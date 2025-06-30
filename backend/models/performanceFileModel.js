import mongoose from 'mongoose';

const performanceFileSchema = new mongoose.Schema({
  performanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Performance', required: true },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  kpiId: { type: mongoose.Schema.Types.ObjectId, ref: 'KPI2', required: true },
  measureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Measure', required: true },
  year: { type: Number, required: true },
  quarter: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4'], required: true },

  description: { type: String, default: "" },  // the comment / justification text

  filename: { type: String, required: true },
  filepath: { type: String, required: true },
  mimetype: { type: String },
  size: { type: Number },

  confirmed: { type: Boolean, default: false }, // NEW: checkbox status

  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.model('PerformanceFile', performanceFileSchema);
