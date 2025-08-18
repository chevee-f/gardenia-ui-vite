import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useMemo, useEffect, useRef } from "react";
import rates from './rates.json';

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg p-6 min-w-[340px] max-w-[90vw] relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold">&times;</button>
        {children}
      </div>
    </div>
  );
}

export default function Billing() {
  const allDr = useQuery(api.dr.getAllDr) || [];
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [billingStatement, setBillingStatement] = useState([]);
  const pageSize = 5;
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [destinationOrder, setDestinationOrder] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);

  // DnD handlers for modal list
  const handleDragStart = (idx) => setDragIndex(idx);
  const handleDragEnter = (idx) => {
    if (dragIndex === null || dragIndex === idx) return;
    setDestinationOrder(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(dragIndex, 1);
      arr.splice(idx, 0, moved);
      return arr;
    });
    setDragIndex(idx);
  };
  const handleDragEnd = () => setDragIndex(null);

  const getDRNumber = (str) => {
    const match = str.match(/(?:DR)?\s*#?\s*(\d{9})/i);
    return match ? match[1] : str;
  }

  // Add this state
  const [drList, setDrList] = useState([]);

  // When allDr changes, update local state
  useEffect(() => {
    if (allDr) {
      setDrList(allDr);
    }
  }, [allDr]);

  // Modify filtered to use drList instead of allDr
  const filtered = useMemo(() => {
    if (!search.trim()) return drList;
    const s = search.toLowerCase();
    return drList.filter(dr =>
      dr.ref_no?.toLowerCase().includes(s) ||
      dr.waybill_no?.toLowerCase().includes(s) ||
      dr.name_of_dealer?.toLowerCase().includes(s)
    );
  }, [drList, search]);

  // Pagination
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  // Check if DR is already in billing statement
  const isDRAdded = (drId) => {
    return billingStatement.some(item => item.drId === drId);
  };

  const getRateForDestination = (destination) => {
    const found = rates.find(r =>
      destination && destination.toLowerCase().includes(r.address.toLowerCase())
    );
    return [found ? found.rate : 0, found ? found.address : ''];
  };

  // Add DR to billing statement
  const addToBillingStatement = (dr) => {
    if (isDRAdded(dr._id)) return;

    const [percent, address] = getRateForDestination(dr.name_of_dealer || '');
    const dv = parseFloat(dr.declared_amount) || 0;

    const newItem = {
      drId: dr._id,
      waybillNo: dr.waybill_no || '',
      wbDate: '',
      destination: address || '',
      drNo: getDRNumber(dr.ref_no),
      drDate: '',
      dv,
      percent,
      charges: dv * (percent / 100)
    };

    setBillingStatement(prev => [...prev, newItem]);

    setDrList(prev => {
      const remaining = prev.filter(item => item._id !== dr._id);
      return [...remaining, dr];
    });
  };

  // Update date fields in billing statement
  const updateBillingItem = (drId, field, value) => {
    setBillingStatement(prev => 
      prev.map(item => 
        item.drId === drId 
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  // Remove item from billing statement
  const removeFromBillingStatement = (drId) => {
    setBillingStatement(prev => prev.filter(item => item.drId !== drId));
  };

  // Get unique destinations in current billing statement (in order of appearance)
  const uniqueDestinations = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const item of billingStatement) {
      if (!seen.has(item.destination)) {
        seen.add(item.destination);
        result.push(item.destination);
      }
    }
    return result;
  }, [billingStatement]);

  // Open modal and initialize order
  const openSortModal = () => {
    setDestinationOrder(uniqueDestinations);
    setSortModalOpen(true);
  };

  // Move destination up/down in modal
  const moveDestination = (idx, dir) => {
    setDestinationOrder(prev => {
      const arr = [...prev];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return arr;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  // Save new order and reorder billing statement
  const saveDestinationOrder = () => {
    // Reorder billingStatement by new destination order, sorting by waybillNo within each group
    setBillingStatement(prev => {
      const grouped = destinationOrder.map(dest =>
        prev
          .filter(item => item.destination === dest)
          .sort((a, b) => {
            // Split the waybillNo by the hyphen and parse both parts as integers
            const [partA1, partA2] = a.waybillNo.split('-').map(num => parseInt(num, 10));
            const [partB1, partB2] = b.waybillNo.split('-').map(num => parseInt(num, 10));

            // First, compare the first parts of the waybillNo (before the hyphen)
            if (partA1 !== partB1) {
              return partA1 - partB1;
            }
            // If the first parts are equal, compare the second parts (after the hyphen)
            return partA2 - partB2;
          })
      );
      return grouped.flat();
    });
    setSortModalOpen(false);
  };

  const getRowColor = (waybillNo, wbDate, drDate) => {
    const hasWaybill = !!waybillNo;
    const hasWbDate = !!wbDate;
    const hasDrDate = !!drDate;
    const filled = [hasWaybill, hasWbDate, hasDrDate].filter(Boolean).length;
    if (filled === 0) return 'bg-red-100';
    if (filled < 3) return 'bg-yellow-100';
    return 'bg-green-100';
  };
  
  const totalItems = billingStatement.length;
  const incompleteItems = billingStatement.filter(
    (item) => !(item.wbDate && item.drDate)
  ).length;
  const totalDV = billingStatement.reduce((sum, item) => sum + item.dv, 0);
  const totalCharges = billingStatement.reduce((sum, item) => sum + item.charges, 0);

  
  const printRef = useRef();
  const handlePrint = () => {
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open("", "", "width=900,height=650");
    printWindow.document.write(`
      <html>
        <head>
          <title>Billing Statement</title>
          <style>
            table { border-collapse: collapse; width: 100%; font-family: Arial; font-size: 12px; }
            th, td { border: 1px solid #000; padding: 4px; text-align: left; }
            thead { background: #eee; }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const [editWaybillPopup, setEditWaybillPopup] = useState({ open: false, drId: null, value: "" });

const openWaybillEdit = (drId, currentValue) => {
  setEditWaybillPopup({ open: true, drId, value: currentValue });
};

const closeWaybillEdit = () => {
  setEditWaybillPopup({ open: false, drId: null, value: "" });
};

const saveWaybillEdit = () => {
  updateBillingItem(editWaybillPopup.drId, "waybillNo", editWaybillPopup.value);
  closeWaybillEdit();
};

function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date)) return "";
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
}

  return (
    <div className="min-h-screen bg-gray-50 py-10 flex gap-6 px-6">
      {/* Billing Records Panel */}
      <div className="w-[45%] min-w-[527px] bg-white rounded-2xl shadow-lg p-8 billing-records">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Billing Records</h1>
        <div className="flex items-center mb-6 relative">
          <input
            placeholder="Search DR, Waybill, or Destination..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // reset page on search
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          <button 
            onClick={() => setSearch("")}
            className="absolute right-[0.1rem] px-3 py-2">x</button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200 min-h-[400px]">
          <table className="w-full text-sm text-left text-gray-700 bg-white">
            <thead className="text-xs text-gray-700 bg-gray-100">
              <tr>
                <th className="px-4 py-3">Waybill</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">D.R No.</th>
                <th className="px-4 py-3">DV</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-gray-400 py-8">No records found.</td>
                </tr>
              ) : (
                [...paginated]
                  .sort((a, b) => {
                    // Disabled (already added) should be last
                    const aDisabled = isDRAdded(a._id) ? 1 : 0;
                    const bDisabled = isDRAdded(b._id) ? 1 : 0;
                    return aDisabled - bDisabled;
                  })
                  .map((dr, idx) => (
                    <tr key={dr._id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm">{dr.waybill_no}</td>
                      <td className="px-4 py-3 text-sm">{dr.name_of_dealer}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{getDRNumber(dr.ref_no)}</td>
                      <td className="px-4 py-3 text-sm">₱{(parseFloat(dr.declared_amount) || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <button 
                          onClick={() => addToBillingStatement(dr)}
                          disabled={isDRAdded(dr._id)}
                          className={`px-3 py-1 text-xs rounded font-medium transition ${
                            isDRAdded(dr._id)
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {isDRAdded(dr._id) ? 'Added' : 'Add'}
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination controls */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
            disabled={page === 1}
          >
            Prev
          </button>
          <span className="text-gray-600 text-sm">
            Page {page} of {Math.max(1, Math.ceil(filtered.length / pageSize))}
          </span>
          <button
            onClick={() => setPage(p => Math.min(Math.ceil(filtered.length / pageSize), p + 1))}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={page === Math.ceil(filtered.length / pageSize) || filtered.length === 0}
          >
            Next
          </button>
        </div>
      </div>

      {/* Billing Statement Panel */}
      <div className="w-full bg-white rounded-2xl shadow-lg p-8 billing-statement flex flex-col">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">
        <span>
      Billing Statement
      <span className="ml-3 text-sm text-gray-500">
        ({incompleteItems} / {totalItems} items left)
      </span>
    </span>
        </h1>
        
        <button
          onClick={handlePrint}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Print
        </button>

        {/* Scrollable table */}
  <div className="overflow-y-auto max-h-[400px] border border-gray-200 rounded-lg">
    <table className="w-full text-sm text-left text-gray-700 bg-white">
      <thead className="text-xs text-gray-700 bg-gray-100 sticky top-0">
        <tr>
          <th className="px-3 py-3">Waybill No</th>
          <th className="px-3 py-3">WB Date</th>
          <th className="px-3 py-3 flex items-center gap-2">
            Destination
            <button
              className="ml-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 border border-blue-200"
              onClick={openSortModal}
              title="Sort Destinations"
            >
              Sort
            </button>
          </th>
          <th className="px-3 py-3">DR No</th>
          <th className="px-3 py-3">DR Date</th>
          <th className="px-3 py-3">DV</th>
          <th className="px-3 py-3">%</th>
          <th className="px-3 py-3">Charges</th>
          <th className="px-3 py-3">Action</th>
        </tr>
      </thead>
      <tbody>
        {billingStatement.length === 0 ? (
          <tr>
            <td colSpan={9} className="text-center text-gray-400 py-8">
              No items in billing statement.
            </td>
          </tr>
        ) : (
          billingStatement.map((item, idx) => (
            <tr
              key={item.drId}
              className={`${getRowColor(item.waybillNo, item.wbDate, item.drDate)} ${idx % 2 === 0 ? '' : 'bg-opacity-75'}`}
            >
              {/* <td className="px-3 py-3 text-sm">
                {/^\d{3}-\d{4}$/.test(item.waybillNo) ? (
                  item.waybillNo
                ) : (
                  <input
                    type="text"
                    value={item.waybillNo}
                    onChange={e => updateBillingItem(item.drId, 'waybillNo', e.target.value)}
                    placeholder="000-0000"
                    pattern="\d{3}-\d{4}"
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                    maxLength={8}
                  />
                )}
              </td> */}
              <td
                className="px-3 py-3 text-sm cursor-pointer hover:underline"
                onClick={() => openWaybillEdit(item.drId, item.waybillNo)}
                title="Click to edit"
              >
                {item.waybillNo || <span className="text-gray-400 italic">Set Waybill No</span>}
              </td>
              <td className="px-3 py-3 relative">
                <input
                  type="date"
                  value={item.wbDate}
                  onChange={e => updateBillingItem(item.drId, 'wbDate', e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded mb-1 text-transparent"
                />
                <div className="text-xs text-gray-500 absolute top-[22px] left-[19px] width-[90px]">
                  {formatDateShort(item.wbDate)}
                </div>
              </td>
              <td className="px-3 py-3 text-sm">{item.destination}</td>
              <td className="px-3 py-3 text-sm font-medium">{item.drNo}</td>
              <td className="px-3 py-3 relative">
                <input
                  type="date"
                  value={item.drDate}
                  onChange={e => updateBillingItem(item.drId, 'drDate', e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded mb-1 text-transparent"
                />
                <div className="text-xs text-gray-500 absolute top-[22px] left-[19px] width-[90px]">
                  {formatDateShort(item.drDate)}
                </div>
              </td>
              <td className="px-3 py-3 text-sm">{item.dv.toLocaleString()}</td>
              <td className="px-3 py-3 text-sm">{item.percent}%</td>
              <td className="px-3 py-3 text-sm font-medium">
                {item.charges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="px-3 py-3">
                <button
                  onClick={() => removeFromBillingStatement(item.drId)}
                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>

      {/* 
      {item.charges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      */}
    </table>
  </div>
        
        {/* Summary stays fixed below */}
        {billingStatement.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-700">
              Total Items: {totalItems}
            </span>
            <div className="flex gap-6">
              <span className="font-bold text-lg text-gray-900">
                Total DV: ₱{totalDV.toLocaleString()}
              </span>
              <span className="font-bold text-lg text-gray-900">
                Total Charges: ₱{totalCharges.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
        <Modal open={sortModalOpen} onClose={() => setSortModalOpen(false)}>
          <h2 className="text-lg font-bold mb-4">Sort Destinations</h2>
          <ul className="mb-4">
            {destinationOrder.map((dest, idx) => (
              <li
                key={dest}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 mb-2 rounded px-3 py-2 border ${
                  dragIndex === idx ? 'bg-blue-50 border-blue-300' : 'bg-gray-50'
                }`}
                title="Drag to reorder"
              >
                <span className="cursor-grab select-none">↕</span>
                <span className="flex-1 truncate">{dest}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              onClick={() => setSortModalOpen(false)}
            >Cancel</button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={saveDestinationOrder}
            >Save Order</button>
          </div>
        </Modal>
        <Modal open={editWaybillPopup.open} onClose={closeWaybillEdit}>
          <h2 className="text-lg font-bold mb-4">Edit Waybill No</h2>
          <input
            type="text"
            value={editWaybillPopup.value}
            onChange={e => {
              let val = e.target.value.replace(/[^0-9]/g, ''); // Only digits
              if (val.length > 3) {
                val = val.slice(0, 3) + '-' + val.slice(3, 7);
              }
              setEditWaybillPopup(p => ({ ...p, value: val }));
            }}
            placeholder="000-0000"
            className="w-full px-3 py-2 border border-gray-300 rounded mb-4"
            maxLength={8}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              onClick={closeWaybillEdit}
            >Cancel</button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={saveWaybillEdit}
            >Save</button>
          </div>
        </Modal>
        {/* Hidden print version */}
        <div style={{ display: "none" }}>
        {/* <div> */}
          <div ref={printRef}>
            <div style={{ fontFamily: 'Arial Narrow', fontSize: '12px', fontWeight: 'bold' }}>
              TRIMOTORS TECHNOLOGY CORP.
            </div>
            <div style={{ fontFamily: 'Arial', fontSize: '6px', fontWeight: 'bold' }}>KM 23 EAST SERVICE ROAD BO,CUPANG,ALABANG</div>
            <div style={{ fontFamily: 'Arial', fontSize: '6px', fontWeight: 'bold', marginBottom: '80px'}}>MUNTINLUPA MANILA</div>
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '9px', fontWeight: 'bold' }}>Waybill No</th>
                  <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '9px', fontWeight: 'bold' }}>WB Date</th>
                  <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '9px', fontWeight: 'bold' }}>Destination</th>
                  <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '9px', fontWeight: 'bold' }}>D.R No.</th>
                  <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '9px', fontWeight: 'bold' }}>DR Date</th>
                  <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '9px', fontWeight: 'bold', width: '40px' }}>DV</th>
                  <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '9px', fontWeight: 'bold', width: '30px' }}>PERCENT</th>
                  <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '9px', fontWeight: 'bold', width: '40px' }}>Charges</th>
                </tr>
              </thead>
              <tbody>
                {billingStatement.map((item) => (
                  <tr key={item.drId}>
                    <td style={{ fontFamily: 'Arial', fontSize: '9px', textAlign: "center" }}>{item.waybillNo}</td>
                    <td style={{ fontFamily: 'Arial', fontSize: '9px', textAlign: "center" }}>{formatDateShort(item.wbDate) || ""}</td>
                    <td style={{ fontFamily: 'Arial', fontSize: '9px', textAlign: "center" }}>{item.destination}</td>
                    <td style={{ fontFamily: 'Arial', fontSize: '9px', textAlign: "center" }}>{item.drNo}</td>
                    <td style={{ fontFamily: 'Arial', fontSize: '9px', textAlign: "center" }}>{formatDateShort(item.drDate) || ""}</td>
                    <td style={{ fontFamily: 'Arial', fontSize: '9px', textAlign: "right" }}>{item.dv.toLocaleString()}</td>
                    <td style={{ fontFamily: 'Arial', fontSize: '9px', textAlign: "center" }}>{item.percent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</td>
                    <td style={{ fontFamily: 'Arial', fontSize: '9px', textAlign: "right" }}>{item.charges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={5} style={{ fontFamily: 'Arial', fontSize: '9px', fontWeight: 'bold', textAlign: 'right' }}>TOTAL</td>
                  <td style={{ fontFamily: 'Calibri', fontSize: '11px', fontWeight: 'bold' }}>{totalDV.toLocaleString()}</td>
                  <td></td>
                  <td style={{ fontFamily: 'Calibri', fontSize: '11px', fontWeight: 'bold' }}>{totalCharges.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ position: 'absolute', bottom: '20px', width: '100%' }}>
              <div style={{ display: 'flex', width: '100%' }}>
                <div style={{ width: '200px' }}>
                  <div style={{ fontFamily: 'Calibri', fontSize: '10px', fontWeight: 'bold', marginBottom: '20px' }}>PREPARED BY:</div>
                  <div style={{ fontFamily: 'Calibri', fontSize: '10px', fontWeight: 'bold', width: '120px', textAlign: 'center' }}>AILEEN MATUB</div>
                  <div style={{ fontFamily: 'Calibri', fontSize: '8px', fontWeight: 'bold', fontStyle: 'italic', width: '120px', textAlign: 'center' }}>OFFICE STAFF</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'Calibri', fontSize: '10px', fontWeight: 'bold', marginBottom: '20px' }}>CHECKED BY:</div>
                  <div style={{ fontFamily: 'Calibri', fontSize: '10px', fontWeight: 'bold', width: '120px', textAlign: 'center' }}>ERVY YPARRAGUIRRE</div>
                  <div style={{ fontFamily: 'Calibri', fontSize: '8px', fontWeight: 'bold', fontStyle: 'italic', width: '120px', textAlign: 'center' }}>OWNER</div>
                </div>
                <div style={{ position: 'absolute', right: '0'}}>
                  <div style={{ fontFamily: 'Calibri', fontSize: '10px', fontWeight: 'bold', marginBottom: '20px' }}>RECEIVED BY:</div>
                  <div>_________________________</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
