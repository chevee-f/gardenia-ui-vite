import { action } from "./_generated/server";
import { v } from "convex/values";

export const sendBillingEmail = action({
  args: {
    printType: v.string(),
    totalSales: v.number(),
    totalDue: v.number(),
    itemCount: v.number(),
    recipientEmail: v.string()
  },
  handler: async (ctx, args) => {
    // Get Resend API key from environment
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      console.log("Email notification (NO API KEY - logging only):", {
        to: args.recipientEmail,
        type: args.printType,
        totals: args.totalSales
      });
      return { success: true, message: "Email logged (no API key configured)" };
    }
    
    // Send email via Resend API
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
            📋 Billing Statement Notification
          </h2>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>Type:</strong> ${args.printType}</p>
            <p style="margin: 10px 0;"><strong>Total Items:</strong> ${args.itemCount}</p>
            <p style="margin: 10px 0;"><strong>Total Sales (DV):</strong> ₱${args.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p style="margin: 10px 0;"><strong>Total Amount Due:</strong> ₱${args.totalDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p style="margin: 10px 0;"><strong>Print Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}</p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            This is an automatic notification from the Billing System.
          </p>
        </div>
      `;
      
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "Billing System <onboarding@resend.dev>", // Change this to your verified domain
          to: [args.recipientEmail],
          subject: `Billing Statement ${args.printType} - ${new Date().toLocaleDateString()}`,
          html: emailHtml,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Resend API error:", errorText);
        return { success: false, error: errorText };
      }

      const result = await response.json();
      console.log("Email sent successfully:", result);
      
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error("Error sending email:", error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
});


