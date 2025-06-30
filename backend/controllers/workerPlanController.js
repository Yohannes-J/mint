// controllers/workerPlanController.js
import mongoose from 'mongoose';
import MeasureAssignment from '../models/measureAssignmentModel.js';
import Measure from '../models/measureModel.js';
import KPI from '../models/kpiModel.js'; // your KPI2

export const getWorkerPlans = async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    console.log("DEBUG userId in controller:", userId);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: user not identified" });
    }

    const { year, quarter, kpiId } = req.query;

    // Use 'new' to instantiate ObjectId
    const filter = { workerId: new mongoose.Types.ObjectId(userId) };
    if (year) filter.year = year;
    if (quarter) filter.quarter = quarter;

    console.log("DEBUG filter used for query:", filter);

    // Fetch assignments with nested KPI population
    const assignments = await MeasureAssignment.find(filter)
      .populate({
        path: 'measureId',
        populate: {
          path: 'kpiId',
          model: 'KPI2',
          select: 'kpi_name'
        },
        select: 'name kpiId'
      })
      .lean();

    console.log("DEBUG assignments fetched:", assignments);

    // Filter by kpiId client-side after population
    const filtered = assignments.filter(a =>
      a.measureId && a.measureId.kpiId &&
      (!kpiId || a.measureId.kpiId._id.toString() === kpiId)
    );

    console.log("DEBUG assignments after kpiId filter:", filtered);

    // Map to response format expected by frontend
    const results = filtered.map(a => ({
  kpiName: a.measureId.kpiId.kpi_name,
  kpiId: a.measureId.kpiId._id.toString(),  // add this line
  measureName: a.measureId.name,
  workerId: userId,
  measureId: a.measureId._id.toString(),
  target: a.target,
  year: a.year,
  quarter: a.quarter,
}));


    console.log("DEBUG final results sent:", results);

    res.status(200).json(results);
  } catch (err) {
    console.error("getWorkerPlans error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
