import Performance from '../models/performanceModel.js';
import PerformanceFile from '../models/performanceFileModel.js';
import User from '../models/userModels.js';
import Plan from '../models/planModels.js';
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const submitWorkerPerformance = async (req, res) => {
  try {
    const {
      measureId,
      kpiId,
      year,
      quarter,
      value,
      description = "",
      subsectorId,
      sectorId,
      workerId: bodyWorkerId,
      confirmed = false,
    } = req.body;

    const file = req.file;
    const workerId = (req.user && req.user._id) || bodyWorkerId;

    if (!workerId || !measureId || !quarter || !year || value === undefined || !kpiId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const ceoUser = await User.findOne({ role: 'CEO', subsector: subsectorId });
    if (!ceoUser) return res.status(404).json({ message: "No CEO found for subsector." });

    const plan = await Plan.findOne({
      subsectorId,
      kpiId,
      year,
      userId: ceoUser._id,
      role: 'CEO',
    });
    if (!plan) return res.status(404).json({ message: "No Plan found for KPI & subsector." });

    let performance = await Performance.findOne({
      userId: ceoUser._id,
      role: 'CEO',
      kpiId,
      year,
      subsectorId,
    });

    if (!performance) {
      performance = new Performance({
        userId: ceoUser._id,
        role: 'CEO',
        kpiId,
        year,
        sectorId,
        subsectorId,
        planId: plan._id,
        q1Performance: { value: 0, description: "" },
        q2Performance: { value: 0, description: "" },
        q3Performance: { value: 0, description: "" },
        q4Performance: { value: 0, description: "" },
        performanceYear: 0,
      });
    } else if (!performance.planId) {
      performance.planId = plan._id;
    }

    const perfField = `${quarter.toLowerCase()}Performance`;
    if (!performance[perfField]) {
      performance[perfField] = { value: 0, description: "" };
    }

    performance[perfField].value += Number(value);
    performance[perfField].description += performance[perfField].description
      ? `\n[${workerId}] ${description}`
      : `[${workerId}] ${description}`;

    performance.performanceYear =
      (performance.q1Performance?.value || 0) +
      (performance.q2Performance?.value || 0) +
      (performance.q3Performance?.value || 0) +
      (performance.q4Performance?.value || 0);

    await performance.save();

    const confirmedBool = confirmed === true || confirmed === "true";

    let perfFile = await PerformanceFile.findOne({
      workerId,
      measureId,
      year,
      quarter,
    });

    if (!perfFile) {
      perfFile = new PerformanceFile({
        performanceId: performance._id,
        workerId,
        kpiId,
        measureId,
        year,
        quarter,
      });
    }

    perfFile.description = description;
    perfFile.confirmed = confirmedBool;

    if (file) {
      perfFile.filename = file.originalname;
      perfFile.filepath = `/uploads/${file.filename}`.replace(/\\/g, "/"); // Uniform
      perfFile.mimetype = file.mimetype;
      perfFile.size = file.size;
    }

    await perfFile.save();

    res.status(200).json({
      message: "Worker performance submitted successfully",
      performance,
      performanceFile: perfFile,
    });
  } catch (error) {
    console.error("submitWorkerPerformance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


export const getWorkerPerformanceFiles = async (req, res) => {
  try {
    const { workerId, year, quarter, kpiId } = req.query;

    if (!workerId) {
      return res.status(400).json({ message: "workerId query param is required" });
    }

    const query = { workerId };

    if (year) query.year = year;
    if (quarter) query.quarter = quarter;
    if (kpiId) query.kpiId = kpiId;

    const performanceFiles = await PerformanceFile.find(query)
      .select('-__v')
      .lean();

    return res.status(200).json(performanceFiles);
  } catch (error) {
    console.error('getWorkerPerformanceFiles error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
