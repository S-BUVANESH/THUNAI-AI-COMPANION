from __future__ import annotations


DEFAULT_IMAGE_SIZE = 224
DEFAULT_MEAN = (0.485, 0.456, 0.406)
DEFAULT_STD = (0.229, 0.224, 0.225)

try:
    import torch
    from torch import nn
except Exception:  # pragma: no cover - optional dependency
    torch = None
    nn = None

try:
    from torchvision.models import ResNet18_Weights, resnet18
except Exception:  # pragma: no cover - optional dependency
    ResNet18_Weights = None
    resnet18 = None


if nn is not None:

    class LeafDiseaseCNN(nn.Module):
        def __init__(self, num_classes: int, image_size: int = DEFAULT_IMAGE_SIZE):
            super().__init__()
            self.image_size = image_size
            self.features = nn.Sequential(
                nn.Conv2d(3, 32, kernel_size=3, padding=1),
                nn.BatchNorm2d(32),
                nn.ReLU(inplace=True),
                nn.MaxPool2d(2),
                nn.Conv2d(32, 64, kernel_size=3, padding=1),
                nn.BatchNorm2d(64),
                nn.ReLU(inplace=True),
                nn.MaxPool2d(2),
                nn.Conv2d(64, 128, kernel_size=3, padding=1),
                nn.BatchNorm2d(128),
                nn.ReLU(inplace=True),
                nn.MaxPool2d(2),
                nn.Conv2d(128, 256, kernel_size=3, padding=1),
                nn.BatchNorm2d(256),
                nn.ReLU(inplace=True),
                nn.AdaptiveAvgPool2d((1, 1)),
            )
            self.classifier = nn.Sequential(
                nn.Flatten(),
                nn.Dropout(p=0.35),
                nn.Linear(256, 128),
                nn.ReLU(inplace=True),
                nn.Dropout(p=0.25),
                nn.Linear(128, num_classes),
            )

        def forward(self, inputs):
            features = self.features(inputs)
            return self.classifier(features)


    class TransferLeafDiseaseModel(nn.Module):
        def __init__(self, num_classes: int, pretrained: bool = False):
            super().__init__()
            if resnet18 is None:
                raise RuntimeError(
                    "torchvision is required to instantiate TransferLeafDiseaseModel."
                )

            weights = (
                ResNet18_Weights.DEFAULT
                if pretrained and ResNet18_Weights is not None
                else None
            )
            self.image_size = DEFAULT_IMAGE_SIZE
            self.backbone = resnet18(weights=weights)
            in_features = self.backbone.fc.in_features
            self.backbone.fc = nn.Linear(in_features, num_classes)

        def forward(self, inputs):
            return self.backbone(inputs)

else:

    class LeafDiseaseCNN:  # pragma: no cover - optional dependency
        def __init__(self, *args, **kwargs):
            raise RuntimeError(
                "PyTorch is required to instantiate LeafDiseaseCNN."
            )


    class TransferLeafDiseaseModel:  # pragma: no cover - optional dependency
        def __init__(self, *args, **kwargs):
            raise RuntimeError(
                "PyTorch and torchvision are required to instantiate TransferLeafDiseaseModel."
            )


def create_model(model_type: str, num_classes: int, image_size: int = DEFAULT_IMAGE_SIZE, pretrained: bool = False):
    if model_type == "custom-cnn":
        return LeafDiseaseCNN(num_classes=num_classes, image_size=image_size)
    if model_type == "pretrained-transfer":
        return TransferLeafDiseaseModel(num_classes=num_classes, pretrained=pretrained)
    raise ValueError(f"Unsupported model type: {model_type}")
