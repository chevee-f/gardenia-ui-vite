// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  dr: defineTable({
    ref_no: v.string(),
    group_ref_no: v.string(),
    waybill_no: v.string(),
    drsi_date: v.optional(v.union(v.string(), v.null())),
    name_of_dealer: v.optional(v.union(v.string(), v.null())),
    contact_person: v.optional(v.union(v.string(), v.null())),
    contact_no: v.optional(v.union(v.string(), v.null())),
    address: v.optional(v.union(v.string(), v.null())),
    declared_amount: v.optional(v.union(v.string(), v.null())),
    no_of_boxes: v.optional(v.union(v.float64(), v.null())),
    no_of_bundles: v.optional(v.union(v.float64(), v.null())),
    dispatched_by: v.optional(v.union(v.string(), v.null()))
  }),
  cykris_dr: defineTable({
    ref_no: v.string(),
    group_ref_no: v.string(),
    waybill_no: v.string(),
    drsi_date: v.optional(v.union(v.string(), v.null())),
    name_of_dealer: v.optional(v.union(v.string(), v.null())),
    contact_person: v.optional(v.union(v.string(), v.null())),
    contact_no: v.optional(v.union(v.string(), v.null())),
    address: v.optional(v.union(v.string(), v.null())),
    declared_amount: v.optional(v.union(v.string(), v.null())),
    no_of_boxes: v.optional(v.union(v.float64(), v.null())),
    no_of_bundles: v.optional(v.union(v.float64(), v.null())),
    dispatched_by: v.optional(v.union(v.string(), v.null())),
    type: v.optional(v.union(v.string(), v.null())),
    description: v.optional(v.union(v.string(), v.null())),
    destination: v.optional(v.union(v.string(), v.null())),
    quantity: v.optional(v.union(v.string(), v.null())),
    unit: v.optional(v.union(v.string(), v.null())),
    reviewed: v.optional(v.boolean())
  }),
  billing_prints: defineTable({
    printDate: v.number(),
    printType: v.string(),
    totalSales: v.number(),
    totalDue: v.number(),
    itemCount: v.number(),
    recipientEmail: v.string(),
    status: v.string(),
    emailSent: v.optional(v.boolean())
  }),

  // Snapshots of localStorage-saved billing statements uploaded from the UI.
  saved_billing_statements_uploads: defineTable({
    uploadedAt: v.number(),
    statementCount: v.number(),
    currentStatementName: v.optional(v.string()),
    // Stored as JSON string to avoid strict schema coupling to UI shape.
    data: v.string(),
  }),

  // One row per saved statement name (mirrors localStorage savedBillingStatements keys).
  saved_billing_statements: defineTable({
    statementName: v.string(),
    updatedAt: v.number(),
    // Stored as JSON string to avoid tight coupling to UI shape.
    data: v.string(),
    // Optional metadata for debugging / UI convenience.
    source: v.optional(v.string()), // e.g. "manual-save", "backup-button"
  }).index("by_statementName", ["statementName"]),
});
