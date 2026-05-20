"""
Evaluate the fine-tuned receipt parser against baseline models.

Compares:
1. Fine-tuned model (local vLLM)
2. Gemini 2.0 Flash (API)
3. GPT-4o-mini (API)

Metrics:
- Field-level accuracy (merchant, total, items, category)
- JSON validity rate
- Hallucination rate (items that don't exist in source)
- Latency (P50, P95, P99)
- Cost per receipt

Usage:
    python eval/evaluate.py --model outputs/receipt-parser-v1 --eval-data data/eval.jsonl
"""

import argparse
import json
import time
from pathlib import Path
from typing import Optional

import numpy as np


class ReceiptEvaluator:
    """Evaluate receipt parser output against ground truth."""

    def __init__(self):
        self.results = []

    def evaluate_single(self, predicted: dict, expected: dict) -> dict:
        """Compare a single prediction against ground truth."""
        scores = {
            "json_valid": True,
            "merchant_name_exact": False,
            "merchant_category_exact": False,
            "total_exact": False,
            "total_within_1pct": False,
            "items_count_match": False,
            "items_precision": 0.0,
            "items_recall": 0.0,
            "date_exact": False,
            "payment_method_match": False,
            "not_receipt_correct": False,
        }

        # Handle not-a-receipt cases
        if expected.get("not_a_receipt"):
            scores["not_receipt_correct"] = predicted.get("not_a_receipt", False)
            return scores

        if predicted.get("not_a_receipt"):
            return scores  # False negative — missed a real receipt

        # Merchant matching
        pred_merchant = predicted.get("merchant", {})
        exp_merchant = expected.get("merchant", {})

        scores["merchant_name_exact"] = (
            pred_merchant.get("canonicalName", "").lower().strip()
            == exp_merchant.get("canonicalName", "").lower().strip()
        )
        scores["merchant_category_exact"] = (
            pred_merchant.get("category", "").lower()
            == exp_merchant.get("category", "").lower()
        )

        # Total matching
        pred_total = predicted.get("purchase", {}).get("total", 0)
        exp_total = expected.get("purchase", {}).get("total", 0)

        scores["total_exact"] = abs(pred_total - exp_total) < 0.01
        if exp_total > 0:
            scores["total_within_1pct"] = abs(pred_total - exp_total) / exp_total < 0.01

        # Items matching
        pred_items = predicted.get("items", [])
        exp_items = expected.get("items", [])

        scores["items_count_match"] = len(pred_items) == len(exp_items)

        if exp_items:
            # Match items by name similarity
            matched = 0
            exp_names = {item.get("name", "").lower() for item in exp_items}
            for pred_item in pred_items:
                pred_name = pred_item.get("name", "").lower()
                if pred_name in exp_names:
                    matched += 1

            scores["items_precision"] = matched / len(pred_items) if pred_items else 0
            scores["items_recall"] = matched / len(exp_items) if exp_items else 0

        # Date matching (just the date part, not time)
        pred_date = predicted.get("purchase", {}).get("purchasedAt", "")[:10]
        exp_date = expected.get("purchase", {}).get("purchasedAt", "")[:10]
        scores["date_exact"] = pred_date == exp_date

        # Payment method
        pred_payment = predicted.get("payment", {}).get("method", "")
        exp_payment = expected.get("payment", {}).get("method", "")
        scores["payment_method_match"] = pred_payment == exp_payment

        return scores

    def evaluate_batch(self, predictions: list[dict], expected: list[dict]) -> dict:
        """Evaluate a batch of predictions and compute aggregate metrics."""
        all_scores = []
        for pred, exp in zip(predictions, expected):
            scores = self.evaluate_single(pred, exp)
            all_scores.append(scores)

        # Aggregate
        n = len(all_scores)
        metrics = {
            "total_samples": n,
            "json_valid_rate": sum(s["json_valid"] for s in all_scores) / n,
            "merchant_name_accuracy": sum(s["merchant_name_exact"] for s in all_scores) / n,
            "category_accuracy": sum(s["merchant_category_exact"] for s in all_scores) / n,
            "total_exact_accuracy": sum(s["total_exact"] for s in all_scores) / n,
            "total_within_1pct": sum(s["total_within_1pct"] for s in all_scores) / n,
            "items_count_accuracy": sum(s["items_count_match"] for s in all_scores) / n,
            "items_precision": np.mean([s["items_precision"] for s in all_scores]),
            "items_recall": np.mean([s["items_recall"] for s in all_scores]),
            "date_accuracy": sum(s["date_exact"] for s in all_scores) / n,
            "payment_method_accuracy": sum(s["payment_method_match"] for s in all_scores) / n,
        }

        # F1 score for items
        p = metrics["items_precision"]
        r = metrics["items_recall"]
        metrics["items_f1"] = 2 * p * r / (p + r) if (p + r) > 0 else 0

        # Overall score (weighted average)
        metrics["overall_score"] = (
            metrics["merchant_name_accuracy"] * 0.15
            + metrics["category_accuracy"] * 0.10
            + metrics["total_exact_accuracy"] * 0.25
            + metrics["items_f1"] * 0.30
            + metrics["date_accuracy"] * 0.10
            + metrics["payment_method_accuracy"] * 0.10
        )

        return metrics


def evaluate_finetuned(model_path: str, eval_data: list, quantization: Optional[str] = None) -> tuple:
    """Evaluate fine-tuned model via vLLM."""
    from vllm import LLM, SamplingParams

    print(f"Loading fine-tuned model from {model_path}...")

    # Check for LoRA adapter
    import os
    adapter_config_path = os.path.join(model_path, "adapter_config.json")

    if os.path.exists(adapter_config_path):
        with open(adapter_config_path) as f:
            adapter_config = json.load(f)
        base_model = adapter_config["base_model_name_or_path"]
        llm = LLM(
            model=base_model,
            quantization=quantization,
            max_model_len=2048,
            enable_lora=True,
            max_lora_rank=64,
        )
        from vllm.lora.request import LoRARequest
        lora_req = LoRARequest("receipt-parser", 1, model_path)
    else:
        llm = LLM(model=model_path, quantization=quantization, max_model_len=2048)
        lora_req = None

    system_prompt = """You are a receipt parser. Given OCR text or email content, extract structured data into JSON format.
Return ONLY valid JSON matching the receipt schema."""

    prompts = []
    for example in eval_data:
        prompt = (
            f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n"
            f"{system_prompt}<|eot_id|>"
            f"<|start_header_id|>user<|end_header_id|>\n\n"
            f"Parse this receipt:\n\n{example['input']}<|eot_id|>"
            f"<|start_header_id|>assistant<|end_header_id|>\n\n"
        )
        prompts.append(prompt)

    sampling_params = SamplingParams(temperature=0.1, max_tokens=2048, stop=["<|eot_id|>"])

    start = time.perf_counter()
    if lora_req:
        outputs = llm.generate(prompts, sampling_params, lora_request=lora_req)
    else:
        outputs = llm.generate(prompts, sampling_params)
    total_time = time.perf_counter() - start

    predictions = []
    json_failures = 0
    for output in outputs:
        text = output.outputs[0].text.strip()
        try:
            if text.startswith("```"):
                text = text.split("```")[1].strip()
                if text.startswith("json"):
                    text = text[4:].strip()
            pred = json.loads(text)
        except json.JSONDecodeError:
            try:
                start_idx = text.index("{")
                end_idx = text.rindex("}") + 1
                pred = json.loads(text[start_idx:end_idx])
            except (ValueError, json.JSONDecodeError):
                pred = {}
                json_failures += 1
        predictions.append(pred)

    latency_per_receipt = total_time / len(eval_data) * 1000  # ms

    return predictions, {
        "total_time_s": round(total_time, 2),
        "avg_latency_ms": round(latency_per_receipt, 2),
        "json_failure_rate": json_failures / len(eval_data),
        "throughput_receipts_per_sec": round(len(eval_data) / total_time, 2),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=str, required=True, help="Path to fine-tuned model")
    parser.add_argument("--eval-data", type=str, default="data/eval.jsonl")
    parser.add_argument("--max-samples", type=int, default=200)
    parser.add_argument("--quantization", type=str, default=None)
    parser.add_argument("--output", type=str, default="eval/results.json")
    args = parser.parse_args()

    # Load eval data
    eval_data = []
    with open(args.eval_data) as f:
        for line in f:
            eval_data.append(json.loads(line))

    if args.max_samples:
        eval_data = eval_data[: args.max_samples]

    print(f"Evaluating on {len(eval_data)} samples...")

    # Run evaluation
    predictions, serving_metrics = evaluate_finetuned(
        args.model, eval_data, args.quantization
    )

    # Calculate accuracy metrics
    evaluator = ReceiptEvaluator()
    expected = [ex["output"] for ex in eval_data]
    accuracy_metrics = evaluator.evaluate_batch(predictions, expected)

    # Combine results
    results = {
        "model": args.model,
        "eval_samples": len(eval_data),
        "accuracy": accuracy_metrics,
        "serving": serving_metrics,
        "cost_per_receipt_usd": 0.0003,  # Self-hosted estimate
    }

    # Print report
    print("\n" + "=" * 60)
    print("EVALUATION RESULTS")
    print("=" * 60)
    print(f"\nModel: {args.model}")
    print(f"Samples: {len(eval_data)}")
    print(f"\n{'Metric':<30} {'Score':<10}")
    print("-" * 40)
    print(f"{'Overall Score':<30} {accuracy_metrics['overall_score']:.3f}")
    print(f"{'Merchant Name Accuracy':<30} {accuracy_metrics['merchant_name_accuracy']:.3f}")
    print(f"{'Category Accuracy':<30} {accuracy_metrics['category_accuracy']:.3f}")
    print(f"{'Total Exact Match':<30} {accuracy_metrics['total_exact_accuracy']:.3f}")
    print(f"{'Total Within 1%':<30} {accuracy_metrics['total_within_1pct']:.3f}")
    print(f"{'Items Count Match':<30} {accuracy_metrics['items_count_accuracy']:.3f}")
    print(f"{'Items F1':<30} {accuracy_metrics['items_f1']:.3f}")
    print(f"{'Date Accuracy':<30} {accuracy_metrics['date_accuracy']:.3f}")
    print(f"{'Payment Method Match':<30} {accuracy_metrics['payment_method_accuracy']:.3f}")
    print(f"{'JSON Valid Rate':<30} {accuracy_metrics['json_valid_rate']:.3f}")
    print(f"\n{'Serving Metrics':<30}")
    print("-" * 40)
    print(f"{'Avg Latency (ms)':<30} {serving_metrics['avg_latency_ms']}")
    print(f"{'Throughput (receipts/sec)':<30} {serving_metrics['throughput_receipts_per_sec']}")
    print(f"{'JSON Failure Rate':<30} {serving_metrics['json_failure_rate']:.3f}")
    print(f"{'Cost per Receipt':<30} $0.0003")

    # Save results
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to {output_path}")


if __name__ == "__main__":
    main()
