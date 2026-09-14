# Vercel Deployment Guide

## Prerequisites
- Vercel account
- GitHub account
- PostgreSQL database (Vercel Postgres or Supabase)

## Step 1: Prepare the Project

### 1.1 Install Dependencies
```bash
npm install
```

### 1.2 Set Up PostgreSQL Database

#### Option A: Vercel Postgres (Recommended)
1. Go to Vercel Dashboard → Storage → Create Database
2. Select Vercel Postgres
3. Create database
4. Copy the `DATABASE_URL` from the database settings

#### Option B: Supabase
1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Copy the `DATABASE_URL` from project settings

### 1.3 Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL=your_postgresql_database_url
JWT_SECRET=your_secure_jwt_secret_key
STRIPE_SECRET_KEY=sk_test_your_stripe_key_here
CLIENT_URL=https://your-project.vercel.app
```

## Step 2: Deploy to Vercel

### 2.1 Connect to GitHub
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository

### 2.2 Configure Project Settings

#### Build & Development Settings
- **Framework Preset**: Other
- **Root Directory**: `./`
- **Build Command**: `cd frontend && npm install && npm run build`
- **Output Directory**: `frontend/build`

#### Environment Variables
Add the following environment variables in Vercel:
- `DATABASE_URL`: Your PostgreSQL connection string
- `JWT_SECRET`: Your JWT secret key
- `STRIPE_SECRET_KEY`: Your Stripe secret key (optional)
- `CLIENT_URL`: Your Vercel domain URL

### 2.3 Deploy
1. Click "Deploy"
2. Wait for deployment to complete
3. Access your site at the provided URL

## Step 3: Post-Deployment Setup

### 3.1 Initialize Database
The database will be automatically initialized on first deployment with:
- All required tables
- Sample tracks and courses
- Default admin user

### 3.2 Create Admin User
1. Register a new account on your deployed site
2. Manually update the user role in the database:
```sql
UPDATE users SET role = 'admin', is_approved = 1 WHERE email = 'your_admin_email';
```

### 3.3 Configure Uploads
For file uploads, you'll need to configure a cloud storage service (Cloudinary recommended):
1. Create Cloudinary account
2. Add Cloudinary credentials to environment variables
3. Update the file upload configuration

## Step 4: Testing

### 4.1 Test API Endpoints
- Health check: `https://your-project.vercel.app/api/health`
- Get tracks: `https://your-project.vercel.app/api/tracks`
- Get courses: `https://your-project.vercel.app/api/courses`

### 4.2 Test Frontend
- Navigate to your Vercel URL
- Test user registration and login
- Test course enrollment
- Test video playback

## Troubleshooting

### Database Connection Issues
- Ensure `DATABASE_URL` is correctly set in Vercel environment variables
- Check that PostgreSQL database is accessible
- Verify SSL settings in connection string

### Build Failures
- Check build logs in Vercel dashboard
- Ensure all dependencies are in package.json
- Verify build command is correct

### API Not Working
- Check that API routes are properly configured
- Verify CORS settings
- Check server logs in Vercel dashboard

## Development vs Production

### Local Development
```bash
# Install dependencies
npm install

# Set up local PostgreSQL database
# Use DATABASE_URL for local Postgres instance

# Run locally
npm run dev
```

### Production Deployment
- Frontend is served as static files from Vercel
- Backend runs as serverless functions
- Database is Vercel Postgres or external PostgreSQL

## Updating the Site

### Push Changes to GitHub
```bash
git add .
git commit -m "Your changes"
git push origin main
```

### Vercel will automatically deploy
- Changes are deployed on push to main branch
- Preview deployments available for pull requests
- Rollback to previous deployments if needed