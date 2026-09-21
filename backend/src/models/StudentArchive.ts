import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentArchive extends Document {
  original_id: mongoose.Types.ObjectId;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  enrollment_date: Date;
  status: 'Active' | 'Graduated' | 'Suspended' | 'Dropped' | 'On Leave';
  program: string;
  year_level: number;
  grade_level?: string;
  section?: string;
  phone?: string;
  address?: string;
  guardian_name?: string;
  guardian_relation?: string;
  guardian_phone?: string;
  assigned_faculty?: mongoose.Types.ObjectId;
  deleted_at: Date;
  deleted_by?: string;
  createdAt: Date;
  updatedAt: Date;
}

const studentArchiveSchema = new Schema<IStudentArchive>(
  {
    original_id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    student_id: {
      type: String,
      required: true,
    },
    first_name: {
      type: String,
      required: true,
    },
    last_name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    enrollment_date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Graduated', 'Suspended', 'Dropped', 'On Leave'],
      required: true,
    },
    program: {
      type: String,
      required: true,
    },
    year_level: {
      type: Number,
      required: true,
    },
    grade_level: String,
    section: String,
    phone: String,
    address: String,
    guardian_name: String,
    guardian_relation: String,
    guardian_phone: String,
    assigned_faculty: {
      type: Schema.Types.ObjectId,
      ref: 'Faculty',
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

export const StudentArchive = mongoose.model<IStudentArchive>('StudentArchive', studentArchiveSchema);
