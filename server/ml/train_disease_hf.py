from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import numpy as np

try:
    import evaluate
    import torch
    from datasets import Dataset, Image
    from transformers import (
        AutoImageProcessor,
        AutoModelForImageClassification,
        Trainer,
        TrainingArguments,
    )
except Exception as exc:
    raise SystemExit(
        "train_disease_hf.py requires transformers, datasets, evaluate, torch, pillow."
    ) from exc


VALID_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def parse_args():
    parser = argparse.ArgumentParser(
        description="Train a Hugging Face pretrained image classifier for THUNAI disease classes."
    )
    parser.add_argument(
        "--dataset",
        type=Path,
        required=True,
        help="Folder-per-class dataset root OR split root with train/val subfolders.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent / "models" / "hf_transfer",
        help="Output directory for Hugging Face model artifacts.",
    )
    parser.add_argument(
        "--hf-model",
        type=str,
        default="google/vit-base-patch16-224",
        help="Pretrained Hugging Face model id.",
    )
    parser.add_argument("--epochs", type=int, default=6)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--learning-rate", type=float, default=5e-5)
    parser.add_argument("--weight-decay", type=float, default=0.01)
    parser.add_argument("--warmup-ratio", type=float, default=0.1)
    parser.add_argument("--val-split", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def set_seed(seed: int):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


def class_dirs(root: Path):
    return [path for path in sorted(root.iterdir()) if path.is_dir()]


def collect_class_samples(root: Path):
    samples = []
    class_names = [path.name for path in class_dirs(root)]
    for class_name in class_names:
        class_root = root / class_name
        for path in sorted(class_root.rglob("*")):
            if path.is_file() and path.suffix.lower() in VALID_SUFFIXES:
                samples.append((str(path), class_name))
    if not samples:
        raise ValueError(f"No valid images found in {root}")
    return class_names, samples


def gather_samples(dataset_root: Path, val_split: float, seed: int):
    train_root = dataset_root / "train"
    val_root = dataset_root / "val"
    if train_root.exists() and val_root.exists():
        class_names, train_samples = collect_class_samples(train_root)
        val_class_names, val_samples = collect_class_samples(val_root)
        merged = sorted(set(class_names) | set(val_class_names))
        return merged, train_samples, val_samples

    class_names, all_samples = collect_class_samples(dataset_root)
    rng = random.Random(seed)
    rng.shuffle(all_samples)
    cut = int(len(all_samples) * val_split)
    if len(all_samples) >= 5 and cut == 0:
        cut = 1
    val_samples = all_samples[:cut]
    train_samples = all_samples[cut:] or all_samples
    return class_names, train_samples, val_samples


def build_hf_dataset(samples, label_to_id):
    payload = {
        "image": [path for path, _ in samples],
        "label": [label_to_id[label] for _, label in samples],
    }
    dataset = Dataset.from_dict(payload)
    dataset = dataset.cast_column("image", Image())
    return dataset


def main():
    args = parse_args()
    set_seed(args.seed)

    class_names, train_samples, val_samples = gather_samples(
        args.dataset,
        args.val_split,
        args.seed,
    )
    if not val_samples:
        raise ValueError("Validation split is empty. Provide a larger dataset or higher val-split.")

    label_to_id = {name: index for index, name in enumerate(class_names)}
    id_to_label = {index: name for name, index in label_to_id.items()}

    train_dataset = build_hf_dataset(train_samples, label_to_id)
    val_dataset = build_hf_dataset(val_samples, label_to_id)

    processor = AutoImageProcessor.from_pretrained(args.hf_model)
    model = AutoModelForImageClassification.from_pretrained(
        args.hf_model,
        num_labels=len(class_names),
        id2label=id_to_label,
        label2id=label_to_id,
        ignore_mismatched_sizes=True,
    )

    def transforms(example_batch):
        images = [image.convert("RGB") for image in example_batch["image"]]
        processed = processor(images=images, return_tensors="pt")
        processed["labels"] = example_batch["label"]
        return processed

    train_dataset.set_transform(transforms)
    val_dataset.set_transform(transforms)

    metric_acc = evaluate.load("accuracy")
    metric_f1 = evaluate.load("f1")

    def compute_metrics(eval_pred):
        logits, labels = eval_pred
        predictions = np.argmax(logits, axis=-1)
        acc = metric_acc.compute(predictions=predictions, references=labels)
        f1_macro = metric_f1.compute(
            predictions=predictions,
            references=labels,
            average="macro",
        )
        return {
            "accuracy": float(acc["accuracy"]),
            "f1_macro": float(f1_macro["f1"]),
        }

    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    training_args = TrainingArguments(
        output_dir=str(output_dir / "checkpoints"),
        remove_unused_columns=False,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="accuracy",
        greater_is_better=True,
        logging_strategy="steps",
        logging_steps=50,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        num_train_epochs=args.epochs,
        learning_rate=args.learning_rate,
        weight_decay=args.weight_decay,
        warmup_ratio=args.warmup_ratio,
        fp16=torch.cuda.is_available(),
        report_to="none",
        seed=args.seed,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        tokenizer=processor,
        compute_metrics=compute_metrics,
    )

    trainer.train()
    eval_metrics = trainer.evaluate()

    final_model_dir = output_dir / "hf_model"
    trainer.save_model(str(final_model_dir))
    processor.save_pretrained(str(final_model_dir))

    summary_path = output_dir / "hf_training_summary.json"
    with open(summary_path, "w", encoding="utf-8") as handle:
        json.dump(
            {
                "hf_model": args.hf_model,
                "num_classes": len(class_names),
                "class_names": class_names,
                "train_samples": len(train_samples),
                "validation_samples": len(val_samples),
                "epochs": args.epochs,
                "batch_size": args.batch_size,
                "learning_rate": args.learning_rate,
                "weight_decay": args.weight_decay,
                "warmup_ratio": args.warmup_ratio,
                "seed": args.seed,
                "eval_metrics": eval_metrics,
            },
            handle,
            indent=2,
        )

    print(f"Saved Hugging Face model to {final_model_dir}")
    print(f"Saved training summary to {summary_path}")


if __name__ == "__main__":
    main()
