# DevOps Academy Platform

A comprehensive learning platform for DevOps, Cloud Engineering, and System Administration courses with interactive features including live sessions, progress tracking, and task submissions.

## Features

- **Multi-Track Learning**: DevOps, Cloud Engineer, System Administrator tracks
- **Course Management**: Create, edit, and manage courses with videos and tasks
- **Progress Tracking**: Track video progress and task submissions
- **Live Sessions**: Real-time live courses with Zoom integration
- **Payment Integration**: Stripe integration for course payments
- **Admin Dashboard**: Full admin panel for content management
- **Authentication**: JWT-based authentication with role-based access
- **Task Submissions**: Submit tasks and receive feedback
- **Course Reviews & Ratings**: Student reviews with star ratings
- **Certificate Generation**: PDF certificates for completed courses
- **Search & Filter**: Advanced search with filters for courses
- **Notification System**: Real-time notifications for students
- **Student Dashboard**: Comprehensive dashboard with progress tracking

## Tech Stack

### Backend
- Node.js + Express.js
- SQLite (better-sqlite3) for database
- JWT for authentication
- Multer for file uploads
- bcryptjs for password hashing
- Stripe for payments

### Frontend
- React 19
- React Router for navigation
- Axios for API calls
- Webpack for bundling
- CSS Modules

## Project Structure

```
devops-platform/
├── backend/
│   ├── src/
│   │   ├── routes/        # API routes (auth, courses, tasks, etc.)
│   │   ├── middleware/    # Auth middleware
│   │   ├── controllers/   # Business logic
│   │   ├── models/        # Data models
│   │   └── database.js    # Database schema and seeding
│   ├── uploads/           # Uploaded files
│   ├── index.js           # Main server file
│   ├── package.json
│   └── .env               # Environment variables
├── frontend/
│   ├── src/
│   │   ├── pages/         # React pages
│   │   ├── components/    # Reusable components
│   │   ├── api/           # API client
│   │   ├── context/       # React context
│   │   └── styles.css     # Global styles
│   ├── public/
│   ├── package.json
│   └── webpack.config.js
└── start.sh               # Start script
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup

1. Clone the repository
```bash
git clone <repository-url>
cd devops-platform
```

2. Install backend dependencies
```bash
cd backend
npm install
```

3. Install frontend dependencies
```bash
cd ../frontend
npm install
```

4. Configure environment variables
```bash
cd ../backend
cp .env.example .env
# Edit .env with your configuration
```

5. Start the application
```bash
cd ..
chmod +x start.sh
./start.sh
```

Or start manually:
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm start
```

## Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=5000
JWT_SECRET=your_secure_jwt_secret_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_key_here
CLIENT_URL=http://localhost:3000
```

## Default Admin User

- Email: `admin@devops.com`
- Password: `admin123`

**Important**: Change the default admin password after first login!

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Tracks
- `GET /api/tracks` - Get all tracks
- `GET /api/tracks/:slug` - Get track by slug

### Courses
- `GET /api/courses` - Get all courses
- `GET /api/courses/:slug` - Get course by slug
- `POST /api/courses/:id/enroll` - Enroll in course
- `GET /api/courses/:id/progress` - Get course progress

### Tasks
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks/:id/submit` - Submit task
- `GET /api/tasks/:id/submissions` - Get task submissions (admin)

### Payments
- `POST /api/payments/create-checkout` - Create Stripe checkout session
- `GET /api/payments/:id/status` - Get payment status

### Live Sessions
- `GET /api/live` - Get all live courses
- `POST /api/live` - Create live course (admin)
- `POST /api/live/:id/join` - Join live session

### Reviews
- `GET /api/reviews/course/:courseId` - Get course reviews
- `POST /api/reviews` - Add course review
- `PUT /api/reviews/:id` - Update review
- `DELETE /api/reviews/:id` - Delete review

### Certificates
- `POST /api/certificates/course/:courseId` - Generate certificate
- `GET /api/certificates/my-certificates` - Get user certificates
- `GET /api/certificates/:id` - Get certificate by ID

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification
- `POST /api/notifications` - Create notification (admin)

### Search
- `GET /api/search/courses` - Search courses with filters
- `GET /api/search/tracks` - Search tracks
- `GET /api/search/suggestions` - Get search suggestions

### Admin
- `GET /api/admin/stats` - Get platform statistics
- `POST /api/admin/courses` - Create course
- `PUT /api/admin/courses/:id` - Update course
- `DELETE /api/admin/courses/:id` - Delete course

## Database Schema

The platform uses SQLite with the following main tables:
- `users` - User accounts
- `tracks` - Learning tracks
- `courses` - Course content
- `roadmap_steps` - Learning roadmap steps
- `videos` - Course videos
- `tasks` - Course tasks
- `task_submissions` - User task submissions
- `enrollments` - User course enrollments
- `video_progress` - Video watching progress
- `payments` - Payment records
- `reviews` - Course reviews and ratings
- `certificates` - User certificates
- `notifications` - User notifications
- `discussions` - Course discussions

## Development

### Running Tests
```bash
# Backend tests
cd backend
npm test              # Run tests once
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Frontend tests
cd frontend
npm test              # Run tests once
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

### Test Structure
- Backend tests: `backend/__tests__/`
- Frontend tests: `frontend/__tests__/`
- Tests use Jest for both backend and frontend
- Frontend tests use React Testing Library

### Building for Production
```bash
cd frontend
npm run build
```

## Deployment

### Using Docker

#### Development
```bash
# Run backend and frontend in development mode
docker-compose -f docker-compose.dev.yml up
```

#### Production
```bash
# Build and start production containers
docker-compose up -d

# Start with SSL (nginx proxy)
docker-compose --profile production up -d
```

#### Individual Services
```bash
# Build backend only
docker build -t devops-backend ./backend

# Build frontend only
docker build -t devops-frontend ./frontend

# Run backend
docker run -p 5000:5000 devops-backend

# Run frontend
docker run -p 80:80 devops-frontend
```

### Manual Deployment
1. Set environment variables for production
2. Build frontend: `cd frontend && npm run build`
3. Start backend: `cd backend && npm start`
4. Use a process manager like PM2: `pm2 start index.js`

## Security Considerations

- Change the default JWT_SECRET in production
- Use HTTPS in production
- Implement rate limiting on API endpoints
- Add input validation and sanitization
- Regular security updates for dependencies
- Use environment-specific configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC

## Support

For support and questions, please open an issue in the repository.
# devops-platform
