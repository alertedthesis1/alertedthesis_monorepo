# AlertEd Thesis - Early Warning System for Students

An AI-powered early warning system designed to identify students at risk of academic failure and provide timely interventions.

## Features

- **Student Risk Assessment**: AI-powered risk scoring based on attendance, academic performance, and behavioral factors
- **Real-time Dashboard**: Comprehensive overview of student metrics and risk levels
- **Intervention Management**: Track and manage student interventions and support programs
- **Attendance Tracking**: Detailed attendance records with term-based filtering
- **Academic Performance Monitoring**: Track grades, GPA, and academic progress
- **Early Warning Alerts**: Automated alerts for students showing risk indicators
- **Faculty Management**: Manage faculty members and their assigned students

## Tech Stack

### Backend
- Node.js with Express
- TypeScript
- MongoDB with Mongoose
- JWT Authentication
- PDF generation with PDFKit

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Recharts for data visualization
- Lucide React for icons

## Project Structure

```
alerted-thesis-monorepo/
├── backend/                 # Express/TypeScript backend
│   ├── src/
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   └── index.ts        # Entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Next.js pages
│   │   ├── lib/           # API client
│   │   └── styles/        # Global styles
│   ├── package.json
│   └── next.config.js
└── package.json           # Root package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/alertedthesis1/alertedthesis_monorepo.git
cd alerted-thesis-monorepo
```

2. Install dependencies
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

3. Set up environment variables

Create `.env` files in both backend and frontend directories:

**Backend (.env)**
```
MONGODB_URI=mongodb://localhost:27017/alerted
JWT_SECRET=your-secret-key
PORT=5000
```

**Frontend (.env.local)**
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

4. Run the development servers
```bash
npm run dev
```

This will start both backend (port 5000) and frontend (port 3000) concurrently.

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Students
- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get student details
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Attendance
- `GET /api/attendance/student/:student_id` - Get student attendance
- `POST /api/attendance` - Record attendance
- `PUT /api/attendance/:id` - Update attendance
- `DELETE /api/attendance/:id` - Delete attendance

### Interventions
- `GET /api/interventions/student/:student_id` - Get student interventions
- `POST /api/interventions` - Create intervention
- `PUT /api/interventions/:id` - Update intervention

### Academic Records
- `GET /api/academic/student/:student_id` - Get academic records
- `POST /api/academic` - Create academic record
- `PUT /api/academic/:id` - Update academic record

## Deployment

This project is deployed on Render:
- **Backend**: [AlertEd Backend](https://alerted-backend.onrender.com)
- **Frontend**: [AlertEd Frontend](https://alerted-frontend.onrender.com)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is part of a thesis for academic purposes.
