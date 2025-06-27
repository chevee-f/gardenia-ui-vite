import React, { useState, useEffect } from 'react';
// import { ResizableBox } from 'react-resizable';
// import 'react-resizable/css/styles.css';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

// === CONSTANTS ===
const COPY_LABELS = {
  ttc: 'TTC COPY',
  customer: "CUSTOMER COPY",
  carrier: 'CARRIER COPY',
};
const EMAILS = [
  'ervycustomsbrokerage@yahoo.com.ph cavimerto@gmail.com',
  'aileenmatub2015@gmail.com',
  'mjervytrucking@yahoo.com',
  'rachelervytrucking08@gmail.com',
];
const CONTACT_NUMBERS = '09274288126/09458261900/09156153298';
const SHIPPER_NAME = 'TRIMOTORS TECHNOLOGY CORP.';
const PRINT_OPTIONS = [
  { key: 'ttc', label: COPY_LABELS.ttc },
  { key: 'customer', label: COPY_LABELS.customer },
  { key: 'carrier', label: COPY_LABELS.carrier },
];
const HOUSEWAY_BILL_PLACEHOLDER = '000-0000';
const HOUSEWAY_BILL_FORMAT_ERROR = 'Format must be 000-0000';
const REMARKS = 'WARRANT THAT ALL DETAILS GIVEN ARE TRUE AND CORRECT';
const RECEIVED_BY = "RECEIVED BY:";
const CONSIGNEE_PRINTED = "CONSIGNEE PRINTED NAME AND SIGNATURE/DATE";
const SHIPPER_PRINTED = "SHIPPER'S PRINTED NAME AND SIGNATURE/DATE";
const AUTHORIZED_REPRESENTATIVE = 'AUTHORIZED REPRESENTATIVE';
const ERVY_LOGISTICS = 'ERVY LOGISTICS';
const DOCUMENT_NUMBER = 'DOCUMENT NUMBER';
const NUMBER_TYPE_PACKAGE = 'NUMBER AND TYPE OF PACKAGE';
const TRUCK_PLATE_NO = 'TRUCK PLATE NO.';
const DECLARED_VALUE = 'DECLARED VALUE:';
const CONSIGNEE_NAME = 'CONSIGNEE NAME:';
const CONSIGNEE_CONTACT = 'CONSIGNEE CONTACT INFORMATION';
const CONSIGNEE_ADDRESS = 'CONSIGNEE ADDRESS:';
const HOUSEWAY_BILL_NO = 'HOUSEWAY BILL NO:';

function SpareParts() {
  const [jsonData, setJsonData] = useState(null);
  const [colWidths, setColWidths] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRef, setSelectedRef] = useState(null);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  // New state for reviewed and houseway bill numbers
  const [reviewedRefs, setReviewedRefs] = useState({}); // { idx: true }
  const [housewayBillNos, setHousewayBillNos] = useState({}); // { idx: '000-0000' }
  const [detailsAccordionOpen, setDetailsAccordionOpen] = useState(false);
  const [globalHousewayBill, setGlobalHousewayBill] = useState('');
  const [editingGlobalHousewayBill, setEditingGlobalHousewayBill] = useState(false);
  const [tempGlobalHousewayBill, setTempGlobalHousewayBill] = useState('');
  const [printChecks, setPrintChecks] = useState({ ttc: false, customer: false, carrier: false });

  // When selectedRef changes, open the accordion by default
  useEffect(() => {
    setDetailsAccordionOpen(true);
  }, [selectedRef]);

  // Helper to increment houseway bill numbers
  function incrementHousewayBill(base, inc) {
    // base: '000-0001', inc: 1 => '000-0002', inc: 2 => '000-0003', etc.
    const match = base.match(/^(\d{3})-(\d{4})$/);
    if (!match) return '';
    const prefix = match[1];
    const num = parseInt(match[2], 10) + inc + 1; // always start from +1
    return `${prefix}-${num.toString().padStart(4, '0')}`;
  }

  // When globalHousewayBill changes, update all housewayBillNos for non-overridden fields
  useEffect(() => {
    if (!/^\d{3}-\d{4}$/.test(globalHousewayBill) || !jsonData) return;
    setHousewayBillNos(prev => {
      const updated = { ...prev };
      for (let i = 0; i < jsonData.length; i++) {
        // Only update if not overridden
        if (!prev[i] || prev[i]._auto) {
          updated[i] = { value: incrementHousewayBill(globalHousewayBill, i), _auto: true };
        }
      }
      return updated;
    });
  }, [globalHousewayBill, jsonData]);

  // On file load, set default global houseway bill if not set
  useEffect(() => {
    if (jsonData && jsonData.length > 0 && !globalHousewayBill) {
      setGlobalHousewayBill('000-0001');
    }
  }, [jsonData]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Read file as ArrayBuffer
    const data = await file.arrayBuffer();
    // Dynamically import xlsx for browser compatibility
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Use XLSX.utils.sheet_to_json to get a 2D array, which handles commas in values
    const rowsArr = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (rowsArr.length < 8) {
      alert('Excel file does not have enough rows.');
      return;
    }

    // Row 7 (index 6) is the key
    const keys = rowsArr[6];
    // Rows 8+ (index 7+) are the values
    const values = rowsArr.slice(7);
    const json = [];
    let totals = null;
    for (const row of values) {
      // If columns A-F (0-5) are all empty, treat this as the end and get G/H totals
      const isEnd = row.slice(0, 6).every(cell => !cell || cell.toString().trim() === '');
      if (isEnd) {
        totals = {
          totalG: row[6]?.toString().trim() || '',
          totalH: row[7]?.toString().trim() || ''
        };
        break;
      }
      const obj = {};
      keys.forEach((key, i) => {
        obj[key?.toString().trim() || `col${i}`] = row[i]?.toString().trim() || '';
      });

      json.push(obj);
    }
    
    // if (totals) {
    //   json.push(totals);
    // }
    setJsonData(json);
    console.log(json);
    // Set default column widths, with reduced width for specific columns
    const reducedCols = ['DR/SI DATE', 'No. Of Boxes', 'NO. OF BUNDLES'];
    const widths = keys.map(key => reducedCols.includes(key?.toString().trim()) ? 90 : 160);
    setColWidths([60, ...widths]); // 60px for index column
  };

  const handleRefClick = (idx) => {
    setSelectedRef(idx);
  };

  // Handle review button
  const handleReview = (idx) => {
    // viewerOpen state and logic removed
  };

  // Confirm review
  const handleConfirmReview = (idx) => {
    setReviewedRefs(prev => ({ ...prev, [idx]: true }));
  };

  // When user edits a specific field, mark it as overridden
  const handleHousewayBillChange = (idx, value) => {
    if (/^\d{0,3}-?\d{0,4}$/.test(value)) {
      let formatted = value.replace(/[^\d]/g, '');
      if (formatted.length > 3) {
        formatted = formatted.slice(0, 3) + '-' + formatted.slice(3, 7);
      }
      setHousewayBillNos(prev => ({ ...prev, [idx]: { value: formatted, _auto: false } }));
    }
  };

  // Helper to get the value for a ref no
  function getHousewayBill(idx) {
    return housewayBillNos[idx]?.value || '';
  }

  const cloneHeadStyles = () => {
    return Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join('');
  };

  // Update handlePrintViewer to accept a type
  const handlePrintViewer = (idx, type) => {
    const content = document.getElementById(`viewer-content-${idx}`);
    const getPrintHtml = (label) => {
      return `
        <div style='position: relative; border: 1px solid; padding-bottom: 20px;'>
          ${content.innerHTML}
          <div style='position: absolute;right: 200px;font-size: 14px;font-weight: bold;'>
            <span style=''>${label}</span>
          </div>
        </div>
      `;
    };
    const printWindow = window.open('', '', 'width=850,height=700');
    const printStyle = `
    ${cloneHeadStyles()}
    <style>
      @page { size: legal; }
      @media print {
        .no-print { display: none; }
      }
    </style>
  `;
    let printHtml = '';
    if (type === 'all') {
      printHtml += getPrintHtml('TTC COPY');
      printHtml += `<hr style='margin-top: 25px;margin-bottom: 25px;'/>`;
      printHtml += getPrintHtml("CUSTOMER COPY");
      printHtml += `<hr style='margin-top: 25px;margin-bottom: 25px;'/>`;
      printHtml += getPrintHtml('CARRIER COPY');
    } else {
      let label = '';
      if (type === 'ttc') label = 'TTC COPY';
      if (type === 'customer') label = "CUSTOMER COPY";
      if (type === 'carrier') label = 'CARRIER COPY';
      printHtml = getPrintHtml(label);
    }
    printWindow.document.write('<html><head><title>Print Viewer</title>' + printStyle + '</head><body>' + printHtml + '</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  // New: Print only selected types in one popup
  const handlePrintCustom = (idx, typesArr) => {
    const content = document.getElementById(`viewer-content-${idx}`);
    const getPrintHtml = (label) => {
      return `
        <div style='position: relative; border: 1px solid; padding-bottom: 20px'>
          ${content.innerHTML}
          <div style='position: absolute;right: 200px;font-size: 14px;font-weight: bold;'>
            <span style=''>${label}</span>
          </div>
        </div>
      `;
    };
    const printWindow = window.open('', '', 'width=850,height=700');
    const printStyle = `
    ${cloneHeadStyles()}
    <style>
      @page { size: legal;}
      @media print {
        .no-print { display: none; }
      }
    </style>
  `;
    let printHtml = '';
    typesArr.forEach((type, i) => {
      let label = '';
      if (type === 'ttc') label = 'TTC COPY';
      if (type === 'customer') label = "CUSTOMER COPY";
      if (type === 'carrier') label = 'CARRIER COPY';
      if (i > 0) printHtml += `<hr style='margin-top: 25px;margin-bottom: 25px;'/>`;
      printHtml += getPrintHtml(label);
    });
    printWindow.document.write('<html><head><title>Print Viewer</title>' + printStyle + '</head><body>' + printHtml + '</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  // Helper for print logic
  const handlePrintSelected = (idx) => {
    const typesArr = [];
    if (printChecks.ttc) typesArr.push('ttc');
    if (printChecks.customer) typesArr.push('customer');
    if (printChecks.carrier) typesArr.push('carrier');
    if (typesArr.length > 0) {
      handlePrintCustom(idx, typesArr);
    }
  };

  const handlePrintAllBox = (idx) => {
    handlePrintViewer(idx, 'all');
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Spare Parts</h1>
      <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
      {jsonData && jsonData.length > 0 && (
        <div className="overflow-x-auto mt-6">
          {/* Search/filter input and button */}
          <div className="flex items-center justify-between w-full max-w-4xl mb-4 gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search Spare Parts"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">🔍</div>
            </div>
            <button
              className="ml-4 px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
              onClick={() => setModalOpen(true)}
            >
              Open Modal
            </button>
          </div>
          {/* Header Table */}
          <div className='overflow-y-scroll'>
            <table className="w-full text-sm text-left text-gray-500 bg-white rounded-t-lg shadow table-fixed" style={{ minWidth: 'max-content' }}>
              <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                <tr>
                  <th style={{ width: colWidths[0], minWidth: 40, maxWidth: 80 }} className="px-0 py-3 border-r text-center">#</th>
                  {Object.keys(jsonData[0]).map((key, idx) => (
                    <th key={key} style={{ width: colWidths[idx+1], minWidth: 80, maxWidth: 400, position: 'relative' }} className="px-0 py-3 border-r last:border-r-0 break-words whitespace-normal">
                      <div className="px-4 py-2 break-words whitespace-normal" style={{width: colWidths[idx+1] - 8}}>{key}</div>
                    </th>
                  ))}
                  <th hidden className="px-0 py-3 border-r text-center">Actions</th>
                </tr>
              </thead>
            </table>
          </div>
          {/* Scrollable Body Table */}
          <div className="max-h-96 overflow-y-scroll">
            <table className="w-full text-sm text-left text-gray-500 bg-white rounded-b-lg shadow table-fixed" style={{ minWidth: 'max-content' }}>
              <tbody>
                {jsonData
                  .filter((row) => {
                    // Don't filter the totals row
                    if (row.totalG !== undefined && row.totalH !== undefined) return true;
                    if (!searchQuery) return true;
                    const values = Object.values(row).join(' ').toLowerCase();
                    return values.includes(searchQuery.toLowerCase());
                  })
                  .map((row, idx) => (
                    <tr key={idx} className="border-t hover:bg-gray-100 transition-colors">
                      <td style={{ width: colWidths[0], minWidth: 40, maxWidth: 80 }} className="px-4 py-2 border-r font-semibold text-center">{row.totalG !== undefined && row.totalH !== undefined ? '' : idx + 1}</td>
                      {Object.keys(jsonData[0]).map((key, colIdx) => (
                        <td key={key} style={{ width: colWidths[colIdx+1], minWidth: 80, maxWidth: 400 }} className="px-4 py-2 break-words whitespace-normal border-r last:border-r-0">{row[key]}</td>
                      ))}
                      <td hidden className="px-4 py-2 border-r text-center">
                        {reviewedRefs[idx] ? (
                          <span className="text-green-600 font-semibold">Reviewed</span>
                        ) : (
                          <button className="px-3 py-1 bg-yellow-400 text-white rounded hover:bg-yellow-500" onClick={() => handleReview(idx)}>Review</button>
                        )}
                        <div className="flex gap-4 mt-4 flex-wrap">
                          <button
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            onClick={() => handleConfirmReview(idx)}
                            disabled={!/^\d{3}-\d{4}$/.test(getHousewayBill(idx) || '')}
                          >
                            Mark as Reviewed
                          </button>
                          <button
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            onClick={() => handlePrintViewer(idx, 'ttc')}
                          >
                            Print TTC Copy
                          </button>
                          <button
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            onClick={() => handlePrintViewer(idx, 'customer')}
                          >
                            Print Customer's Copy
                          </button>
                          <button
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            onClick={() => handlePrintViewer(idx, 'carrier')}
                          >
                            Print Carrier Copy
                          </button>
                          <button
                            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                            onClick={() => handlePrintViewer(idx, 'all')}
                          >
                            Print All
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {/* Modal for REF NO. list and details */}
          {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-[96vw] h-[96vh] flex flex-col">
                <div className="flex justify-between items-center border-b px-8 py-6">
                  <div className="flex items-center gap-8">
                    <h2 className="text-2xl font-semibold">Spare Parts Details</h2>
                    <div className="houseway-bill-no-field flex items-center gap-2">
                      <label className="block font-medium mb-0">Last Houseway Bill No.:</label>
                      <input
                        type="text"
                        className="border rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="000-0001"
                        value={editingGlobalHousewayBill ? tempGlobalHousewayBill : globalHousewayBill}
                        onChange={e => editingGlobalHousewayBill ? setTempGlobalHousewayBill(e.target.value) : undefined}
                        maxLength={8}
                        style={{ width: 120 }}
                        readOnly={!editingGlobalHousewayBill}
                      />
                      {editingGlobalHousewayBill ? (
                        <>
                          <button
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                            onClick={() => {
                              setGlobalHousewayBill(tempGlobalHousewayBill);
                              setEditingGlobalHousewayBill(false);
                            }}
                            disabled={!/^\d{3}-\d{4}$/.test(tempGlobalHousewayBill)}
                          >
                            Save
                          </button>
                          <button
                            className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                            onClick={() => {
                              setTempGlobalHousewayBill(globalHousewayBill);
                              setEditingGlobalHousewayBill(false);
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                          onClick={() => {
                            setTempGlobalHousewayBill(globalHousewayBill);
                            setEditingGlobalHousewayBill(true);
                          }}
                        >
                          Edit
                        </button>
                      )}
                      {(editingGlobalHousewayBill ? tempGlobalHousewayBill : globalHousewayBill) && !/^\d{3}-\d{4}$/.test(editingGlobalHousewayBill ? tempGlobalHousewayBill : globalHousewayBill) && (
                        <div className="text-red-500 text-xs mt-1">Format must be 000-0000</div>
                      )}
                    </div>
                  </div>
                  <button className="text-gray-500 hover:text-gray-700 text-3xl" onClick={() => setModalOpen(false)}>&times;</button>
                </div>
                <div className="flex flex-1 overflow-hidden relative">
                  <div className="w-1/5 absolute top-0">
                    <button
                      className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded shadow"
                      onClick={() => setShowLeftPanel((v) => !v)}
                    >
                      {showLeftPanel ? 'Hide List' : 'Show List'}
                    </button>
                  </div>
                  {/* Left panel: REF NO. list */}
                  {showLeftPanel && (
                    <div className="w-1/5 border-r overflow-y-auto p-3 transition-all duration-300">
                      <div className="relative">
                        <h3 className="text-lg font-medium mb-4">REF NO. List</h3>
                      </div>
                      <ul>
                        {jsonData
                          .filter(row => row['REF NO.'] && row['REF NO.'].trim() !== '')
                          .map((row, idx) => (
                            <li
                              key={row['REF NO.'] + idx}
                              className={`cursor-pointer px-4 py-3 rounded mb-2 ${selectedRef === idx ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'}`}
                              onClick={() => handleRefClick(idx)}
                            >
                              {row['REF NO.']}
                              {reviewedRefs[idx] && <span className="ml-2 text-green-600 font-semibold">(Reviewed)</span>}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                  {/* Right panel: details */}
                  <div className="flex-1 p-8 overflow-y-auto">
                    {selectedRef !== null && jsonData[selectedRef] ? (
                      <div className="space-y-4">
                        <h3 className="text-xl font-semibold mb-6">
                          Details for REF NO. {jsonData[selectedRef]['REF NO.']}
                          {/* Show reviewed label if reviewed */}
                          {reviewedRefs[selectedRef] && (
                            <span className="text-green-600 font-semibold ml-2 mt-4">Reviewed</span>
                          )}
                        </h3>
                        <div className='flex'>
                          <div className='mr-6'>
                            <div className="houseway-bill-no-field mb-4">
                              <label className="block font-medium mb-1">Houseway Bill No:</label>
                              <input
                                type="text"
                                className="border rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="000-0000"
                                value={getHousewayBill(selectedRef)}
                                onChange={e => handleHousewayBillChange(selectedRef, e.target.value)}
                                maxLength={8}
                              />
                              {getHousewayBill(selectedRef) && !/^[\d]{3}-[\d]{4}$/.test(getHousewayBill(selectedRef)) && (
                                <div className="text-red-500 text-xs mt-1">Format must be 000-0000</div>
                              )}
                            </div>
                            <div className="flex gap-4 mt-4 flex-wrap">
                              <button
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                onClick={() => handleConfirmReview(selectedRef)}
                                disabled={!/^[\d]{3}-[\d]{4}$/.test(getHousewayBill(selectedRef) || '')}
                              >
                                Mark as Reviewed
                              </button>
                            </div>
                          </div>
                          {/* Print options box */}
                          <div className="border border-gray-300 rounded p-4 mb-2 w-full max-w-xs" style={{padding:10}}>
                            <div className="mb-3 font-semibold">Print Options</div>
                            <div className="flex flex-col gap-2 mb-4">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={printChecks.ttc}
                                  onChange={e => setPrintChecks(c => ({ ...c, ttc: e.target.checked }))}
                                />
                                TTC Copy
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={printChecks.customer}
                                  onChange={e => setPrintChecks(c => ({ ...c, customer: e.target.checked }))}
                                />
                                Customer's Copy
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={printChecks.carrier}
                                  onChange={e => setPrintChecks(c => ({ ...c, carrier: e.target.checked }))}
                                />
                                Carrier Copy
                              </label>
                            </div>
                            <div className="flex gap-3 mt-2">
                              <button
                                className={`px-4 py-2 rounded font-semibold ${printChecks.ttc || printChecks.customer || printChecks.carrier ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                                onClick={() => handlePrintSelected(selectedRef)}
                                disabled={!(printChecks.ttc || printChecks.customer || printChecks.carrier)}
                              >
                                Print
                              </button>
                              <button
                                className="px-4 py-2 rounded font-semibold bg-purple-600 text-white hover:bg-purple-700"
                                onClick={() => handlePrintAllBox(selectedRef)}
                              >
                                Print All
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="relative mt-8 border rounded-lg shadow p-6 bg-gray-50 font-bold" id={`viewer-content-${selectedRef}`}>
                          <div className='font-bold text-[12px]'>
                            <div className='viewer-header flex'>
                              <div className='viewer-header-left'>
                                <div className='absolute top-0 left-0'>
                                  <img src='src/assets/waybill-logo.png' alt='Waybill Logo' className='mt-[1px] ml-[1px] h-[68px] mb-[10px] w-auto' />
                                </div>
                                <div className='flex mt-[85px]'>
                                  <div className='ml-1 w-[84px]'>Email address:</div>
                                  <div className='ml-[40px] text-red-500 w-[360px]'>{EMAILS[0]}</div>
                                </div>
                                <div className='flex'>
                                  <div className='ml-1'>Contact Number:</div>
                                  <div className='ml-[23px] text-red-500'>{CONTACT_NUMBERS}</div>
                                </div>
                              </div>
                              <div className='viewer-header-right ml-[40px] mt-[20px]'>
                                <div className='flex font-serif items-center'>
                                  <div>
                                    {HOUSEWAY_BILL_NO}
                                  </div>
                                  <div className='pt-1 pb-1 text-[16px] font-bold font-[Times New Roman] bg-[#fbe4d5] w-[160px] flex justify-center items-center'>{getHousewayBill(selectedRef)}</div></div>
                                <div className="mt-[33px]">
                                  <div className='underline text-red-500'>{EMAILS[1]}</div>
                                  <div className='underline text-red-500'>{EMAILS[2]}</div>
                                  <div className='underline text-red-500'>{EMAILS[3]}</div>
                                </div>
                              </div>
                            </div>
                            <div className='viewer-top-body flex mt-6'>
                              <div className='viewer-top-body-left w-[445px]'>
                                <div className='flex'>
                                  <div className='ml-1 w-[120px]'>SHIPPER NAME:</div>
                                  <div className='font-normal h-[40px] flex items-center justify-center w-[215px] bg-[#fbe4d5]'>TRIMOTORS TECHNOLOGY CORP.</div>
                                </div>
                                <div className='flex mt-5'>
                                  <div className='ml-1 w-[120px]'>DECLARED VALUE:</div>
                                  <div className='pl-2 bg-[#fbe4d5]'>P<span className='font-normal ml-[90px]'>{jsonData[selectedRef]['DECLARED AMOUNT']}</span></div>
                                </div>
                              </div>
                              <div className='viewer-top-body-right'>
                                <div className='flex'>
                                  <div className='w-[140px] pl-2'>CONSIGNEE NAME:</div>
                                  <div className='font-normal pb-[20px] w-[350px] bg-[#fbe4d5] pl-2 mr-[2px]'>{jsonData[selectedRef]['NAME OF DEALER']}</div>
                                </div>
                                <div className='flex'>
                                  <div className=' pl-2'>CONSIGNEE CONTACT INFORMATION</div>
                                  <div></div>
                                </div>
                                <div className='flex'>
                                  <div className='w-[140px] flex items-center pl-2'>CONSIGNEE ADDRESS:</div>
                                  <div className='font-normal pt-[10px] pb-[10px] flex items-center justify-center flex-1 bg-[#fbe4d5] pl-2 mr-[2px]'>{jsonData[selectedRef]['ADDRESS']}</div>
                                </div>
                              </div>
                            </div>
                            <div className='viewer-bot-body flex justify-between'>
                              <div className='viewer-bot-body-left flex-1'>
                                <div className='items-center justify-center flex border border-l-0 pt-[10px] pb-[10px]'>{DOCUMENT_NUMBER}</div>
                                <div style={{backgroundColor: '#fbe4d5'}} className='pt-[15px] pb-[15px] flex items-center border border-l-0 border-t-0 pl-1 font-medium'>{jsonData[selectedRef]['REF NO.']}</div>
                                <div className='ml-1 flex h-[40px] items-center text-[14px] font-serif border-r-1'>REMARKS:</div>
                                <div className='ml-1 flex h-[54px] border-r-1'>{REMARKS}</div>
                                <div className='border-r-1 border-t-1 pb-[25px] pl-[30px]'>{SHIPPER_PRINTED}</div>
                                <div className='border-r-1 pb-5 border-b-1'>{RECEIVED_BY}</div>
                                <div className='border-r-1 ml-8'>{CONSIGNEE_PRINTED}</div>
                              </div>
                              <div className='viewer-bot-body-right flex-1'>
                                <div className='items-center justify-center flex border pt-[10px] pb-[10px] border-l-0 border-r-0'>{NUMBER_TYPE_PACKAGE}</div>
                                <div className='pt-[15px] pb-[15px] font-medium flex items-center border border-t-0 border-l-0 border-r-0 pl-1 bg-[#fbe4d5] mr-[2px]'>
                                  {jsonData[selectedRef]['No. Of Boxes']} {parseInt(jsonData[selectedRef]['No. Of Boxes'], 10) === 1 ? 'BOX' : 'BOXES'}
                                </div>
                                <div className='pt-[40px] pl-1'>{ERVY_LOGISTICS}</div>
                                <div className='pb-[18px] pl-1'>{AUTHORIZED_REPRESENTATIVE}</div>
                                <div className='pl-8 border-t-1'>PRINTED NAME AND SIGNATURE/DATE</div>
                                <div className='flex pl-1'>{TRUCK_PLATE_NO} <div className='ml-10 bg-[#fbe4d5] w-[200px] h-[25px]'></div></div>
                              </div>
                            </div>
                            
                            <div className='text-center mt-2 border-[10px] text-[10px]' style={{ borderColor: '#fbe4d5'}}>
                              This is a non-negotiable consignment note subject to the terms and conditions set forth on the reverse of shipper's copy. In tendering this shipment, shipper agrees that ERVY Logistics shall and be liable for special, incidental or consequential damages arising from the carriage hereof. ERVY Logistics disclaims all warranties, express or implied, with respect to this shipment. Insurance coverage is available upon the shipper's request and payment thereof, ERVY LOGISTICS RESERVES THE RIGHT TO OPEN AND INSPECT THE SHIPMENT OFFERED FOR CARRIAGE
                              </div>
                          </div>
                        </div>{/* Accordion for details table */}
                        <div className="mt-4">
                          <button
                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-200 hover:bg-gray-300 rounded-t-lg focus:outline-none"
                            onClick={() => setDetailsAccordionOpen(v => !v)}
                            aria-expanded={detailsAccordionOpen}
                          >
                            <span className="font-semibold text-lg">Details Table</span>
                            <span className="ml-2">{detailsAccordionOpen ? '▲' : '▼'}</span>
                          </button>
                          {!detailsAccordionOpen && (
                            <table className="w-full text-base border rounded-b-lg shadow bg-white">
                              <tbody>
                                {Object.entries(jsonData[selectedRef]).map(([key, value]) => (
                                  <tr key={key}>
                                    <td className="font-medium pr-6 py-2 text-gray-600 align-top whitespace-nowrap">{key}</td>
                                    <td className="py-2 break-words whitespace-normal">{value}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center mt-20">Select a REF NO. to view details</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SpareParts; 