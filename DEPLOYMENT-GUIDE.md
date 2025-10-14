# LogiSync Deployment Guide
## Deploying to Vercel (Frontend) + Railway (Backend + Database)

This guide will help you deploy LogiSync for GPS tracking testing with HTTPS support.

---

## Prerequisites

- GitHub account
- Vercel account (free): https://vercel.com/signup
- Railway account (free): https://railway.app/
- Git installed locally

---

## Step 1: Push Code to GitHub ✅

Your code is already on GitHub at: `https://github.com/kairu9k/LogiSync`

---

## Step 2: Deploy Backend to Railway 🚂

### 2.1 Create Railway Project

1. Go to https://railway.app/
2. Click **"Start a New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository: `kairu9k/LogiSync`
5. Railway will detect the Laravel app

### 2.2 Add MySQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add MySQL"**
3. Railway will automatically create a MySQL database
4. Note: Database credentials are auto-injected as environment variables

### 2.3 Configure Environment Variables

In Railway project settings, add these variables:

```
APP_NAME=LogiSync
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:YOUR_APP_KEY_HERE
FRONTEND_URL=https://your-vercel-app.vercel.app

# Database variables are auto-provided by Railway:
# MYSQLHOST, MYSQLPORT, MYSQLDATABASE, MYSQLUSER, MYSQLPASSWORD
```

**Generate APP_KEY:**
```bash
# Run locally:
cd backend
php artisan key:generate --show
# Copy the output and paste it into Railway
```

### 2.4 Set Root Directory

1. In Railway project → **Settings** → **Service Settings**
2. Set **Root Directory** to: `backend`
3. Click **"Save"**

### 2.5 Deploy

1. Railway will automatically deploy
2. Wait for deployment to complete (~3-5 minutes)
3. Get your backend URL: `https://your-app.railway.app`

### 2.6 Run Database Migrations

1. In Railway project → **Your Service** → **"Deployments"**
2. Click latest deployment → **"View Logs"**
3. Open **"Deploy"** tab
4. You'll see migrations run automatically

**OR** run manually via Railway CLI:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run migrations
railway run php artisan migrate --force

# Seed test data
railway run php artisan db:seed --class=MinimalGPSTestSeeder
```

---

## Step 3: Deploy Frontend to Vercel 🌐

### 3.1 Create Vercel Project

1. Go to https://vercel.com/
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository: `kairu9k/LogiSync`
4. Vercel will detect it's a Vite app

### 3.2 Configure Build Settings

**Framework Preset:** Vite
**Root Directory:** `frontend`
**Build Command:** `npm run build`
**Output Directory:** `dist`

### 3.3 Set Environment Variable

Add this environment variable in Vercel:

```
VITE_API_URL=https://your-backend.railway.app
```

Replace `your-backend.railway.app` with your actual Railway backend URL.

### 3.4 Deploy

1. Click **"Deploy"**
2. Wait for deployment (~2-3 minutes)
3. Get your frontend URL: `https://your-app.vercel.app`

### 3.5 Update Backend CORS

1. Go back to Railway
2. Update `FRONTEND_URL` environment variable:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```
3. Railway will automatically redeploy

---

## Step 4: Update API Configuration 🔧

### 4.1 Check Frontend API URL

Verify `frontend/src/lib/api.js` uses the environment variable:

```javascript
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
```

This is already configured! ✅

---

## Step 5: Test GPS Tracking 📍

### 5.1 Admin Dashboard Test

1. Open your Vercel URL: `https://your-app.vercel.app`
2. Click **"Sign In"**
3. Login with:
   - Email: `admin@logisync.com`
   - Password: `admin123`
4. Go to **Dashboard**
5. Check **"Live Tracking"** widget
6. You should see the test shipment

### 5.2 Driver Mobile Test

1. Open your Vercel URL on a **mobile device with GPS**
2. Go to: `https://your-app.vercel.app/driver/login`
3. Login with:
   - Email: `jose@logisync.com`
   - Password: `driver123`
4. Click on the active shipment
5. Click **"📍 Start GPS Tracking"**
6. **Allow location permissions** when prompted
7. GPS will update every 20 seconds

### 5.3 View Live Updates

1. On desktop, login as admin
2. Go to Dashboard → Live Tracking
3. Click on the shipment
4. You'll see the driver's location on the map updating in real-time!

---

## Troubleshooting 🔧

### GPS Not Working

**Problem:** "Location unavailable" error

**Solutions:**
1. ✅ Ensure you're using **HTTPS** (Vercel provides this automatically)
2. ✅ Use an actual **mobile device** (not desktop)
3. ✅ **Allow location permissions** in browser
4. ✅ Test **outdoors** for better GPS signal
5. ✅ Check browser console for errors

### Database Connection Errors

**Problem:** "SQLSTATE[HY000] [2002] Connection refused"

**Solutions:**
1. Check Railway MySQL database is running
2. Verify environment variables in Railway
3. Check Railway logs for errors

### CORS Errors

**Problem:** "Access to fetch blocked by CORS policy"

**Solutions:**
1. Verify `FRONTEND_URL` in Railway matches your Vercel URL exactly
2. Check `backend/routes/api.php` CORS headers
3. Redeploy backend after changing CORS settings

### 404 Errors on Frontend Routes

**Problem:** Refreshing page shows 404

**Solution:** Already fixed with `vercel.json` rewrites! ✅

---

## Environment Variables Summary

### Railway (Backend)
```
APP_NAME=LogiSync
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:your-key-here
FRONTEND_URL=https://your-vercel-app.vercel.app
```

### Vercel (Frontend)
```
VITE_API_URL=https://your-railway-app.railway.app
```

---

## Database Seeding

To add test data for GPS tracking:

```bash
# Via Railway CLI
railway run php artisan db:seed --class=MinimalGPSTestSeeder
```

This creates:
- ✅ Admin account (`admin@logisync.com`)
- ✅ Driver account (`jose@logisync.com`)
- ✅ Active shipment with GPS history
- ✅ Test warehouse, vehicle, and orders

---

## Cost Breakdown 💰

| Service | Free Tier | Limits |
|---------|-----------|--------|
| **Vercel** | ✅ Free | 100GB bandwidth/month |
| **Railway** | $5 credit/month | ~$5-10/month after credit |
| **Total** | ~$0-10/month | Perfect for testing! |

---

##  Monitoring & Logs

### Railway Logs
1. Go to Railway project → Your service
2. Click **"Deployments"** → Latest deployment
3. View **"Deploy Logs"** and **"Runtime Logs"**

### Vercel Logs
1. Go to Vercel project → **"Deployments"**
2. Click deployment → **"Functions"** tab
3. View real-time logs

---

## Next Steps After Testing

1. ✅ Test GPS tracking thoroughly
2. ✅ Test all other features (quotes, orders, shipments)
3. ✅ Verify email verification works
4. ✅ Test on multiple mobile devices
5. Consider upgrading to Hostinger VPS for production

---

## Quick Reference Links

- **Frontend (Vercel):** https://your-app.vercel.app
- **Backend (Railway):** https://your-backend.railway.app
- **Admin Login:** admin@logisync.com / admin123
- **Driver Login:** jose@logisync.com / driver123

---

## Support

If you encounter issues:
1. Check Railway & Vercel deployment logs
2. Test locally first to isolate the issue
3. Verify all environment variables are set correctly
4. Ensure database migrations ran successfully

---

**🎉 Happy Testing!**

Once GPS tracking works on deployment, you'll be ready for your thesis presentation! 🚀
