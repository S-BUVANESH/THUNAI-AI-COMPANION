from pathlib import Path
from datasets import load_dataset

from disease_bridge import PLANT_VILLAGE_ID_TO_LABEL

root = Path("TEST_IMAGES")
root.mkdir(parents=True, exist_ok=True)

# Map app buckets to PlantVillage classes.
CLASS_MAP = {
    "Bacterial_Blight": ["Tomato___Bacterial_spot", "Pepper,_bell___Bacterial_spot"],
    "Healthy": ["Tomato___healthy", "Potato___healthy", "Corn_(maize)___healthy"],
    "Leaf_Curl": ["Tomato___Tomato_Yellow_Leaf_Curl_Virus"],
    "Leaf_Spot": ["Tomato___Septoria_leaf_spot", "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot"],
    "Powdery_Mildew": ["Squash___Powdery_mildew", "Cherry_(including_sour)___Powdery_mildew"],
    "Rust": ["Corn_(maize)___Common_rust", "Apple___Cedar_apple_rust"],
}

label_to_id = {
    name: int(idx)
    for idx, name in PLANT_VILLAGE_ID_TO_LABEL.items()
}

wanted_ids = {}
for bucket, names in CLASS_MAP.items():
    ids = [label_to_id[n] for n in names if n in label_to_id]
    if not ids:
        raise RuntimeError(f"No labels found for {bucket}: {names}")
    wanted_ids[bucket] = set(ids)

for bucket in CLASS_MAP:
    out_dir = root / bucket
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("sample_*.JPG"):
        old.unlink(missing_ok=True)

saved = {k: 0 for k in CLASS_MAP}
target_per_bucket = 2

ds = load_dataset("dpdl-benchmark/plant_village", split="train", streaming=True)

for row in ds:
    label_id = int(row["label"])
    for bucket, id_set in wanted_ids.items():
        if saved[bucket] >= target_per_bucket:
            continue
        if label_id in id_set:
            img = row["image"].convert("RGB")
            out_file = root / bucket / f"sample_{saved[bucket] + 1}.JPG"
            img.save(out_file, format="JPEG", quality=95)
            saved[bucket] += 1

    if all(v >= target_per_bucket for v in saved.values()):
        break

missing = [k for k, v in saved.items() if v < target_per_bucket]
if missing:
    raise RuntimeError(f"Could not fill all buckets. Missing: {missing}. Saved: {saved}")

for bucket, count in saved.items():
    print(f"{bucket}: {count} real images")
