import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type {
  CropSwitchConfig,
  CropSwitchHistoryEntry,
  CropSwitchPredictionResponse,
  CropSwitchPredictionResult,
  CropSwitchRequest,
} from "@shared/api";
import { Button } from "@/components/ui/button";

const defaultForm: CropSwitchRequest = {
  district: "",
  current_crop: "",
  season: "",
  soil_type: "Loamy",
  rainfall: 900,
};

export default function CropSwitch() {
  const [config, setConfig] = useState<CropSwitchConfig | null>(null);
  const [history, setHistory] = useState<CropSwitchHistoryEntry[]>([]);
  const [form, setForm] = useState<CropSwitchRequest>(defaultForm);
  const [result, setResult] = useState<CropSwitchPredictionResult | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void loadPage();
  }, []);

  async function loadPage() {
    try {
      const [configResponse, historyResponse] = await Promise.all([
        fetch("/api/crop-switch/config"),
        fetch("/api/crop-switch/history"),
      ]);
      const configData = await configResponse.json();
      const historyData = await historyResponse.json();

      if (!configResponse.ok || !configData.success) {
        throw new Error(configData.error || "Unable to load crop-switch config.");
      }
      if (!historyResponse.ok || !historyData.success) {
        throw new Error(historyData.error || "Unable to load crop-switch history.");
      }

      setConfig(configData.config);
      setHistory(historyData.history || []);
      setForm((current) => ({
        district: current.district || configData.config.districts[0] || "",
        current_crop: current.current_crop || configData.config.crops[0] || "",
        season: current.season || configData.config.seasons[0] || "",
        soil_type: current.soil_type || configData.config.soil_types[0] || "Loamy",
        rainfall: current.rainfall || 900,
      }));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load crop-switch page.",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/crop-switch/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as CropSwitchPredictionResponse & {
        error?: string;
      };
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Crop-switch prediction failed.");
      }

      setResult(data.result);

      const refreshedHistory = await fetch("/api/crop-switch/history");
      const historyData = await refreshedHistory.json();
      if (refreshedHistory.ok && historyData.success) {
        setHistory(historyData.history || []);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Crop-switch prediction failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isSwitch = result?.switch === 1;

  return (
    <main className="min-h-screen bg-secondary/40 pb-20">
      <section className="bg-[#12311b] text-white">
        <div className="container grid gap-8 py-16 lg:grid-cols-[1.2fr_0.9fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">
              Crop Switch Advisor
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight md:text-5xl">
              Run the Tamil Nadu crop-switch model directly inside THUNAI.
            </h1>
            <p className="mt-4 max-w-2xl text-white/80">
              This page uses the existing Python artifact and stores advisor runs
              in THUNAI&apos;s local SQLite database so the website stays the main
              product surface.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">
              Coverage
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <MiniHeroStat label="Districts" value={String(config?.districts.length ?? 0)} />
              <MiniHeroStat label="Crops" value={String(config?.crops.length ?? 0)} />
              <MiniHeroStat label="Seasons" value={String(config?.seasons.length ?? 0)} />
            </div>
          </div>
        </div>
      </section>

      <section className="container mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Advisor Form
          </p>
          <h2 className="mt-2 text-2xl font-bold">Run a field check</h2>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            Select your district, current crop, season, soil, and annual
            rainfall. THUNAI will compare the current crop against locally
            supported alternatives from the existing model artifact.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="District">
                <select
                  value={form.district}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      district: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border bg-white px-3 py-2 text-sm"
                >
                  {(config?.districts || []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Current Crop">
                <select
                  value={form.current_crop}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      current_crop: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border bg-white px-3 py-2 text-sm"
                >
                  {(config?.crops || []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Season">
                <select
                  value={form.season}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      season: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border bg-white px-3 py-2 text-sm"
                >
                  {(config?.seasons || []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Soil Type">
                <select
                  value={form.soil_type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      soil_type: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border bg-white px-3 py-2 text-sm"
                >
                  {(config?.soil_types || []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="rounded-2xl border bg-secondary/60 p-4">
              <div className="mb-3 flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-foreground">
                  Annual rainfall
                </label>
                <span className="text-sm font-semibold text-primary">
                  {form.rainfall} mm
                </span>
              </div>
              <input
                type="range"
                min={200}
                max={3000}
                step={25}
                value={form.rainfall}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    rainfall: Number(event.target.value),
                  }))
                }
                className="w-full accent-primary"
              />
              <div className="mt-2 flex justify-between text-xs text-foreground/55">
                <span>Dry</span>
                <span>Balanced</span>
                <span>Wet</span>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full rounded-md">
              {isSubmitting ? "Analyzing field..." : "Run advisor"}
            </Button>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </form>
        </article>

        <aside className="space-y-6">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Model Notes
            </p>
            <div className="mt-4 space-y-3 text-sm text-foreground/75">
              {(config?.limitations || []).slice(0, 3).map((item) => (
                <div key={item} className="rounded-xl bg-secondary/60 px-3 py-3">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Recent runs
            </p>
            <div className="mt-4 space-y-3">
              {history.length === 0 ? (
                <div className="rounded-xl border border-dashed px-4 py-4 text-sm text-foreground/60">
                  No crop-switch runs stored yet.
                </div>
              ) : (
                history.slice(0, 4).map((entry) => (
                  <article key={entry.id} className="rounded-xl border px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">
                          {entry.current_crop} to {entry.top_crop}
                        </h3>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-foreground/55">
                          {entry.district} | {entry.season}
                        </p>
                      </div>
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-primary">
                        {entry.confidence}%
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-foreground/65">
                      {entry.recommendation} | rainfall {entry.rainfall} mm
                    </p>
                    <p className="mt-2 text-xs text-foreground/50">
                      {formatDate(entry.created_at)}
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>
        </aside>
      </section>

      <section className="container mt-8">
        <article
          className={`rounded-2xl border p-6 shadow-sm ${
            result
              ? isSwitch
                ? "border-amber-200 bg-amber-50"
                : "border-green-200 bg-green-50"
              : "border bg-white"
          }`}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Decision
              </p>
              <h2 className="mt-2 text-3xl font-bold">
                {result
                  ? isSwitch
                    ? `Switch toward ${result.recommendations[0]?.crop ?? "a stronger crop"}`
                    : `Stay with ${result.input.current_crop}`
                  : "Waiting for advisor output"}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/70">
                {result
                  ? isSwitch
                    ? `${result.input.current_crop} is trailing the best alternative for this district and season.`
                    : `${result.input.current_crop} remains one of the stronger choices for the selected setup.`
                  : "Run the advisor to see the crop decision banner, reasons, and top alternatives."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ResultStat
                label="Confidence"
                value={result ? `${result.confidence}%` : "--"}
              />
              <ResultStat
                label="Performance Gap"
                value={result ? result.performance_gap.toFixed(3) : "--"}
              />
            </div>
          </div>

          {result && (
            <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Decision drivers
                  </p>
                  <div className="mt-4 space-y-3">
                    {result.reasons.map((reason) => (
                      <div key={reason.label} className="rounded-xl bg-secondary/60 px-4 py-3">
                        <p className="font-medium">{reason.label}</p>
                        <p className="mt-1 text-sm text-foreground/70">
                          {reason.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Current crop standing
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ResultStat
                      label="Opportunity score"
                      value={result.current_crop_analysis.score.toFixed(3)}
                    />
                    <ResultStat
                      label="Predicted yield"
                      value={`${result.current_crop_analysis.predicted_yield.toFixed(2)} t/ha`}
                    />
                    <ResultStat
                      label="Support mode"
                      value={result.current_crop_analysis.support_mode}
                    />
                    <ResultStat
                      label="Years seen"
                      value={String(result.current_crop_analysis.years_seen)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Top alternatives
                  </p>
                  <div className="mt-4 grid gap-4">
                    {result.recommendations.slice(0, 3).map((item, index) => (
                      <article key={item.crop} className="rounded-xl border bg-secondary/40 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">
                              Rank {index + 1}
                            </p>
                            <h3 className="mt-1 text-lg font-semibold">{item.crop}</h3>
                          </div>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-primary">
                            {(item.confidence ?? 0).toFixed(1)}% fit
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <ResultStat label="Opportunity" value={item.score.toFixed(3)} />
                          <ResultStat
                            label="Predicted yield"
                            value={`${item.predicted_yield.toFixed(2)} t/ha`}
                          />
                          <ResultStat label="Support" value={item.support_mode} />
                          <ResultStat
                            label="Market"
                            value={
                              item.market
                                ? `INR ${item.market.modal_price.toLocaleString()}`
                                : "No live match"
                            }
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Validation snapshot
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {Object.entries(result.model_info.metrics).map(([name, metrics]) => (
                      <div key={name} className="rounded-xl bg-secondary/60 px-4 py-4 text-sm">
                        <p className="font-medium">{name}</p>
                        <p className="mt-2 text-foreground/70">
                          RMSE {metrics.rmse} | MAE {metrics.mae} | R2 {metrics.r2}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function MiniHeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/60">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/60 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}
