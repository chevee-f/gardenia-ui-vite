import { query } from "./_generated/server";

export const getDr = query(async ({ db }, { ref_no, waybill_no, group_ref_no }) => {
  let q = db.query("dr");

  if (ref_no) {
    q = q.filter((dr) => dr.ref_no.startsWith(ref_no));
  }
  if (waybill_no) {
    q = q.filter((dr) => dr.waybill_no.startsWith(waybill_no));
  }
  if (group_ref_no) {
    q = q.filter((dr) => dr.group_ref_no.startsWith(group_ref_no));
  }

  return await q.collect();
});
