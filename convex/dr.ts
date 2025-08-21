import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Save or update DR rows
export const saveDr = mutation({
  args: {
    data: v.array(v.object({
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
        for (const key of keysToCompare) {
          // Using loose equality to allow null vs undefined equivalence
          if ((existing[key] ?? null) !== (doc[key] ?? null)) {
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
      ref_no: v.string(),
      group_ref_no: v.string(),
      waybill_no: v.string()
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
    ref_no: v.optional(v.union(v.string(), v.null())),
    group_ref_no: v.optional(v.union(v.string(), v.null())),
    waybill_no: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, { ref_no, group_ref_no, waybill_no }) => {
    console.log("getDr received args:", ref_no, group_ref_no, waybill_no);

    // Get all rows first
    let results = await ctx.db.query("dr").collect();

    // Filter by ref_no if provided (anywhere match, case-insensitive)
    if (ref_no && ref_no.trim() !== "") {
      const search = ref_no.toLowerCase();
      results = results.filter((dr) =>
        dr.ref_no?.toLowerCase().includes(search)
      );
    }

    // Filter by group_ref_no if provided (exact match, case-insensitive)
    if (group_ref_no && group_ref_no.trim() !== "") {
      const search = group_ref_no.toLowerCase();
      results = results.filter((dr) =>
        dr.group_ref_no?.toLowerCase() === search
      );
    }

    // Filter by waybill_no if provided (exact match, case-insensitive)
    if (waybill_no && waybill_no.trim() !== "") {
      const search = waybill_no.toLowerCase();
      results = results.filter((dr) =>
        dr.waybill_no?.toLowerCase() === search
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
      ref_no: v.string(),
      group_ref_no: v.optional(v.string()),
      waybill_no: v.optional(v.string()),
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