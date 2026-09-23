import mongoose, { Schema, Document } from 'mongoose';

export interface ICourseGrade {
  subject: string;
  grade: string;
  date: Date;
}

export interface IAcademicRecord extends Document {
  student_id: mongoose.Types.ObjectId;
  term: string;
  year: string;
  mathematics_grade: number;
  english_grade: number;
  science_grade: number;
  overall_average: number;
  major_subject_grades: ICourseGrade[];
  createdAt: Date;
  updatedAt: Date;
}

const courseGradeSchema = new Schema<ICourseGrade>({
  subject: { type: String, required: true },
  grade: { type: String, required: true },
  date: { type: Date, required: true }
});

const academicRecordSchema = new Schema<IAcademicRecord>(
  {
    student_id: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    term: {
      type: String,
      required: true,
    },
    year: {
      type: String,
      required: true,
    },
    mathematics_grade: {
      type: Number,
      min: 0,
      max: 100,
    },
    english_grade: {
      type: Number,
      min: 0,
      max: 100,
    },
    science_grade: {
      type: Number,
      min: 0,
      max: 100,
    },
    overall_average: {
      type: Number,
      min: 0,
      max: 100,
    },
    major_subject_grades: [courseGradeSchema],
  },
  { timestamps: true }
);

export const AcademicRecord = mongoose.model<IAcademicRecord>(
  'AcademicRecord',
  academicRecordSchema
);
