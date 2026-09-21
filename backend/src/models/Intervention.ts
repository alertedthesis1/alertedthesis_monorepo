import mongoose, { Schema, Document } from 'mongoose';

export interface IIntervention extends Document {
  intervention_id: string;
  student_id: mongoose.Types.ObjectId;
  score_id: mongoose.Types.ObjectId;
  intervention_type: string;
  description: string;
  assigned_to?: mongoose.Types.ObjectId;
  start_date: Date;
  end_date?: Date;
  status: 'Pending' | 'Active' | 'Completed' | 'Cancelled';
  outcome?: string;
  meeting_details?: string;
  schedule_id?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const interventionSchema = new Schema<IIntervention>(
  {
    intervention_id: {
      type: String,
      required: true,
      unique: true,
    },
    student_id: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    score_id: {
      type: Schema.Types.ObjectId,
      ref: 'RiskScore',
      required: true,
    },
    intervention_type: String,
    description: String,
    assigned_to: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
    },
    start_date: Date,
    end_date: Date,
    status: {
      type: String,
      enum: ['Pending', 'Active', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    outcome: String,
    meeting_details: String,
    schedule_id: {
      type: Schema.Types.ObjectId,
      ref: 'Schedule',
    },
  },
  { timestamps: true }
);

export const Intervention = mongoose.model<IIntervention>(
  'Intervention',
  interventionSchema
);
