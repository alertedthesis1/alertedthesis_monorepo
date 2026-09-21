import mongoose, { Schema, Document } from 'mongoose';

export interface IBehaviorReport extends Document {
  student_id: mongoose.Types.ObjectId;
  report_date: Date;
  incident_type: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  action_taken: string;
  createdAt: Date;
  updatedAt: Date;
}

const behaviorReportSchema = new Schema<IBehaviorReport>(
  {
    student_id: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    report_date: {
      type: Date,
      required: true,
    },
    incident_type: String,
    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
    },
    description: String,
    action_taken: String,
  },
  { timestamps: true }
);

export const BehaviorReport = mongoose.model<IBehaviorReport>(
  'BehaviorReport',
  behaviorReportSchema
);
