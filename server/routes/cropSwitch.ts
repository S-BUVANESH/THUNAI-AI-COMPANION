import { RequestHandler } from "express";
import { z } from "zod";
import type {
  CropSwitchConfig,
  CropSwitchConfigResponse,
  CropSwitchHistoryResponse,
  CropSwitchPredictionResponse,
  CropSwitchPredictionResult,
  CropSwitchRequest,
} from "@shared/api";
import { listCropSwitchRuns, saveCropSwitchRun } from "../lib/database";
import { runPythonJson } from "../lib/pythonBridge";

const cropSwitchSchema = z.object({
  district: z.string().min(1),
  current_crop: z.string().min(1),
  season: z.string().min(1),
  soil_type: z.string().min(1),
  rainfall: z.coerce.number().min(100).max(5000),
});

export const handleCropSwitchConfig: RequestHandler = async (_req, res) => {
  try {
    const config = await runPythonJson<{ action: "config" }, CropSwitchConfig>(
      "server/ml/crop_switch_bridge.py",
      { action: "config" },
    );

    const response: CropSwitchConfigResponse = {
      success: true,
      config,
    };
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load crop-switch configuration.",
    });
  }
};

export const handleCropSwitchPredict: RequestHandler = async (req, res) => {
  const parsed = cropSwitchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "district, current_crop, season, soil_type, and rainfall are required.",
      details: parsed.error.flatten(),
    });
    return;
  }

  try {
    const payload: CropSwitchRequest = {
      district: parsed.data.district,
      current_crop: parsed.data.current_crop,
      season: parsed.data.season,
      soil_type: parsed.data.soil_type,
      rainfall: parsed.data.rainfall,
    };

    const result = await runPythonJson<
      { action: "predict"; payload: CropSwitchRequest },
      CropSwitchPredictionResult
    >("server/ml/crop_switch_bridge.py", {
      action: "predict",
      payload,
    });

    saveCropSwitchRun(payload, result);

    const response: CropSwitchPredictionResponse = {
      success: true,
      result,
    };
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Crop-switch prediction failed.",
    });
  }
};

export const handleCropSwitchHistory: RequestHandler = (req, res) => {
  const limit = Math.max(
    1,
    Math.min(Number(req.query.limit ?? 8) || 8, 20),
  );
  const response: CropSwitchHistoryResponse = {
    success: true,
    history: listCropSwitchRuns(limit),
  };
  res.status(200).json(response);
};
