import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { legacyOptional, legacyScalar } from "./legacyValidators";

// Save or update Cykris DR rows
export const saveCykris = mutation({
  args: {
    data: v.array(v.object({
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
    }))
  },
  handler: async (ctx, { data }) => {
    console.log('saveCykris received', data.length, 'rows');
    for (let i = 0; i < data.length; i++) {
      const args = data[i];
      const doc = {
        drsi_date: null,
        name_of_dealer: null,
        contact_person: null,
        contact_no: null,
        address: null,
        declared_amount: null,
        no_of_boxes: null,
        no_of_bundles: null,
        dispatched_by: null,
        type: null,
        description: null,
        destination: null,
        quantity: null,
        unit: null,
        reviewed: false,
        ...args,
      };

      console.log(`Processing row ${i + 1}/${data.length}:`, {
        ref_no: doc.ref_no,
        group_ref_no: doc.group_ref_no,
        description: doc.description,
        quantity: doc.quantity,
        unit: doc.unit
      });

      // Check for existing record - include description, quantity, unit to make rows unique
      // This allows multiple rows per DR# with different items
      // Note: We need to handle null values carefully in the query
      let query = ctx.db
        .query("cykris_dr")
        .filter(q =>
          q.and(
            q.eq(q.field("ref_no"), doc.ref_no),
            q.eq(q.field("waybill_no"), doc.waybill_no),
            q.eq(q.field("group_ref_no"), doc.group_ref_no)
          )
        );

      // Add description, quantity, unit filters - handle null values
      const allRecords = await query.collect();
      const existing = allRecords.find(record => {
        const descMatch = (record.description ?? null) === (doc.description ?? null);
        const qtyMatch = (record.quantity ?? null) === (doc.quantity ?? null);
        const unitMatch = (record.unit ?? null) === (doc.unit ?? null);
        return descMatch && qtyMatch && unitMatch;
      });

      if (existing) {
        console.log(`Row ${i + 1}: Found existing record with _id:`, existing._id);
        // Compare fields to check if patch needed
        const keysToCompare = [
          'drsi_date', 'name_of_dealer', 'contact_person', 'contact_no', 'address',
          'declared_amount', 'no_of_boxes', 'no_of_bundles', 'dispatched_by',
          'type', 'description', 'destination', 'quantity', 'unit', 'reviewed',
          'ref_no', 'waybill_no', 'group_ref_no'
        ];

        let isDifferent = false;
        const ex = existing as Record<string, unknown>;
        const d = doc as Record<string, unknown>;
        for (const key of keysToCompare) {
          if ((ex[key] ?? null) !== (d[key] ?? null)) {
            isDifferent = true;
            break;
          }
        }

        if (isDifferent) {
          console.log(`Row ${i + 1}: Patching existing record`);
          await ctx.db.patch(existing._id, doc);
        } else {
          console.log(`Row ${i + 1}: No changes, skipping`);
        }
      } else {
        console.log(`Row ${i + 1}: No existing record found, inserting new record`);
        await ctx.db.insert("cykris_dr", doc);
      }
    }
    console.log('saveCykris completed');
    return { success: true };
  }
});

// Delete Cykris DR rows
export const deleteCykris = mutation({
  args: {
    data: v.array(v.object({
      ref_no: legacyScalar,
      group_ref_no: legacyScalar,
      waybill_no: legacyScalar,
    }))
  },
  handler: async (ctx, { data }) => {
    for (const { ref_no, group_ref_no, waybill_no } of data) {
      const existing = await ctx.db
        .query("cykris_dr")
        .filter(q =>
          q.and(
            q.eq(q.field("ref_no"), ref_no),
            q.eq(q.field("group_ref_no"), group_ref_no),
            q.eq(q.field("waybill_no"), waybill_no)
          )
        )
        .first();

      if (existing) {
        await ctx.db.delete(existing._id);
      }
    }

    return { success: true };
  }
});

// Get Cykris DR by filters
export const getCykris = query({
  args: {
    ref_no: legacyOptional,
    group_ref_no: legacyOptional,
    waybill_no: legacyOptional,
  },
  handler: async (ctx, { ref_no, group_ref_no, waybill_no }) => {
    console.log("getCykris received args:", ref_no, group_ref_no, waybill_no);

    // Get all rows first
    let results = await ctx.db.query("cykris_dr").collect();

    // Filter by ref_no if provided (anywhere match, case-insensitive)
    const refStr = ref_no != null ? String(ref_no).trim() : "";
    if (refStr !== "") {
      const search = refStr.toLowerCase();
      results = results.filter((dr) =>
        String(dr.ref_no ?? "").toLowerCase().includes(search)
      );
    }

    // Filter by group_ref_no if provided (exact match, case-insensitive)
    const groupStr = group_ref_no != null ? String(group_ref_no).trim() : "";
    if (groupStr !== "") {
      const search = groupStr.toLowerCase();
      results = results.filter((dr) =>
        String(dr.group_ref_no ?? "").toLowerCase() === search
      );
    }

    // Filter by waybill_no if provided (exact match, case-insensitive)
    const waybillStr = waybill_no != null ? String(waybill_no).trim() : "";
    if (waybillStr !== "") {
      const search = waybillStr.toLowerCase();
      results = results.filter((dr) =>
        String(dr.waybill_no ?? "").toLowerCase() === search
      );
    }

    return results;
  },
});

// Get all Cykris DRs
export const getAllCykris = query({
  handler: async (ctx) => {
    const drs = await ctx.db.query("cykris_dr").order("desc").collect();
    return drs;
  },
});

// Get saved Cykris DRs (check if specific DRs are already saved)
export const getSavedCykris = query({
  args: {
    data: v.array(v.object({
      ref_no: legacyScalar,
      group_ref_no: legacyOptional,
      waybill_no: legacyOptional,
    }))
  },
  handler: async (ctx, { data }) => {
    // Get all saved Cykris DRs from the database
    const allSavedDrs = await ctx.db.query("cykris_dr").collect();
    
    // Create a map for faster lookup
    const savedDrMap = new Map();
    allSavedDrs.forEach(dr => {
      // Create a unique key based on ref_no
      const key = `${dr.ref_no}`;
      savedDrMap.set(key, dr);
    });
    
    // Filter the input data to find matches in saved DRs
    const matchingDrs = [];
    
    for (const inputDr of data) {
      // Create the same key format for comparison
      const key = `${inputDr.ref_no}`;
      
      if (savedDrMap.has(key)) {
        matchingDrs.push(savedDrMap.get(key));
      }
    }
    
    return matchingDrs;
  },
});


