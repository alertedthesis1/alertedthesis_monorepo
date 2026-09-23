import mongoose, { Schema, Document } from 'mongoose';

export interface IRiskScore extends Document {
  student_id: mongoose.Types.ObjectId;
  risk_level: 'Low' | 'Medium' | 'High';
  risk_score: number;
  confidence: number;
  prediction_date: Date;
  term?: string; // e.g., "1st Term", "2nd Term", "3rd Term"
  year?: string; // e.g., "2024", "2025"
  attendance_factor: number;
  academic_factor: number;
  behavior_factor: number;
  notes?: string;
  model_version: string;
  reviewed: boolean;
  reviewed_by?: mongoose.Types.ObjectId;
  detailed_factors?: {
    attendanceRate: number;
    unexcusedAbsenceRate: number;
    overallAverage: number;
    subjectGrades: {
      mathematics: number;
      english: number;
      science: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const riskScoreSchema = new Schema<IRiskScore>(
  {
    student_id: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    risk_level: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      required: true,
    },
    risk_score: {
      type: Number,
      min: 0,
      max: 100,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
    },
    prediction_date: {
      type: Date,
      default: Date.now,
    },
    term: {
      type: String,
      enum: ['1st Term', '2nd Term', '3rd Term'],
    },
    year: {
      type: String,
    },
    attendance_factor: Number,
    academic_factor: Number,
    behavior_factor: Number,
    notes: String,
    model_version: {
      type: String,
      default: '1.0.0',
    },
    detailed_factors: {
      attendanceRate: Number,
      unexcusedAbsenceRate: Number,
      overallAverage: Number,
      subjectGrades: {
        mathematics: Number,
        english: Number,
        science: Number,
      },
    },
    reviewed: {
      type: Boolean,
      default: false,
    },
    reviewed_by: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
    },
  },
  { timestamps: true }
);

export const RiskScore = mongoose.model<IRiskScore>(
  'RiskScore',
  riskScoreSchema
);
