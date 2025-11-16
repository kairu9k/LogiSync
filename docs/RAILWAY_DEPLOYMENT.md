# Railway Deployment Guide for LogiSync

## Prerequisites
- Railway account (https://railway.app)
- GitHub account (to connect repository)
- Your project pushed to GitHub

## Step 1: Push to GitHub

```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

## Step 2: Create Railway Project

1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select your LogiSync repository
4. Railway will auto-detect it as a PHP/Laravel project

## Step 3: Add MySQL Database

1. In your Railway project, click "New" → "Database" → "MySQL"
2. Railway will automatically create the database and connection variables

## Step 4: Set Environment Variables

In Railway project settings → Variables, add these:

### Required Variables:
```
APP_NAME=LogiSync
APP_ENV=production
APP_KEY=base64:R6LGvVtrGQ7gZ5z7tOdvM8szNqDH81jYhViOcKqPRao=
APP_DEBUG=false
APP_URL=https://your-app.railway.app

# Database (Railway auto-fills these)
DB_CONNECTION=mysql
MYSQL_HOST=${{MYSQL.MYSQL_HOST}}
MYSQL_PORT=${{MYSQL.MYSQL_PORT}}
MYSQL_DATABASE=${{MYSQL.MYSQL_DATABASE}}
MYSQL_USER=${{MYSQL.MYSQL_USER}}
MYSQL_PASSWORD=${{MYSQL.MYSQL_PASSWORD}}

# Use Railway MySQL variables
DB_HOST=${{MYSQL.MYSQL_HOST}}
DB_PORT=${{MYSQL.MYSQL_PORT}}
DB_DATABASE=${{MYSQL.MYSQL_DATABASE}}
DB_USERNAME=${{MYSQL.MYSQL_USER}}
DB_PASSWORD=${{MYSQL.MYSQL_PASSWORD}}

# Email (Gmail SMTP - Add your own credentials)
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=your_email@gmail.com
MAIL_FROM_NAME=LogiSync

# PayMongo (Add your own keys from PayMongo dashboard)
PAYMONGO_PUBLIC_KEY=your_paymongo_public_key
PAYMONGO_SECRET_KEY=your_paymongo_secret_key

# Ably (for real-time tracking - Add your own key from Ably dashboard)
ABLY_KEY=your_ably_api_key
BROADCAST_CONNECTION=ably

# Frontend URL (update after deployment)
FRONTEND_URL=https://your-app.railway.app
```

## Step 5: Deploy

1. Railway will automatically deploy when you push to GitHub
2. Wait for build to complete (~5-10 minutes)
3. Railway will run migrations automatically
4. Access your app at the provided URL

## Step 6: Seed Subscription Plans

After first deployment, run this command in Railway terminal:

```bash
php artisan db:seed --class=SubscriptionPlansSeeder
```

## Step 7: Update Frontend API URL

Update `frontend/.env` to use your Railway backend URL:

```
VITE_API_URL=https://your-app.railway.app/api
```

Then redeploy.

## Testing Live Tracking

Once deployed:
1. Register an account
2. Create orders
3. Create shipment with packages
4. Assign to driver
5. Driver can update location in real-time
6. Track on map with live updates via Ably

## Troubleshooting

### Build Fails
- Check Railway build logs
- Ensure all dependencies in `composer.json` are correct
- Check PHP version compatibility

### Database Connection Error
- Verify DATABASE_URL is set correctly
- Check MySQL service is running in Railway

### Migrations Fail
- Manually run: `php artisan migrate:fresh --force --seed`
- Check database permissions

### App Key Error
Generate new key: `php artisan key:generate --show`
Copy output to `APP_KEY` in Railway variables

## Important Notes

- Railway provides a free tier with limitations
- Database persists between deployments
- Use environment variables, not hardcoded values
- Monitor usage to avoid overages
- Set up custom domain if needed (Settings → Domains)

## Post-Deployment

1. Test all features (registration, orders, shipments)
2. Test live tracking with driver app
3. Test email notifications
4. Test PayMongo payments
5. Monitor logs for errors

## Support

Railway Docs: https://docs.railway.app
Railway Discord: https://discord.gg/railway
