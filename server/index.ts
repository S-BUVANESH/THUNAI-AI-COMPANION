import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  handleCropSwitchConfig,
  handleCropSwitchHistory,
  handleCropSwitchPredict,
} from "./routes/cropSwitch";
import { handleDiseaseAnalyze, handleDiseaseHistory } from "./routes/disease";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "12mb" }));
  app.use(express.urlencoded({ extended: true, limit: "12mb" }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.get("/api/crop-switch/config", handleCropSwitchConfig);
  app.get("/api/crop-switch/history", handleCropSwitchHistory);
  app.post("/api/crop-switch/predict", handleCropSwitchPredict);
  app.get("/api/disease/history", handleDiseaseHistory);
  app.post("/api/disease/analyze", handleDiseaseAnalyze);

  return app;
}
