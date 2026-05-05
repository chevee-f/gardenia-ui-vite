// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { legacyOptional, legacyScalar } from "./legacyValidators";

export default defineSchema({
  dr: defineTable({
    ref_no: legacyScalar,
    group_ref_no: legacyScalar,
    waybill_no: legacyScalar,
    drsi_date: legacyOptional,
    name_of_dealer: legacyOptional,
    contact_person: legacyOptional,
    contact_no: legacyOptional,
    address: legacyOptional,
    declared_amount: legacyOptional,
    no_of_boxes: legacyOptional,
    no_of_bundles: legacyOptional,
    dispatched_by: legacyOptional,
  }),
  cykris_dr: defineTable({
    ref_no: legacyScalar,
    group_ref_no: legacyScalar,
    waybill_no: legacyScalar,
    drsi_date: legacyOptional,
    name_of_dealer: legacyOptional,
    contact_person: legacyOptional,
    contact_no: legacyOptional,
    address: legacyOptional,
    declared_amount: legacyOptional,
    no_of_boxes: legacyOptional,
    no_of_bundles: legacyOptional,
    dispatched_by: legacyOptional,
    type: legacyOptional,
    description: legacyOptional,
    destination: legacyOptional,
    quantity: legacyOptional,
    unit: legacyOptional,
    reviewed: legacyOptional,
  }),
  billing_prints: defineTable({
    printDate: legacyScalar,
    printType: legacyScalar,
    totalSales: legacyScalar,
    totalDue: legacyScalar,
    itemCount: legacyScalar,
    recipientEmail: legacyScalar,
    status: legacyScalar,
    emailSent: legacyOptional,
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
