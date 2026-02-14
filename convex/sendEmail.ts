import { action } from "./_generated/server";
import { v } from "convex/values";

// Cykris Billing Email - for /cykris-billing
export const sendCykrisBillingEmail = action({
  args: {
    printType: v.string(),
    totalSales: v.number(),
    totalDue: v.number(),
    itemCount: v.number(),
    recipientEmail: v.string(),
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
    // Get Resend API key from environment
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      console.log("Email notification (NO API KEY - logging only):", {
        to: args.recipientEmail,
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
                <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #111827;">
                  Page ${pageIndex + 1} of ${totalPages}
                </h3>
                <div style="overflow-x: auto;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                      <tr style="background-color: #f3f4f6;">
                        <th style="border: 1px solid #d1d5db; padding: 4px;">DR#</th>
                        <th style="border: 1px solid #d1d5db; padding: 4px;">Destination</th>
                        <th style="border: 1px solid #d1d5db; padding: 4px;">Description</th>
                        <th style="border: 1px solid #d1d5db; padding: 4px;">Qty</th>
                        <th style="border: 1px solid #d1d5db; padding: 4px;">Unit</th>
                        <th style="border: 1px solid #d1d5db; padding: 4px;">Amount</th>
                        <th style="border: 1px solid #d1d5db; padding: 4px;">Waybill No</th>
                        <th style="border: 1px solid #d1d5db; padding: 4px;">WB Date</th>
                        <th style="border: 1px solid #d1d5db; padding: 4px;">DR Date</th>
                        <th style="border: 1px solid #d1d5db; padding: 4px;">%</th>
                        <th style="border: 1px solid #d1d5db; padding: 4px;">Charges</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${pageItems
                        .map((item) => {
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
                          return `
                            <tr>
                              <td style="border: 1px solid #e5e7eb; padding: 4px;">${item.drNo ?? ""}</td>
                              <td style="border: 1px solid #e5e7eb; padding: 4px;">${item.destination ?? ""}</td>
                              <td style="border: 1px solid #e5e7eb; padding: 4px;">${item.description ?? ""}</td>
                              <td style="border: 1px solid #e5e7eb; padding: 4px; text-align: right;">${qty}</td>
                              <td style="border: 1px solid #e5e7eb; padding: 4px;">${item.unit ?? ""}</td>
                              <td style="border: 1px solid #e5e7eb; padding: 4px; text-align: right;">
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
                              <td style="border: 1px solid #e5e7eb; padding: 4px;">${item.waybillNo ?? ""}</td>
                              <td style="border: 1px solid #e5e7eb; padding: 4px;">${item.wbDate ?? ""}</td>
                              <td style="border: 1px solid #e5e7eb; padding: 4px;">${item.drDate ?? ""}</td>
                              <td style="border: 1px solid #e5e7eb; padding: 4px; text-align: right;">${
                                percent !== undefined ? percent.toString() : ""
                              }</td>
                              <td style="border: 1px solid #e5e7eb; padding: 4px; text-align: right;">
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
              </div>
            `;
          }).join("")
        : "";

    // Send email via Resend API
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
            📋 Cykris Billing Statement Notification
          </h2>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>Type:</strong> ${args.printType}</p>
            <p style="margin: 10px 0;"><strong>Total Items:</strong> ${args.itemCount}</p>
            <p style="margin: 10px 0;"><strong>Total Sales (DV):</strong> ₱${args.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p style="margin: 10px 0;"><strong>Total Amount Due:</strong> ₱${args.totalDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p style="margin: 10px 0;"><strong>Print Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}</p>
          </div>
          
          ${itemsTableHtml}
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            This is an automatic notification from the Cykris Billing System.
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
          subject: `Cykris Billing Statement ${args.printType} - ${new Date().toLocaleDateString()}`,
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

// Spare Parts Billing Email - for /billing
export const sendSparePartsBillingEmail = action({
  args: {
    printType: v.string(),
    totalSales: v.number(),
    totalDue: v.number(),
    itemCount: v.number(),
    recipientEmail: v.string(),
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
    // Get Resend API key from environment
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      console.log("Email notification (NO API KEY - logging only):", {
        to: args.recipientEmail,
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
                <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #111827;">
                  Page ${pageIndex + 1} of ${totalPages}
                </h3>
                <div style="overflow-x: auto;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                      <tr style="background-color: #f3f4f6;">
                        <th style="border: 1px solid #d1d5db; padding: 4px;">Waybill No</th>
                        <th style="border: 1px solid #d1d5db; padding: 4px;">WB Date</th>
                        <th style="border: 1px solid #d1d5db; padding: 4px;">Destination</th>
                        <th style="border: 1px solid #d1d5db; padding: 4px;">DR#</th>
                        <th style="border: 1px solid #d1d5db; padding: 4px;">DR Date</th>
                        <th style="border: 1px solid #d1d5db; padding: 4px;">Amount (DV)</th>
                        <th style="border: 1px solid #d1d5db; padding: 4px;">%</th>
                        <th style="border: 1px solid #d1d5db; padding: 4px;">Charges</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${pageItems
                        .map((item) => {
                          const amount =
                            typeof item.amount === "number" ? item.amount : undefined;
                          const percent =
                            typeof item.percent === "number" ? item.percent : undefined;
                          const charges =
                            typeof item.charges === "number" ? item.charges : undefined;
                          return `
                            <tr>
                              <td style="border: 1px solid #e5e7eb; padding: 4px;">${item.waybillNo ?? ""}</td>
                              <td style="border: 1px solid #e5e7eb; padding: 4px;">${item.wbDate ?? ""}</td>
                              <td style="border: 1px solid #e5e7eb; padding: 4px;">${item.destination ?? ""}</td>
                              <td style="border: 1px solid #e5e7eb; padding: 4px;">${item.drNo ?? ""}</td>
                              <td style="border: 1px solid #e5e7eb; padding: 4px;">${item.drDate ?? ""}</td>
                              <td style="border: 1px solid #e5e7eb; padding: 4px; text-align: right;">
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
                              <td style="border: 1px solid #e5e7eb; padding: 4px; text-align: right;">${
                                percent !== undefined ? percent.toString() : ""
                              }</td>
                              <td style="border: 1px solid #e5e7eb; padding: 4px; text-align: right;">
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
              </div>
            `;
          }).join("")
        : "";

    // Send email via Resend API
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
            📋 Spare Parts Billing Statement Notification
          </h2>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>Type:</strong> ${args.printType}</p>
            <p style="margin: 10px 0;"><strong>Total Items:</strong> ${args.itemCount}</p>
            <p style="margin: 10px 0;"><strong>Total Sales (DV):</strong> ₱${args.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p style="margin: 10px 0;"><strong>Total Amount Due:</strong> ₱${args.totalDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p style="margin: 10px 0;"><strong>Print Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}</p>
          </div>
          
          ${itemsTableHtml}
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            This is an automatic notification from the Spare Parts Billing System.
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
          subject: `Spare Parts Billing Statement ${args.printType} - ${new Date().toLocaleDateString()}`,
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

// Legacy function - kept for backward compatibility
export const sendBillingEmail = action({
  args: {
    printType: v.string(),
    totalSales: v.number(),
    totalDue: v.number(),
    itemCount: v.number(),
    recipientEmail: v.string(),
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
    // Get Resend API key from environment
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      console.log("Email notification (NO API KEY - logging only):", {
        to: args.recipientEmail,
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
            <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #111827;">
              Billing Items (first ${Math.min(args.items.length, 100)} shown)
            </h3>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="border: 1px solid #d1d5db; padding: 4px;">DR#</th>
                    <th style="border: 1px solid #d1d5db; padding: 4px;">Destination</th>
                    <th style="border: 1px solid #d1d5db; padding: 4px;">Description</th>
                    <th style="border: 1px solid #d1d5db; padding: 4px;">Qty</th>
                    <th style="border: 1px solid #d1d5db; padding: 4px;">Unit</th>
                    <th style="border: 1px solid #d1d5db; padding: 4px;">Amount</th>
                    <th style="border: 1px solid #d1d5db; padding: 4px;">Waybill No</th>
                    <th style="border: 1px solid #d1d5db; padding: 4px;">WB Date</th>
                    <th style="border: 1px solid #d1d5db; padding: 4px;">DR Date</th>
                    <th style="border: 1px solid #d1d5db; padding: 4px;">%</th>
                    <th style="border: 1px solid #d1d5db; padding: 4px;">Charges</th>
                  </tr>
                </thead>
                <tbody>
                  ${(args.items ?? [])
                    .slice(0, 100)
                    .map((item) => {
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
                      return `
                        <tr>
                          <td style="border: 1px solid #e5e7eb; padding: 4px;">${item.drNo ?? ""}</td>
                          <td style="border: 1px solid #e5e7eb; padding: 4px;">${item.destination ?? ""}</td>
                          <td style="border: 1px solid #e5e7eb; padding: 4px;">${item.description ?? ""}</td>
                          <td style="border: 1px solid #e5e7eb; padding: 4px; text-align: right;">${qty}</td>
                          <td style="border: 1px solid #e5e7eb; padding: 4px;">${item.unit ?? ""}</td>
                          <td style="border: 1px solid #e5e7eb; padding: 4px; text-align: right;">
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
                          <td style="border: 1px solid #e5e7eb; padding: 4px;">${item.waybillNo ?? ""}</td>
                          <td style="border: 1px solid #e5e7eb; padding: 4px;">${item.wbDate ?? ""}</td>
                          <td style="border: 1px solid #e5e7eb; padding: 4px;">${item.drDate ?? ""}</td>
                          <td style="border: 1px solid #e5e7eb; padding: 4px; text-align: right;">${
                            percent !== undefined ? percent.toString() : ""
                          }</td>
                          <td style="border: 1px solid #e5e7eb; padding: 4px; text-align: right;">
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

    // Send email via Resend API
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; margin: 0 auto; padding: 20px;">
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
          
          ${itemsTableHtml}
          
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


