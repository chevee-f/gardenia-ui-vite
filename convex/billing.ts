import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Record a print event (when user prints)
export const recordPrint = mutation({
  args: {
    printType: v.string(),
    totalSales: v.number(),
    totalDue: v.number(),
    itemCount: v.number(),
    recipientEmail: v.string()
  },
  handler: async (ctx, args) => {
    const printRecord = {
      printDate: Date.now(),
      printType: args.printType,
      totalSales: args.totalSales,
      totalDue: args.totalDue,
      itemCount: args.itemCount,
      recipientEmail: args.recipientEmail,
      status: 'printed',
      emailSent: false
    };
    
    const id = await ctx.db.insert("billing_prints", printRecord);
    return { success: true, id };
  }
});

// Update print record when email is sent
export const updatePrintEmailSent = mutation({
  args: {
    printId: v.id("billing_prints")
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.printId, {
      emailSent: true,
      status: 'sent'
    });
    return { success: true };
  }
});

// Get the most recent print without email sent
export const getLatestPrintWithoutEmail = query({
  handler: async (ctx) => {
    const prints = await ctx.db.query("billing_prints")
      .order("desc")
      .filter((q) => q.eq(q.field("emailSent"), false))
      .take(1);
    return prints[0] || null;
  }
});

// Get count of prints without email sent
export const getUnsentEmailCount = query({
  handler: async (ctx) => {
    const prints = await ctx.db.query("billing_prints")
      .filter((q) => q.eq(q.field("emailSent"), false))
      .collect();
    return prints.length;
  }
});

// Legacy: Record print with email (for backward compatibility)
export const recordBillingPrint = mutation({
  args: {
    printType: v.string(),
    totalSales: v.number(),
    totalDue: v.number(),
    itemCount: v.number(),
    recipientEmail: v.string()
  },
  handler: async (ctx, args) => {
    const printRecord = {
      printDate: Date.now(),
      printType: args.printType,
      totalSales: args.totalSales,
      totalDue: args.totalDue,
      itemCount: args.itemCount,
      recipientEmail: args.recipientEmail,
      status: 'sent',
      emailSent: true
    };
    
    await ctx.db.insert("billing_prints", printRecord);
    return { success: true };
  }
});

export const getBillingPrintHistory = query({
  handler: async (ctx) => {
    return await ctx.db.query("billing_prints")
      .order("desc")
      .collect();
  }
});


