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
    declared_amount: v.optional(v.union(v.float64(), v.string(), v.null())),
    no_of_boxes: v.optional(v.union(v.float64(), v.null())),
    no_of_bundles: v.optional(v.union(v.float64(), v.null())),
    dispatched_by: v.optional(v.union(v.string(), v.null())),
    type: v.optional(v.union(v.string(), v.null())),
    description: v.optional(v.union(v.string(), v.null())),
    destination: v.optional(v.union(v.string(), v.null())),
    quantity: v.optional(v.union(v.float64(), v.string(), v.null())),
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
  })
});
