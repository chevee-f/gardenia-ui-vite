import { action } from "./_generated/server";
import { v } from "convex/values";

// Cykris Billing Email - for /cykris-billing
export const sendCykrisBillingEmail = action({
  args: {
    printType: v.string(),
    totalSales: v.number(),
    totalDue: v.number(),
    itemCount: v.number(),
    recipientEmail: v.union(v.string(), v.array(v.string())),
    items: v.optional(
      v.array(
        v.object({
          drNo: v.optional(v.string()),
          destination: v.optional(v.string()),
          description: v.optional(v.string()),
          quantity: v.optional(v.union(v.number(), v.string())),
          unit: v.optional(v.string()),
          amount: v.optional(v.number()),
          waybillNo: v.optional(v.string()),
          wbDate: v.optional(v.string()),
          drDate: v.optional(v.string()),
          percent: v.optional(v.number()),
          charges: v.optional(v.number()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    // Get Brevo API key and from address from environment
    const brevoApiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.BREVO_FROM_EMAIL || "noreply@sendinblue.com";
    const fromName = process.env.BREVO_FROM_NAME || "Billing System";
    
    if (!brevoApiKey) {
      console.log("Email notification (NO API KEY - logging only):", {
        to: Array.isArray(args.recipientEmail) ? args.recipientEmail : [args.recipientEmail],
        type: args.printType,
        totals: args.totalSales,
        itemCount: args.itemCount,
        itemsPreview: (args.items ?? []).slice(0, 10),
      });
      return { success: true, message: "Email logged (no API key configured)" };
    }

    // Build paginated items table HTML for Cykris billing (12 items per page)
    const itemsPerPage = 12;
    const allItems = args.items ?? [];
    const totalPages = Math.ceil(allItems.length / itemsPerPage);
    
    const itemsTableHtml =
      allItems.length > 0
        ? Array.from({ length: totalPages }, (_, pageIndex) => {
            const startIndex = pageIndex * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, allItems.length);
            const pageItems = allItems.slice(startIndex, endIndex);
            
            // Calculate page totals
            const pageTotalDV = pageItems.reduce((sum, item) => {
              const amount = typeof item.amount === "number" ? item.amount : 0;
              return sum + amount;
            }, 0);
            const pageTotalCharges = pageItems.reduce((sum, item) => {
              const charges = typeof item.charges === "number" ? item.charges : 0;
              return sum + charges;
            }, 0);
            
            return `
              <div style="margin-top: ${pageIndex === 0 ? '20px' : '40px'}; page-break-inside: avoid;">
                ${totalPages > 1 ? `
                <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #111827;">
                  Page ${pageIndex + 1} of ${totalPages}
                </h3>
                ` : ''}
                <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px; background-color: #ffffff;">
                    <thead>
                      <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">DR#</th>
                        <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Destination</th>
                        <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Description</th>
                        <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                        <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Unit</th>
                        <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Amount</th>
                        <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Waybill No</th>
                        <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">WB Date</th>
                        <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">DR Date</th>
                        <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">%</th>
                        <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Charges</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${pageItems
                        .map((item, idx) => {
                          const amount =
                            typeof item.amount === "number"
                              ? item.amount
                              : typeof item.charges === "number"
                              ? item.charges
                              : undefined;
                          const percent =
                            typeof item.percent === "number" ? item.percent : undefined;
                          const charges =
                            typeof item.charges === "number" ? item.charges : undefined;
                          const qty =
                            typeof item.quantity === "number"
                              ? item.quantity.toString()
                              : item.quantity ?? "";
                          const rowBg = idx % 2 === 0 ? "#ffffff" : "#f9fafb";
                          return `
                            <tr style="background-color: ${rowBg};">
                              <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 500;">${item.drNo ?? ""}</td>
                              <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${item.destination ?? ""}</td>
                              <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${item.description ?? ""}</td>
                              <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827; text-align: right; font-weight: 500;">${qty}</td>
                              <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${item.unit ?? ""}</td>
                              <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827; text-align: right; font-weight: 600;">
                                ${
                                  amount !== undefined
                                    ? "₱" +
                                      amount.toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })
                                    : ""
                                }
                              </td>
                              <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${item.waybillNo ?? ""}</td>
                              <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${item.wbDate ?? ""}</td>
                              <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${item.drDate ?? ""}</td>
                              <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827; text-align: right; font-weight: 500;">${
                                percent !== undefined ? percent.toString() : ""
                              }</td>
                              <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827; text-align: right; font-weight: 600;">
                                ${
                                  charges !== undefined
                                    ? "₱" +
                                      charges.toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })
                                    : ""
                                }
                              </td>
                            </tr>
                          `;
                        })
                        .join("")}
                    </tbody>
                  </table>
                </div>
                ${totalPages > 1 ? `
                <div style="background-color: #f9fafb; padding: 12px; margin-top: 12px; border-radius: 4px; border: 1px solid #e5e7eb;">
                  <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
                    <span>Page ${pageIndex + 1} Total Sales (DV):</span>
                    <span>₱${pageTotalDV.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 8px;">
                    <span>Page ${pageIndex + 1} Total Charges:</span>
                    <span>₱${pageTotalCharges.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
                ` : ''}
              </div>
            `;
          }).join("")
        : "";

    // Send email via Brevo API
    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">
                        📋 Cykris Billing Statement
                      </h1>
                      <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                        ${args.printType}
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Summary Cards -->
                  <tr>
                    <td style="padding: 32px 40px 24px 40px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="50%" style="padding-right: 12px; vertical-align: top;">
                            <div style="background: linear-gradient(135deg, #f6f8fb 0%, #e9ecef 100%); border-radius: 8px; padding: 20px; border-left: 4px solid #667eea;">
                              <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Total Items</div>
                              <div style="color: #111827; font-size: 28px; font-weight: 700;">${args.itemCount}</div>
                            </div>
                          </td>
                          <td width="50%" style="padding-left: 12px; vertical-align: top;">
                            <div style="background: linear-gradient(135deg, #f6f8fb 0%, #e9ecef 100%); border-radius: 8px; padding: 20px; border-left: 4px solid #10b981;">
                              <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Total Amount Due</div>
                              <div style="color: #111827; font-size: 28px; font-weight: 700;">₱${args.totalDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2" style="padding-top: 16px;">
                            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 20px; border-left: 4px solid #f59e0b;">
                              <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Total Sales (DV)</div>
                              <div style="color: #111827; font-size: 32px; font-weight: 700;">₱${args.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2" style="padding-top: 16px;">
                            <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb;">
                              <div style="color: #6b7280; font-size: 12px; font-weight: 500; margin-bottom: 4px;">Print Time</div>
                              <div style="color: #111827; font-size: 14px; font-weight: 500;">${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}</div>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Billing Items Table -->
                  <tr>
                    <td style="padding: 0 40px 32px 40px;">
                      ${itemsTableHtml}
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
                      <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                        This is an automatic notification from the <strong>Cykris Billing System</strong>.<br>
                        <span style="color: #9ca3af; font-size: 12px;">Generated on ${new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}</span>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;
      
      // Convert recipient emails to Brevo format (array of objects)
      const recipientEmails = Array.isArray(args.recipientEmail) ? args.recipientEmail : [args.recipientEmail];
      const toRecipients = recipientEmails.map(email => ({ email }));
      
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": brevoApiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Brevo API error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          recipients: toRecipients,
        });
        return { success: false, error: errorText, status: response.status };
      }

      const result = await response.json();
      console.log("Email sent successfully:", {
        result,
        recipients: toRecipients,
        fromEmail,
        fromName,
      });
      
      // Brevo returns messageId, not id
      return { success: true, messageId: result.messageId || result.id };
    } catch (error) {
      console.error("Error sending email:", error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
});

// Spare Parts Billing Email - for /billing
export const sendSparePartsBillingEmail = action({
  args: {
    printType: v.string(),
    totalSales: v.number(),
    totalDue: v.number(),
    itemCount: v.number(),
    recipientEmail: v.union(v.string(), v.array(v.string())),
    items: v.optional(
      v.array(
        v.object({
          amount: v.optional(v.number()),
          charges: v.optional(v.number()),
          description: v.optional(v.string()),
          destination: v.optional(v.string()),
          drDate: v.optional(v.string()),
          drNo: v.optional(v.string()),
          percent: v.optional(v.number()),
          quantity: v.optional(v.union(v.number(), v.string())),
          unit: v.optional(v.string()),
          waybillNo: v.optional(v.string()),
          wbDate: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    // Get Brevo API key and from address from environment
    const brevoApiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.BREVO_FROM_EMAIL || "noreply@sendinblue.com";
    const fromName = process.env.BREVO_FROM_NAME || "Billing System";
    
    if (!brevoApiKey) {
      console.log("Email notification (NO API KEY - logging only):", {
        to: Array.isArray(args.recipientEmail) ? args.recipientEmail : [args.recipientEmail],
        type: args.printType,
        totals: args.totalSales,
        itemCount: args.itemCount,
        itemsPreview: (args.items ?? []).slice(0, 10),
      });
      return { success: true, message: "Email logged (no API key configured)" };
    }

    // Build paginated items table HTML for Spare Parts billing (22 items per page)
    const itemsPerPage = 22;
    const allItems = args.items ?? [];
    const totalPages = Math.ceil(allItems.length / itemsPerPage);
    
    const itemsTableHtml =
      allItems.length > 0
        ? Array.from({ length: totalPages }, (_, pageIndex) => {
            const startIndex = pageIndex * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, allItems.length);
            const pageItems = allItems.slice(startIndex, endIndex);
            
            // Calculate page totals
            const pageTotalDV = pageItems.reduce((sum, item) => {
              const amount = typeof item.amount === "number" ? item.amount : 0;
              return sum + amount;
            }, 0);
            const pageTotalCharges = pageItems.reduce((sum, item) => {
              const charges = typeof item.charges === "number" ? item.charges : 0;
              return sum + charges;
            }, 0);
            
            return `
              <div style="margin-top: ${pageIndex === 0 ? '20px' : '40px'}; page-break-inside: avoid;">
                ${totalPages > 1 ? `
                <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #111827;">
                  Page ${pageIndex + 1} of ${totalPages}
                </h3>
                ` : ''}
                <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px; background-color: #ffffff;">
                    <thead>
                      <tr style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                        <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Waybill No</th>
                        <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">WB Date</th>
                        <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Destination</th>
                        <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">DR#</th>
                        <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">DR Date</th>
                        <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Amount (DV)</th>
                        <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">%</th>
                        <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Charges</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${pageItems
                        .map((item, idx) => {
                          const amount =
                            typeof item.amount === "number" ? item.amount : undefined;
                          const percent =
                            typeof item.percent === "number" ? item.percent : undefined;
                          const charges =
                            typeof item.charges === "number" ? item.charges : undefined;
                          const rowBg = idx % 2 === 0 ? "#ffffff" : "#f9fafb";
                          return `
                            <tr style="background-color: ${rowBg};">
                              <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 500;">${item.waybillNo ?? ""}</td>
                              <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${item.wbDate ?? ""}</td>
                              <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${item.destination ?? ""}</td>
                              <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 500;">${item.drNo ?? ""}</td>
                              <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${item.drDate ?? ""}</td>
                              <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827; text-align: right; font-weight: 600;">
                                ${
                                  amount !== undefined
                                    ? "₱" +
                                      amount.toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })
                                    : ""
                                }
                              </td>
                              <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827; text-align: right; font-weight: 500;">${
                                percent !== undefined ? percent.toString() : ""
                              }</td>
                              <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827; text-align: right; font-weight: 600;">
                                ${
                                  charges !== undefined
                                    ? "₱" +
                                      charges.toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })
                                    : ""
                                }
                              </td>
                            </tr>
                          `;
                        })
                        .join("")}
                    </tbody>
                  </table>
                </div>
                ${totalPages > 1 ? `
                <div style="background-color: #f9fafb; padding: 12px; margin-top: 12px; border-radius: 4px; border: 1px solid #e5e7eb;">
                  <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
                    <span>Page ${pageIndex + 1} Total Sales (DV):</span>
                    <span>₱${pageTotalDV.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 8px;">
                    <span>Page ${pageIndex + 1} Total Charges:</span>
                    <span>₱${pageTotalCharges.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
                ` : ''}
              </div>
            `;
          }).join("")
        : "";

    // Send email via Brevo API
    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">
                        📋 Spare Parts Billing Statement
                      </h1>
                      <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                        ${args.printType}
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Summary Cards -->
                  <tr>
                    <td style="padding: 32px 40px 24px 40px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="50%" style="padding-right: 12px; vertical-align: top;">
                            <div style="background: linear-gradient(135deg, #f6f8fb 0%, #e9ecef 100%); border-radius: 8px; padding: 20px; border-left: 4px solid #10b981;">
                              <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Total Items</div>
                              <div style="color: #111827; font-size: 28px; font-weight: 700;">${args.itemCount}</div>
                            </div>
                          </td>
                          <td width="50%" style="padding-left: 12px; vertical-align: top;">
                            <div style="background: linear-gradient(135deg, #f6f8fb 0%, #e9ecef 100%); border-radius: 8px; padding: 20px; border-left: 4px solid #f59e0b;">
                              <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Total Amount Due</div>
                              <div style="color: #111827; font-size: 28px; font-weight: 700;">₱${args.totalDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2" style="padding-top: 16px;">
                            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 20px; border-left: 4px solid #f59e0b;">
                              <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Total Sales (DV)</div>
                              <div style="color: #111827; font-size: 32px; font-weight: 700;">₱${args.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2" style="padding-top: 16px;">
                            <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb;">
                              <div style="color: #6b7280; font-size: 12px; font-weight: 500; margin-bottom: 4px;">Print Time</div>
                              <div style="color: #111827; font-size: 14px; font-weight: 500;">${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}</div>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Billing Items Table -->
                  <tr>
                    <td style="padding: 0 40px 32px 40px;">
                      ${itemsTableHtml}
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
                      <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                        This is an automatic notification from the <strong>Spare Parts Billing System</strong>.<br>
                        <span style="color: #9ca3af; font-size: 12px;">Generated on ${new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}</span>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;
      
      // Convert recipient emails to Brevo format (array of objects)
      const recipientEmails = Array.isArray(args.recipientEmail) ? args.recipientEmail : [args.recipientEmail];
      const toRecipients = recipientEmails.map(email => ({ email }));
      
      const requestBody = {
        sender: {
          name: fromName,
          email: fromEmail,
        },
        to: toRecipients,
        subject: `Spare Parts Billing Statement ${args.printType} - ${new Date().toLocaleDateString()}`,
        htmlContent: emailHtml,
      };
      
      console.log("Sending email via Brevo:", {
        from: { name: fromName, email: fromEmail },
        to: toRecipients,
        subject: requestBody.subject,
        hasApiKey: !!brevoApiKey,
      });
      
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": brevoApiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Brevo API error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          recipients: toRecipients,
        });
        return { success: false, error: errorText, status: response.status };
      }

      const result = await response.json();
      console.log("Email sent successfully:", {
        result,
        recipients: toRecipients,
        fromEmail,
        fromName,
      });
      
      // Brevo returns messageId, not id
      return { success: true, messageId: result.messageId || result.id };
    } catch (error) {
      console.error("Error sending email:", error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
});

// Legacy function - kept for backward compatibility
export const sendBillingEmail = action({
  args: {
    printType: v.string(),
    totalSales: v.number(),
    totalDue: v.number(),
    itemCount: v.number(),
    recipientEmail: v.union(v.string(), v.array(v.string())),
    items: v.optional(
      v.array(
        v.object({
          // Common Cykris fields
          drNo: v.optional(v.string()),
          destination: v.optional(v.string()),
          description: v.optional(v.string()),
          quantity: v.optional(v.union(v.number(), v.string())),
          unit: v.optional(v.string()),
          amount: v.optional(v.number()),
          // Spare-parts specific fields
          waybillNo: v.optional(v.string()),
          wbDate: v.optional(v.string()),
          drDate: v.optional(v.string()),
          percent: v.optional(v.number()),
          charges: v.optional(v.number()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    // Get Brevo API key and from address from environment
    const brevoApiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.BREVO_FROM_EMAIL || "noreply@sendinblue.com";
    const fromName = process.env.BREVO_FROM_NAME || "Billing System";
    
    if (!brevoApiKey) {
      console.log("Email notification (NO API KEY - logging only):", {
        to: Array.isArray(args.recipientEmail) ? args.recipientEmail : [args.recipientEmail],
        type: args.printType,
        totals: args.totalSales,
        itemCount: args.itemCount,
        itemsPreview: (args.items ?? []).slice(0, 10),
      });
      return { success: true, message: "Email logged (no API key configured)" };
    }

    // Build optional items table HTML (shared for all billing types)
    const itemsTableHtml =
      args.items && args.items.length
        ? `
          <div style="margin-top: 20px;">
            <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #111827; font-weight: 600;">
              Billing Items (first ${Math.min(args.items.length, 100)} shown)
            </h3>
            <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; background-color: #ffffff;">
                <thead>
                  <tr style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
                    <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">DR#</th>
                    <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Destination</th>
                    <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Description</th>
                    <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                    <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Unit</th>
                    <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Amount</th>
                    <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Waybill No</th>
                    <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">WB Date</th>
                    <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">DR Date</th>
                    <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">%</th>
                    <th style="padding: 12px 10px; color: #ffffff; font-weight: 600; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Charges</th>
                  </tr>
                </thead>
                <tbody>
                  ${(args.items ?? [])
                    .slice(0, 100)
                    .map((item, idx) => {
                      const amount =
                        typeof item.amount === "number"
                          ? item.amount
                          : typeof item.charges === "number"
                          ? item.charges
                          : undefined;
                      const percent =
                        typeof item.percent === "number" ? item.percent : undefined;
                      const charges =
                        typeof item.charges === "number" ? item.charges : undefined;
                      const qty =
                        typeof item.quantity === "number"
                          ? item.quantity.toString()
                          : item.quantity ?? "";
                      const rowBg = idx % 2 === 0 ? "#ffffff" : "#f9fafb";
                      return `
                        <tr style="background-color: ${rowBg};">
                          <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 500;">${item.drNo ?? ""}</td>
                          <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${item.destination ?? ""}</td>
                          <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${item.description ?? ""}</td>
                          <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827; text-align: right; font-weight: 500;">${qty}</td>
                          <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${item.unit ?? ""}</td>
                          <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827; text-align: right; font-weight: 600;">
                            ${
                              amount !== undefined
                                ? "₱" +
                                  amount.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })
                                : ""
                            }
                          </td>
                          <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${item.waybillNo ?? ""}</td>
                          <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${item.wbDate ?? ""}</td>
                          <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${item.drDate ?? ""}</td>
                          <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827; text-align: right; font-weight: 500;">${
                            percent !== undefined ? percent.toString() : ""
                          }</td>
                          <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827; text-align: right; font-weight: 600;">
                            ${
                              charges !== undefined
                                ? "₱" +
                                  charges.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })
                                : ""
                            }
                          </td>
                        </tr>
                      `;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>
        `
        : "";

    // Send email via Brevo API
    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 32px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">
                        📋 Billing Statement
                      </h1>
                      <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                        ${args.printType}
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Summary Cards -->
                  <tr>
                    <td style="padding: 32px 40px 24px 40px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="50%" style="padding-right: 12px; vertical-align: top;">
                            <div style="background: linear-gradient(135deg, #f6f8fb 0%, #e9ecef 100%); border-radius: 8px; padding: 20px; border-left: 4px solid #3b82f6;">
                              <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Total Items</div>
                              <div style="color: #111827; font-size: 28px; font-weight: 700;">${args.itemCount}</div>
                            </div>
                          </td>
                          <td width="50%" style="padding-left: 12px; vertical-align: top;">
                            <div style="background: linear-gradient(135deg, #f6f8fb 0%, #e9ecef 100%); border-radius: 8px; padding: 20px; border-left: 4px solid #10b981;">
                              <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Total Amount Due</div>
                              <div style="color: #111827; font-size: 28px; font-weight: 700;">₱${args.totalDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2" style="padding-top: 16px;">
                            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 20px; border-left: 4px solid #f59e0b;">
                              <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Total Sales (DV)</div>
                              <div style="color: #111827; font-size: 32px; font-weight: 700;">₱${args.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2" style="padding-top: 16px;">
                            <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb;">
                              <div style="color: #6b7280; font-size: 12px; font-weight: 500; margin-bottom: 4px;">Print Time</div>
                              <div style="color: #111827; font-size: 14px; font-weight: 500;">${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}</div>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Billing Items Table -->
                  <tr>
                    <td style="padding: 0 40px 32px 40px;">
                      ${itemsTableHtml}
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
                      <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                        This is an automatic notification from the <strong>Billing System</strong>.<br>
                        <span style="color: #9ca3af; font-size: 12px;">Generated on ${new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}</span>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;
      
      // Convert recipient emails to Brevo format (array of objects)
      const recipientEmails = Array.isArray(args.recipientEmail) ? args.recipientEmail : [args.recipientEmail];
      const toRecipients = recipientEmails.map(email => ({ email }));
      
      const requestBody = {
        sender: {
          name: fromName,
          email: fromEmail,
        },
        to: toRecipients,
        subject: `Billing Statement ${args.printType} - ${new Date().toLocaleDateString()}`,
        htmlContent: emailHtml,
      };
      
      console.log("Sending email via Brevo:", {
        from: { name: fromName, email: fromEmail },
        to: toRecipients,
        subject: requestBody.subject,
        hasApiKey: !!brevoApiKey,
      });
      
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": brevoApiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Brevo API error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          recipients: toRecipients,
        });
        return { success: false, error: errorText, status: response.status };
      }

      const result = await response.json();
      console.log("Email sent successfully:", {
        result,
        recipients: toRecipients,
        fromEmail,
        fromName,
      });
      
      // Brevo returns messageId, not id
      return { success: true, messageId: result.messageId || result.id };
    } catch (error) {
      console.error("Error sending email:", error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
});


