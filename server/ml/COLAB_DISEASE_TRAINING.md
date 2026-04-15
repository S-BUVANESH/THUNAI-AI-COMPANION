# THUNAI Disease CNN Training (Colab)

This guide trains both disease model paths used by THUNAI diagnostics:

- pretrained-transfer (ResNet18 transfer learning)
- custom-cnn (scratch CNN)

It is designed for Google Colab GPU and exports artifacts that THUNAI can load directly.

## 1) Prepare Dataset (folder-per-class)

Expected structure:

```text
dataset_root/
  Healthy/
    img1.jpg
    ...
  Brown Spot/
    img1.jpg
    ...
  Rust/
  Powdery Mildew/
  ...
```

THUNAI trainer reads class names from folder names.

## 2) Dataset Sources

Use one of the following and reshape into the folder-per-class layout above.

- Kaggle PlantVillage dataset family (multiple mirrors exist)
- Roboflow public plant disease datasets
- GitHub repositories that host PlantVillage subsets

Recommended for consistency: a PlantVillage variant with stable disease labels.

## 3) Colab Setup

In Colab:

1. Runtime -> Change runtime type -> GPU
2. Upload your dataset zip or mount Google Drive
3. Clone THUNAI repo branch containing disease ML scripts

Example setup cell:

```bash
!git clone <YOUR_THUNAI_REPO_URL>
%cd THUNAI.AI/server/ml
!python -m pip install --upgrade pip
!python -m pip install torch torchvision pillow numpy
```

If dataset zip is uploaded to Colab:

```bash
!mkdir -p /content/data
!unzip -q /content/<dataset>.zip -d /content/data
```

## 4) Train Both Models

Run from THUNAI.AI/server/ml:

```bash
!python train_both_disease_models.py \
  --dataset /content/data/<dataset_root> \
  --output-dir ./models \
  --epochs-transfer 12 \
  --epochs-custom 20 \
  --batch-size 32 \
  --learning-rate 0.001 \
  --val-split 0.2
```

Artifacts created in models/:

- plant_disease_transfer.pt
- plant_disease_transfer_classes.json
- plant_disease_transfer_metrics.json
- plant_disease_cnn.pt
- plant_disease_cnn_classes.json
- plant_disease_cnn_metrics.json

## 5) Copy Artifacts Back to THUNAI

Copy all six artifacts into:

- THUNAI.AI/server/ml/models

Once copied, THUNAI diagnostics automatically resolves model availability:

- requested pretrained-transfer -> uses transfer model
- requested custom-cnn -> uses custom model
- requested auto -> uses best available in priority order

## 6) Quick Validation

From THUNAI.AI:

```bash
pnpm typecheck
pnpm build
```

Then test disease status/analyze API routes for:

- requested_model=pretrained-transfer
- requested_model=custom-cnn
- requested_model=auto

## 7) Recommended Next Improvements

- Add augmentation (flip, rotate, color jitter) in train_disease_cnn.py
- Add early stopping and LR scheduling
- Log confusion matrix and per-class F1 in *_metrics.json
- Surface top-line metrics on diagnostics UI cards
