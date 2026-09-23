import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  user_id: mongoose.Types.ObjectId;
  user_email: string;
  type: 'consecutive_absence' | 'attendance_alert' | 'academic_alert' | 'behavioral_alert' | 'risk_alert' | 'intervention_alert' | 'system';
  title: string;
  message: string;
  student_id?: mongoose.Types.ObjectId;
  student_name?: string;
  priority: 'high' | 'medium' | 'low';
  link?: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    user_email: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['consecutive_absence', 'attendance_alert', 'academic_alert', 'behavioral_alert', 'risk_alert', 'intervention_alert', 'system'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    student_id: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
    },
    student_name: String,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    link: String,
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Create index for faster queries
notificationSchema.index({ user_email: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user_id: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);