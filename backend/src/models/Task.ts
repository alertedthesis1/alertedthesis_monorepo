import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description?: string;
  student_id?: mongoose.Types.ObjectId;
  assigned_to?: mongoose.Types.ObjectId;
  intervention_id?: mongoose.Types.ObjectId;
  due_date?: Date;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'In Progress' | 'Completed';
  created_by?: string;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    student_id: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
    },
    assigned_to: {
      type: Schema.Types.ObjectId,
      ref: 'Faculty',
    },
    intervention_id: {
      type: Schema.Types.ObjectId,
      ref: 'Intervention',
    },
    due_date: {
      type: Date,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed'],
      default: 'Pending',
    },
    created_by: {
      type: String,
    },
  },
  { timestamps: true }
);

export const Task = mongoose.model<ITask>('Task', taskSchema);
