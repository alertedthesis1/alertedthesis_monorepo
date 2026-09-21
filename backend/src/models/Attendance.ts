import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
  student_id: mongoose.Types.ObjectId;
  attendance_date: Date;
  present: boolean;
  excused_absent: boolean;
  course_code: string;
  course_name?: string;
  createdAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    student_id: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    attendance_date: {
      type: Date,
      required: true,
    },
    present: {
      type: Boolean,
      default: false,
    },
    excused_absent: {
      type: Boolean,
      default: false,
    },
    course_code: String,
    course_name: String,
  },
  { timestamps: true }
);

export const Attendance = mongoose.model<IAttendance>(
  'Attendance',
  attendanceSchema
);
