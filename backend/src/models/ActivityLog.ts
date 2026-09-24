import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  action: string;
  user: string;
  user_email: string;
  user_role: string;
  target_type?: string;
  target_id?: string;
  details?: any;
  last_login?: Date;
  timestamp: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    action: {
      type: String,
      required: true,
    },
    user: {
      type: String,
      required: true,
    },
    user_email: {
      type: String,
      required: true,
    },
    user_role: {
      type: String,
      required: true,
    },
    target_type: {
      type: String,
    },
    target_id: {
      type: String,
    },
    details: {
      type: Schema.Types.Mixed,
    },
    last_login: {
      type: Date,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
