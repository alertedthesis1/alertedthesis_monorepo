import mongoose, { Schema, Document } from 'mongoose';

export interface ISchedule extends Document {
  student_id: mongoose.Types.ObjectId;
  student_name: string;
  date: Date;
  time: string;
  type: 'Mentoring' | 'Tutoring' | 'Counseling' | 'Family Meeting';
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled' | 'No-Show';
  notes?: string;
  intervention_id?: mongoose.Types.ObjectId;
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
      enum: ['Mentoring', 'Tutoring', 'Counseling', 'Family Meeting'],
      default: 'Counseling',
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
      type: Schema.Types.ObjectId,
      ref: 'Intervention',
    },
    created_by: {
      type: String,
    },
  },
  { timestamps: true }
);

export const Schedule = mongoose.model<ISchedule>('Schedule', scheduleSchema);
