import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Student } from './models/Student';
import { updateRiskScoreForStudent } from './services/riskCalculationService';
import { RiskScore } from './models/RiskScore';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env');
  process.exit(1);
}

async function recalculateAllRiskScores() {
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Get all students
    const students = await Student.find({});
    console.log(`📊 Found ${students.length} students`);

    let updatedCount = 0;
    let errorCount = 0;

    // Determine current academic period
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    let currentTerm = '1st Term';
    let academicYear = currentYear.toString();
    
    if (currentMonth >= 11 || currentMonth <= 3) {
      currentTerm = '2nd Term';
      academicYear = currentMonth >= 11 ? currentYear.toString() : (currentYear - 1).toString();
    } else if (currentMonth >= 4 && currentMonth <= 8) {
      currentTerm = '3rd Term';
      academicYear = (currentYear - 1).toString();
    }

    console.log(`📅 Using current academic period: ${currentTerm} ${academicYear}`);

    for (const student of students) {
      try {
        console.log(`🔄 Processing ${student.first_name} ${student.last_name}...`);
        
        // Recalculate risk score for current academic period
        await updateRiskScoreForStudent(String(student._id), currentTerm, academicYear);
        
        // Also update for other terms if they exist
        const terms = ['1st Term', '2nd Term', '3rd Term'];
        const years = ['2025', '2026'];
        
        for (const term of terms) {
          for (const year of years) {
            if (term !== currentTerm || year !== academicYear) {
              try {
                await updateRiskScoreForStudent(String(student._id), term, year);
              } catch (err) {
                // Skip if no data exists for this term/year
                continue;
              }
            }
          }
        }
        
        updatedCount++;
        console.log(`✅ Updated risk score for ${student.first_name} ${student.last_name}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error updating risk score for ${student.first_name} ${student.last_name}:`, error);
      }
    }

    // Verify the updates
    const totalRiskScores = await RiskScore.countDocuments();
    console.log(`\n📊 Total risk scores in database: ${totalRiskScores}`);

    // Show distribution
    const highRisk = await RiskScore.countDocuments({ risk_level: 'High' });
    const mediumRisk = await RiskScore.countDocuments({ risk_level: 'Medium' });
    const lowRisk = await RiskScore.countDocuments({ risk_level: 'Low' });
    
    console.log(`\n📈 Risk Level Distribution:`);
    console.log(`   High Risk: ${highRisk}`);
    console.log(`   Medium Risk: ${mediumRisk}`);
    console.log(`   Low Risk: ${lowRisk}`);

    console.log(`\n🎉 Risk score recalculation complete!`);
    console.log(`   ✅ Successfully updated: ${updatedCount} students`);
    console.log(`   ❌ Errors: ${errorCount}`);
  } catch (error) {
    console.error('❌ Error recalculating risk scores:', error);
  } finally {
    await mongoose.disconnect();
  }
}

recalculateAllRiskScores();
