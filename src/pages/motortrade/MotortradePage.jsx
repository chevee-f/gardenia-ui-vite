import React, { useEffect, useMemo, useState } from 'react';
import { HiOutlineEye, HiOutlineRefresh, HiOutlineSearch, HiOutlineXCircle } from 'react-icons/hi';

const STORAGE_KEY = 'motortradeData';
const REVIEWED_KEY = 'motortradeReviewed';

const COPY_LABELS = {
  motortrade: 'MOTORTRADE COPY',
  customer: 'CUSTOMER COPY',
  carrier: 'CARRIER COPY',
};

const emptyItem = () => ({
  model: '',
  qty: '',
  color: '',
  frame: '',
  engine: '',
});

const emptyForm = () => ({
  deliveryFrom: '',
  deliveryTo: '',
  waybillNo: '',
  kmpcDrNo: '',
  items: [emptyItem()],
});

function normalizeLoaded(value) {
  if (!Array.isArray(value)) return [];
  if (value.length === 0) return [];
  const first = value[0];
  if (!first || typeof first !== 'object') return [];
  if (!('kmpcDrNo' in first) || !('items' in first)) return [];
  return value;
}

export default function MotortradePage() {
  const [drs, setDrs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [editingKmpcDrNo, setEditingKmpcDrNo] = useState(null);
  const [formData, setFormData] = useState(emptyForm());
  const [reviewedRefs, setReviewedRefs] = useState({});
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewFilter, setReviewFilter] = useState('all'); // all | reviewed | unreviewed
  const [selectedKmpcDrNo, setSelectedKmpcDrNo] = useState(null);
  const [printChecks, setPrintChecks] = useState({ motortrade: false, customer: false, carrier: false });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      setDrs(normalizeLoaded(JSON.parse(saved)));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(REVIEWED_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') setReviewedRefs(parsed);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (drs.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drs));
    } catch {
      // ignore
    }
  }, [drs]);

  useEffect(() => {
    try {
      localStorage.setItem(REVIEWED_KEY, JSON.stringify(reviewedRefs || {}));
    } catch {
      // ignore
    }
  }, [reviewedRefs]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return drs;
    return drs.filter((dr) => {
      const hay = [
        dr.deliveryFrom,
        dr.deliveryTo,
        dr.waybillNo,
        dr.kmpcDrNo,
        ...(dr.items || []).flatMap((it) => [
          it.model,
          it.color,
          it.frame,
          it.engine,
          String(it.qty ?? ''),
        ]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [drs, searchQuery]);

  const openNew = () => {
    setEditingKmpcDrNo(null);
    setErrorMsg(null);
    setFormData(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (kmpcDrNo) => {
    const found = drs.find((d) => d.kmpcDrNo === kmpcDrNo);
    if (!found) return;
    setEditingKmpcDrNo(kmpcDrNo);
    setErrorMsg(null);
    setFormData({
      deliveryFrom: found.deliveryFrom || '',
      deliveryTo: found.deliveryTo || '',
      waybillNo: found.waybillNo || '',
      kmpcDrNo: found.kmpcDrNo || '',
      items: (found.items && found.items.length > 0 ? found.items : [emptyItem()]).map((it) => ({
        model: it.model || '',
        qty: String(it.qty ?? ''),
        color: it.color || '',
        frame: it.frame || '',
        engine: it.engine || '',
      })),
    });
    setFormOpen(true);
  };

  const deleteDr = (kmpcDrNo) => {
    if (!window.confirm(`Delete KMPC DR No "${kmpcDrNo}"?`)) return;
    setDrs((prev) => prev.filter((d) => d.kmpcDrNo !== kmpcDrNo));
    if (drs.length <= 1) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  };

  const selectedDr = useMemo(() => {
    if (!selectedKmpcDrNo) return null;
    return drs.find((d) => d.kmpcDrNo === selectedKmpcDrNo) || null;
  }, [drs, selectedKmpcDrNo]);

  const openReviewModal = () => {
    if (!drs || drs.length === 0) return;
    setReviewModalOpen(true);
    setSelectedKmpcDrNo((prev) => prev || drs[0]?.kmpcDrNo || null);
    setPrintChecks({ motortrade: false, customer: false, carrier: false });
  };

  const escapeHtml = (s) =>
    String(s ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

  const cloneHeadStyles = () =>
    Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join('');

  const buildPrintHtml = (dr, label) => {
    const rows = (dr.items || [])
      .map(
        (it) => `
          <tr>
            <td style="border:1px solid #111;padding:6px;">${escapeHtml(it.model)}</td>
            <td style="border:1px solid #111;padding:6px;text-align:center;">${escapeHtml(it.qty)}</td>
            <td style="border:1px solid #111;padding:6px;">${escapeHtml(it.color)}</td>
            <td style="border:1px solid #111;padding:6px;">${escapeHtml(it.frame)}</td>
            <td style="border:1px solid #111;padding:6px;">${escapeHtml(it.engine)}</td>
          </tr>
        `
      )
      .join('');

    const printStyle = `
      ${cloneHeadStyles()}
      <style>
        @page { size: legal; margin: 10mm; }
        body { font-family: Arial, sans-serif; color: #111; }
        .label { position: fixed; top: 10mm; right: 10mm; font-weight: 700; font-size: 12px; }
        .title { font-size: 18px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 10px; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; margin-bottom: 10px; font-size: 12px; }
        .meta div { padding: 6px 8px; border: 1px solid #ddd; border-radius: 6px; background: #fafafa; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { border: 1px solid #111; padding: 6px; background: #f3f4f6; text-transform: uppercase; font-size: 11px; letter-spacing: 0.4px; }
        .footer { margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; font-size: 12px; }
        .box { border: 1px solid #111; border-radius: 6px; padding: 10px; min-height: 90px; }
      </style>
    `;

    return `
      <html>
        <head><title>Motortrade Print</title>${printStyle}</head>
        <body>
          <div class="label">${escapeHtml(label)}</div>
          <div class="title">DELIVERY RECEIPT</div>
          <div class="meta">
            <div><b>Delivery from:</b> ${escapeHtml(dr.deliveryFrom)}</div>
            <div><b>Delivery to:</b> ${escapeHtml(dr.deliveryTo)}</div>
            <div><b>Waybill No:</b> ${escapeHtml(dr.waybillNo)}</div>
            <div><b>KMPC DR No:</b> ${escapeHtml(dr.kmpcDrNo)}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th>Qty</th>
                <th>Color</th>
                <th>Frame</th>
                <th>Engine</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div class="footer">
            <div class="box"><b>Received by</b><br/><br/>Printed name & signature</div>
            <div class="box"><b>Delivered by</b><br/><br/>Printed name & signature</div>
            <div class="box"><b>Date / Time</b><br/><br/>_____________________</div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrintCustom = (dr, typesArr) => {
    const w = window.open('', '', 'width=900,height=700');
    if (!w) return;
    const spaceHeight = '650px';
    let html = '<html><head><title>Print</title></head><body>';
    typesArr.forEach((type, idx) => {
      if (idx > 0) html += `<div style="height:${spaceHeight};"></div>`;
      html += buildPrintHtml(dr, COPY_LABELS[type]);
    });
    html += '</body></html>';
    // buildPrintHtml returns a full html doc; extract body only by writing each doc's body is complex.
    // Instead, open separate windows per copy if needed.
  };

  const handlePrintSelected = () => {
    if (!selectedDr) return;
    const typesArr = [];
    if (printChecks.motortrade) typesArr.push('motortrade');
    if (printChecks.customer) typesArr.push('customer');
    if (printChecks.carrier) typesArr.push('carrier');
    if (typesArr.length === 0) return;

    // Open one window per selected type for reliability.
    typesArr.forEach((type) => {
      const w = window.open('', '', 'width=900,height=700');
      if (!w) return;
      w.document.write(buildPrintHtml(selectedDr, COPY_LABELS[type]));
      w.document.close();
      w.focus();
    });
  };

  const handlePrintAll = () => {
    if (!selectedDr) return;
    const types = ['motortrade', 'customer', 'carrier'];
    types.forEach((type) => {
      const w = window.open('', '', 'width=900,height=700');
      if (!w) return;
      w.document.write(buildPrintHtml(selectedDr, COPY_LABELS[type]));
      w.document.close();
      w.focus();
    });
  };

  const addItemRow = () => setFormData((p) => ({ ...p, items: [...p.items, emptyItem()] }));
  const removeItemRow = (idx) =>
    setFormData((p) => (p.items.length <= 1 ? p : { ...p, items: p.items.filter((_, i) => i !== idx) }));
  const setHeaderField = (field, value) => setFormData((p) => ({ ...p, [field]: value }));
  const setItemField = (idx, field, value) =>
    setFormData((p) => ({ ...p, items: p.items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)) }));

  const validate = () => {
    const deliveryFrom = String(formData.deliveryFrom || '').trim();
    const deliveryTo = String(formData.deliveryTo || '').trim();
    const waybillNo = String(formData.waybillNo || '').trim();
    const kmpcDrNo = String(formData.kmpcDrNo || '').trim();

    if (!deliveryFrom) return 'Delivery from is required';
    if (!deliveryTo) return 'Delivery to is required';
    if (!waybillNo) return 'Waybill No is required';
    if (!kmpcDrNo) return 'KMPC DR No is required';
    if (!Array.isArray(formData.items) || formData.items.length === 0) return 'At least one row is required';

    for (let i = 0; i < formData.items.length; i++) {
      const it = formData.items[i];
      const model = String(it.model || '').trim();
      const qtyStr = String(it.qty ?? '').trim();
      const qty = Number(qtyStr);
      const color = String(it.color || '').trim();
      const frame = String(it.frame || '').trim();
      const engine = String(it.engine || '').trim();

      if (!model) return `Row ${i + 1}: Model is required`;
      if (!qtyStr) return `Row ${i + 1}: Qty is required`;
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) return `Row ${i + 1}: Qty must be a whole number > 0`;
      if (!color) return `Row ${i + 1}: Color is required`;
      if (!frame) return `Row ${i + 1}: Frame is required`;
      if (!engine) return `Row ${i + 1}: Engine is required`;
    }

    const exists = drs.some((d) => d.kmpcDrNo === kmpcDrNo);
    if (exists && editingKmpcDrNo !== kmpcDrNo) return `KMPC DR No "${kmpcDrNo}" already exists`;

    return null;
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const err = validate();
      if (err) {
        setErrorMsg(err);
        return;
      }

      const payload = {
        deliveryFrom: String(formData.deliveryFrom).trim(),
        deliveryTo: String(formData.deliveryTo).trim(),
        waybillNo: String(formData.waybillNo).trim(),
        kmpcDrNo: String(formData.kmpcDrNo).trim(),
        items: formData.items.map((it) => ({
          model: String(it.model).trim(),
          qty: Number(String(it.qty).trim()),
          color: String(it.color).trim(),
          frame: String(it.frame).trim(),
          engine: String(it.engine).trim(),
        })),
        updatedAt: new Date().toISOString(),
      };

      setDrs((prev) => {
        if (editingKmpcDrNo) {
          const withoutOld = prev.filter((d) => d.kmpcDrNo !== editingKmpcDrNo);
          return [payload, ...withoutOld];
        }
        return [payload, ...prev];
      });

      setFormOpen(false);
      setEditingKmpcDrNo(null);
      setFormData(emptyForm());
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Motortrade</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded shadow text-sm font-medium transition ${
              drs.length > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            onClick={openReviewModal}
            disabled={drs.length === 0}
          >
            <HiOutlineEye className="w-5 h-5" /> Start Review & Print
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 text-sm font-medium transition"
            onClick={openNew}
          >
            Add DR
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 text-sm font-medium transition shadow"
            onClick={() => window.location.reload()}
          >
            <HiOutlineRefresh className="w-5 h-5" /> Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-6 px-6">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-3 mb-3 relative">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search Motortrade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border rounded bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
              />
              <HiOutlineSearch className="absolute left-2 top-1.5 text-gray-400 w-4 h-4" />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center text-gray-400 py-10 text-sm">No DRs yet. Click “Add DR” to start.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-gray-700 bg-white rounded shadow">
                <thead className="sticky top-0 z-10 text-xs text-gray-700 uppercase bg-gray-100">
                  <tr>
                    <th className="px-2 py-2 font-semibold">KMPC DR No</th>
                    <th className="px-2 py-2 font-semibold">Waybill No</th>
                    <th className="px-2 py-2 font-semibold">Delivery From</th>
                    <th className="px-2 py-2 font-semibold">Delivery To</th>
                    <th className="px-2 py-2 font-semibold">Items</th>
                    <th className="px-2 py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((dr) => (
                    <tr key={dr.kmpcDrNo} className="border-t">
                      <td className="px-2 py-2 font-semibold text-gray-900">{dr.kmpcDrNo}</td>
                      <td className="px-2 py-2">{dr.waybillNo}</td>
                      <td className="px-2 py-2">{dr.deliveryFrom}</td>
                      <td className="px-2 py-2">{dr.deliveryTo}</td>
                      <td className="px-2 py-2">
                        <div className="space-y-1">
                          {(dr.items || []).map((it, idx) => (
                            <div key={idx} className="text-gray-700">
                              <span className="font-medium">{it.model}</span>
                              <span className="text-gray-500">{` • Qty ${it.qty} • ${it.color} • ${it.frame} • ${it.engine}`}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(dr.kmpcDrNo)}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteDr(dr.kmpcDrNo)}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-all">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden border border-gray-200">
            <div className="flex justify-between items-center border-b px-4 py-2.5 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">{editingKmpcDrNo ? 'Edit DR' : 'Add DR'}</h2>
              <button
                className={`text-gray-500 text-2xl font-bold leading-none ${isSaving ? 'cursor-not-allowed opacity-50' : 'hover:text-gray-700'}`}
                onClick={() => {
                  if (isSaving) return;
                  setFormOpen(false);
                  setEditingKmpcDrNo(null);
                  setErrorMsg(null);
                }}
                disabled={isSaving}
              >
                &times;
              </button>
            </div>

            <div className="p-4 max-h-[75vh] overflow-y-auto">
              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <HiOutlineXCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 flex-1">{errorMsg}</p>
                  <button
                    onClick={() => setErrorMsg(null)}
                    className="text-red-600 hover:text-red-800 text-lg font-bold leading-none"
                    disabled={isSaving}
                  >
                    &times;
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Delivery from *</label>
                  <input
                    type="text"
                    value={formData.deliveryFrom}
                    onChange={(e) => setHeaderField('deliveryFrom', e.target.value)}
                    disabled={isSaving}
                    className={`w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${isSaving ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Delivery to *</label>
                  <input
                    type="text"
                    value={formData.deliveryTo}
                    onChange={(e) => setHeaderField('deliveryTo', e.target.value)}
                    disabled={isSaving}
                    className={`w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${isSaving ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Waybill No *</label>
                  <input
                    type="text"
                    value={formData.waybillNo}
                    onChange={(e) => setHeaderField('waybillNo', e.target.value)}
                    disabled={isSaving}
                    className={`w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${isSaving ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">KMPC DR No *</label>
                  <input
                    type="text"
                    value={formData.kmpcDrNo}
                    onChange={(e) => setHeaderField('kmpcDrNo', e.target.value)}
                    disabled={isSaving}
                    className={`w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${isSaving ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">Items</label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    disabled={isSaving}
                    className={`px-3 py-1 text-xs bg-blue-600 text-white rounded font-medium ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                  >
                    + Add Row
                  </button>
                </div>

                {formData.items.map((it, idx) => (
                  <div key={idx} className={`border border-gray-300 rounded-lg p-3 ${isSaving ? 'bg-gray-100' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600">Row {idx + 1}</span>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          disabled={isSaving}
                          className={`px-2 py-1 text-xs bg-red-500 text-white rounded font-medium ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600'}`}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Model *</label>
                        <input
                          type="text"
                          value={it.model}
                          onChange={(e) => setItemField(idx, 'model', e.target.value)}
                          disabled={isSaving}
                          className={`w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${isSaving ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Qty *</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={it.qty}
                          onChange={(e) => setItemField(idx, 'qty', e.target.value)}
                          disabled={isSaving}
                          className={`w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${isSaving ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Color *</label>
                        <input
                          type="text"
                          value={it.color}
                          onChange={(e) => setItemField(idx, 'color', e.target.value)}
                          disabled={isSaving}
                          className={`w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${isSaving ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Frame *</label>
                        <input
                          type="text"
                          value={it.frame}
                          onChange={(e) => setItemField(idx, 'frame', e.target.value)}
                          disabled={isSaving}
                          className={`w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${isSaving ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Engine *</label>
                        <input
                          type="text"
                          value={it.engine}
                          onChange={(e) => setItemField(idx, 'engine', e.target.value)}
                          disabled={isSaving}
                          className={`w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${isSaving ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 px-4 py-2.5 border-t bg-gray-50">
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className={`px-4 py-1.5 text-sm bg-green-600 text-white rounded font-medium shadow-sm transition ${
                  isSaving ? 'opacity-60 cursor-not-allowed' : 'hover:bg-green-700'
                }`}
              >
                {isSaving ? 'Saving...' : editingKmpcDrNo ? 'Update DR' : 'Add DR'}
              </button>
              <button
                onClick={() => {
                  if (isSaving) return;
                  setFormOpen(false);
                  setEditingKmpcDrNo(null);
                  setErrorMsg(null);
                }}
                disabled={isSaving}
                className={`px-4 py-1.5 text-sm bg-gray-400 text-white rounded font-medium shadow-sm transition ${
                  isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-500'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review & Print Modal */}
      {reviewModalOpen && drs.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-gray-200">
            <div className="flex justify-between items-center border-b px-8 py-5 bg-gray-50 sticky top-0 z-10">
              <h2 className="text-2xl font-bold text-gray-900">Motortrade Review & Print</h2>
              <button
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
                onClick={() => setReviewModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Left panel */}
              <aside className="w-1/4 min-w-[360px] max-w-md bg-gray-50 border-r border-gray-200 p-4 flex flex-col gap-2 overflow-y-auto">
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="Search KMPC DR / Waybill..."
                    value={reviewSearch}
                    onChange={(e) => setReviewSearch(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2 mb-2">
                  <button
                    className={`px-3 py-1 rounded text-sm font-medium border transition ${reviewFilter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                    onClick={() => setReviewFilter('all')}
                  >
                    All
                  </button>
                  <button
                    className={`px-3 py-1 rounded text-sm font-medium border transition ${reviewFilter === 'reviewed' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                    onClick={() => setReviewFilter('reviewed')}
                  >
                    Reviewed
                  </button>
                  <button
                    className={`px-3 py-1 rounded text-sm font-medium border transition ${reviewFilter === 'unreviewed' ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                    onClick={() => setReviewFilter('unreviewed')}
                  >
                    Unreviewed
                  </button>
                </div>

                <ul className="flex-1 overflow-y-auto pr-1">
                  {drs
                    .filter((dr) => {
                      if (reviewFilter === 'reviewed') return !!reviewedRefs[dr.kmpcDrNo];
                      if (reviewFilter === 'unreviewed') return !reviewedRefs[dr.kmpcDrNo];
                      return true;
                    })
                    .filter((dr) => {
                      const q = reviewSearch.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        String(dr.kmpcDrNo || '').toLowerCase().includes(q) ||
                        String(dr.waybillNo || '').toLowerCase().includes(q) ||
                        String(dr.deliveryTo || '').toLowerCase().includes(q) ||
                        String(dr.deliveryFrom || '').toLowerCase().includes(q)
                      );
                    })
                    .map((dr) => {
                      const key = dr.kmpcDrNo;
                      const isReviewed = !!reviewedRefs[key];
                      const isSelected = selectedKmpcDrNo === key;
                      return (
                        <li
                          key={key}
                          className={`cursor-pointer px-4 py-3 rounded-lg transition font-medium mb-3 shadow-sm flex items-center justify-between border border-gray-200
                            ${isReviewed ? 'border-l-4 border-l-green-500 bg-green-100 text-green-900' : isSelected ? 'border-l-4 border-l-blue-500 bg-blue-50 text-blue-700' : 'hover:bg-blue-100 text-gray-700'}
                          `}
                          onClick={() => {
                            setSelectedKmpcDrNo(key);
                            setPrintChecks({ motortrade: false, customer: false, carrier: false });
                          }}
                        >
                          <div className="flex-1">
                            <div className="text-sm leading-tight">{dr.kmpcDrNo}</div>
                            <div className="text-xs text-gray-600 mt-1">Waybill: {dr.waybillNo || '-'}</div>
                          </div>
                          {isSelected && (
                            <span className="ml-3 flex items-center">
                              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </span>
                          )}
                        </li>
                      );
                    })}
                </ul>
              </aside>

              {/* Right panel */}
              <section className="flex-1 p-8 overflow-y-auto bg-white flex flex-col gap-6">
                {!selectedDr ? (
                  <div className="text-gray-400 text-center mt-20">Select a DR to view details</div>
                ) : (
                  <>
                    <div className="flex items-center justify-end gap-2">
                      {reviewedRefs[selectedDr.kmpcDrNo] ? (
                        <button
                          className="px-4 py-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600 font-medium text-sm shadow-sm transition"
                          onClick={() => setReviewedRefs((prev) => ({ ...prev, [selectedDr.kmpcDrNo]: false }))}
                        >
                          Mark as Unreviewed
                        </button>
                      ) : (
                        <button
                          className="px-4 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 font-medium text-sm shadow-sm transition"
                          onClick={() => setReviewedRefs((prev) => ({ ...prev, [selectedDr.kmpcDrNo]: true }))}
                        >
                          Mark as Reviewed
                        </button>
                      )}
                    </div>

                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 shadow-sm">
                      <div className="mb-2 text-xs font-semibold text-gray-700 uppercase tracking-wide">Print Options</div>
                      <div className="space-y-1.5 mb-3">
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={printChecks.motortrade}
                            onChange={(e) => setPrintChecks((c) => ({ ...c, motortrade: e.target.checked }))}
                            className="w-3.5 h-3.5"
                          />
                          Motortrade Copy
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={printChecks.customer}
                            onChange={(e) => setPrintChecks((c) => ({ ...c, customer: e.target.checked }))}
                            className="w-3.5 h-3.5"
                          />
                          Customer's Copy
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={printChecks.carrier}
                            onChange={(e) => setPrintChecks((c) => ({ ...c, carrier: e.target.checked }))}
                            className="w-3.5 h-3.5"
                          />
                          Carrier Copy
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition ${printChecks.motortrade || printChecks.customer || printChecks.carrier ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                          onClick={handlePrintSelected}
                          disabled={!(printChecks.motortrade || printChecks.customer || printChecks.carrier)}
                        >
                          Print
                        </button>
                        <button
                          className="flex-1 px-3 py-1.5 rounded text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 transition"
                          onClick={handlePrintAll}
                        >
                          Print All
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
                        <div className="font-semibold text-blue-900">Details</div>
                        <div className="text-xs text-gray-600 mt-1">KMPC DR No: {selectedDr.kmpcDrNo}</div>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><span className="font-semibold">Delivery from:</span> {selectedDr.deliveryFrom}</div>
                          <div><span className="font-semibold">Delivery to:</span> {selectedDr.deliveryTo}</div>
                          <div><span className="font-semibold">Waybill No:</span> {selectedDr.waybillNo}</div>
                        </div>
                        <div className="mt-4">
                          <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Items</div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border border-gray-200 px-2 py-2 text-left">Model</th>
                                  <th className="border border-gray-200 px-2 py-2 text-center">Qty</th>
                                  <th className="border border-gray-200 px-2 py-2 text-left">Color</th>
                                  <th className="border border-gray-200 px-2 py-2 text-left">Frame</th>
                                  <th className="border border-gray-200 px-2 py-2 text-left">Engine</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(selectedDr.items || []).map((it, idx) => (
                                  <tr key={idx} className="odd:bg-white even:bg-gray-50">
                                    <td className="border border-gray-200 px-2 py-2">{it.model}</td>
                                    <td className="border border-gray-200 px-2 py-2 text-center">{it.qty}</td>
                                    <td className="border border-gray-200 px-2 py-2">{it.color}</td>
                                    <td className="border border-gray-200 px-2 py-2">{it.frame}</td>
                                    <td className="border border-gray-200 px-2 py-2">{it.engine}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

