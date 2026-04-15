import { RequestHandler } from "express";
import { z } from "zod";
import type {
  DiseaseAnalyzeRequest,
  DiseaseAnalyzeResponse,
  DiseaseHistoryResponse,
  DiseaseModelChoice,
  DiseaseModelStatus,
  DiseasePrediction,
} from "@shared/api";
import {
  getDiseaseSummary,
  listDiseasePredictions,
  saveDiseasePrediction,
} from "../lib/database";
import { runPythonJson } from "../lib/pythonBridge";

const diseaseAnalyzeSchema = z.object({
  image_name: z.string().min(1),
  image_data_url: z.string().min(32),
  crop_hint: z.string().max(80).optional().default(""),
  requested_model: z
    .enum(["auto", "pretrained-transfer", "custom-cnn"])
    .default("auto"),
});

export const handleDiseaseAnalyze: RequestHandler = async (req, res) => {
  const parsed = diseaseAnalyzeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "image_name and image_data_url are required.",
      details: parsed.error.flatten(),
    });
    return;
  }

  try {
    const payload: DiseaseAnalyzeRequest = {
      image_name: parsed.data.image_name,
      image_data_url: parsed.data.image_data_url,
      crop_hint: parsed.data.crop_hint ?? "",
      requested_model: parsed.data.requested_model as DiseaseModelChoice,
    };

    const prediction = await runPythonJson<
      { action: "analyze"; payload: DiseaseAnalyzeRequest },
      DiseasePrediction
    >("server/ml/disease_bridge.py", {
      action: "analyze",
      payload,
    });

    saveDiseasePrediction(
      payload.image_name,
      payload.crop_hint ?? "",
      payload.requested_model ?? "auto",
      prediction,
    );

    const response: DiseaseAnalyzeResponse = {
      success: true,
      prediction,
      history: listDiseasePredictions(6),
      summary: getDiseaseSummary(),
    };
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Disease analysis failed.",
    });
  }
};

export const handleDiseaseHistory: RequestHandler = async (req, res) => {
  const limit = Math.max(
    1,
    Math.min(Number(req.query.limit ?? 6) || 6, 20),
  );
  const requestedModel = z
    .enum(["auto", "pretrained-transfer", "custom-cnn"])
    .catch("auto")
    .parse(req.query.requested_model);

  try {
    const modelStatus = await runPythonJson<
      { action: "status"; payload: { requested_model: DiseaseModelChoice } },
      DiseaseModelStatus
    >("server/ml/disease_bridge.py", {
      action: "status",
      payload: { requested_model: requestedModel },
    });

    const response: DiseaseHistoryResponse = {
      success: true,
      history: listDiseasePredictions(limit),
      summary: getDiseaseSummary(),
      model_status: modelStatus,
    };
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load disease history.",
    });
  }
};
