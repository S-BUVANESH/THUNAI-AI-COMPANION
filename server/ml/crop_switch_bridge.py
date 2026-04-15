import json
import os
import sys
from pathlib import Path


SOIL_PROFILES = {
    "Alluvial": {
        "N": 60,
        "P": 35,
        "K": 40,
        "ph": 7.0,
        "desc": "River-fed and fertile. Strong general productivity with good moisture retention.",
    },
    "Black": {
        "N": 45,
        "P": 30,
        "K": 50,
        "ph": 7.5,
        "desc": "Moisture-holding regur soil. Strong support for rain-fed and long-duration crops.",
    },
    "Red": {
        "N": 35,
        "P": 25,
        "K": 30,
        "ph": 6.5,
        "desc": "Well-drained and lighter. Better for pulses, oilseeds, and many dryland crops.",
    },
    "Laterite": {
        "N": 30,
        "P": 20,
        "K": 25,
        "ph": 5.5,
        "desc": "Leached under high rainfall. Needs stronger nutrient management.",
    },
    "Sandy": {
        "N": 20,
        "P": 15,
        "K": 20,
        "ph": 6.0,
        "desc": "Fast-draining and lower fertility. Works best with tight irrigation control.",
    },
    "Clay": {
        "N": 55,
        "P": 40,
        "K": 45,
        "ph": 7.2,
        "desc": "Nutrient-rich but heavy. Productive when drainage is managed well.",
    },
    "Loamy": {
        "N": 50,
        "P": 35,
        "K": 35,
        "ph": 6.8,
        "desc": "Balanced and versatile. Strong all-round soil for mixed crop planning.",
    },
}


WORKSPACE_ROOT = Path(
    os.environ.get(
        "THUNAI_WORKSPACE_ROOT",
        str(Path(__file__).resolve().parents[3]),
    )
)
WEBAPP_DIR = Path(
    os.environ.get("THUNAI_WEBAPP_DIR", str(WORKSPACE_ROOT / "webapp"))
)
MODEL_DIR = WEBAPP_DIR / "models"
ARTIFACT_PATH = MODEL_DIR / "crop_companion_artifact.pkl"
CONFIG_PATH = MODEL_DIR / "feature_config.json"

if str(WEBAPP_DIR) not in sys.path:
    sys.path.insert(0, str(WEBAPP_DIR))

from ml_engine import CropCompanionEngine  # noqa: E402


ENGINE = None


def load_engine():
    global ENGINE
    if ENGINE is None:
        if not ARTIFACT_PATH.exists():
            raise FileNotFoundError(
                f"Crop advisor artifact not found at {ARTIFACT_PATH}"
            )
        ENGINE = CropCompanionEngine.load(str(ARTIFACT_PATH))
    return ENGINE


def load_config():
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(f"Crop advisor config not found at {CONFIG_PATH}")

    with open(CONFIG_PATH, "r", encoding="utf-8") as handle:
        config = json.load(handle)

    return {
        "districts": config.get("districts", []),
        "crops": config.get("crops", []),
        "seasons": config.get("seasons", []),
        "soil_types": list(SOIL_PROFILES.keys()),
        "data_years": config.get("data_years", []),
        "limitations": config.get("limitations", []),
        "model_metrics": config.get("model_metrics", {}),
        "source_summary": config.get("source_summary", {}),
        "ensemble_weights": config.get("ensemble_weights", {}),
    }


def soil_snapshot(soil_type):
    return SOIL_PROFILES.get(soil_type, SOIL_PROFILES["Loamy"])


def handle_predict(payload):
    district = str(payload.get("district", "")).strip()
    current_crop = str(payload.get("current_crop", "")).strip()
    season = str(payload.get("season", "")).strip()
    soil_type = str(payload.get("soil_type", "Loamy")).strip() or "Loamy"
    rainfall = float(payload.get("rainfall", 900))

    if not district or not current_crop or not season:
        raise ValueError("district, current_crop, and season are required.")

    engine = load_engine()
    soil = soil_snapshot(soil_type)
    result = engine.recommend(
        district=district,
        current_crop=current_crop,
        season=season,
        rainfall=rainfall,
        soil_profile=soil,
        top_n=5,
    )

    result["input"] = {
        "district": district.upper(),
        "current_crop": current_crop.title(),
        "season": season,
        "soil_type": soil_type,
        "rainfall": rainfall,
    }
    result["soil_snapshot"] = soil
    return result


def main():
    request = json.loads(sys.stdin.read() or "{}")
    action = request.get("action")

    if action == "config":
        response = load_config()
    elif action == "predict":
        response = handle_predict(request.get("payload", {}))
    else:
        raise ValueError(f"Unsupported action: {action}")

    json.dump(response, sys.stdout, ensure_ascii=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
