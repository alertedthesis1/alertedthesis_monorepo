import mongoose, { Schema, Document } from 'mongoose';

export interface ISchedule extends Document {
  student_id: mongoose.Types.ObjectId;
  student_name: string;
  date: Date;
  time: string;
  type: 'Mentoring' | 'Peer Tutoring' | 'Counseling/Coaching' | 'Parent Conference';
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled' | 'No-Show';
  notes?: string;
  intervention_id?: string; // Changed from ObjectId to string to store readable intervention ID
  created_by?: string;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleSchema = new Schema<ISchedule>(
  {
    student_id: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
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
      default: 'Counseling/Coaching',
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'No-Show'],
      default: 'Scheduled',
    },
    notes: {
      type: String,
    },
    intervention_id: {
      type: String, // Changed to String to store readable intervention ID like "M202600001"
    },
    created_by: {
      type: String,
    },
  },
  { timestamps: true }
);

export const Schedule = mongoose.model<ISchedule>('Schedule', scheduleSchema);
