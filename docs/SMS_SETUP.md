# SMS Notifications Setup Guide

LogiSync now supports SMS notifications when creating shipments! This guide will help you set up SMS functionality using Semaphore, a popular SMS gateway in the Philippines.

## Features

- ✅ Automatic SMS notifications when shipments are created
- ✅ Custom messages/notes included in notifications
- ✅ Philippine phone number formatting (+63)
- ✅ Graceful error handling (SMS failures won't block shipment creation)

## Setup Instructions

### 1. Create a Semaphore Account

1. Visit [https://semaphore.co/](https://semaphore.co/)
2. Click "Sign Up" and create an account
3. Verify your email address
4. Log in to your Semaphore account

### 2. Get Your API Key

1. Go to your Semaphore dashboard
2. Navigate to "Account" → "API Keys"
3. Copy your API key (it looks like: `abcd1234efgh5678...`)

### 3. Configure LogiSync

1. Open your `.env` file in the `backend` directory
2. Find the SMS configuration section (at the bottom):
   ```env
   # SMS Notifications (Semaphore - https://semaphore.co/)
   SEMAPHORE_API_KEY=your_api_key_here
   SEMAPHORE_SENDER_NAME=LogiSync
   ```
3. Replace `your_api_key_here` with your actual Semaphore API key
4. Optionally customize the sender name (max 11 characters)

### 4. Add the Database Column

Run the migration to add the `notes` column to the shipments table:

```bash
cd backend
mysql -u root -p logisync < database/migrations/add_notes_to_shipments.sql
```

Or manually execute:
```sql
ALTER TABLE `shipments`
ADD COLUMN `notes` TEXT NULL COMMENT 'Custom message/notes for the shipment'
AFTER `charges`;
```

### 5. Test the Integration

1. Create a new shipment from an order
2. Fill in the receiver's contact number (use Philippine format: 09XX XXX XXXX)
3. Add a custom message in the "Message to Customer" field
4. Submit the form

The receiver should receive an SMS with:
- Tracking number
- Destination
- Your custom message

## Phone Number Formats

The system automatically formats phone numbers to Philippine international format (+63):

| Input Format | Converted To | Example |
|-------------|-------------|---------|
| 09123456789 | +639123456789 | 09171234567 → +639171234567 |
| 9123456789 | +639123456789 | 9171234567 → +639171234567 |
| +639123456789 | +639123456789 | +639171234567 → +639171234567 |
| 639123456789 | +639123456789 | 639171234567 → +639171234567 |

## SMS Message Format

### Standard Message (no custom notes):
```
Hello Juan Dela Cruz! Your shipment #LS67890ABC123 is ready for dispatch to Davao City. Track at logisync.com. -LogiSync Team
```

### With Custom Notes:
```
Hello Juan Dela Cruz! Your shipment #LS67890ABC123 is ready for dispatch to Davao City. Message: Package will arrive between 2-4 PM. Please have payment ready... Track at logisync.com. -LogiSync Team
```

*Note: Custom messages are truncated to 100 characters in SMS to keep costs down.*

## Email Notifications

Emails work similarly and include the full custom message (not truncated):

```
Hello Juan Dela Cruz,

Your shipment has been created and is ready for dispatch!

Tracking Number: LS67890ABC123
Destination: Davao City
Estimated Charges: ₱1,500.00

Message from LogiSync:
---
Package will arrive between 2-4 PM. Please have payment ready. Please ensure someone is available to receive the package.
---

You can track your shipment status using the tracking number above.

If you have any questions, please contact us.

Best regards,
LogiSync Team
Davao City, Philippines
```

## Pricing

Semaphore charges per SMS sent:
- **₱0.70-1.00 per SMS** (rates vary by plan)
- Free credits available for new accounts
- Check current rates at [https://semaphore.co/pricing](https://semaphore.co/pricing)

## Troubleshooting

### SMS not being sent?

1. **Check your API key**: Make sure `SEMAPHORE_API_KEY` is set correctly in `.env`
2. **Check account balance**: Log in to Semaphore and verify you have sufficient credits
3. **Check logs**: Review `storage/logs/laravel.log` for error messages
4. **Test phone number**: Make sure the receiver's contact number is valid

### Common Errors:

| Error | Solution |
|-------|----------|
| "Semaphore API key not configured" | Add your API key to `.env` file |
| "Invalid phone number" | Use Philippine format (09XX XXX XXXX or +639XX XXX XXXX) |
| "Insufficient balance" | Top up your Semaphore account |
| "Invalid sender name" | Sender name must be ≤11 characters |

### Testing Without SMS

If you want to disable SMS temporarily:
1. Leave `SEMAPHORE_API_KEY` empty in `.env`
2. SMS will be skipped (warning logged) but shipments will still be created
3. Email notifications will still work

## Support

- **Semaphore Support**: [https://semaphore.co/contact](https://semaphore.co/contact)
- **Semaphore Documentation**: [https://semaphore.co/docs](https://semaphore.co/docs)

## Alternative SMS Providers

While this guide uses Semaphore, you can modify the `sendSMS()` method in `ShipmentController.php` to use other providers:

- **Twilio**: [https://www.twilio.com/](https://www.twilio.com/)
- **Vonage (Nexmo)**: [https://www.vonage.com/](https://www.vonage.com/)
- **Globe Labs**: [https://www.globelabs.com.ph/](https://www.globelabs.com.ph/)
- **Smart DevNet**: [https://developer.smart.com.ph/](https://developer.smart.com.ph/)

## Code Reference

The SMS functionality is implemented in:
- **Backend**: `backend/app/Http/Controllers/Api/ShipmentController.php` (lines 272-696)
- **Frontend**: `frontend/src/pages/app/OrderDetail.jsx` (CreateShipmentForm component)
- **Database**: `backend/database/migrations/add_notes_to_shipments.sql`
