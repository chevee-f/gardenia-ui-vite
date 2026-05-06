import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Save or update Cykris DR rows
export const saveCykris = mutation({
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
      type: v.optional(v.union(v.string(), v.null())),
      description: v.optional(v.union(v.string(), v.null())),
      destination: v.optional(v.union(v.string(), v.null())),
      quantity: v.optional(v.union(v.string(), v.null())),
      unit: v.optional(v.union(v.string(), v.null())),
      reviewed: v.optional(v.boolean()),
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
        for (const key of keysToCompare) {
          // Using loose equality to allow null vs undefined equivalence
          if ((existing[key] ?? null) !== (doc[key] ?? null)) {
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
      ref_no: v.string(),
      group_ref_no: v.string(),
      waybill_no: v.string()
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

/** Recalculate `declared_amount` from quantity × unit price for rows whose `type` exists in `pricing`. */
export const updateDeclaredAmountsFromPricing = mutation({
  args: {
    pricing: v.record(v.string(), v.number()),
  },
  handler: async (ctx, { pricing }) => {
    const rows = await ctx.db.query("cykris_dr").collect();
    let updated = 0;

    for (const row of rows) {
      const typeKey = row.type ?? "";
      const price = pricing[typeKey];
      if (price === undefined) continue;

      const qtyRaw = row.quantity;
      if (
        qtyRaw === null ||
        qtyRaw === undefined ||
        String(qtyRaw).trim() === ""
      ) {
        continue;
      }

      const qty = parseFloat(String(qtyRaw));
      if (Number.isNaN(qty)) continue;

      const newAmount = (qty * price).toFixed(2);

      const cur = row.declared_amount;
      let curNorm = "";
      if (cur !== null && cur !== undefined) {
        curNorm =
          typeof cur === "number"
            ? cur.toFixed(2)
            : String(cur).replace(/,/g, "").trim();
      }

      if (curNorm === newAmount) continue;

      await ctx.db.patch(row._id, { declared_amount: newAmount });
      updated++;
    }

    return { updated, examined: rows.length };
  },
});

// Get Cykris DR by filters
export const getCykris = query({
  args: {
    ref_no: v.optional(v.union(v.string(), v.null())),
    group_ref_no: v.optional(v.union(v.string(), v.null())),
    waybill_no: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, { ref_no, group_ref_no, waybill_no }) => {
    console.log("getCykris received args:", ref_no, group_ref_no, waybill_no);

    // Get all rows first
    let results = await ctx.db.query("cykris_dr").collect();

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

// Get all Cykris DRs
export const getAllCykris = query({
  handler: async (ctx) => {
    console.log("[getAllCykris] query started");
    try {
      const drs = await ctx.db.query("cykris_dr").order("desc").collect();
      console.log("[getAllCykris] success", { count: drs.length });
      return drs;
    } catch (err) {
      console.error("[getAllCykris] failed", err);
      throw err;
    }
  },
});

// Get saved Cykris DRs (check if specific DRs are already saved)
export const getSavedCykris = query({
  args: {
    data: v.array(v.object({
      ref_no: v.string(),
      group_ref_no: v.optional(v.string()),
      waybill_no: v.optional(v.string()),
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


