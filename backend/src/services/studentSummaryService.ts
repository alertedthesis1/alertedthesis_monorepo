import { Student } from '../models/Student';
import { Attendance } from '../models/Attendance';
import { AcademicRecord } from '../models/AcademicRecord';
import { Intervention } from '../models/Intervention';
import { BehaviorReport } from '../models/BehaviorReport';
import { RiskScore } from '../models/RiskScore';

const OPENROUTER_API_KEY = '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';

export interface StudentSummaryData {
  student: any;
  attendance: any[];
  academics: any[];
  interventions: any[];
  behaviorReports: any[];
  riskScores: any[];
}

export class StudentSummaryService {
  /**
   * Fetch all relevant data for a student
   */
  async getStudentData(studentId: string): Promise<StudentSummaryData> {
    const [student, attendance, academics, interventions, behaviorReports, riskScores] = await Promise.all([
      Student.findById(studentId),
      Attendance.find({ student_id: studentId }).sort({ attendance_date: -1 }).limit(30),
      AcademicRecord.find({ student_id: studentId }).sort({ createdAt: -1 }).limit(5),
      Intervention.find({ student_id: studentId }).sort({ createdAt: -1 }).limit(10),
      BehaviorReport.find({ student_id: studentId }).sort({ report_date: -1 }).limit(10),
      RiskScore.find({ student_id: studentId }).sort({ prediction_date: -1 }).limit(5),
    ]);

    return {
      student,
      attendance,
      academics,
      interventions,
      behaviorReports,
      riskScores,
    };
  }

  /**
   * Generate AI summary using OpenRouter API
   */
  async generateAISummary(studentData: StudentSummaryData): Promise<string> {
    const { student, attendance, academics, interventions, behaviorReports, riskScores } = studentData;

    // Calculate key metrics
    const recentAttendance = attendance.slice(0, 10);
    const attendanceRate = recentAttendance.length > 0
      ? (recentAttendance.filter(a => a.present).length / recentAttendance.length) * 100
      : 0;

    const latestAcademic = academics[0];
    const latestRisk = riskScores[0];

    const activeInterventions = interventions.filter(i => i.status === 'Active');
    const completedInterventions = interventions.filter(i => i.status === 'Completed');

    // Build context for AI
    const context = `
Student Information:
- Name: ${student?.firstName} ${student?.lastName}
- ID: ${student?.student_id}
- Grade: ${student?.grade}
- Section: ${student?.section}

Academic Performance:
- Latest GPA: ${latestAcademic?.gpa || 'N/A'}
- Major Subjects Enrolled: ${latestAcademic?.major_subjects_enrolled || 'N/A'}
- Major Subjects Passed: ${latestAcademic?.major_subjects_passed || 'N/A'}
- Major Subjects Failed: ${latestAcademic?.major_subjects_failed || 'N/A'}

Attendance (Last 10 records):
- Attendance Rate: ${attendanceRate.toFixed(1)}%
- Recent Records: ${recentAttendance.map(a => `${new Date(a.attendance_date).toLocaleDateString()}: ${a.present ? 'Present' : 'Absent'}`).join(', ')}

Risk Assessment:
- Current Risk Level: ${latestRisk?.risk_level || 'N/A'}
- Risk Score: ${latestRisk?.risk_score || 'N/A'}
- Last Updated: ${latestRisk?.prediction_date ? new Date(latestRisk.prediction_date).toLocaleDateString() : 'N/A'}

Interventions:
- Total Interventions: ${interventions.length}
- Active: ${activeInterventions.length}
- Completed: ${completedInterventions.length}
- Recent Interventions: ${interventions.slice(0, 3).map(i => `${i.intervention_type} - ${i.status} - ${i.notes || 'No notes'}`).join('; ')}

Behavior Reports:
- Total Reports: ${behaviorReports.length}
- Recent Incidents: ${behaviorReports.slice(0, 3).map(b => `${b.incident_type} - ${b.severity} - ${b.description || 'No description'}`).join('; ')}
`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-OpenRouter-Title": "AlertED Student Counseling System",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
          messages: [
            {
              role: "system",
              content: "You are a helpful AI assistant for a student counseling system. Your task is to provide concise, professional summaries of student data for counselors. Focus on key insights, patterns, and areas needing attention. Keep the summary under 200 words and use bullet points for clarity."
            },
            {
              role: "user",
              content: `Please provide a concise summary of this student's situation based on the following data:\n\n${context}\n\nInclude:\n1. Overall academic standing\n2. Attendance patterns\n3. Current risk level and concerns\n4. Intervention history and effectiveness\n5. Key areas requiring attention\n6. Any notable patterns or trends`
            }
          ],
          max_tokens: 500,
          temperature: 0.7,
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter API error:', response.status, errorText);
        throw new Error(`AI service returned error: ${response.status}`);
      }

      clearTimeout(timeoutId);

      const jsonData: any = await response.json();
      
      if (jsonData.choices && jsonData.choices.length > 0) {
        return jsonData.choices[0].message.content;
      } else {
        console.error('Unexpected AI response format:', jsonData);
        throw new Error('No response from AI service');
      }
    } catch (error) {
      console.error('Error generating AI summary:', error);
      throw error;
    }
  }

  /**
   * Get student summary with AI-generated insights
   */
  async getStudentSummary(studentId: string): Promise<{ data: StudentSummaryData; aiSummary: string }> {
    const data = await this.getStudentData(studentId);
    const aiSummary = await this.generateAISummary(data);
    return { data, aiSummary };
  }
}

export const studentSummaryService = new StudentSummaryService();
