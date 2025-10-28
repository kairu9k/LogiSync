# LogiSync Railway Deployment Guide

## Step-by-Step Deployment Instructions

### Prerequisites
- [ ] GitHub account
- [ ] Railway account (sign up at https://railway.app)
- [ ] Code pushed to GitHub

---

## 1️⃣ Push Code to GitHub

```bash
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

---

## 2️⃣ Create Railway Project

1. Go to https://railway.app
2. Click **"Login"** → Sign in with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose **"LogiSync-Warp"** repository
6. Railway will ask which service to deploy first

---

## 3️⃣ Deploy Backend (Laravel)

1. When Railway asks "Which service?", select **"backend"** folder
2. Railway will auto-detect Laravel and start building
3. Wait for deployment to complete (~3-5 minutes)
4. Copy the backend URL (something like `https://logisync-backend-production.up.railway.app`)

---

## 4️⃣ Add MySQL Database

1. In your Railway project dashboard, click **"+ New"**
2. Select **"Database"** → **"Add MySQL"**
3. Railway automatically creates the database and connects it to your backend
4. No manual configuration needed!

---

## 5️⃣ Configure Backend Environment Variables

1. Click on your **backend service**
2. Go to **"Variables"** tab
3. Add these variables:

```env
APP_NAME=LogiSync
APP_ENV=production
APP_DEBUG=false
APP_URL=<your-backend-url>

FRONTEND_URL=<your-frontend-url-will-add-later>

MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-gmail-app-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=your-email@gmail.com
MAIL_FROM_NAME=LogiSync

PAYMONGO_PUBLIC_KEY=your-paymongo-public-key
PAYMONGO_SECRET_KEY=your-paymongo-secret-key

ABLY_KEY=your-ably-api-key
BROADCAST_CONNECTION=ably
```

4. Railway automatically adds database variables (MYSQLHOST, MYSQLPORT, etc.)

---

## 6️⃣ Run Database Migrations

1. In backend service, go to **"Settings"** → **"Deploy"**
2. The nixpacks.toml will automatically run migrations on deploy
3. Or manually run in Railway terminal:
   ```bash
   php artisan migrate --force
   ```

---

## 7️⃣ Deploy Frontend (React)

1. In Railway project, click **"+ New"** → **"GitHub Repo"**
2. Select **LogiSync-Warp** again
3. This time choose **"frontend"** folder
4. Railway will auto-detect Vite/React
5. Wait for build to complete (~2-3 minutes)
6. Copy the frontend URL

---

## 8️⃣ Update Frontend Environment Variable

1. Click on **frontend service**
2. Go to **"Variables"** tab
3. Add:
   ```env
   VITE_API_URL=<your-backend-url>
   ```
4. Redeploy frontend (it will auto-redeploy after variable change)

---

## 9️⃣ Update Backend CORS Settings

1. Go back to **backend service** → **"Variables"**
2. Update:
   ```env
   FRONTEND_URL=<your-frontend-url>
   ```
3. Redeploy backend

---

## 🎉 Done! Your App is Live!

### Your URLs:
- **Frontend:** `https://logisync-production.up.railway.app`
- **Backend API:** `https://logisync-backend-production.up.railway.app`
- **Database:** Managed by Railway (automatically connected)

---

## 📊 Import Your Database (Optional)

If you want to import your local XAMPP data:

1. Export from phpMyAdmin:
   - Open http://localhost/phpmyadmin
   - Select `logisync` database
   - Click "Export" → "Go"
   - Download the SQL file

2. Import to Railway:
   - In Railway, click on MySQL database
   - Click "Connect" → Copy connection details
   - Use MySQL Workbench or command line to import the SQL file

---

## 🔧 Troubleshooting

### Backend not starting?
- Check logs in Railway dashboard
- Ensure all environment variables are set
- Run migrations manually if needed

### Frontend can't connect to backend?
- Check VITE_API_URL is correct
- Ensure CORS is configured (FRONTEND_URL in backend)
- Check browser console for errors

### Database connection error?
- Railway auto-connects MySQL, but check Variables tab
- Ensure MYSQL* variables are present

---

## 💰 Costs

- **Free Tier:** $5 credit per month
- **Usage:** ~$5-10/month for small app
- **Database:** Included in usage costs

---

## 📝 Post-Deployment Checklist

- [ ] Backend is running
- [ ] Frontend is running
- [ ] Database is connected
- [ ] Migrations ran successfully
- [ ] Can register/login
- [ ] Can create orders/shipments
- [ ] Real-time notifications work
- [ ] Email sending works

---

Good luck with your deployment! 🚀
