// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { legacyOptional, legacyScalar } from "./legacyValidators";

/*
 * Field names align with Convex dashboard “Generate schema” output.
 * Auto-generated validators often use plain `v.null()` when the sampler only
 * saw null — that rejects real rows once another type appears. We use
 * legacyScalar / legacyOptional instead so string | number | boolean | null
 * (and optional absence) stay valid.
 */
export default defineSchema({
  billing_prints: defineTable({
    emailSent: legacyOptional,
    itemCount: legacyScalar,
    printDate: legacyScalar,
    printType: legacyScalar,
    recipientEmail: legacyScalar,
    status: legacyScalar,
    totalDue: legacyScalar,
    totalSales: legacyScalar,
  }),

  cykris_dr: defineTable({
    ref_no: legacyScalar,
    group_ref_no: legacyScalar,
    waybill_no: legacyScalar,
    address: legacyOptional,
    contact_no: legacyOptional,
    contact_person: legacyOptional,
    declared_amount: legacyOptional,
    description: legacyOptional,
    destination: legacyOptional,
    dispatched_by: legacyOptional,
    drsi_date: legacyOptional,
    name_of_dealer: legacyOptional,
    no_of_boxes: legacyOptional,
    no_of_bundles: legacyOptional,
    quantity: legacyOptional,
    reviewed: legacyOptional,
    type: legacyOptional,
    unit: legacyOptional,
  }),

  dr: defineTable({
    ref_no: legacyScalar,
    group_ref_no: legacyScalar,
    waybill_no: legacyScalar,
    address: legacyOptional,
    contact_no: legacyOptional,
    contact_person: legacyOptional,
    declared_amount: legacyOptional,
    dispatched_by: legacyOptional,
    drsi_date: legacyOptional,
    name_of_dealer: legacyOptional,
    no_of_boxes: legacyOptional,
    no_of_bundles: legacyOptional,
  }),

  saved_billing_statements_uploads: defineTable({
    uploadedAt: legacyScalar,
    statementCount: legacyScalar,
    currentStatementName: legacyOptional,
    data: legacyScalar,
  }),

  saved_billing_statements: defineTable({
    statementName: legacyScalar,
    updatedAt: legacyScalar,
    data: legacyScalar,
    source: legacyOptional,
  }).index("by_statementName", ["statementName"]),
});
