import { mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { DatabaseSync } from "node:sqlite";
import type {
  CropSwitchHistoryEntry,
  DiseaseModelChoice,
  CropSwitchPredictionResult,
  DiseaseAdvisory,
  DiseaseHistoryEntry,
  DiseasePrediction,
  DiseaseSummary,
} from "@shared/api";

const databasePath = resolve(process.cwd(), "server", "data", "thunai.sqlite");
mkdirSync(dirname(databasePath), { recursive: true });

const db = new DatabaseSync(databasePath);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS disease_predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    crop_hint TEXT,
    requested_model TEXT NOT NULL DEFAULT 'auto',
    predicted_label TEXT NOT NULL,
    confidence REAL NOT NULL,
    model_mode TEXT NOT NULL,
    image_digest TEXT NOT NULL,
    advisory_json TEXT,
    raw_result_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS crop_switch_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    district TEXT NOT NULL,
    current_crop TEXT NOT NULL,
    season TEXT NOT NULL,
    soil_type TEXT NOT NULL,
    rainfall REAL NOT NULL,
    recommendation TEXT NOT NULL,
    confidence REAL NOT NULL,
    top_crop TEXT NOT NULL,
    performance_gap REAL NOT NULL,
    yield_gap REAL NOT NULL,
    raw_result_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

function ensureColumn(tableName: string, columnName: string, definition: string) {
  const columns = db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as Array<Record<string, unknown>>;
  const exists = columns.some((column) => String(column.name) === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

ensureColumn(
  "disease_predictions",
  "requested_model",
  "TEXT NOT NULL DEFAULT 'auto'",
);

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function saveDiseasePrediction(
  filename: string,
  cropHint: string,
  requestedModel: DiseaseModelChoice,
  prediction: DiseasePrediction,
): void {
  const createdAt = new Date().toISOString();
  const statement = db.prepare(`
    INSERT INTO disease_predictions (
      filename,
      crop_hint,
      requested_model,
      predicted_label,
      confidence,
      model_mode,
      image_digest,
      advisory_json,
      raw_result_json,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  statement.run(
    filename,
    cropHint,
    requestedModel,
    prediction.predicted_label,
    prediction.confidence,
    prediction.model_status.mode,
    prediction.image_digest,
    JSON.stringify(prediction.advisory),
    JSON.stringify(prediction),
    createdAt,
  );
}

export function listDiseasePredictions(limit = 6): DiseaseHistoryEntry[] {
  const statement = db.prepare(`
    SELECT
      id,
      filename,
      crop_hint,
      requested_model,
      predicted_label,
      confidence,
      model_mode,
      advisory_json,
      created_at
    FROM disease_predictions
    ORDER BY datetime(created_at) DESC
    LIMIT ?
  `);

  const rows = statement.all(limit) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: Number(row.id),
    filename: String(row.filename ?? ""),
    crop_hint: String(row.crop_hint ?? ""),
    requested_model: String(row.requested_model ?? "auto") as DiseaseModelChoice,
    predicted_label: String(row.predicted_label ?? ""),
    confidence: Number(row.confidence ?? 0),
    model_mode: String(row.model_mode ?? ""),
    created_at: String(row.created_at ?? ""),
    advisory: safeParse<DiseaseAdvisory | null>(
      typeof row.advisory_json === "string" ? row.advisory_json : null,
      null,
    ),
  }));
}

export function getDiseaseSummary(): DiseaseSummary {
  const countRow = db
    .prepare("SELECT COUNT(*) AS total FROM disease_predictions")
    .get() as Record<string, unknown>;
  const topDiseaseRow = db
    .prepare(`
      SELECT predicted_label, COUNT(*) AS total
      FROM disease_predictions
      GROUP BY predicted_label
      ORDER BY total DESC, predicted_label ASC
      LIMIT 1
    `)
    .get() as Record<string, unknown> | undefined;
  const latestRow = db
    .prepare(`
      SELECT created_at
      FROM disease_predictions
      ORDER BY datetime(created_at) DESC
      LIMIT 1
    `)
    .get() as Record<string, unknown> | undefined;

  return {
    total_scans: Number(countRow.total ?? 0),
    top_disease: topDiseaseRow?.predicted_label
      ? String(topDiseaseRow.predicted_label)
      : null,
    latest_scan_at: latestRow?.created_at ? String(latestRow.created_at) : null,
  };
}

export function saveCropSwitchRun(
  request: {
    district: string;
    current_crop: string;
    season: string;
    soil_type: string;
    rainfall: number;
  },
  result: CropSwitchPredictionResult,
): void {
  const createdAt = new Date().toISOString();
  const topCrop =
    result.recommendations[0]?.crop ?? result.current_crop_analysis.crop;

  const statement = db.prepare(`
    INSERT INTO crop_switch_runs (
      district,
      current_crop,
      season,
      soil_type,
      rainfall,
      recommendation,
      confidence,
      top_crop,
      performance_gap,
      yield_gap,
      raw_result_json,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  statement.run(
    request.district,
    request.current_crop,
    request.season,
    request.soil_type,
    request.rainfall,
    result.recommendation,
    result.confidence,
    topCrop,
    result.performance_gap,
    result.yield_gap,
    JSON.stringify(result),
    createdAt,
  );
}

export function listCropSwitchRuns(limit = 8): CropSwitchHistoryEntry[] {
  const statement = db.prepare(`
    SELECT
      id,
      district,
      current_crop,
      season,
      soil_type,
      rainfall,
      recommendation,
      confidence,
      top_crop,
      performance_gap,
      yield_gap,
      created_at
    FROM crop_switch_runs
    ORDER BY datetime(created_at) DESC
    LIMIT ?
  `);

  const rows = statement.all(limit) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: Number(row.id),
    district: String(row.district ?? ""),
    current_crop: String(row.current_crop ?? ""),
    season: String(row.season ?? ""),
    soil_type: String(row.soil_type ?? ""),
    rainfall: Number(row.rainfall ?? 0),
    recommendation: String(row.recommendation ?? ""),
    confidence: Number(row.confidence ?? 0),
    top_crop: String(row.top_crop ?? ""),
    performance_gap: Number(row.performance_gap ?? 0),
    yield_gap: Number(row.yield_gap ?? 0),
    created_at: String(row.created_at ?? ""),
  }));
}
