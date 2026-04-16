# THUNAI Hugging Face Transfer Training

This guide gives you a Hugging Face-first retraining path for THUNAI disease models:

- export a split dataset from Hugging Face
- retrain the pretrained transfer model
- optionally train a Hugging Face transformer model

## 1) Install Packages (Colab)

```bash
!python -m pip install --upgrade pip
!python -m pip install torch torchvision pillow numpy
!python -m pip install transformers datasets evaluate accelerate
```

## 2) Prepare Dataset

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

## 3) Train the Transfer CNN used by THUNAI

```bash
!python train_disease_cnn.py \
  --dataset /content/data/disease_splits/train \
  --output-dir ./models \
  --model-type pretrained-transfer \
  --use-imagenet-weights \
  --epochs 16 \
  --batch-size 32 \
  --learning-rate 0.0003
```

## 4) Optional: Train Pretrained Hugging Face Model

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
