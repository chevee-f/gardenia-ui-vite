# Email Notification Setup Guide (Simplified)

## ⚠️ Important: Convex Limitation

Convex Actions have limited Node.js support, so we can't use NodeMailer directly. Instead, we'll use **EmailJS** - a free email service that works from the browser.

## ✅ Current Status

The email notification feature is working but only logs to the database. To enable **actual email sending**, you need to:

1. Sign up for EmailJS (free)
2. Configure it
3. Update the code

## 📧 Option 1: EmailJS (Recommended - Free)

### Setup:

1. **Sign up at [EmailJS](https://www.emailjs.com/)** (free tier: 200 emails/month)
2. Create an email service (Gmail)
3. Get your Public Key and Service ID
4. Update the code to use EmailJS client-side

### Code Changes Needed:

Replace the action call with client-side EmailJS:

```javascript
// In Billing.jsx, change notifyBillingPrint to:
const notifyBillingPrint = async (printType) => {
  // ... existing code ...
  
  // Send via EmailJS
  emailjs.send(
    'YOUR_SERVICE_ID',
    'YOUR_TEMPLATE_ID',
    {
      to: 'chevee.kid@gmail.com',
      subject: `Billing ${printType}`,
      message: `Total Items: ${itemCount}, Total: ₱${totalDue}`
    },
    'YOUR_PUBLIC_KEY'
  );
};
```

## 📧 Option 2: Keep Current Setup (Database Logging Only)

For now, the button works and saves to the database. You can:
- View email history in Convex dashboard
- Get a notification that button was clicked
- Manually send emails later based on logs

## 📧 Option 3: Use Flask Backend (app.py)

You already have `app.py`. We could add an email endpoint there using Flask-Mail.

## 📧 Option 4: Resend.com (Paid but Reliable)

1. Sign up at [Resend.com](https://resend.com)
2. Get API key
3. Use fetch() in action to call Resend API

## 🎯 Recommendation

**For now**: Keep the database logging working. It's already implemented and gives you a record of every "Send Email Report" click.

**Future**: Add EmailJS or Resend for actual email sending when you're ready.

---

**Current Implementation**: ✅ Button works, logs to database  
**Email Sending**: ⏳ Pending email service integration

