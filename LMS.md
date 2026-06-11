# NCUI CEAS LMS - Learning Management System

A comprehensive Learning Management System built for the National Centre for Uniformed Services (NCUI) Continuous Education & Assessment Services (CEAS).

## Overview

The NCUI CEAS LMS is a full-featured web application designed to manage online learning, assessments, certifications, and administrative functions for military education and training programs.

## Tech Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite 6.3
- **Styling:** Tailwind CSS 4.1
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Icons:** Lucide React
- **Routing:** React Router 7
- **State Management:** React hooks + Context
- **Charts:** Recharts
- **3D Graphics:** Three.js (for shader effects)

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT with role-based access control
- **Real-time:** Socket.io for live sessions and notifications

### Key Dependencies
- `@mui/material` - Material UI components
- `axios` - HTTP client
- `xlsx` - Excel file processing
- `canvas-confetti` - Celebration effects
- `date-fns` - Date utilities

## Project Structure

```
lms/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── admin/          # Admin-specific components
│   │   │   ├── course/         # Course-related components
│   │   │   ├── assessment/     # Assessment components
│   │   │   ├── dashboard/      # Dashboard widgets
│   │   │   ├── media/          # Media library components
│   │   │   └── ...             # Other feature components
│   │   ├── services/           # API services
│   │   └── App.tsx             # Main application component
│   ├── pages/
│   │   ├── Login.jsx           # Login page
│   │   ├── AdminDashboard.jsx
│   │   ├── TrainerDashboard.jsx
│   │   └── StudentDashboard.jsx
│   ├── utils/
│   │   └── axiosConfig.ts      # Axios instance configuration
│   └── AppRouter.tsx           # Route definitions
├── backend/
│   └── src/
│       ├── controllers/        # Request handlers
│       ├── models/            # Mongoose models
│       ├── routes/            # API routes
│       ├── middlewares/       # Express middleware
│       ├── services/          # Business logic
│       ├── utils/             # Utilities
│       └── config/            # Configuration
├── public/
│   ├── ncui.png               # Logo
│   └── mca_logo.png
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## User Roles

The system supports three primary user roles:

1. **Administrator** - Full system access, user management, analytics
2. **Trainer** - Course creation, assessment management, student oversight
3. **Student** - Course enrollment, assessments, certifications

## Core Features

### 1. Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Token validation and session management
- Protected routes with role checking

### 2. Dashboard
- Role-specific dashboard views
- Statistics and metrics
- Quick actions and navigation
- Enhanced student dashboard with progress tracking

### 3. Course Management
- Course creation and editing (Trainer/Admin)
- Rich text content editor
- Voice input for content creation
- Course enrollment
- Progress tracking
- Course Q&A (Questions & Answers)

### 4. Assessments
- Assessment creation (Admin/Trainer)
- Question editor
- Multiple question types
- Proctoring integration
- Exam session management
- Real-time monitoring
- Anti-cheating measures
- Assessment submissions tracking

### 5. Live Sessions
- Scheduled live sessions
- Real-time interaction
- Session management

### 6. Certificates
- Certificate generation (PDF)
- QR code verification
- Unique certificate IDs
- Public verification system

### 7. Media Library
- Upload and manage media
- Category-based organization
- Dynamic stats (videos, audio, views, duration)
- Content filtering

### 8. User Management
- Admin user insights
- Student management
- Trainer management
- Department management
- Batch management
- Bulk student import (Excel)
- Trainer assignment

### 9. Analytics & Reports
- Analytics dashboard
- Custom reports
- User activity tracking
- Performance metrics

### 10. Notifications
- Real-time notifications
- Toast notifications (Sonner)
- Email notifications
- SMS notifications

### 11. QMS (Quality Management System)
- Query management
- Issue tracking
- Resolution workflow

### 12. AI Chatbot
- Chatbot launcher
- FAQ integration
- Assistance for students

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - User logout

### Courses
- `GET /api/v1/courses` - List courses
- `POST /api/v1/courses` - Create course
- `GET /api/v1/courses/:id` - Get course details
- `PUT /api/v1/courses/:id` - Update course
- `DELETE /api/v1/courses/:id` - Delete course
- `POST /api/v1/courses/enroll` - Enroll in course

### Assessments
- `GET /api/v1/assessments` - List assessments
- `POST /api/v1/assessments` - Create assessment
- `GET /api/v1/assessments/:id` - Get assessment
- `POST /api/v1/assessments/:id/submit` - Submit assessment

### Enrollments
- `GET /api/v1/enrollments` - List enrollments
- `POST /api/v1/enrollments` - Create enrollment

### Certificates
- `GET /api/v1/certificates` - List certificates
- `POST /api/v1/certificates` - Generate certificate
- `GET /api/v1/certificates/verify/:token` - Verify certificate

### Live Sessions
- `GET /api/v1/live-sessions` - List sessions
- `POST /api/v1/live-sessions` - Create session

### Media
- `GET /api/v1/media` - List media
- `POST /api/v1/media/upload` - Upload media

### Users (Admin)
- `GET /api/v1/admin/users` - List users
- `POST /api/v1/admin/users` - Create user
- `PUT /api/v1/admin/users/:id` - Update user
- `DELETE /api/v1/admin/users/:id` - Delete user

### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard analytics
- `GET /api/v1/analytics/reports` - Generate reports

## Database Models

### User
- `_id`, `email`, `password`, `firstName`, `lastName`
- `role` (administrator, trainer, student)
- `department`, `batch`
- `status`, `isApproved`

### Course
- `_id`, `title`, `description`, `thumbnail`
- `instructor`, `category`, `level`
- `duration`, `lessons`, `enrollmentCount`

### Enrollment
- `_id`, `user`, `course`
- `progress`, `status`, `completedAt`

### Assessment
- `_id`, `title`, `description`, `course`
- `questions`, `duration`, `passingScore`
- `type` (quiz, exam, assignment)

### AssessmentAttempt
- `_id`, `user`, `assessment`
- `answers`, `score`, `submittedAt`

### Certificate
- `_id`, `user`, `course`
- `certificateId`, `qrCode`
- `issuedAt`, `verificationToken`

### LiveSession
- `_id`, `title`, `description`, `instructor`
- `scheduledAt`, `duration`, `meetingLink`

### Media
- `_id`, `title`, `type`, `url`
- `category`, `duration`, `views`

## Security Features

1. **Authentication**
   - JWT tokens with expiration
   - Secure password hashing (bcrypt)
   - Session management

2. **Authorization**
   - Role-based route protection
   - Endpoint-level authorization
   - RBAC middleware

3. **Input Validation**
   - Input sanitization
   - Request validation
   - Error handling middleware

4. **Rate Limiting**
   - API rate limiting
   - Login attempt limits

5. **Proctoring**
   - Exam session monitoring
   - Tab switching detection
   - Heartbeat system

## UI Components (shadcn/ui)

The project includes 30+ reusable UI components:
- Accordion, Alert, AlertDialog
- Avatar, Badge, Button
- Calendar, Card, Carousel
- Checkbox, Collapsible, Command
- ContextMenu, Dialog, Drawer
- DropdownMenu, Form, HoverCard
- Input, InputOTP, Label
- Menubar, NavigationMenu
- Pagination, Popover, Progress
- RadioGroup, Resizable, ScrollArea
- Select, Separator, Sheet
- Sidebar, Skeleton, Slider
- Sonner (toasts), Switch
- Table, Tabs, Textarea
- Toggle, ToggleGroup, Tooltip

## Design System

### Color Palette
- Primary: Indigo (#4F46E5)
- Secondary: Violet
- Background: #FAFBFF
- Surface: White
- Text: Gray scale

### Typography
- Font: System UI / Inter
- Headings: Bold, various sizes
- Body: Regular, 14-16px

### Components
- Border radius: 8-16px
- Shadows: Subtle, layered
- Transitions: 150-300ms ease

## Build & Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Backend
```bash
cd backend
npm run start
```

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api/v1
```

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/lms
JWT_SECRET=your-secret-key
```

## External Services

- **MongoDB** - Database
- **Socket.io** - Real-time features
- **Redis** - Caching (optional)
- **SendGrid** - Email notifications
- **Twilio** - SMS notifications

## Testing Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ncui.in | Admin@123 |
| Trainer | trainer@ncui.in | Trainer@123 |
| Student | student@ncui.in | Student@123 |

## Pages Overview

### Login Page (`/login`)
- Clean professional design
- Credential-based authentication
- Demo login buttons for testing

### Dashboard (`/dashboard`)
- Statistics cards
- Recent courses
- Progress charts
- Quick actions
- Role-specific widgets

### My Courses
- Course grid/list view
- Enrollment status
- Progress tracking
- Course details

### Assessments
- Available assessments
- Attempt history
- Results and scores

### Certificates
- My certificates
- Verification system
- Download PDF

### Live Sessions
- Upcoming sessions
- Session history
- Join functionality

### Media Library
- Video/Audio content
- Category filters
- Upload functionality

### QMS (Query Management)
- Submit queries
- Track resolution
- Admin responses

### Admin Pages
- User Management
- Department Management
- Batch Management
- Trainer Management
- Student Management
- Bulk Import
- Certificate Management
- Analytics Dashboard
- Reports

## File Organization

- `src/app/components/ui/` - Reusable UI components
- `src/app/services/` - API service modules
- `src/app/components/admin/` - Admin-specific components
- `src/app/components/course/` - Course-related components
- `src/app/components/assessment/` - Assessment components
- `src/app/components/dashboard/` - Dashboard components

## Best Practices

1. **Component Design**
   - Single responsibility
   - Prop typing with TypeScript
   - Reusable and composable

2. **State Management**
   - Local state for component-specific data
   - Context for global state (auth, user)
   - API services for data fetching

3. **API Integration**
   - Centralized axios instance
   - Error handling
   - Loading states

4. **Styling**
   - Tailwind CSS utility classes
   - Consistent spacing
   - Responsive design
   - Dark mode ready

5. **Security**
   - Validate tokens
   - Sanitize inputs
   - Handle errors gracefully

## Known Features

- Voice input for content creation
- Proctoring with tab switching detection
- Real-time notifications
- Certificate QR verification
- Bulk student import via Excel
- AI chatbot integration
- Rich text editor for course content
- Media library with upload
- Analytics and reporting

## License

Project-specific - NCUI CEAS

## Support

For issues and questions, contact the development team.