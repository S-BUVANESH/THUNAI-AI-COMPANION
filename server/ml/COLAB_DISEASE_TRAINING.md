# THUNAI Disease CNN Training (Colab)

This guide retrains the disease models from a Hugging Face dataset source and exports artifacts that THUNAI can load directly.

Primary path:

- Hugging Face PlantVillage-style dataset export
- pretrained-transfer retraining (recommended)
- custom-cnn retraining (optional)

## 1) Colab Setup

In Colab:

1. Runtime -> Change runtime type -> GPU
2. Clone the THUNAI repo branch containing disease ML scripts

Example setup cell:

```bash
!git clone <YOUR_THUNAI_REPO_URL>
%cd THUNAI.AI/server/ml
!python -m pip install --upgrade pip
!python -m pip install torch torchvision pillow numpy
```

## 2) Export Dataset from Hugging Face

Run from THUNAI.AI/server/ml:

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

## 3) Retrain the Transfer Model

```bash
!python train_both_disease_models.py \
  --dataset /content/data/disease_splits/train \
  --output-dir ./models \
  --skip-custom \
  --epochs-transfer 16 \
  --batch-size 32 \
  --learning-rate 0.0003 \
  --val-split 0.2
```

Artifacts created in models/:

- plant_disease_transfer.pt
- plant_disease_transfer_classes.json
- plant_disease_transfer_metrics.json

If you want a custom CNN backup as well, rerun the same command without `--skip-custom`.

## 4) Copy Artifacts Back to THUNAI

Copy the generated artifacts into:

- THUNAI.AI/server/ml/models

Once copied, THUNAI diagnostics automatically resolves model availability:

- requested pretrained-transfer -> uses transfer model
- requested custom-cnn -> uses custom model if you retrain it
- requested auto -> uses best available in priority order

## 5) Quick Validation

From THUNAI.AI:

```bash
pnpm typecheck
pnpm build
```

Then test disease status/analyze API routes for:

- requested_model=pretrained-transfer
- requested_model=custom-cnn
- requested_model=auto

## 6) Recommended Next Improvements

- Add augmentation (flip, rotate, color jitter) in train_disease_cnn.py
- Add early stopping and LR scheduling
- Log confusion matrix and per-class F1 in *_metrics.json
- Surface top-line metrics on diagnostics UI cards
