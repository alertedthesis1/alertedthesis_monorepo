import mongoose, { Schema, Document } from 'mongoose';

export interface ITaskArchive extends Document {
  original_id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  student_id?: mongoose.Types.ObjectId;
  assigned_to?: mongoose.Types.ObjectId;
  intervention_id?: string;
  due_date?: Date;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'In Progress' | 'Completed';
  created_by?: string;
  deleted_at: Date;
  deleted_by?: string;
  createdAt: Date;
  updatedAt: Date;
}

const taskArchiveSchema = new Schema<ITaskArchive>(
  {
    original_id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    student_id: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
    },
    assigned_to: {
      type: Schema.Types.ObjectId,
      ref: 'Faculty',
    },
    intervention_id: String,
    due_date: Date,
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed'],
      required: true,
    },
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

export const TaskArchive = mongoose.model<ITaskArchive>('TaskArchive', taskArchiveSchema);
