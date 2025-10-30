import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
      status: 'sent'
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


