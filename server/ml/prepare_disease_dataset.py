from __future__ import annotations

import argparse
import random
import shutil
from collections import defaultdict
from pathlib import Path


VALID_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def parse_args():
    parser = argparse.ArgumentParser(
        description=(
            "Prepare a folder-per-class disease dataset for THUNAI training. "
            "Can split an existing local dataset and optionally export a Hugging Face image dataset."
        )
    )
    parser.add_argument(
        "--source-dir",
        type=Path,
        help="Local source dataset root with class subfolders.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        required=True,
        help="Output folder where train/val/test class folders will be created.",
    )
    parser.add_argument("--val-split", type=float, default=0.2)
    parser.add_argument("--test-split", type=float, default=0.1)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--copy",
        action="store_true",
        help="Copy files instead of hard-linking when creating split folders.",
    )
    parser.add_argument(
        "--hf-dataset",
        type=str,
        help=(
            "Optional Hugging Face dataset id, for example 'dpdl-benchmark/plant_village'. "
            "Requires datasets and pillow packages."
        ),
    )
    parser.add_argument(
        "--hf-split",
        type=str,
        default="train",
        help="Hugging Face split name to export, default is train.",
    )
    parser.add_argument(
        "--hf-image-column",
        type=str,
        default="image",
        help="Image column name in Hugging Face dataset.",
    )
    parser.add_argument(
        "--hf-label-column",
        type=str,
        default="label",
        help="Label column name in Hugging Face dataset.",
    )
    return parser.parse_args()


def list_class_images(source_dir: Path):
    classes = [path for path in sorted(source_dir.iterdir()) if path.is_dir()]
    if not classes:
        raise ValueError("No class folders found in source-dir.")

    samples = defaultdict(list)
    for class_dir in classes:
        for path in sorted(class_dir.rglob("*")):
            if path.is_file() and path.suffix.lower() in VALID_SUFFIXES:
                samples[class_dir.name].append(path)

    if not samples:
        raise ValueError("No valid images found under source-dir.")
    return samples


def ensure_clean_dir(path: Path):
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def materialize_file(source: Path, destination: Path, copy_mode: bool):
    destination.parent.mkdir(parents=True, exist_ok=True)
    if copy_mode:
        shutil.copy2(source, destination)
        return

    try:
        destination.hardlink_to(source)
    except OSError:
        shutil.copy2(source, destination)


def split_samples(samples, val_split: float, test_split: float, seed: int):
    if val_split < 0 or test_split < 0 or (val_split + test_split) >= 1:
        raise ValueError("val-split and test-split must be >= 0 and add up to < 1.")

    rng = random.Random(seed)
    split_map = {"train": defaultdict(list), "val": defaultdict(list), "test": defaultdict(list)}

    for class_name, class_samples in samples.items():
        paths = class_samples[:]
        rng.shuffle(paths)

        total = len(paths)
        test_count = int(total * test_split)
        val_count = int(total * val_split)

        if total >= 3 and test_count == 0 and test_split > 0:
            test_count = 1
        if total >= 3 and val_count == 0 and val_split > 0:
            val_count = 1

        if (test_count + val_count) >= total and total > 1:
            test_count = max(0, test_count - 1)

        test_paths = paths[:test_count]
        val_paths = paths[test_count:test_count + val_count]
        train_paths = paths[test_count + val_count:] or paths

        split_map["train"][class_name].extend(train_paths)
        split_map["val"][class_name].extend(val_paths)
        split_map["test"][class_name].extend(test_paths)

    return split_map


def write_split_dataset(split_map, output_dir: Path, copy_mode: bool):
    ensure_clean_dir(output_dir)
    for split_name, class_map in split_map.items():
        for class_name, paths in class_map.items():
            for index, path in enumerate(paths):
                destination = output_dir / split_name / class_name / f"{index:06d}{path.suffix.lower()}"
                materialize_file(path, destination, copy_mode)


def export_hf_dataset(dataset_id: str, hf_split: str, image_column: str, label_column: str, export_root: Path):
    try:
        from datasets import load_dataset
    except Exception as exc:
        raise SystemExit(
            "Hugging Face export requires 'datasets' and 'pillow'. Install them first."
        ) from exc

    dataset = load_dataset(dataset_id, split=hf_split)
    if image_column not in dataset.column_names:
        raise ValueError(f"Image column '{image_column}' not found in dataset columns: {dataset.column_names}")
    if label_column not in dataset.column_names:
        raise ValueError(f"Label column '{label_column}' not found in dataset columns: {dataset.column_names}")

    label_feature = dataset.features.get(label_column)
    label_names = None
    if hasattr(label_feature, "names") and label_feature.names:
        label_names = label_feature.names

    ensure_clean_dir(export_root)
    for index, row in enumerate(dataset):
        label_value = row[label_column]
        if label_names is not None and isinstance(label_value, int) and label_value < len(label_names):
            class_name = str(label_names[label_value])
        else:
            class_name = str(label_value)
        class_name = class_name.replace("/", "_").strip()
        image = row[image_column]
        destination = export_root / class_name / f"hf_{index:07d}.jpg"
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, format="JPEG", quality=95)


def print_summary(output_dir: Path):
    print(f"Prepared dataset at {output_dir}")
    for split in ("train", "val", "test"):
        split_dir = output_dir / split
        if not split_dir.exists():
            print(f"  {split}: 0")
            continue
        count = sum(1 for path in split_dir.rglob("*") if path.is_file())
        print(f"  {split}: {count}")


def main():
    args = parse_args()
    working_source = args.source_dir

    if args.hf_dataset:
        hf_export_dir = args.output_dir / "_hf_export"
        export_hf_dataset(
            dataset_id=args.hf_dataset,
            hf_split=args.hf_split,
            image_column=args.hf_image_column,
            label_column=args.hf_label_column,
            export_root=hf_export_dir,
        )
        working_source = hf_export_dir

    if working_source is None:
        raise ValueError("Provide --source-dir or --hf-dataset.")
    if not working_source.exists():
        raise FileNotFoundError(f"Source folder not found: {working_source}")

    samples = list_class_images(working_source)
    split_map = split_samples(samples, args.val_split, args.test_split, args.seed)
    write_split_dataset(split_map, args.output_dir, args.copy)
    print_summary(args.output_dir)


if __name__ == "__main__":
    main()
