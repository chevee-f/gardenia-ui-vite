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
    
    // Helper function to get start of day (midnight UTC)
    const getStartOfDay = (timestamp: number) => {
      const date = new Date(timestamp);
      // Use UTC to ensure consistency across timezones
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();
      const utcDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      return utcDate.getTime();
    };
    
    // Helper function to get start of week (Monday UTC)
    const getStartOfWeek = (timestamp: number) => {
      const date = new Date(timestamp);
      const day = date.getUTCDay();
      const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const monday = new Date(Date.UTC(year, month, diff, 0, 0, 0, 0));
      return monday.getTime();
    };
    
    // Helper function to get start of month (UTC)
    const getStartOfMonth = (timestamp: number) => {
      const date = new Date(timestamp);
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const firstDay = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      return firstDay.getTime();
    };
    
    // Last billing statement date
    const lastBillingDate = allPrints.length > 0 
      ? allPrints[0].printDate 
      : null;
    
    // Group billing statements by day
    const billingByDay: Record<string, number> = {};
    allPrints.forEach(print => {
      const dayKey = getStartOfDay(print.printDate).toString();
      billingByDay[dayKey] = (billingByDay[dayKey] || 0) + 1;
    });
    
    // Group billing statements by week
    const billingByWeek: Record<string, number> = {};
    allPrints.forEach(print => {
      const weekKey = getStartOfWeek(print.printDate).toString();
      billingByWeek[weekKey] = (billingByWeek[weekKey] || 0) + 1;
    });
    
    // Group billing statements by month
    const billingByMonth: Record<string, number> = {};
    allPrints.forEach(print => {
      const monthKey = getStartOfMonth(print.printDate).toString();
      billingByMonth[monthKey] = (billingByMonth[monthKey] || 0) + 1;
    });
    
    // Group DRs by day (using _creationTime)
    const drsByDay: Record<string, number> = {};
    allDrs.forEach(dr => {
      const dayKey = getStartOfDay(dr._creationTime).toString();
      drsByDay[dayKey] = (drsByDay[dayKey] || 0) + 1;
    });
    
    // Group DRs by week
    const drsByWeek: Record<string, number> = {};
    allDrs.forEach(dr => {
      const weekKey = getStartOfWeek(dr._creationTime).toString();
      drsByWeek[weekKey] = (drsByWeek[weekKey] || 0) + 1;
    });
    
    // Group DRs by month
    const drsByMonth: Record<string, number> = {};
    allDrs.forEach(dr => {
      const monthKey = getStartOfMonth(dr._creationTime).toString();
      drsByMonth[monthKey] = (drsByMonth[monthKey] || 0) + 1;
    });
    
    // Group email reports by day (where emailSent = true)
    const emailReportsByDay: Record<string, number> = {};
    const emailReports = allPrints.filter(print => print.emailSent === true);
    
    emailReports.forEach(print => {
      const dayKey = getStartOfDay(print.printDate).toString();
      emailReportsByDay[dayKey] = (emailReportsByDay[dayKey] || 0) + 1;
    });
    
    // Group email reports by week
    const emailReportsByWeek: Record<string, number> = {};
    emailReports.forEach(print => {
      const weekKey = getStartOfWeek(print.printDate).toString();
      emailReportsByWeek[weekKey] = (emailReportsByWeek[weekKey] || 0) + 1;
    });
    
    // Group email reports by month
    const emailReportsByMonth: Record<string, number> = {};
    emailReports.forEach(print => {
      const monthKey = getStartOfMonth(print.printDate).toString();
      emailReportsByMonth[monthKey] = (emailReportsByMonth[monthKey] || 0) + 1;
    });
    
    // Debug: Get total email reports count
    const totalEmailReports = emailReports.length;
    
    return {
      lastBillingDate,
      billingByDay,
      billingByWeek,
      billingByMonth,
      drsByDay,
      drsByWeek,
      drsByMonth,
      emailReportsByDay,
      emailReportsByWeek,
      emailReportsByMonth,
      // Debug info
      totalEmailReports,
      totalBillingPrints: allPrints.length
    };
  }
});

