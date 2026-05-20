"""
Fine-tune receipt parsing models using QLoRA.

Two models:
  - Text Parser: Phi-3.5-mini (3.8B) for email/OCR text → JSON
  - Vision Parser: Qwen2.5-VL-7B for receipt images → JSON

Usage:
    python training/finetune.py --mode text    # Fine-tune text parser (Phi-3.5-mini)
    python training/finetune.py --mode vision  # Fine-tune vision parser (Qwen2.5-VL)

Hardware:
    Text model:   RTX 4090 24GB (~1 hour for 5K samples) or A100 (~30 min)
    Vision model: A100 40GB (~2 hours for 3K samples)
"""

import argparse
import json
import os

import torch
import yaml
from datasets import Dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from trl import SFTTrainer, DataCollatorForCompletionOnlyLM


SYSTEM_PROMPT = """You are a receipt parser. Given receipt text or image content, extract structured data as JSON.

Output this exact structure:
{"merchant":{"rawName":str,"canonicalName":str,"category":str,"location":str|null},"purchase":{"purchasedAt":"ISO8601","currency":"USD","subtotal":float,"tax":float,"tip":float,"discount":float,"fees":float,"total":float},"payment":{"method":str,"cardId":null,"cardLast4":str|null,"walletType":null,"entryMode":str|null},"items":[{"rawName":str,"name":str,"quantity":int,"unitPrice":float,"totalPrice":float,"category":str}],"metadata":{"confidence":float,"requiresReview":bool}}

Categories: Groceries, Dining, Shopping, Transportation, Travel, Entertainment, Healthcare, Utilities, Subscriptions, Gas & Fuel, Electronics, Home & Garden, Personal Care, Education, Gifts & Donations, Business, Uncategorized.
If NOT a receipt, return {"not_a_receipt": true}.
Return ONLY valid JSON."""


def load_config(config_path: str) -> dict:
    with open(config_path) as f:
        return yaml.safe_load(f)


def load_training_data(train_file: str, eval_file: str, max_samples: int | None = None):
    train_data = []
    with open(train_file) as f:
        for line in f:
            train_data.append(json.loads(line))

    eval_data = []
    with open(eval_file) as f:
        for line in f:
            eval_data.append(json.loads(line))

    if max_samples:
        train_data = train_data[:max_samples]

    return Dataset.from_list(train_data), Dataset.from_list(eval_data)


def setup_text_model(config: dict):
    """Load Phi-3.5-mini with QLoRA for text parsing."""
    mc = config["text_model"]

    quant_config = BitsAndBytesConfig(
        load_in_4bit=mc["quantization"]["load_in_4bit"],
        bnb_4bit_quant_type=mc["quantization"]["bnb_4bit_quant_type"],
        bnb_4bit_compute_dtype=getattr(torch, mc["quantization"]["bnb_4bit_compute_dtype"]),
        bnb_4bit_use_double_quant=mc["quantization"]["bnb_4bit_use_double_quant"],
    )

    model = AutoModelForCausalLM.from_pretrained(
        mc["base_model"],
        quantization_config=quant_config,
        device_map="auto",
        torch_dtype=torch.bfloat16,
        trust_remote_code=True,
        attn_implementation="flash_attention_2",
    )

    tokenizer = AutoTokenizer.from_pretrained(mc["base_model"], trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    model = prepare_model_for_kbit_training(model)

    lora_config = LoraConfig(
        r=mc["lora"]["r"],
        lora_alpha=mc["lora"]["lora_alpha"],
        target_modules=mc["lora"]["target_modules"],
        lora_dropout=mc["lora"]["lora_dropout"],
        bias=mc["lora"]["bias"],
        task_type=mc["lora"]["task_type"],
    )

    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    return model, tokenizer, mc


def setup_vision_model(config: dict):
    """Load Qwen2.5-VL-7B with QLoRA for vision parsing."""
    mc = config["vision_model"]

    quant_config = BitsAndBytesConfig(
        load_in_4bit=mc["quantization"]["load_in_4bit"],
        bnb_4bit_quant_type=mc["quantization"]["bnb_4bit_quant_type"],
        bnb_4bit_compute_dtype=getattr(torch, mc["quantization"]["bnb_4bit_compute_dtype"]),
        bnb_4bit_use_double_quant=mc["quantization"]["bnb_4bit_use_double_quant"],
    )

    # Qwen2.5-VL uses a different model class
    from transformers import Qwen2_5_VLForConditionalGeneration, AutoProcessor

    model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
        mc["base_model"],
        quantization_config=quant_config,
        device_map="auto",
        torch_dtype=torch.bfloat16,
    )

    processor = AutoProcessor.from_pretrained(mc["base_model"])

    model = prepare_model_for_kbit_training(model)

    lora_config = LoraConfig(
        r=mc["lora"]["r"],
        lora_alpha=mc["lora"]["lora_alpha"],
        target_modules=mc["lora"]["target_modules"],
        lora_dropout=mc["lora"]["lora_dropout"],
        bias=mc["lora"]["bias"],
        task_type=mc["lora"]["task_type"],
    )

    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    return model, processor, mc


def phi_formatting_func(example, tokenizer):
    """Format for Phi-3.5-mini chat template."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Parse this receipt:\n\n{example['input']}"},
        {"role": "assistant", "content": json.dumps(example["output"], separators=(",", ":"))},
    ]
    return tokenizer.apply_chat_template(messages, tokenize=False)


def train_text_model(config: dict):
    """Fine-tune Phi-3.5-mini for text receipt parsing."""
    model, tokenizer, mc = setup_text_model(config)
    tc = mc["training"]

    print(f"Loading training data from {mc['data']['train_file']}")
    train_dataset, eval_dataset = load_training_data(
        mc["data"]["train_file"], mc["data"]["eval_file"]
    )
    print(f"  Train: {len(train_dataset)} | Eval: {len(eval_dataset)}")

    output_dir = mc["output_dir"]
    os.makedirs(output_dir, exist_ok=True)

    if config.get("wandb"):
        os.environ["WANDB_PROJECT"] = config["wandb"]["project"]
        report_to = "wandb"
    else:
        report_to = "none"

    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=tc["num_train_epochs"],
        per_device_train_batch_size=tc["per_device_train_batch_size"],
        per_device_eval_batch_size=tc["per_device_train_batch_size"],
        gradient_accumulation_steps=tc["gradient_accumulation_steps"],
        learning_rate=tc["learning_rate"],
        weight_decay=tc["weight_decay"],
        warmup_ratio=tc["warmup_ratio"],
        lr_scheduler_type=tc["lr_scheduler_type"],
        bf16=tc["bf16"],
        logging_steps=tc["logging_steps"],
        save_steps=tc["save_steps"],
        eval_strategy="steps",
        eval_steps=tc["eval_steps"],
        save_total_limit=tc["save_total_limit"],
        gradient_checkpointing=tc["gradient_checkpointing"],
        optim=tc["optim"],
        report_to=report_to,
        run_name="receipt-text-parser-phi35",
        remove_unused_columns=False,
    )

    # Phi-3.5 uses <|assistant|> as response marker
    response_template = "<|assistant|>"
    collator = DataCollatorForCompletionOnlyLM(
        response_template=response_template,
        tokenizer=tokenizer,
    )

    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        formatting_func=lambda ex: phi_formatting_func(ex, tokenizer),
        data_collator=collator,
        max_seq_length=tc["max_seq_length"],
        packing=False,
    )

    print("Starting text model training...")
    trainer.train()

    print(f"Saving to {output_dir}")
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)

    metadata = {
        "base_model": mc["base_model"],
        "task": "text_receipt_parsing",
        "train_samples": len(train_dataset),
        "eval_samples": len(eval_dataset),
        "lora_r": mc["lora"]["r"],
    }
    with open(os.path.join(output_dir, "training_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print("Text model training complete!")


def train_vision_model(config: dict):
    """Fine-tune Qwen2.5-VL for receipt image parsing."""
    model, processor, mc = setup_vision_model(config)
    tc = mc["training"]

    print(f"Loading vision training data from {mc['data']['train_file']}")
    train_dataset, eval_dataset = load_training_data(
        mc["data"]["train_file"], mc["data"]["eval_file"]
    )
    print(f"  Train: {len(train_dataset)} | Eval: {len(eval_dataset)}")

    output_dir = mc["output_dir"]
    os.makedirs(output_dir, exist_ok=True)

    if config.get("wandb"):
        os.environ["WANDB_PROJECT"] = config["wandb"]["project"]
        report_to = "wandb"
    else:
        report_to = "none"

    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=tc["num_train_epochs"],
        per_device_train_batch_size=tc["per_device_train_batch_size"],
        per_device_eval_batch_size=1,
        gradient_accumulation_steps=tc["gradient_accumulation_steps"],
        learning_rate=tc["learning_rate"],
        weight_decay=tc["weight_decay"],
        warmup_ratio=tc["warmup_ratio"],
        lr_scheduler_type=tc["lr_scheduler_type"],
        bf16=tc["bf16"],
        logging_steps=tc["logging_steps"],
        save_steps=tc["save_steps"],
        eval_strategy="steps",
        eval_steps=tc["eval_steps"],
        save_total_limit=tc["save_total_limit"],
        gradient_checkpointing=tc["gradient_checkpointing"],
        optim=tc["optim"],
        report_to=report_to,
        run_name="receipt-vision-parser-qwen25vl",
        remove_unused_columns=False,
    )

    # For vision model, we use a simpler SFT approach
    # The training data should have "image_path" and "output" fields
    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        max_seq_length=tc["max_seq_length"],
        packing=False,
    )

    print("Starting vision model training...")
    trainer.train()

    print(f"Saving to {output_dir}")
    trainer.save_model(output_dir)
    processor.save_pretrained(output_dir)

    metadata = {
        "base_model": mc["base_model"],
        "task": "vision_receipt_parsing",
        "train_samples": len(train_dataset),
        "eval_samples": len(eval_dataset),
        "lora_r": mc["lora"]["r"],
    }
    with open(os.path.join(output_dir, "training_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print("Vision model training complete!")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", type=str, required=True, choices=["text", "vision"])
    parser.add_argument("--config", type=str, default="training/config.yaml")
    args = parser.parse_args()

    config = load_config(args.config)

    if args.mode == "text":
        train_text_model(config)
    else:
        train_vision_model(config)


if __name__ == "__main__":
    main()
