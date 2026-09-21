import mongoose, { Schema, Document } from 'mongoose';

export interface IReportArchive extends Document {
  original_id: mongoose.Types.ObjectId;
  title: string;
  report_type: 'Attendance' | 'Academic' | 'Behavioral' | 'Risk' | 'Intervention';
  description?: string;
  student_id?: mongoose.Types.ObjectId;
  generated_by?: string;
  data?: any;
  status: 'Draft' | 'Generated' | 'Archived';
  deleted_at: Date;
  deleted_by?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reportArchiveSchema = new Schema<IReportArchive>(
  {
    original_id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    report_type: {
      type: String,
      enum: ['Attendance', 'Academic', 'Behavioral', 'Risk', 'Intervention'],
      required: true,
    },
    description: String,
    student_id: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
    },
    generated_by: String,
    data: {
      type: Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ['Draft', 'Generated', 'Archived'],
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

export const ReportArchive = mongoose.model<IReportArchive>('ReportArchive', reportArchiveSchema);
