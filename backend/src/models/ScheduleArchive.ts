import mongoose, { Schema, Document } from 'mongoose';

export interface IScheduleArchive extends Document {
  original_id: mongoose.Types.ObjectId;
  student_id: mongoose.Types.ObjectId;
  student_name: string;
  date: Date;
  time: string;
  type: 'Mentoring' | 'Peer Tutoring' | 'Counseling/Coaching' | 'Parent Conference';
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled' | 'No-Show';
  notes?: string;
  intervention_id?: string;
  created_by?: string;
  deleted_at: Date;
  deleted_by?: string;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleArchiveSchema = new Schema<IScheduleArchive>(
  {
    original_id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    student_id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    student_name: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['Mentoring', 'Peer Tutoring', 'Counseling/Coaching', 'Parent Conference'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'No-Show'],
      required: true,
    },
    notes: String,
    intervention_id: String,
    created_by: String,
    deleted_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    deleted_by: String,
  },
  { timestamps: true }
);

export const ScheduleArchive = mongoose.model<IScheduleArchive>('ScheduleArchive', scheduleArchiveSchema);
