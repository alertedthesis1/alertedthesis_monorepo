import mongoose, { Schema, Document } from 'mongoose';

export interface IAlertArchive extends Document {
  original_id: mongoose.Types.ObjectId;
  student_id: mongoose.Types.ObjectId;
  category: 'Attendance' | 'Academic' | 'Behavioral';
  date: Date;
  message: string;
  resolved: boolean;
  deleted_at: Date;
  deleted_by?: string;
  createdAt: Date;
  updatedAt: Date;
}

const alertArchiveSchema = new Schema<IAlertArchive>(
  {
    original_id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    student_id: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    category: {
      type: String,
      enum: ['Attendance', 'Academic', 'Behavioral'],
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    resolved: {
      type: Boolean,
      required: true,
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

export const AlertArchive = mongoose.model<IAlertArchive>('AlertArchive', alertArchiveSchema);
