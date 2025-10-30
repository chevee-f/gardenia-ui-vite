# Email Notification Setup Guide

## ✅ Implementation Complete!

All code has been implemented. Now you just need to configure your Gmail credentials.

## 📧 How to Set Up Email Notifications

### Step 1: Get Gmail App Password

1. Go to [Google Account Security Settings](https://myaccount.google.com/security)
2. Enable **2-Step Verification** (if not already enabled)
3. Go to **App Passwords**:
   - You may need to search for "App Passwords" in the search bar
4. Generate a new App Password:
   - Select **Mail** as the app
   - Select **Other (Custom name)** as the device
   - Enter "Billing System" as the name
5. **Copy the 16-character password** (it looks like: `abcd efgh ijkl mnop`)

### Step 2: Set Up Convex Environment Secrets

Run these commands in your terminal (in the project directory):

```bash
# Replace with your actual Gmail address
npx convex env set GMAIL_USER "your-email@gmail.com"

# Replace with your 16-character App Password (no spaces)
npx convex env set GMAIL_APP_PASSWORD "abcdefghijklmnop"
```

### Step 3: Test the Feature

1. Open your billing page
2. Add some items to your billing statement
3. Click **Print** button
4. Click **Send Email Report** button
5. Check `chevee.kid@gmail.com` for the email!

## 📋 What's Included

### ✅ Backend (Convex)
- **convex/sendEmail.ts** - Sends HTML email via Gmail
- **convex/billing.ts** - Records print events to database
- **convex/schema.ts** - Added `billing_prints` table

### ✅ Frontend
- **src/pages/spare-parts/Billing.jsx**
  - Added "Send Email Report" button to Print Options modal
  - Helper function `notifyBillingPrint()` that sends email and logs event
  - Loading state management

### ✅ Email Content
The email includes:
- Billing statement type
- Total items count
- Total sales (DV)
- Total amount due
- Print time
- Nice HTML formatting

## 🎯 How It Works

```
User clicks "Send Email Report"
    ↓
notifyBillingPrint() calculates totals
    ↓
Sends email via Convex action (NodeMailer + Gmail)
    ↓
Logs event to billing_prints table
    ↓
Email sent to chevee.kid@gmail.com
```

## 🐛 Troubleshooting

### Email not sending?
1. Check browser console for error messages
2. Verify Convex secrets are set: `npx convex env ls`
3. Make sure Gmail App Password is correct (no spaces)
4. Check Convex dashboard for any errors

### Need to change email?
Edit `src/pages/spare-parts/Billing.jsx` line 520 & 529:
```javascript
recipientEmail: "chevee.kid@gmail.com" // Change this
```

### Want to test without sending?
Comment out the `sendBillingEmail` call in the `notifyBillingPrint` function.

## 📊 View Email History

All email notifications are logged in the `billing_prints` table in Convex. You can query this later for a dashboard/analytics.

---

**That's it! You're ready to send email notifications! 🚀**


