import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { legacyOptional, legacyScalar } from "./legacyValidators";

// Save or update DR rows
export const saveDr = mutation({
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
    }))
  },
  handler: async (ctx, { data }) => {
    for (const args of data) {
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
        ...args,
      };

      const existing = await ctx.db
        .query("dr")
        .filter(q =>
          q.and(
            q.eq(q.field("ref_no"), doc.ref_no),
            q.eq(q.field("waybill_no"), doc.waybill_no),
            q.eq(q.field("group_ref_no"), doc.group_ref_no)
          )
        )
        .first();

      if (existing) {
        // Compare fields to check if patch needed
        const keysToCompare = [
          'drsi_date', 'name_of_dealer', 'contact_person', 'contact_no', 'address',
          'declared_amount', 'no_of_boxes', 'no_of_bundles', 'dispatched_by',
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
          await ctx.db.patch(existing._id, doc);
        } // else skip patching, no changes
      } else {
        await ctx.db.insert("dr", doc);
      }
    }
    return { success: true };
  }
});


export const deleteDr = mutation({
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
        .query("dr")
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


export const getDr = query({
  args: {
    ref_no: legacyOptional,
    group_ref_no: legacyOptional,
    waybill_no: legacyOptional,
  },
  handler: async (ctx, { ref_no, group_ref_no, waybill_no }) => {
    console.log("getDr received args:", ref_no, group_ref_no, waybill_no);

    // Get all rows first
    let results = await ctx.db.query("dr").collect();

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

export const getAllDr = query({
  handler: async (ctx) => {
    const drs = await ctx.db.query("dr").order("desc").collect();
    return drs;
  },
});

export const getSavedDr = query({
  args: {
    data: v.array(v.object({
      ref_no: legacyScalar,
      group_ref_no: legacyOptional,
      waybill_no: legacyOptional,
    }))
  },
  handler: async (ctx, { data }) => {
    // console.log(data)
    // Get all saved DRs from the database
    const allSavedDrs = await ctx.db.query("dr").collect();
    // console.log(allSavedDrs);
    // Create a map for faster lookup
    const savedDrMap = new Map();
    allSavedDrs.forEach(dr => {
      // Create a unique key based on ref_no, group_ref_no, and waybill_no
      const key = `${dr.ref_no}`;
      savedDrMap.set(key, dr);
    });
    // console.log(savedDrMap);
    
    // Filter the input data to find matches in saved DRs
    const matchingDrs = [];
    
    for (const inputDr of data) {
      // Create the same key format for comparison
      const key = `${inputDr.ref_no}`;
      
      if (savedDrMap.has(key)) {
        matchingDrs.push(savedDrMap.get(key));
      }
    }
    
    // console.log(matchingDrs);
    return matchingDrs;
  },
});