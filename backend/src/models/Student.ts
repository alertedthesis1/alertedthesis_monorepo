import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
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
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<IStudent>(
  {
    student_id: {
      type: String,
      required: true,
      unique: true,
      match: /^\d{8}$/,
    },
    first_name: {
      type: String,
      required: true,
      trim: true,
    },
    last_name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /.+\@.+\..+/,
    },
    enrollment_date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Graduated', 'Suspended', 'Dropped', 'On Leave'],
      default: 'Active',
    },
    program: {
      type: String,
      required: true,
    },
    year_level: {
      type: Number,
      min: 1,
      max: 12,
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
  },
  { timestamps: true }
);

export const Student = mongoose.model<IStudent>('Student', studentSchema);
