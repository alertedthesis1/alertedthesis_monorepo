import mongoose, { Schema, Document } from 'mongoose';

export interface IFaculty extends Document {
  name: string;
  email: string;
  password: string;
  title?: string;
  department?: string;
  createdAt: Date;
  updatedAt: Date;
}

const facultySchema = new Schema<IFaculty>(
  {
    name: {
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
    password: {
      type: String,
      required: true,
    },
    title: String,
    department: String,
  },
  { timestamps: true }
);

export const Faculty = mongoose.model<IFaculty>('Faculty', facultySchema);
