import { Student } from '../models/Student';
import { Attendance } from '../models/Attendance';
import { AcademicRecord } from '../models/AcademicRecord';
import { Intervention } from '../models/Intervention';
import { BehaviorReport } from '../models/BehaviorReport';
import { RiskScore } from '../models/RiskScore';

const OPENROUTER_API_KEY: string = process.env.OPENROUTER_API_KEY || '';

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
    // Check if API key is configured
    if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === '') {
      console.warn('OpenRouter API key not configured. Using fallback summary.');
      return this.generateFallbackSummary(studentData);
    }

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
- Name: ${student?.first_name} ${student?.last_name}
- ID: ${student?.student_id}
- Grade: ${student?.grade_level || student?.year_level}
- Section: ${student?.section}

Academic Performance:
- Overall Average: ${latestAcademic?.overall_average || 'N/A'}
- Mathematics Grade: ${latestAcademic?.mathematics_grade || 'N/A'}
- English Grade: ${latestAcademic?.english_grade || 'N/A'}
- Science Grade: ${latestAcademic?.science_grade || 'N/A'}

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
      // Return fallback summary instead of throwing error
      return this.generateFallbackSummary(studentData);
    }
  }

  /**
   * Generate a fallback summary when AI is unavailable
   */
  private generateFallbackSummary(studentData: StudentSummaryData): string {
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

    // Build a structured summary
    const summary = [
      `**Student Overview:** ${student?.first_name} ${student?.last_name} (${student?.student_id}) - Grade ${student?.grade_level || student?.year_level}, Section ${student?.section}`,
      `**Academic Performance:** Overall Average: ${latestAcademic?.overall_average || 'N/A'}, Mathematics: ${latestAcademic?.mathematics_grade || 'N/A'}, English: ${latestAcademic?.english_grade || 'N/A'}, Science: ${latestAcademic?.science_grade || 'N/A'}`,
      `**Attendance:** ${attendanceRate.toFixed(1)}% attendance rate in recent records`,
      `**Risk Assessment:** Current level: ${latestRisk?.risk_level || 'N/A'}, Risk score: ${latestRisk?.risk_score || 'N/A'}`,
      `**Interventions:** ${interventions.length} total (${activeInterventions.length} active, ${completedInterventions.length} completed)`,
      `**Behavior Reports:** ${behaviorReports.length} incidents reported`,
    ];

    // Add specific concerns based on data
    const concerns = [];
    if (attendanceRate < 80) concerns.push('Poor attendance pattern requiring attention');
    if (latestAcademic?.overall_average && parseFloat(latestAcademic.overall_average) < 75) concerns.push('Academic performance below threshold');
    if (latestRisk?.risk_level === 'High' || latestRisk?.risk_level === 'Critical') concerns.push('High risk status requires immediate intervention');
    if (activeInterventions.length > 3) concerns.push('Multiple active interventions may need prioritization');

    if (concerns.length > 0) {
      summary.push('**Key Concerns:**');
      concerns.forEach(concern => summary.push(`- ${concern}`));
    } else {
      summary.push('**Status:** Student appears to be on track with manageable concerns.');
    }

    return summary.join('\n');
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
