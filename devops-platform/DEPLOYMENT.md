# Separated Deployment Guide

## Architecture
- **Frontend**: React app deployed on Vercel
- **Backend**: Node.js/Express API deployed on Render or Railway
- **Database**: Neon PostgreSQL

## Step 1: Deploy Backend on Render/Railway

### Option A: Render (Recommended)

1. **Create account** at [render.com](https://render.com)

2. **Create new Web Service**
   - Connect your GitHub repository
   - Select the `backend` folder as root directory
   - Build Command: `npm install`
   - Start Command: `node index.js`

3. **Add Environment Variables**
   ```
   DATABASE_URL=postgresql://neondb_owner:npg_AaZCv76ypGig@ep-small-art-aw026ici-pooler.c-12.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require
   JWT_SECRET=your_secure_jwt_secret_key
   STRIPE_SECRET_KEY=sk_test_your_stripe_key_here
   CLIENT_URL=https://your-frontend.vercel.app
   PORT=5000
   ```

4. **Deploy**
   - Render will automatically deploy when you push to GitHub
   - Your backend URL will be something like: `https://your-app.onrender.com`

### Option B: Railway

1. **Create account** at [railway.app](https://railway.app)

2. **Create new Project**
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Select `backend` folder

3. **Add Neon PostgreSQL**
   - Add PostgreSQL service from Railway marketplace
   - Or connect your existing Neon database

4. **Add Environment Variables**
   Same as Render above

5. **Deploy**
   - Railway will provide your backend URL

## Step 2: Deploy Frontend on Vercel

1. **Update Frontend Environment**
   Edit `frontend/.env.production`:
   ```
   REACT_APP_API_URL=https://your-backend-url.com/api
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Add new project from GitHub
   - Select the root directory
   - Root Directory: `./` (not `frontend`)
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend/build`

3. **Add Environment Variable**
   ```
   REACT_APP_API_URL=https://your-backend-url.com/api
   ```

4. **Deploy**
   - Your frontend URL will be: `https://your-project.vercel.app`

## Step 3: Update Backend CORS

After getting your Vercel frontend URL, update the backend:
- In Render/Railway, update `CLIENT_URL` environment variable
- Restart the backend service

## Step 4: Test the Deployment

1. **Test Backend Health**
   - Visit: `https://your-backend-url.com/api/health`
   - Should return: `{"status":"OK","timestamp":"..."}`

2. **Test Frontend**
   - Visit: `https://your-project.vercel.app`
   - Test registration, login, course enrollment

3. **Test Database Connection**
   - Try to create a new user
   - Check if data appears in Neon database

## Local Development

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm start
```

### Both together
```bash
# From root directory
npm run dev
```

## Troubleshooting

### CORS Issues
- Ensure `CLIENT_URL` in backend matches your Vercel frontend URL
- Check that CORS is properly configured in backend

### Database Connection
- Verify `DATABASE_URL` is correct
- Check that Neon database is accessible
- Ensure SSL is enabled in connection string

### Build Failures
- Check build logs in Render/Railway/Vercel
- Ensure all dependencies are in package.json
- Verify build commands are correct

## Update Backend URL

If you change backend deployment:
1. Update `frontend/.env.production`
2. Redeploy frontend on Vercel
3. Update `CLIENT_URL` in backend environment variables
4. Restart backend service