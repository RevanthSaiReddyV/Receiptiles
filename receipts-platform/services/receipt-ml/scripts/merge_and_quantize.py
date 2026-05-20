"""
Merge LoRA adapter into base model and optionally quantize for production serving.

Steps:
1. Load base model + LoRA adapter
2. Merge weights into a single model
3. Optionally quantize to INT4 (AWQ) for 3x faster inference + 3x less VRAM

Usage:
    # Merge only
    python scripts/merge_and_quantize.py --adapter outputs/receipt-parser-v1 --output outputs/receipt-parser-v1-merged

    # Merge + AWQ quantize (recommended for production)
    python scripts/merge_and_quantize.py --adapter outputs/receipt-parser-v1 --output outputs/receipt-parser-v1-awq --quantize awq
"""

import argparse
import json
import os

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer


def merge_lora(adapter_path: str, output_path: str):
    """Merge LoRA adapter into base model."""
    # Load adapter config to get base model name
    with open(os.path.join(adapter_path, "adapter_config.json")) as f:
        config = json.load(f)

    base_model_name = config["base_model_name_or_path"]
    print(f"Loading base model: {base_model_name}")

    # Load in fp16 for merging
    base_model = AutoModelForCausalLM.from_pretrained(
        base_model_name,
        torch_dtype=torch.float16,
        device_map="auto",
    )
    tokenizer = AutoTokenizer.from_pretrained(base_model_name)

    print(f"Loading LoRA adapter from: {adapter_path}")
    model = PeftModel.from_pretrained(base_model, adapter_path)

    print("Merging weights...")
    merged_model = model.merge_and_unload()

    print(f"Saving merged model to: {output_path}")
    os.makedirs(output_path, exist_ok=True)
    merged_model.save_pretrained(output_path)
    tokenizer.save_pretrained(output_path)

    # Save metadata
    metadata = {
        "base_model": base_model_name,
        "adapter_path": adapter_path,
        "merged": True,
        "dtype": "float16",
        "lora_r": config.get("r"),
        "lora_alpha": config.get("lora_alpha"),
    }
    with open(os.path.join(output_path, "merge_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print("Merge complete!")
    return output_path


def quantize_awq(model_path: str, output_path: str):
    """Quantize merged model to INT4 using AWQ."""
    try:
        from awq import AutoAWQForCausalLM
    except ImportError:
        print("ERROR: autoawq not installed. Run: pip install autoawq")
        return

    print(f"Loading model for AWQ quantization: {model_path}")
    model = AutoAWQForCausalLM.from_pretrained(model_path)
    tokenizer = AutoTokenizer.from_pretrained(model_path)

    quant_config = {
        "zero_point": True,
        "q_group_size": 128,
        "w_bit": 4,
        "version": "GEMM",
    }

    print("Quantizing (this may take 20-40 minutes)...")
    model.quantize(tokenizer, quant_config=quant_config)

    print(f"Saving quantized model to: {output_path}")
    os.makedirs(output_path, exist_ok=True)
    model.save_quantized(output_path)
    tokenizer.save_pretrained(output_path)

    # Save metadata
    metadata = {
        "source_model": model_path,
        "quantization": "awq",
        "bits": 4,
        "group_size": 128,
    }
    with open(os.path.join(output_path, "quant_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print("Quantization complete!")
    print(f"  Original size: ~16GB (fp16)")
    print(f"  Quantized size: ~4.5GB (int4)")
    print(f"  Expected speedup: ~2.5x")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--adapter", type=str, required=True, help="Path to LoRA adapter")
    parser.add_argument("--output", type=str, required=True, help="Output path for merged/quantized model")
    parser.add_argument("--quantize", type=str, choices=["awq", "none"], default="none")
    args = parser.parse_args()

    # Step 1: Merge
    if args.quantize == "none":
        merge_lora(args.adapter, args.output)
    else:
        # Merge to temp dir, then quantize
        merged_path = args.output + "-merged-tmp"
        merge_lora(args.adapter, merged_path)

        # Step 2: Quantize
        if args.quantize == "awq":
            quantize_awq(merged_path, args.output)

        # Clean up temp merged model (optional)
        print(f"\nNote: Intermediate merged model at {merged_path} can be deleted to save disk space.")


if __name__ == "__main__":
    main()
