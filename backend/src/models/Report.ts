import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  title: string;
  report_type: 'Attendance' | 'Academic' | 'Behavioral' | 'Risk' | 'Intervention';
  description?: string;
  student_id?: mongoose.Types.ObjectId;
  generated_by?: string;
  data?: any;
  status: 'Draft' | 'Generated' | 'Archived';
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    title: {
      type: String,
      required: true,
    },
    report_type: {
      type: String,
      enum: ['Attendance', 'Academic', 'Behavioral', 'Risk', 'Intervention'],
      required: true,
    },
    description: {
      type: String,
    },
    student_id: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
    },
    generated_by: {
      type: String,
    },
    data: {
      type: Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ['Draft', 'Generated', 'Archived'],
      default: 'Draft',
    },
  },
  { timestamps: true }
);

export const Report = mongoose.model<IReport>('Report', reportSchema);
