import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { Link } from "react-router-dom";
import type {
  DiseaseAnalyzeResponse,
  DiseaseHistoryEntry,
  DiseaseModelChoice,
  DiseaseModelStatus,
  DiseasePrediction,
  DiseaseSummary,
} from "@shared/api";
import { Button } from "@/components/ui/button";

const cropOptions = [
  "Tomato",
  "Rice",
  "Cotton",
  "Maize",
  "Banana",
  "Turmeric",
  "Groundnut",
  "Chilli",
];

export default function Diagnostics() {
  const [imageName, setImageName] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [cropHint, setCropHint] = useState("Tomato");
  const [selectedModel, setSelectedModel] = useState<DiseaseModelChoice>("auto");
  const [prediction, setPrediction] = useState<DiseasePrediction | null>(null);
  const [history, setHistory] = useState<DiseaseHistoryEntry[]>([]);
  const [summary, setSummary] = useState<DiseaseSummary>({
    total_scans: 0,
    top_disease: null,
    latest_scan_at: null,
  });
  const [modelStatus, setModelStatus] = useState<DiseaseModelStatus | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void loadHistory(selectedModel);
  }, [selectedModel]);

  async function loadHistory(requestedModel: DiseaseModelChoice) {
    try {
      const response = await fetch(
        `/api/disease/history?requested_model=${requestedModel}`,
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load diagnostics history.");
      }
      setHistory(data.history || []);
      setSummary(data.summary);
      setModelStatus(data.model_status);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load diagnostics history.",
      );
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImageName(file.name);
    setPrediction(null);
    setError("");

    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(String(reader.result ?? ""));
    };
    reader.onerror = () => {
      setError("Could not read the selected image.");
    };
    reader.readAsDataURL(file);
  }

  async function analyzeImage() {
    if (!imageDataUrl || !imageName) {
      setError("Select a leaf image before starting analysis.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/disease/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_name: imageName,
          image_data_url: imageDataUrl,
          crop_hint: cropHint,
          requested_model: selectedModel,
        }),
      });

      const data = (await response.json()) as DiseaseAnalyzeResponse & {
        error?: string;
      };
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Disease analysis failed.");
      }

      setPrediction(data.prediction);
      setHistory(data.history);
      setSummary(data.summary);
      setModelStatus(data.prediction.model_status);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Disease analysis failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const modelOptions = modelStatus?.available_models ?? [];

  return (
    <main className="min-h-screen bg-secondary/40 pb-20">
      <section className="bg-[#14331d] text-white">
        <div className="container grid gap-8 py-16 lg:grid-cols-[1.2fr_0.9fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">
              Disease Diagnostics
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight md:text-5xl">
              Upload a leaf photo and keep every diagnosis inside THUNAI.
            </h1>
            <p className="mt-4 max-w-2xl text-white/80">
              This page now talks to real server routes, stores scan history in
              SQLite, and is ready to switch to the trained CNN path when
              weights are available.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm text-white/75">Current mode</p>
            <h2 className="mt-2 text-2xl font-bold">
              {modelStatus
                ? `${labelForResolvedMode(modelStatus.mode)} active`
                : "Loading model status"}
            </h2>
            <p className="mt-3 text-sm text-white/80">
              {modelStatus?.reason ?? "Loading model status from the server."}
            </p>
          </div>
        </div>
      </section>

      <section className="container mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 md:grid md:grid-cols-[0.95fr_1.05fr]">
            <div className="overflow-hidden rounded-2xl border bg-secondary">
              <img
                src={imageDataUrl || "/images/placeholder-leaf-disease.svg"}
                alt="Leaf preview"
                className="aspect-square h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Upload
              </p>
              <h2 className="mt-2 text-2xl font-bold">Start a disease scan</h2>
              <p className="mt-3 text-sm leading-6 text-foreground/70">
                Use one clear leaf image per scan. Crop hint helps the response
                read more naturally in the UI, while the stored history keeps a
                trail of what was analyzed.
              </p>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Model family
                  </label>
                  <div className="grid gap-3">
                    {MODEL_CHOICES.map((option) => {
                      const availability = modelOptions.find(
                        (item) => item.key === option.key,
                      );
                      const isSelected = selectedModel === option.key;
                      const isAuto = option.key === "auto";
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setSelectedModel(option.key)}
                          className={`rounded-xl border px-4 py-3 text-left transition ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {option.label}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-foreground/65">
                                {isAuto
                                  ? "Let THUNAI use the best available trained model automatically."
                                  : availability?.description ?? option.description}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                                isAuto
                                  ? "bg-secondary text-foreground/70"
                                  : availability?.available
                                    ? "bg-green-100 text-green-700"
                                    : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {isAuto
                                ? "Auto"
                                : availability?.available
                                  ? "Ready"
                                  : "Pending"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Crop hint
                  </label>
                  <select
                    value={cropHint}
                    onChange={(event) => setCropHint(event.target.value)}
                    className="w-full rounded-md border bg-white px-3 py-2 text-sm"
                  >
                    {cropOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Leaf image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full rounded-md border bg-secondary px-3 py-2 text-sm"
                  />
                  <p className="mt-2 text-xs text-foreground/60">
                    {imageName || "No image selected yet."}
                  </p>
                </div>
                <Button
                  onClick={analyzeImage}
                  disabled={isSubmitting || !imageDataUrl}
                  className="w-full rounded-md"
                >
                  {isSubmitting ? "Analyzing image..." : "Run diagnosis"}
                </Button>
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </article>

        <aside className="space-y-6">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Scan Summary
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <SummaryCard label="Total scans" value={String(summary.total_scans)} />
              <SummaryCard label="Top disease" value={summary.top_disease ?? "None yet"} />
              <SummaryCard label="Latest scan" value={formatDate(summary.latest_scan_at)} />
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              CNN Status
            </p>
            <ul className="mt-4 space-y-3 text-sm text-foreground/75">
              <li>Torch available: {modelStatus?.dependencies.torch ? "Yes" : "No"}</li>
              <li>Pillow available: {modelStatus?.dependencies.pillow ? "Yes" : "No"}</li>
              <li>torchvision available: {modelStatus?.dependencies.torchvision ? "Yes" : "No"}</li>
              <li>Weights present: {modelStatus?.model_files.weights ? "Yes" : "No"}</li>
              <li>Classes present: {modelStatus?.model_files.classes ? "Yes" : "No"}</li>
            </ul>
            <div className="mt-5">
              <Button asChild variant="outline" className="rounded-md">
                <Link to="/crop-switch">Go to crop switch</Link>
              </Button>
            </div>
          </div>
        </aside>
      </section>

      <section className="container mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Result
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                {prediction ? prediction.predicted_label : "Waiting for a scan"}
              </h2>
            </div>
            <div className="rounded-2xl bg-secondary px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-foreground/60">
                Confidence
              </p>
              <p className="text-2xl font-bold text-primary">
                {prediction ? `${prediction.confidence}%` : "--"}
              </p>
            </div>
          </div>

          {prediction ? (
            <div className="mt-6 grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border bg-secondary/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Overview
                  </p>
                  <p className="mt-3 text-sm leading-6 text-foreground/75">
                    {prediction.advisory.overview}
                  </p>
                  <p className="mt-3 text-sm text-foreground/65">
                    Severity: <strong>{prediction.advisory.severity}</strong>
                  </p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Why this result
                  </p>
                  <p className="mt-3 text-sm leading-6 text-foreground/75">
                    {prediction.advisory.why}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <SummaryCard
                      label="Requested model"
                      value={labelForModelChoice(prediction.requested_model)}
                    />
                    <SummaryCard
                      label="Resolved mode"
                      value={labelForResolvedMode(prediction.model_status.mode)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <ActionList
                  title="Immediate actions"
                  items={prediction.advisory.immediate_actions}
                />
                <ActionList
                  title="Preventive actions"
                  items={prediction.advisory.preventive_actions}
                />
                <div className="rounded-2xl border p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Top predictions
                  </p>
                  <div className="mt-4 space-y-3">
                    {prediction.top_predictions.map((item) => (
                      <div key={item.label}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span>{item.label}</span>
                          <span className="font-medium">{item.confidence}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.min(item.confidence, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm leading-6 text-foreground/70">
              Select a leaf image and run diagnosis to see the model result,
              treatment suggestions, and ranked disease classes.
            </p>
          )}
        </article>

        <aside className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Recent scans
          </p>
          <div className="mt-4 space-y-3">
            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-5 text-sm text-foreground/65">
                No scans stored yet. The first diagnosis will appear here.
              </div>
            ) : (
              history.map((entry) => (
                <article key={entry.id} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{entry.predicted_label}</h3>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-foreground/55">
                        {entry.crop_hint || "Unspecified crop"} | requested {labelForModelChoice(entry.requested_model)}
                      </p>
                    </div>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-primary">
                      {entry.confidence}%
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-foreground/65">
                    {entry.filename} | ran {labelForResolvedMode(entry.model_mode)}
                  </p>
                  <p className="mt-2 text-xs text-foreground/50">
                    {formatDate(entry.created_at)}
                  </p>
                </article>
              ))
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

const MODEL_CHOICES: Array<{
  key: DiseaseModelChoice;
  label: string;
  description: string;
}> = [
  {
    key: "auto",
    label: "Auto",
    description: "Use the best available model automatically.",
  },
  {
    key: "pretrained-transfer",
    label: "Pretrained + Fine-tuned",
    description: "Transfer-learning path built on a pretrained visual backbone.",
  },
  {
    key: "custom-cnn",
    label: "Custom CNN",
    description: "Project-owned convolutional model trained from scratch.",
  },
];

function labelForModelChoice(value: DiseaseModelChoice) {
  const match = MODEL_CHOICES.find((option) => option.key === value);
  return match?.label ?? value;
}

function labelForResolvedMode(value: DiseaseModelStatus["mode"] | string) {
  if (value === "demo-fallback") {
    return "Fallback Proxy";
  }
  return labelForModelChoice(value as DiseaseModelChoice);
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-secondary/60 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ActionList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        {title}
      </p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground/75">
        {items.map((item) => (
          <li key={item} className="rounded-xl bg-secondary/60 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}
