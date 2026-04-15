from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(
        description="Train both THUNAI disease model families: pretrained transfer + custom CNN."
    )
    parser.add_argument(
        "--dataset",
        type=Path,
        required=True,
        help="Root dataset folder containing one subdirectory per class.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent / "models",
        help="Directory where model artifacts should be written.",
    )
    parser.add_argument("--epochs-transfer", type=int, default=12)
    parser.add_argument("--epochs-custom", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
    parser.add_argument("--val-split", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--image-size", type=int, default=224)
    parser.add_argument(
        "--skip-transfer",
        action="store_true",
        help="Skip training the pretrained transfer-learning model.",
    )
    parser.add_argument(
        "--skip-custom",
        action="store_true",
        help="Skip training the custom CNN model.",
    )
    parser.add_argument(
        "--no-imagenet-weights",
        action="store_true",
        help="Disable ImageNet initialization for pretrained-transfer training.",
    )
    return parser.parse_args()


def run_training(command):
    print(" ".join(command))
    subprocess.run(command, check=True)


def main():
    args = parse_args()

    trainer = Path(__file__).resolve().parent / "train_disease_cnn.py"
    if not trainer.exists():
        raise FileNotFoundError(f"Training script not found: {trainer}")

    base = [
        sys.executable,
        str(trainer),
        "--dataset",
        str(args.dataset),
        "--output-dir",
        str(args.output_dir),
        "--batch-size",
        str(args.batch_size),
        "--learning-rate",
        str(args.learning_rate),
        "--val-split",
        str(args.val_split),
        "--seed",
        str(args.seed),
        "--image-size",
        str(args.image_size),
    ]

    if not args.skip_transfer:
        transfer_cmd = [
            *base,
            "--model-type",
            "pretrained-transfer",
            "--epochs",
            str(args.epochs_transfer),
        ]
        if not args.no_imagenet_weights:
            transfer_cmd.append("--use-imagenet-weights")
        run_training(transfer_cmd)

    if not args.skip_custom:
        custom_cmd = [
            *base,
            "--model-type",
            "custom-cnn",
            "--epochs",
            str(args.epochs_custom),
        ]
        run_training(custom_cmd)

    print("Completed requested training runs.")


if __name__ == "__main__":
    main()
