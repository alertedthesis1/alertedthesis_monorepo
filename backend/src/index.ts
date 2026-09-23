import express, { Express, Request, Response, NextFunction } from 'express';

import cors from 'cors';

import dotenv from 'dotenv';

import mongoose from 'mongoose';

import * as dns from 'dns';

import studentRoutes from './routes/students';

import riskRoutes from './routes/risks';

import analyticsRoutes from './routes/analytics';

import dashboardRoutes from './routes/dashboard';

import scheduleRoutes from './routes/schedules';

import alertRoutes from './routes/alerts';

import interventionRoutes from './routes/interventions';

import taskRoutes from './routes/tasks';

import reportRoutes from './routes/reports';

import authRoutes from './routes/auth';

import activityLogRoutes from './routes/activityLogs';

import facultyRoutes from './routes/faculty';

import earlyWarningRoutes from './routes/earlyWarning';

import attendanceRoutes from './routes/attendance';

import academicRecordsRoutes from './routes/academicRecords';

import fileRoutes from './routes/files';

import seedRoutes from './routes/seed';

import notificationRoutes from './routes/notifications';



dotenv.config();



// ===== INLINE MIDDLEWARE =====

const errorHandler = (

  err: any,

  req: Request,

  res: Response,

  next: NextFunction

) => {

  console.error('Error:', err);

  

  const statusCode = err.statusCode || 500;

  const message = err.message || 'Internal server error';

  

  res.status(statusCode).json({

    error: message,

    status: statusCode,

    timestamp: new Date().toISOString(),

  });

};



const notFoundHandler = (req: Request, res: Response) => {

  res.status(404).json({

    error: 'Not Found',

    path: req.path,

    method: req.method,

  });

};



// ===== SETUP =====

dns.setServers(['8.8.8.8', '8.8.4.4']);



const app: Express = express();

const PORT = process.env.PORT || 5000;



// Middleware

app.use(cors({

  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'https://alerted-frontend.onrender.com'],

  credentials: true

}));

app.use(express.json());



// Connect to MongoDB

async function startServer() {

  try {

    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {

      throw new Error('MONGODB_URI is not defined in .env');

    }



    await mongoose.connect(MONGODB_URI, {

      serverSelectionTimeoutMS: 10000,

      socketTimeoutMS: 45000,

      retryWrites: true,

    });

    console.log('✅ Connected to MongoDB Atlas');

  } catch (error) {

    console.error('❌ MongoDB connection error:', error);

    process.exit(1);

  }

}



startServer();



// Health check endpoint

app.get('/api/health', (req: Request, res: Response) => {

  res.json({ 

    status: 'OK', 

    timestamp: new Date(),

    environment: process.env.NODE_ENV,

    database: 'MongoDB Atlas'

  });

});



// Routes

app.use('/api/students', studentRoutes);

app.use('/api/risk-scores', riskRoutes);

app.use('/api/analytics', analyticsRoutes);

app.use('/api/dashboard', dashboardRoutes);

app.use('/api/schedules', scheduleRoutes);

app.use('/api/alerts', alertRoutes);

app.use('/api/interventions', interventionRoutes);

app.use('/api/tasks', taskRoutes);

app.use('/api/reports', reportRoutes);

app.use('/api/auth', authRoutes);

app.use('/api/activity-logs', activityLogRoutes);

app.use('/api/faculty', facultyRoutes);

app.use('/api/early-warning', earlyWarningRoutes);

app.use('/api/attendance', attendanceRoutes);

app.use('/api/academicrecords', academicRecordsRoutes);

app.use('/api/files', fileRoutes);

app.use('/api/seed', seedRoutes);

app.use('/api/notifications', notificationRoutes);



// 404 handler

app.use(notFoundHandler);



// Error handling middleware

app.use(errorHandler);



// Start server

app.listen(PORT, () => {

  console.log(`🚀 Server running at http://localhost:${PORT}`);

  console.log(`📊 Environment: ${process.env.NODE_ENV}`);

  console.log(`💾 Database: MongoDB Atlas`);

  console.log(`✅ API Health: http://localhost:${PORT}/api/health`);

  console.log(`📚 API Documentation: See API_DOCUMENTATION.md`);

});



export default app;

