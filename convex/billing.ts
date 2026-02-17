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

// Dashboard queries for Spare Parts
export const getDashboardStats = query({
  handler: async (ctx) => {
    // Get all billing prints
    const allPrints = await ctx.db.query("billing_prints")
      .order("desc")
      .collect();
    
    // Get all DRs
    const allDrs = await ctx.db.query("dr")
      .order("desc")
      .collect();
    
    // Helper function to get start of day (midnight)
    const getStartOfDay = (timestamp) => {
      const date = new Date(timestamp);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    };
    
    // Helper function to get start of week (Monday)
    const getStartOfWeek = (timestamp) => {
      const date = new Date(timestamp);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
      const monday = new Date(date.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      return monday.getTime();
    };
    
    // Last billing statement date
    const lastBillingDate = allPrints.length > 0 
      ? allPrints[0].printDate 
      : null;
    
    // Group billing statements by day
    const billingByDay = {};
    allPrints.forEach(print => {
      const dayKey = getStartOfDay(print.printDate).toString();
      billingByDay[dayKey] = (billingByDay[dayKey] || 0) + 1;
    });
    
    // Group billing statements by week
    const billingByWeek = {};
    allPrints.forEach(print => {
      const weekKey = getStartOfWeek(print.printDate).toString();
      billingByWeek[weekKey] = (billingByWeek[weekKey] || 0) + 1;
    });
    
    // Group DRs by day (using _creationTime)
    const drsByDay = {};
    allDrs.forEach(dr => {
      const dayKey = getStartOfDay(dr._creationTime).toString();
      drsByDay[dayKey] = (drsByDay[dayKey] || 0) + 1;
    });
    
    // Group DRs by week
    const drsByWeek = {};
    allDrs.forEach(dr => {
      const weekKey = getStartOfWeek(dr._creationTime).toString();
      drsByWeek[weekKey] = (drsByWeek[weekKey] || 0) + 1;
    });
    
    // Group email reports by day (where emailSent = true)
    const emailReportsByDay = {};
    allPrints.filter(print => print.emailSent === true).forEach(print => {
      const dayKey = getStartOfDay(print.printDate).toString();
      emailReportsByDay[dayKey] = (emailReportsByDay[dayKey] || 0) + 1;
    });
    
    // Group email reports by week
    const emailReportsByWeek = {};
    allPrints.filter(print => print.emailSent === true).forEach(print => {
      const weekKey = getStartOfWeek(print.printDate).toString();
      emailReportsByWeek[weekKey] = (emailReportsByWeek[weekKey] || 0) + 1;
    });
    
    return {
      lastBillingDate,
      billingByDay,
      billingByWeek,
      drsByDay,
      drsByWeek,
      emailReportsByDay,
      emailReportsByWeek
    };
  }
});

