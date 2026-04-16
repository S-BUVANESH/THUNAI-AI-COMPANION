from __future__ import annotations

import argparse
import json
import random
from collections import Counter
from contextlib import nullcontext
from pathlib import Path

import numpy as np

try:
    import torch
    from PIL import Image
    from torch import nn
    from torch.utils.data import DataLoader, Dataset
    try:
        from torchvision import transforms
    except Exception:  # pragma: no cover - optional dependency
        transforms = None
except Exception as exc:  # pragma: no cover - optional dependency
    raise SystemExit(
        "train_disease_cnn.py requires torch and pillow. "
        "Install them in the shared virtual environment before training."
    ) from exc

from disease_cnn import DEFAULT_IMAGE_SIZE, DEFAULT_MEAN, DEFAULT_STD, create_model


VALID_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
ARTIFACT_STEMS = {
    "custom-cnn": "plant_disease_cnn",
    "pretrained-transfer": "plant_disease_transfer",
}


class LeafImageDataset(Dataset):
    def __init__(self, samples, class_names, image_size, augment=False):
        self.samples = samples
        self.class_to_idx = {name: index for index, name in enumerate(class_names)}
        self.image_size = image_size
        self.augment = augment

        if transforms is not None:
            self.train_transform = transforms.Compose(
                [
                    transforms.RandomResizedCrop(
                        self.image_size, scale=(0.82, 1.0), ratio=(0.9, 1.1)
                    ),
                    transforms.RandomHorizontalFlip(p=0.5),
                    transforms.RandomRotation(degrees=16),
                    transforms.ColorJitter(
                        brightness=0.15,
                        contrast=0.15,
                        saturation=0.15,
                        hue=0.03,
                    ),
                    transforms.ToTensor(),
                    transforms.Normalize(DEFAULT_MEAN, DEFAULT_STD),
                ]
            )
            self.eval_transform = transforms.Compose(
                [
                    transforms.Resize((self.image_size, self.image_size)),
                    transforms.ToTensor(),
                    transforms.Normalize(DEFAULT_MEAN, DEFAULT_STD),
                ]
            )
        else:
            self.train_transform = None
            self.eval_transform = None

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, index):
        image_path, label = self.samples[index]
        image = Image.open(image_path).convert("RGB").resize(
            (self.image_size, self.image_size)
        )
        if self.train_transform is not None:
            transform = self.train_transform if self.augment else self.eval_transform
            tensor = transform(image)
            return tensor, self.class_to_idx[label]

        array = np.asarray(image, dtype=np.float32) / 255.0
        mean = np.asarray(DEFAULT_MEAN, dtype=np.float32)
        std = np.asarray(DEFAULT_STD, dtype=np.float32)
        array = (array - mean) / std
        tensor = torch.from_numpy(np.transpose(array, (2, 0, 1)))
        return tensor, self.class_to_idx[label]


def parse_args():
    parser = argparse.ArgumentParser(
        description="Train the THUNAI plant disease CNN from a folder-organized dataset."
    )
    parser.add_argument(
        "--dataset",
        type=Path,
        required=True,
        help="Root folder where each class has its own subdirectory of images.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent / "models",
        help="Directory where model weights and metadata should be saved.",
    )
    parser.add_argument("--epochs", type=int, default=12)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
    parser.add_argument("--val-split", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--image-size", type=int, default=DEFAULT_IMAGE_SIZE)
    parser.add_argument(
        "--model-type",
        choices=sorted(ARTIFACT_STEMS.keys()),
        default="custom-cnn",
        help="Choose the custom CNN path or the pretrained transfer-learning path.",
    )
    parser.add_argument(
        "--use-imagenet-weights",
        action="store_true",
        help="When using pretrained-transfer, initialize from torchvision ImageNet weights.",
    )
    parser.add_argument(
        "--num-workers",
        type=int,
        default=2,
        help="DataLoader worker count. Use 0 on constrained environments, higher on Colab GPUs.",
    )
    parser.add_argument(
        "--patience",
        type=int,
        default=3,
        help="Stop after this many epochs without validation improvement.",
    )
    parser.add_argument(
        "--min-delta",
        type=float,
        default=0.001,
        help="Minimum validation accuracy improvement required to reset early stopping.",
    )
    parser.add_argument(
        "--freeze-backbone-epochs",
        type=int,
        default=0,
        help="For pretrained-transfer, freeze the backbone for this many initial epochs.",
    )
    return parser.parse_args()


def collect_samples(dataset_root, val_split, seed):
    if not dataset_root.exists():
        raise FileNotFoundError(f"Dataset folder not found: {dataset_root}")

    class_dirs = [path for path in sorted(dataset_root.iterdir()) if path.is_dir()]
    if not class_dirs:
        raise ValueError("Dataset folder must contain one subdirectory per class.")

    class_names = [path.name for path in class_dirs]
    train_samples = []
    val_samples = []

    rng = random.Random(seed)
    for class_dir in class_dirs:
        files = [
            path
            for path in sorted(class_dir.rglob("*"))
            if path.is_file() and path.suffix.lower() in VALID_SUFFIXES
        ]
        if not files:
            continue

        rng.shuffle(files)
        split_index = max(1, int(len(files) * val_split)) if len(files) > 1 else 0
        val_files = files[:split_index]
        train_files = files[split_index:] or files

        train_samples.extend((path, class_dir.name) for path in train_files)
        val_samples.extend((path, class_dir.name) for path in val_files)

    if not train_samples:
        raise ValueError("No valid training images found in the dataset.")

    return class_names, train_samples, val_samples


def set_seed(seed):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


def build_class_weights(samples, class_names):
    counts = Counter(label for _, label in samples)
    sample_count = max(len(samples), 1)
    class_count = max(len(class_names), 1)
    weights = [
        sample_count / (class_count * max(counts.get(class_name, 0), 1))
        for class_name in class_names
    ]
    return torch.tensor(weights, dtype=torch.float32)


def evaluate(model, loader, device):
    if len(loader.dataset) == 0:
        return {"loss": 0.0, "accuracy": 0.0}

    model.eval()
    criterion = nn.CrossEntropyLoss()
    total_loss = 0.0
    total_correct = 0
    total_items = 0

    with torch.no_grad():
        for inputs, targets in loader:
            inputs = inputs.to(device)
            targets = targets.to(device)
            logits = model(inputs)
            loss = criterion(logits, targets)
            total_loss += float(loss.item()) * len(inputs)
            total_correct += int((logits.argmax(dim=1) == targets).sum().item())
            total_items += len(inputs)

    return {
        "loss": round(total_loss / max(total_items, 1), 4),
        "accuracy": round(total_correct / max(total_items, 1), 4),
    }


def train_step(model, loader, criterion, optimizer, device, scaler=None):
    model.train()
    running_loss = 0.0
    running_correct = 0
    seen = 0

    use_amp = scaler is not None and device == "cuda"
    if use_amp and hasattr(torch, "amp"):
        autocast = lambda: torch.amp.autocast("cuda")
    else:
        autocast = torch.cuda.amp.autocast if use_amp else nullcontext

    for inputs, targets in loader:
        inputs = inputs.to(device, non_blocking=True)
        targets = targets.to(device, non_blocking=True)

        optimizer.zero_grad(set_to_none=True)
        with autocast():
            logits = model(inputs)
            loss = criterion(logits, targets)

        if use_amp:
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
        else:
            loss.backward()
            optimizer.step()

        running_loss += float(loss.item()) * len(inputs)
        running_correct += int((logits.argmax(dim=1) == targets).sum().item())
        seen += len(inputs)

    return {
        "loss": round(running_loss / max(seen, 1), 4),
        "accuracy": round(running_correct / max(seen, 1), 4),
    }


def set_backbone_trainable(model, trainable: bool):
    backbone = getattr(model, "backbone", None)
    if backbone is None:
        return False

    for parameter in backbone.parameters():
        parameter.requires_grad = trainable

    # Keep the classification head trainable even when freezing the backbone,
    # otherwise the loss tensor has no trainable path and backward() fails.
    head = getattr(backbone, "fc", None)
    if head is not None:
        for parameter in head.parameters():
            parameter.requires_grad = True

    return True


def main():
    args = parse_args()
    set_seed(args.seed)

    if hasattr(torch.backends, "cudnn") and torch.cuda.is_available():
        torch.backends.cudnn.benchmark = True

    class_names, train_samples, val_samples = collect_samples(
        args.dataset,
        args.val_split,
        args.seed,
    )
    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    train_dataset = LeafImageDataset(
        train_samples,
        class_names,
        args.image_size,
        augment=True,
    )
    val_dataset = LeafImageDataset(
        val_samples,
        class_names,
        args.image_size,
        augment=False,
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=max(args.num_workers, 0),
        pin_memory=torch.cuda.is_available(),
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=max(args.num_workers, 0),
        pin_memory=torch.cuda.is_available(),
    )

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = create_model(
        model_type=args.model_type,
        num_classes=len(class_names),
        image_size=args.image_size,
        pretrained=args.use_imagenet_weights,
    ).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.learning_rate)
    class_weights = build_class_weights(train_samples, class_names).to(device)
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    if device == "cuda" and hasattr(torch, "amp"):
        scaler = torch.amp.GradScaler("cuda")
    else:
        scaler = torch.cuda.amp.GradScaler() if device == "cuda" else None
    is_transfer_model = args.model_type == "pretrained-transfer"

    history = []
    best_state = None
    best_val_accuracy = float("-inf")
    epochs_without_improvement = 0
    for epoch in range(1, args.epochs + 1):
        if is_transfer_model and args.freeze_backbone_epochs > 0:
            if epoch <= args.freeze_backbone_epochs:
                set_backbone_trainable(model, False)
            else:
                set_backbone_trainable(model, True)

        train_metrics = train_step(model, train_loader, criterion, optimizer, device, scaler=scaler)
        val_metrics = evaluate(model, val_loader, device)
        history.append(
            {
                "epoch": epoch,
                "train": train_metrics,
                "validation": val_metrics,
            }
        )
        print(
            f"Epoch {epoch}/{args.epochs} "
            f"train_loss={train_metrics['loss']:.4f} "
            f"train_acc={train_metrics['accuracy']:.4f} "
            f"val_loss={val_metrics['loss']:.4f} "
            f"val_acc={val_metrics['accuracy']:.4f}"
        )

        if val_metrics["accuracy"] > (best_val_accuracy + args.min_delta):
            best_val_accuracy = val_metrics["accuracy"]
            epochs_without_improvement = 0
            best_state = {
                key: value.detach().cpu().clone()
                for key, value in model.state_dict().items()
            }
        else:
            epochs_without_improvement += 1

        if epochs_without_improvement >= args.patience:
            print(
                f"Early stopping at epoch {epoch} after {args.patience} epochs without improvement."
            )
            break

    if best_state is not None:
        model.load_state_dict(best_state)

    artifact_stem = ARTIFACT_STEMS[args.model_type]
    weights_path = output_dir / f"{artifact_stem}.pt"
    classes_path = output_dir / f"{artifact_stem}_classes.json"
    metrics_path = output_dir / f"{artifact_stem}_metrics.json"

    torch.save(
        {
            "model_state": model.state_dict(),
            "class_names": class_names,
            "image_size": args.image_size,
        },
        weights_path,
    )

    with open(classes_path, "w", encoding="utf-8") as handle:
        json.dump({"class_names": class_names}, handle, indent=2)

    with open(metrics_path, "w", encoding="utf-8") as handle:
        json.dump(
            {
                "dataset_root": str(args.dataset),
                "image_size": args.image_size,
                "epochs": args.epochs,
                "batch_size": args.batch_size,
                "learning_rate": args.learning_rate,
                "class_weights": [round(float(value), 6) for value in class_weights.detach().cpu().tolist()],
                "device": device,
                "model_type": args.model_type,
                "use_imagenet_weights": args.use_imagenet_weights,
                "class_names": class_names,
                "train_samples": len(train_samples),
                "validation_samples": len(val_samples),
                "history": history,
            },
            handle,
            indent=2,
        )

    print(f"Saved weights to {weights_path}")
    print(f"Saved class metadata to {classes_path}")
    print(f"Saved metrics to {metrics_path}")


if __name__ == "__main__":
    main()
