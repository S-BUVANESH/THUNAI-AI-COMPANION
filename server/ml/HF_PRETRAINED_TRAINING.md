# THUNAI Hugging Face Transfer Training

This guide gives you runnable code paths for:

- Creating a split dataset (train/val/test)
- Training a custom CNN (existing THUNAI trainer)
- Training a pretrained Hugging Face model

## 1) Install Packages (Colab)

```bash
!python -m pip install --upgrade pip
!python -m pip install torch torchvision pillow numpy
!python -m pip install transformers datasets evaluate accelerate
```

## 2) Prepare Dataset

If you already have class folders:

```bash
!python prepare_disease_dataset.py \
  --source-dir /content/data/raw_dataset \
  --output-dir /content/data/disease_splits \
  --val-split 0.2 \
  --test-split 0.1
```

If you want to pull from a Hugging Face dataset first:

```bash
!python prepare_disease_dataset.py \
  --hf-dataset dpdl-benchmark/plant_village \
  --hf-split train \
  --hf-image-column image \
  --hf-label-column label \
  --output-dir /content/data/disease_splits \
  --val-split 0.2 \
  --test-split 0.1
```

Output layout:

```text
/content/data/disease_splits/
  train/<class_name>/*.jpg
  val/<class_name>/*.jpg
  test/<class_name>/*.jpg
```

## 3) Train Custom CNN (THUNAI)

```bash
!python train_disease_cnn.py \
  --dataset /content/data/disease_splits/train \
  --output-dir ./models \
  --model-type custom-cnn \
  --epochs 20 \
  --batch-size 32 \
  --learning-rate 0.001
```

## 4) Train Pretrained Hugging Face Model

```bash
!python train_disease_hf.py \
  --dataset /content/data/disease_splits \
  --output-dir ./models/hf_transfer \
  --hf-model google/vit-base-patch16-224 \
  --epochs 6 \
  --batch-size 16 \
  --learning-rate 5e-5
```

Artifacts produced:

- models/hf_transfer/hf_model (Transformers model + processor)
- models/hf_transfer/hf_training_summary.json

## 5) Recommended Hugging Face Model IDs

- google/vit-base-patch16-224
- microsoft/resnet-50
- nvidia/mit-b0

Choose based on GPU memory and speed requirements.

## 6) Notes for THUNAI Integration

- Current THUNAI inference route uses native PyTorch model artifacts for custom-cnn and pretrained-transfer.
- The Hugging Face model from train_disease_hf.py is saved in Transformers format.
- If you want, add a new THUNAI inference mode that loads the Transformers model directly from models/hf_transfer/hf_model.
