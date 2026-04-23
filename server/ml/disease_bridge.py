import base64
import hashlib
import importlib.util
import json
import random
import sys
from io import BytesIO
from pathlib import Path

import numpy as np

from disease_cnn import DEFAULT_IMAGE_SIZE, DEFAULT_MEAN, DEFAULT_STD, create_model


MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_VARIANTS = {
    "pretrained-transfer": {
        "label": "Pretrained Transfer",
        "description": "A transfer-learning path built on a pretrained image backbone and fine-tuned for plant disease classes.",
        "framework": "PyTorch Transfer Learning",
        "weights": MODEL_DIR / "plant_disease_transfer.pt",
        "classes": MODEL_DIR / "plant_disease_transfer_classes.json",
        "metrics": MODEL_DIR / "plant_disease_transfer_metrics.json",
    },
    "custom-cnn": {
        "label": "Custom CNN",
        "description": "A custom convolutional network trained from scratch for this project.",
        "framework": "PyTorch Custom CNN",
        "weights": MODEL_DIR / "plant_disease_cnn.pt",
        "classes": MODEL_DIR / "plant_disease_cnn_classes.json",
        "metrics": MODEL_DIR / "plant_disease_cnn_metrics.json",
    },
}
LEGACY_VARIANT_FILES = {
    "custom-cnn": {
        "classes": [MODEL_DIR / "plant_disease_classes.json"],
        "metrics": [MODEL_DIR / "plant_disease_metrics.json"],
    },
}
MODEL_PRIORITY = ["pretrained-transfer", "custom-cnn"]
MODEL_SEED_OFFSETS = {
    "auto": 0,
    "pretrained-transfer": 137,
    "custom-cnn": 281,
}

CROP_HINT_ALIASES = {
    "maize": ["corn (maize)", "corn maize"],
    "chilli": ["pepper bell", "pepper, bell"],
    "pepper": ["pepper bell", "pepper, bell"],
    "capsicum": ["pepper bell", "pepper, bell"],
    "tomato": ["tomato"],
    "rice": ["rice"],
    "cotton": ["cotton"],
    "groundnut": ["groundnut", "peanut"],
    "turmeric": ["turmeric"],
    "banana": ["banana"],
}

# Canonical PlantVillage id -> class label mapping used by dpdl-benchmark/plant_village.
PLANT_VILLAGE_ID_TO_LABEL = {
    "0": "Apple___Apple_scab",
    "1": "Apple___Black_rot",
    "2": "Apple___Cedar_apple_rust",
    "3": "Apple___healthy",
    "4": "Blueberry___healthy",
    "5": "Cherry_(including_sour)___Powdery_mildew",
    "6": "Cherry_(including_sour)___healthy",
    "7": "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "8": "Corn_(maize)___Common_rust",
    "9": "Corn_(maize)___Northern_Leaf_Blight",
    "10": "Corn_(maize)___healthy",
    "11": "Grape___Black_rot",
    "12": "Grape___Esca_(Black_Measles)",
    "13": "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    "14": "Grape___healthy",
    "15": "Orange___Haunglongbing_(Citrus_greening)",
    "16": "Peach___Bacterial_spot",
    "17": "Peach___healthy",
    "18": "Pepper,_bell___Bacterial_spot",
    "19": "Pepper,_bell___healthy",
    "20": "Potato___Early_blight",
    "21": "Potato___Late_blight",
    "22": "Potato___healthy",
    "23": "Raspberry___healthy",
    "24": "Soybean___healthy",
    "25": "Squash___Powdery_mildew",
    "26": "Strawberry___Leaf_scorch",
    "27": "Strawberry___healthy",
    "28": "Tomato___Bacterial_spot",
    "29": "Tomato___Early_blight",
    "30": "Tomato___Late_blight",
    "31": "Tomato___Leaf_Mold",
    "32": "Tomato___Septoria_leaf_spot",
    "33": "Tomato___Spider_mites Two-spotted_spider_mite",
    "34": "Tomato___Target_Spot",
    "35": "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "36": "Tomato___Tomato_mosaic_virus",
    "37": "Tomato___healthy",
}

TORCH_AVAILABLE = importlib.util.find_spec("torch") is not None
PIL_AVAILABLE = importlib.util.find_spec("PIL") is not None
TORCHVISION_AVAILABLE = importlib.util.find_spec("torchvision") is not None


CLASS_CATALOG = {
    "Healthy": {
        "severity": "Low",
        "overview": "The scan does not show a strong disease signature.",
        "why": "Leaf texture and color patterns are closest to the healthy reference class.",
        "immediate_actions": [
            "Continue field scouting for new lesions over the next 3-5 days.",
            "Maintain balanced irrigation and avoid over-fertilization.",
        ],
        "preventive_actions": [
            "Use clean tools and remove heavily damaged leaves early.",
            "Keep spacing and airflow strong to reduce moisture stress.",
        ],
    },
    "Bacterial Blight": {
        "severity": "High",
        "overview": "The model sees water-soaked or streaking damage consistent with bacterial blight.",
        "why": "The strongest signals are elongated lesion patterns and rapid tissue discoloration.",
        "immediate_actions": [
            "Isolate heavily affected plants or rows where possible.",
            "Avoid overhead irrigation until the field is reassessed.",
            "Consult the nearest agri extension officer for crop-specific bactericide guidance.",
        ],
        "preventive_actions": [
            "Use disease-free seed or planting material in the next cycle.",
            "Reduce standing moisture and sanitize tools between plots.",
        ],
    },
    "Brown Spot": {
        "severity": "Medium",
        "overview": "The image matches circular necrotic spotting patterns often seen in brown spot.",
        "why": "Small dark lesions with yellow margins are driving the prediction.",
        "immediate_actions": [
            "Remove the most infected leaves and avoid leaf wetness at night.",
            "Review potassium balance and general nutrient stress in the field.",
        ],
        "preventive_actions": [
            "Strengthen seed treatment and residue management.",
            "Monitor humidity-prone sections of the field more frequently.",
        ],
    },
    "Leaf Smut": {
        "severity": "Medium",
        "overview": "The scan resembles narrow black or brown streaking associated with leaf smut.",
        "why": "Linear lesions and darkened tissue clusters are the main cues.",
        "immediate_actions": [
            "Scout neighboring plants for spread before symptoms intensify.",
            "Avoid dense canopy moisture by improving spacing and airflow where possible.",
        ],
        "preventive_actions": [
            "Rotate crops and destroy infected residue after harvest.",
            "Use balanced nitrogen management to reduce soft, disease-prone growth.",
        ],
    },
    "Powdery Mildew": {
        "severity": "Medium",
        "overview": "White dusty growth patterns in the image align with powdery mildew.",
        "why": "Surface-level powdering and diffuse chlorosis are elevating this class.",
        "immediate_actions": [
            "Prune crowded foliage and remove the worst infected leaves.",
            "Use approved sulfur or bio-fungicide options appropriate for the crop stage.",
        ],
        "preventive_actions": [
            "Keep canopy humidity low and avoid excessive shade.",
            "Repeat scouting after 48-72 hours to confirm containment.",
        ],
    },
    "Rust": {
        "severity": "Medium",
        "overview": "Orange-brown pustules suggest a rust-type infection.",
        "why": "Raised rust-colored specks and clustered lesions are the main contributors.",
        "immediate_actions": [
            "Separate seed lots or harvested material from affected plants.",
            "Use crop-approved fungicide or bio-control support after local guidance.",
        ],
        "preventive_actions": [
            "Improve airflow and reduce prolonged humidity around foliage.",
            "Clean volunteer plants and alternate hosts near the field.",
        ],
    },
    "Mosaic Virus": {
        "severity": "High",
        "overview": "Patchy light-dark mosaic patterns point toward a viral symptom cluster.",
        "why": "Uneven chlorosis and leaf distortion are driving the prediction.",
        "immediate_actions": [
            "Rogue the most affected plants quickly to limit spread.",
            "Inspect vector pressure such as whiteflies or aphids in surrounding plants.",
        ],
        "preventive_actions": [
            "Use resistant varieties where available.",
            "Tighten insect-vector management and weed control near field edges.",
        ],
    },
    "Leaf Curl": {
        "severity": "High",
        "overview": "Curling and deformation patterns are consistent with leaf-curl-type stress.",
        "why": "Shape distortion and vein-related stress signals dominate the prediction.",
        "immediate_actions": [
            "Check vector insects immediately and isolate severe cases.",
            "Avoid moving tools from infected blocks into clean rows.",
        ],
        "preventive_actions": [
            "Use certified seedlings and manage vectors early in the season.",
            "Remove volunteer hosts around the farm boundary.",
        ],
    },
    "Anthracnose": {
        "severity": "Medium",
        "overview": "Sunken dark lesions in the image resemble anthracnose-like damage.",
        "why": "The model is reacting to necrotic spotting and collapse around lesion centers.",
        "immediate_actions": [
            "Remove infected plant material and avoid splashing water.",
            "Improve drainage and reduce leaf wetness duration.",
        ],
        "preventive_actions": [
            "Use clean planting stock and rotate susceptible crops.",
            "Apply crop-appropriate protective sprays only when recommended locally.",
        ],
    },
}

DEFAULT_CLASS_NAMES = list(CLASS_CATALOG.keys())
MODEL_CACHE = {}


def humanize_disease_label(label):
    if "___" in label:
        crop, disease = label.split("___", 1)
        crop = crop.replace("_", " ").replace(",", "").strip()
        disease = disease.replace("_", " ").strip()
        return f"{crop} - {disease}"

    return label.replace("_", " ").strip()


def normalize_class_names(class_names):
    if not isinstance(class_names, list):
        return DEFAULT_CLASS_NAMES

    if class_names and all(str(name) in PLANT_VILLAGE_ID_TO_LABEL for name in class_names):
        return [humanize_disease_label(PLANT_VILLAGE_ID_TO_LABEL[str(name)]) for name in class_names]

    return [humanize_disease_label(str(name)) for name in class_names]


def normalized_text(value):
    return str(value).strip().lower().replace("_", " ").replace(",", "")


def crop_hint_candidates(crop_hint):
    hint = normalized_text(crop_hint)
    candidates = [hint]
    candidates.extend(CROP_HINT_ALIASES.get(hint, []))
    return [candidate for candidate in candidates if candidate]


def label_matches_crop_hint(label, crop_hint):
    if not crop_hint:
        return True

    label_text = normalized_text(label)
    crop_prefix = label_text.split(" - ", 1)[0]
    if crop_prefix == normalized_text(crop_hint):
        return True

    for candidate in crop_hint_candidates(crop_hint):
        if crop_prefix == candidate:
            return True
        if candidate in crop_prefix:
            return True
    return False


def normalize_requested_mode(value):
    if value in {"auto", "pretrained-transfer", "custom-cnn"}:
        return value
    return "auto"


def resolve_variant_file(model_key, field):
    variant = MODEL_VARIANTS[model_key]
    primary_path = variant[field]
    candidates = [primary_path]
    candidates.extend(LEGACY_VARIANT_FILES.get(model_key, {}).get(field, []))

    for path in candidates:
        if path.exists():
            return path

    return primary_path


def variant_file_status(model_key):
    return {
        "weights": resolve_variant_file(model_key, "weights").exists(),
        "classes": resolve_variant_file(model_key, "classes").exists(),
        "metrics": resolve_variant_file(model_key, "metrics").exists(),
    }


def variant_dependencies_ready(model_key):
    if not (TORCH_AVAILABLE and PIL_AVAILABLE):
        return False
    if model_key == "pretrained-transfer" and not TORCHVISION_AVAILABLE:
        return False
    return True


def is_variant_available(model_key):
    files = variant_file_status(model_key)
    return (
        variant_dependencies_ready(model_key)
        and files["weights"]
        and files["classes"]
    )


def load_class_names(model_key=None):
    if model_key in MODEL_VARIANTS:
        class_path = resolve_variant_file(model_key, "classes")
        if class_path.exists():
            with open(class_path, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
            if isinstance(payload, dict):
                return normalize_class_names(payload.get("class_names", DEFAULT_CLASS_NAMES))
            if isinstance(payload, list):
                return normalize_class_names(payload)

    for fallback_key in MODEL_PRIORITY:
        class_path = resolve_variant_file(fallback_key, "classes")
        if class_path.exists():
            with open(class_path, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
            if isinstance(payload, dict):
                return normalize_class_names(payload.get("class_names", DEFAULT_CLASS_NAMES))
            if isinstance(payload, list):
                return normalize_class_names(payload)

    return DEFAULT_CLASS_NAMES


def best_available_mode():
    for model_key in MODEL_PRIORITY:
        if is_variant_available(model_key):
            return model_key
    return "demo-fallback"


def resolve_mode(requested_mode):
    requested_mode = normalize_requested_mode(requested_mode)
    if requested_mode == "auto":
        return best_available_mode()
    if is_variant_available(requested_mode):
        return requested_mode
    return "demo-fallback"


def option_status(model_key):
    variant = MODEL_VARIANTS[model_key]
    files = variant_file_status(model_key)

    if is_variant_available(model_key):
        reason = f"{variant['label']} is ready for inference."
    elif not TORCH_AVAILABLE or not PIL_AVAILABLE:
        reason = "Torch and Pillow must be installed before this path can run."
    elif model_key == "pretrained-transfer" and not TORCHVISION_AVAILABLE:
        reason = "torchvision is required for the transfer-learning path."
    elif not files["weights"] or not files["classes"]:
        reason = "Weights and class metadata are still missing for this path."
    else:
        reason = "This path is not ready yet."

    return {
        "key": model_key,
        "label": variant["label"],
        "description": variant["description"],
        "available": is_variant_available(model_key),
        "framework": variant["framework"],
        "reason": reason,
        "model_files": files,
    }


def model_status(requested_mode="auto"):
    requested_mode = normalize_requested_mode(requested_mode)
    resolved_mode = resolve_mode(requested_mode)
    best_mode = best_available_mode()

    active_key = None
    if resolved_mode in MODEL_VARIANTS:
        active_key = resolved_mode
    elif requested_mode in MODEL_VARIANTS:
        active_key = requested_mode
    elif best_mode in MODEL_VARIANTS:
        active_key = best_mode

    files = (
        variant_file_status(active_key)
        if active_key in MODEL_VARIANTS
        else {"weights": False, "classes": False, "metrics": False}
    )

    if resolved_mode == "demo-fallback":
        if requested_mode == "auto":
            reason = (
                "No trained THUNAI disease model is ready yet. THUNAI is using a deterministic fallback until at least one disease model is trained."
            )
        else:
            label = MODEL_VARIANTS[requested_mode]["label"]
            reason = (
                f"{label} is selected, but its dependencies or weights are not ready. THUNAI is using a deterministic fallback proxy for now."
            )
    elif requested_mode == "auto":
        reason = (
            f"Auto mode selected {MODEL_VARIANTS[resolved_mode]['label']} because it is the best available trained model."
        )
    else:
        reason = f"{MODEL_VARIANTS[resolved_mode]['label']} is active for this scan."

    return {
        "ready": resolved_mode != "demo-fallback",
        "mode": resolved_mode,
        "requested_mode": requested_mode,
        "best_available_mode": best_mode,
        "reason": reason,
        "framework": (
            MODEL_VARIANTS[resolved_mode]["framework"]
            if resolved_mode in MODEL_VARIANTS
            else "Deterministic fallback"
        ),
        "dependencies": {
            "torch": TORCH_AVAILABLE,
            "pillow": PIL_AVAILABLE,
            "torchvision": TORCHVISION_AVAILABLE,
        },
        "model_files": files,
        "image_size": DEFAULT_IMAGE_SIZE,
        "class_names": load_class_names(active_key),
        "available_models": [option_status(model_key) for model_key in MODEL_PRIORITY],
    }


def decode_image_bytes(image_data_url):
    if "," not in image_data_url:
        raise ValueError("Invalid image payload. Expected a data URL.")
    _, encoded = image_data_url.split(",", 1)
    return base64.b64decode(encoded)


def build_advisory(label):
    details = CLASS_CATALOG.get(label)
    if details is None:
        return {
            "severity": "Medium",
            "overview": f"The scan is leaning toward {label}.",
            "why": "A trained class was available, but no treatment card is mapped yet.",
            "immediate_actions": [
                "Recheck the leaf in better lighting before treating the whole field.",
                "Consult a local agronomist or extension worker for crop-specific guidance.",
            ],
            "preventive_actions": [
                "Keep infected material separate from healthy plots.",
                "Continue regular scouting to confirm spread direction.",
            ],
        }
    return details


def ranked_fallback_predictions(filename, digest, class_names, requested_mode, crop_hint=""):
    normalized = filename.lower()
    keyword_map = {
        "healthy": "Healthy",
        "blight": "Bacterial Blight",
        "brown": "Brown Spot",
        "smut": "Leaf Smut",
        "mildew": "Powdery Mildew",
        "rust": "Rust",
        "mosaic": "Mosaic Virus",
        "curl": "Leaf Curl",
        "anthracnose": "Anthracnose",
        "spot": "Brown Spot",
    }

    eligible_classes = [
        label for label in class_names if label_matches_crop_hint(label, crop_hint)
    ]
    if not eligible_classes:
        eligible_classes = class_names

    matched = next(
        (
            label
            for keyword, label in keyword_map.items()
            if keyword in normalized and label in eligible_classes
        ),
        None,
    )
    seed = int(digest[:8], 16) + MODEL_SEED_OFFSETS[requested_mode]
    if matched is None:
        matched = eligible_classes[seed % len(eligible_classes)]

    randomizer = random.Random(seed)
    remaining = [label for label in eligible_classes if label != matched]
    randomizer.shuffle(remaining)
    ordered = [matched, *remaining]

    requested_boost = {
        "auto": 0.0,
        "pretrained-transfer": 0.04,
        "custom-cnn": -0.02,
    }
    base_confidence = 0.72 + ((seed % 7) * 0.02) + requested_boost[requested_mode]
    if any(key in normalized for key in keyword_map):
        base_confidence += 0.07

    predictions = []
    for index, label in enumerate(ordered[:3]):
        predictions.append(
            {
                "label": label,
                "confidence": round(max(0.16, base_confidence - (index * 0.13)), 4),
            }
        )
    return predictions


def load_trained_model(model_key):
    if model_key in MODEL_CACHE:
        return MODEL_CACHE[model_key]

    if model_key not in MODEL_VARIANTS:
        raise RuntimeError(f"Unsupported trained model key: {model_key}")
    if not is_variant_available(model_key):
        raise RuntimeError(f"{model_key} assets are not available.")

    import torch

    weights_path = resolve_variant_file(model_key, "weights")
    checkpoint = torch.load(weights_path, map_location="cpu")
    class_names = checkpoint.get("class_names") if isinstance(checkpoint, dict) else None
    if not class_names:
        class_names = load_class_names(model_key)
    else:
        class_names = normalize_class_names(class_names)
    image_size = (
        checkpoint.get("image_size", DEFAULT_IMAGE_SIZE)
        if isinstance(checkpoint, dict)
        else DEFAULT_IMAGE_SIZE
    )
    state_dict = checkpoint.get("model_state") if isinstance(checkpoint, dict) else checkpoint
    model = create_model(
        model_type=model_key,
        num_classes=len(class_names),
        image_size=image_size,
        pretrained=False,
    )
    model.load_state_dict(state_dict)
    model.eval()
    MODEL_CACHE[model_key] = (model, class_names, image_size)
    return MODEL_CACHE[model_key]


def preprocess_image(image_bytes, image_size):
    import torch
    from PIL import Image

    image = Image.open(BytesIO(image_bytes)).convert("RGB").resize((image_size, image_size))
    array = np.asarray(image, dtype=np.float32) / 255.0
    mean = np.asarray(DEFAULT_MEAN, dtype=np.float32)
    std = np.asarray(DEFAULT_STD, dtype=np.float32)
    array = (array - mean) / std
    tensor = torch.from_numpy(np.transpose(array, (2, 0, 1))).unsqueeze(0)
    return tensor


def analyze_with_trained_model(image_bytes, model_key, crop_hint=""):
    import torch

    model, class_names, image_size = load_trained_model(model_key)
    tensor = preprocess_image(image_bytes, image_size)

    with torch.no_grad():
        logits = model(tensor)
        probabilities = torch.softmax(logits, dim=1).cpu().numpy()[0]

    ranked_indices = np.argsort(probabilities)[::-1]
    if crop_hint:
        eligible_indices = [
            index
            for index, label in enumerate(class_names)
            if label_matches_crop_hint(label, crop_hint)
        ]
        if eligible_indices:
            eligible_probs = probabilities[eligible_indices]
            # If crop-filtered scores are extremely weak, keep global ranking.
            # This avoids showing 0%-confidence predictions for the hinted crop
            # when the model strongly believes another crop class.
            if float(np.max(eligible_probs)) >= 0.001:
                ranked_indices = [
                    eligible_indices[int(index)]
                    for index in np.argsort(eligible_probs)[::-1]
                ]

    return [
        {
            "label": class_names[int(index)],
            "confidence": round(float(probabilities[int(index)]), 4),
        }
        for index in ranked_indices[:3]
    ]


def build_response(predictions, crop_hint, digest, requested_mode):
    status = model_status(requested_mode)
    primary = predictions[0]
    label = primary["label"]
    advisory = build_advisory(label)
    return {
        "predicted_label": label,
        "confidence": round(float(primary["confidence"]) * 100, 1),
        "crop_hint": crop_hint,
        "requested_model": requested_mode,
        "image_digest": digest[:16],
        "top_predictions": [
            {
                "label": item["label"],
                "confidence": round(float(item["confidence"]) * 100, 1),
            }
            for item in predictions
        ],
        "advisory": advisory,
        "model_status": status,
    }


def handle_analyze(payload):
    image_name = str(payload.get("image_name", "uploaded-image"))
    crop_hint = str(payload.get("crop_hint", "")).strip()
    requested_mode = normalize_requested_mode(payload.get("requested_model", "auto"))
    image_bytes = decode_image_bytes(str(payload.get("image_data_url", "")))
    digest = hashlib.sha1(image_bytes).hexdigest()
    status = model_status(requested_mode)

    if status["mode"] in MODEL_VARIANTS:
        predictions = analyze_with_trained_model(image_bytes, status["mode"], crop_hint)
    else:
        predictions = ranked_fallback_predictions(
            image_name,
            digest,
            status["class_names"],
            requested_mode,
            crop_hint,
        )

    return build_response(predictions, crop_hint, digest, requested_mode)


def main():
    request = json.loads(sys.stdin.read() or "{}")
    action = request.get("action")
    payload = request.get("payload", {})

    if action == "status":
        response = model_status(payload.get("requested_model", "auto"))
    elif action == "analyze":
        response = handle_analyze(payload)
    else:
        raise ValueError(f"Unsupported action: {action}")

    json.dump(response, sys.stdout, ensure_ascii=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
