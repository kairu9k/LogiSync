# LogiSync Deployment Guide

This guide covers deploying LogiSync to production for GPS tracking testing.

## Pre-Deployment Checklist

### Frontend Fixes Applied
- [x] Fixed environment variable naming (`VITE_API_URL` instead of `VITE_API_BASE`)
- [x] Removed leftover `vercel.json` from frontend folder
- [x] Local build tested and working successfully

### Backend Fixes Applied
- [x] Added proper CORS middleware (`app/Http/Middleware/Cors.php`)
- [x] Created CORS configuration file (`config/cors.php`)
- [x] Registered CORS middleware in `bootstrap/app.php`
- [x] Removed manual CORS route from `routes/api.php`
- [x] CORS configured to use `FRONTEND_URL` environment variable

---

## Deployment Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   Netlify       │ HTTPS   │    Railway       │
│   (Frontend)    │────────►│   (Backend +     │
│   React + Vite  │         │    MySQL)        │
└─────────────────┘         └──────────────────┘
```

**Why this setup?**
- **HTTPS Required**: GPS tracking requires HTTPS for browser security
- **Netlify**: Best for React/Vite monorepos, simple configuration
- **Railway**: Easy Laravel + MySQL deployment with auto-migrations

---

## Step 1: Deploy Backend to Railway

### 1.1 Create Railway Account
- Go to https://railway.app/
- Sign up with GitHub

### 1.2 Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your LogiSync repository
4. Railway will detect it's a Laravel project

### 1.3 Add MySQL Database
1. In your project, click "+ New"
2. Select "Database" → "MySQL"
3. Railway will automatically provision the database

### 1.4 Configure Environment Variables

Click on your backend service → Variables tab → Add these:

```env
# Laravel
APP_NAME=LogiSync
APP_ENV=production
APP_KEY=                    # Will be generated automatically
APP_DEBUG=false
APP_URL=${{RAILWAY_PUBLIC_DOMAIN}}

# Database (Railway auto-fills these when you add MySQL)
DB_CONNECTION=mysql
DB_HOST=${{MYSQL_HOST}}
DB_PORT=${{MYSQL_PORT}}
DB_DATABASE=${{MYSQL_DATABASE}}
DB_USERNAME=${{MYSQL_USER}}
DB_PASSWORD=${{MYSQL_PASSWORD}}

# CORS - IMPORTANT: Add your frontend URL after deploying frontend
FRONTEND_URL=http://localhost:3000

# Session & Cache
SESSION_DRIVER=file
CACHE_DRIVER=file
QUEUE_CONNECTION=sync

# Logging
LOG_CHANNEL=stack
LOG_LEVEL=error
```

### 1.5 Configure Build Settings
Railway auto-detects Laravel using `nixpacks.toml` and `railway.json` already in the repo.

**Root Directory**: `backend`

### 1.6 Deploy
1. Click "Deploy"
2. Wait for build to complete (2-5 minutes)
3. Railway will automatically:
   - Install PHP dependencies
   - Generate `APP_KEY`
   - Run migrations
   - Start the Laravel server

### 1.7 Get Backend URL
- Copy your Railway public URL (e.g., `https://logisync-production-xxxx.up.railway.app`)
- Test it by visiting: `https://your-url.railway.app/api/dashboard/metrics`
- You should see: `{"message":"Unauthorized - Please login"}`

---

## Step 2: Deploy Frontend to Netlify

### 2.1 Create Netlify Account
- Go to https://www.netlify.com/
- Sign up with GitHub

### 2.2 Create New Site
1. Click "Add new site" → "Import an existing project"
2. Choose GitHub and select your LogiSync repository
3. Configure build settings:

**Build Settings:**
```
Base directory: frontend
Build command: npm run build
Publish directory: frontend/dist
```

### 2.3 Configure Environment Variables

Go to Site settings → Environment variables → Add:

```env
VITE_API_URL=https://your-railway-url.railway.app
```

Replace `your-railway-url` with your actual Railway URL from Step 1.7.

### 2.4 Deploy
1. Click "Deploy site"
2. Wait for build to complete (2-3 minutes)
3. Netlify will give you a URL like: `https://your-app-name.netlify.app`

---

## Step 3: Update CORS Settings

Now that you have both URLs, update Railway's CORS configuration:

1. Go back to Railway → Your project → Backend service
2. Go to Variables tab
3. Update the `FRONTEND_URL` variable:
   ```
   FRONTEND_URL=https://your-app-name.netlify.app
   ```
4. Click "Redeploy" to apply changes

---

## Step 4: Test GPS Tracking

### 4.1 Create Test Data
1. Visit your Netlify URL
2. Register a new account or login with your manually created account
3. Ensure you have:
   - At least one active shipment
   - A driver assigned to the shipment

### 4.2 Test on Mobile Device
1. Open your Netlify URL on a mobile device with GPS
2. Login as a driver
3. Navigate to your assigned shipment
4. Click "Update Location" or enable live tracking
5. Browser should request GPS permission
6. Grant permission
7. Location should update successfully

### 4.3 Verify Tracking
1. Login as admin/manager on desktop
2. Navigate to Shipments
3. Click on the active shipment
4. You should see the GPS location on the map
5. Location should update in real-time

---

## Troubleshooting

### Frontend Build Fails
- **Error**: "Cannot find module"
  - **Fix**: Check `package.json` dependencies are correct
  - Run `npm install` locally to verify

- **Error**: "VITE_API_URL is not defined"
  - **Fix**: Add environment variable in Netlify

### Backend Deploy Fails
- **Error**: "Migration failed"
  - **Fix**: Check database connection in Railway variables
  - Ensure MySQL service is running

- **Error**: "APP_KEY not set"
  - **Fix**: Railway should auto-generate this
  - Or manually run: `php artisan key:generate --show` and add to variables

### CORS Errors
- **Error**: "Access-Control-Allow-Origin"
  - **Fix**: Verify `FRONTEND_URL` in Railway includes your exact Netlify URL
  - No trailing slash in URL
  - Include protocol (https://)
  - Redeploy after changing

### GPS Not Working
- **Error**: "Geolocation is not available"
  - **Fix**: Must be accessed via HTTPS (not HTTP)
  - Check browser permissions for location access

---

## Environment Variables Reference

### Backend (Railway)

| Variable | Example | Description |
|----------|---------|-------------|
| `APP_URL` | `${{RAILWAY_PUBLIC_DOMAIN}}` | Your Railway backend URL |
| `FRONTEND_URL` | `https://logisync.netlify.app` | Your Netlify frontend URL (for CORS) |
| `DB_HOST` | `${{MYSQL_HOST}}` | Auto-filled by Railway MySQL |
| `DB_DATABASE` | `${{MYSQL_DATABASE}}` | Auto-filled by Railway MySQL |
| `DB_USERNAME` | `${{MYSQL_USER}}` | Auto-filled by Railway MySQL |
| `DB_PASSWORD` | `${{MYSQL_PASSWORD}}` | Auto-filled by Railway MySQL |

### Frontend (Netlify)

| Variable | Example | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `https://logisync-production-xxxx.railway.app` | Your Railway backend URL |

---

## Post-Deployment

### Update Documentation
- Update README.md with production URLs
- Document any custom configuration

### Monitor Logs
- **Railway**: Click on your service → Logs tab
- **Netlify**: Site settings → Functions → Logs

### Set up Custom Domain (Optional)
- **Netlify**: Site settings → Domain management
- **Railway**: Service settings → Generate domain

---

## Rollback

If something goes wrong:

### Frontend (Netlify)
1. Go to Deploys tab
2. Find previous working deployment
3. Click "Publish deploy"

### Backend (Railway)
1. Go to Deployments tab
2. Find previous working deployment
3. Click "Redeploy"

---

## Next Steps After Deployment

1. Test all features thoroughly
2. Monitor for errors in production logs
3. Optimize bundle size if needed
4. Set up continuous deployment (auto-deploy on push to main)
5. Consider adding error tracking (Sentry, etc.)
6. Set up database backups on Railway

---

## Support

If you encounter issues not covered here:
- Check Railway docs: https://docs.railway.app/
- Check Netlify docs: https://docs.netlify.com/
- Review Laravel deployment guide: https://laravel.com/docs/deployment
