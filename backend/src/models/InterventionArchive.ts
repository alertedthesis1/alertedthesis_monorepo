import mongoose, { Schema, Document } from 'mongoose';

export interface IInterventionArchive extends Document {
  original_id: mongoose.Types.ObjectId;
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
  deleted_at: Date;
  deleted_by?: string;
  createdAt: Date;
  updatedAt: Date;
}

const interventionArchiveSchema = new Schema<IInterventionArchive>(
  {
    original_id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    intervention_id: {
      type: String,
      required: true,
    },
    student_id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    score_id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    intervention_type: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    assigned_to: {
      type: Schema.Types.ObjectId,
      ref: 'Faculty',
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: Date,
    status: {
      type: String,
      enum: ['Pending', 'Active', 'Completed', 'Cancelled'],
      required: true,
    },
    outcome: String,
    meeting_details: String,
    schedule_id: {
      type: Schema.Types.ObjectId,
    },
    deleted_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    deleted_by: String,
  },
  { timestamps: true }
);

export const InterventionArchive = mongoose.model<IInterventionArchive>('InterventionArchive', interventionArchiveSchema);
