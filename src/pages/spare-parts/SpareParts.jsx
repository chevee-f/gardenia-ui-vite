import React, { useState, useEffect, useRef } from 'react';
// import { ResizableBox } from 'react-resizable';
// import 'react-resizable/css/styles.css';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { HiOutlineUpload, HiOutlineRefresh, HiOutlineSearch, HiOutlineEye } from 'react-icons/hi';
// import { deleteWaybill, saveWaybill } from '../../services/Waybill.service';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

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
  const [selectedGroupKey, setSelectedGroupKey] = useState(null);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  // New state for reviewed and houseway bill numbers
  const [reviewedRefs, setReviewedRefs] = useState({}); // { idx: true }
  const [housewayBillNos, setHousewayBillNos] = useState({}); // { idx: '000-0000' }
  const [detailsAccordionOpen, setDetailsAccordionOpen] = useState(false);
  const [globalHousewayBill, setGlobalHousewayBill] = useState('');
  const [editingGlobalHousewayBill, setEditingGlobalHousewayBill] = useState(false);
  const [tempGlobalHousewayBill, setTempGlobalHousewayBill] = useState('');
  const [printChecks, setPrintChecks] = useState({ ttc: false, customer: false, carrier: false });
  const [leftPanelSearch, setLeftPanelSearch] = useState("");
  const [dashboardFileName, setDashboardFileName] = useState('');
  const [refNoFilter, setRefNoFilter] = useState('all'); // 'all', 'reviewed', 'unreviewed'
  const [waybillDisabled, setWaybillDisabled] = useState(false);
  const [latestStoredWaybill, setLatestStoredWaybill] = useState('');
  const [editingLatestWaybill, setEditingLatestWaybill] = useState(false);
  const [tempLatestWaybill, setTempLatestWaybill] = useState('');
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const fileInputRef = useRef();

  // When selectedGroupKey changes, open the accordion by default
  useEffect(() => {
    setDetailsAccordionOpen(true);
  }, [selectedGroupKey]);

  // Helper to increment houseway bill numbers
  function incrementHousewayBill(base, inc) {
    // base: '000-0001', inc: 1 => '000-0002', inc: 2 => '000-0003', etc.
    const match = base.match(/^(\d{3})-(\d{4})$/);
    if (!match) return '';
    const prefix = match[1];
    const num = parseInt(match[2], 10) + inc + 1; // always start from +1
    return `${prefix}-${num.toString().padStart(4, '0')}`;
  }

  // Helper to compare waybill numbers and find the highest
  function compareWaybillNumbers(wb1, wb2) {
    if (!wb1 || !/^\d{3}-\d{4}$/.test(wb1)) return wb2;
    if (!wb2 || !/^\d{3}-\d{4}$/.test(wb2)) return wb1;
    
    const [prefix1, num1] = wb1.split('-').map((n, i) => i === 0 ? n : parseInt(n, 10));
    const [prefix2, num2] = wb2.split('-').map((n, i) => i === 0 ? n : parseInt(n, 10));
    
    // Compare prefixes first (as strings)
    if (prefix1 !== prefix2) {
      return prefix1 > prefix2 ? wb1 : wb2;
    }
    // If prefixes are same, compare numbers
    return num1 > num2 ? wb1 : wb2;
  }

  // Helper to get highest waybill from an array of waybills
  function getHighestWaybill(waybills) {
    return waybills.reduce((highest, current) => {
      return compareWaybillNumbers(highest, current);
    }, '000-0000');
  }

  // Save latest waybill to localStorage
  const saveLatestWaybillToStorage = (waybill) => {
    if (!waybill || !/^\d{3}-\d{4}$/.test(waybill)) return;
    
    const stored = localStorage.getItem('spareParts_latestWaybill');
    const highest = compareWaybillNumbers(stored || '000-0000', waybill);
    localStorage.setItem('spareParts_latestWaybill', highest);
  };

  // Load latest waybill from localStorage
  const loadLatestWaybillFromStorage = () => {
    const stored = localStorage.getItem('spareParts_latestWaybill');
    return stored && /^\d{3}-\d{4}$/.test(stored) ? stored : null;
  };

  // Update useEffect for globalHousewayBill to use group keys
  useEffect(() => {
    if (!/^[\d]{3}-[\d]{4}$/.test(globalHousewayBill) || !jsonData) return;
    const groups = groupByParenthesis(jsonData);
    setHousewayBillNos(prev => {
      const updated = { ...prev };
      Object.keys(groups).forEach((key, i) => {
        if (!prev[key] || prev[key]._auto) {
          updated[key] = { value: incrementHousewayBill(globalHousewayBill, i), _auto: true };
        }
      });
      return updated;
    });
  }, [globalHousewayBill, jsonData]);

  // Load latest waybill from localStorage on mount
  useEffect(() => {
    const savedWaybill = loadLatestWaybillFromStorage();
    if (savedWaybill && !globalHousewayBill) {
      setGlobalHousewayBill(savedWaybill);
    }
    if (savedWaybill) setLatestStoredWaybill(savedWaybill);
  }, []);

  // Refresh the displayed stored waybill when the modal opens
  useEffect(() => {
    if (modalOpen) {
      const savedWaybill = loadLatestWaybillFromStorage();
      setLatestStoredWaybill(savedWaybill || '');
    }
  }, [modalOpen]);

  // On file load, initialize housewayBillNos and reviewedRefs by group key
  useEffect(() => {
    if (jsonData && jsonData.length > 0) {
      const groups = groupByParenthesis(jsonData);
      
      // Load saved waybill if globalHousewayBill is empty
      const savedWaybill = loadLatestWaybillFromStorage();
      const initialWaybill = globalHousewayBill || savedWaybill || '000-0001';
      
      setHousewayBillNos(prev => {
        const updated = { ...prev };
        Object.keys(groups).forEach((key, i) => {
          if (!updated[key]) {
            updated[key] = { value: incrementHousewayBill(initialWaybill, i), _auto: true };
          }
        });
        return updated;
      });
      setReviewedRefs(prev => {
        const updated = { ...prev };
        Object.keys(groups).forEach(key => {
          if (!(key in updated)) updated[key] = false;
        });
        return updated;
      });
      if (!globalHousewayBill) {
        setGlobalHousewayBill(initialWaybill);
      }
    }
  }, [jsonData]);
  const getSavedDr = useQuery(api.dr.getSavedDr, jsonData ? {
    data: jsonData.map(item => ({
      ref_no: item["REF NO."] || "",
      waybill_no: item["waybill_no"] || ""
      // group_ref_no: "", // You need to decide where this comes from
      // waybill_no: "" // This will be empty initially since waybill is assigned during review
    }))
  } : "skip");

  // Check for saved DRs and mark them as reviewed
  useEffect(() => {
    if (getSavedDr && jsonData && jsonData.length > 0) {
      const groups = groupByParenthesis(jsonData);
      
      console.log('getSavedDr:', getSavedDr);
      setReviewedRefs(prev => {
        const updated = { ...prev };
        
        // For each group, check if any of its DRs are saved
        Object.keys(groups).forEach(groupKey => {
          const groupRows = groups[groupKey].rows;
          
          // Check if any row in this group has a matching saved DR
          const hasSavedDr = groupRows.some(row => 
            getSavedDr.some(savedDr => savedDr.ref_no === row["REF NO."] && savedDr.waybill_no !== "")
          );
          
          if (hasSavedDr) {
            updated[groupKey] = true;
          }
        });
        
        return updated;
      });

      // Update houseway bill numbers for saved DRs
      setHousewayBillNos(prev => {
        const updated = { ...prev };
        
        Object.keys(groups).forEach(groupKey => {
          const groupRows = groups[groupKey].rows;
          
          // Find the saved DR for this group
          const savedDr = getSavedDr.find(savedDr => 
            groupRows.some(row => savedDr.ref_no === row["REF NO."])
          );
          
          if (savedDr && savedDr.waybill_no) {
            updated[groupKey] = { value: savedDr.waybill_no, _auto: false };
          }
        });
        
        return updated;
      });
    }
  }, [getSavedDr, jsonData]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setDashboardFileName(file.name);
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
    console.log(json);
    setJsonData(json);
    // setJsonData(json.slice(0, 5));
    // console.log(JSON.stringify(json));
    // Set default column widths, with reduced width for specific columns
    const reducedCols = ['DR/SI DATE', 'No. Of Boxes', 'NO. OF BUNDLES'];
    const widths = keys.map(key => reducedCols.includes(key?.toString().trim()) ? 90 : 160);
    setColWidths([60, ...widths]); // 60px for index column
  };

  const saveDr = useMutation(api.dr.saveDr);
  const deleteDr = useMutation(api.dr.deleteDr);
  // Confirm review
  const handleConfirmReview = async (idx) => {
    setWaybillDisabled(true);
    // Use groupByParenthesis to get the actual rows for this group key
    const groups = groupByParenthesis(jsonData);
    const group = groups[idx];
    if (!group) {
      console.error('Group not found:', idx);
      setWaybillDisabled(false);
      return;
    }
    let data = group.rows;

    const waybillNo = housewayBillNos[idx].value;
    data = data.map(item => ({
      ...item,
      waybill_no: waybillNo
    }));

    try {
      console.log(JSON.stringify(data));
      const formattedData = data.map(item => ({
        ref_no: item["REF NO."] || "",
        group_ref_no: "", // You need to decide where this comes from
        waybill_no: item["waybill_no"] || "",
        drsi_date: item["DR/SI DATE"] || null,
        name_of_dealer: item["NAME OF DEALER"] || null,
        contact_person: item["Contact Person"] || null,
        contact_no: item["Contact No."] || null,
        address: item["ADDRESS"] || null,
        declared_amount: item["DECLARED AMOUNT"] 
        ? String(item["DECLARED AMOUNT"]) 
        : null,
        no_of_boxes: item["No. Of Boxes"] ? parseFloat(item["No. Of Boxes"]) : null,
        no_of_bundles: item["NO. OF BUNDLES"] ? parseFloat(item["NO. OF BUNDLES"]) : null,
        dispatched_by: item["DISPATCHED BY:"] || null
      }));
      await saveDr({ data: formattedData });
      
      // Save the waybill number to localStorage as latest
      if (waybillNo) {
        saveLatestWaybillToStorage(waybillNo);
        // Also update globalHousewayBill if this is higher
        const currentHighest = compareWaybillNumbers(globalHousewayBill || '000-0000', waybillNo);
        if (currentHighest === waybillNo) {
          setGlobalHousewayBill(waybillNo);
        }
      }
      
      // await saveWaybill({ data });
      setReviewedRefs(prev => ({ ...prev, [idx]: true }));
      // setWaybillDisabled(false);
    } catch (err) {
      // optional: show toast or alert
      console.error('Failed to save waybill:', err);
    }
  };

  const handleConfirmUnreview = async (idx) => {
    setWaybillDisabled(true);
    // Use groupByParenthesis to get the actual rows for this group key
    const groups = groupByParenthesis(jsonData);
    const group = groups[idx];
    if (!group) {
      console.error('Group not found:', idx);
      setWaybillDisabled(false);
      return;
    }
    let data = group.rows;

    data = data.map(item => ({
      ...item,
      waybill_no: housewayBillNos[idx].value
    }));

    try {
      // await deleteWaybill({ data });
      
      const formattedData = data.map(item => ({
        ref_no: item["REF NO."] || "",
        group_ref_no: "", // You need to decide where this comes from
        waybill_no: item["waybill_no"] || ""
      }));
      console.log(formattedData);
      await deleteDr({ data: formattedData });
      setReviewedRefs(prev => ({ ...prev, [idx]: false }));
      setWaybillDisabled(false);
    } catch (err) {
      // optional: show toast or alert
      console.error('Failed to save waybill:', err);
    }
  }

  // When user edits a specific field, mark it as overridden
  const handleHousewayBillChange = (idx, value) => {
    if (/^\d{0,3}-?\d{0,4}$/.test(value)) {
      let formatted = value.replace(/[^\d]/g, '');
      if (formatted.length > 3) {
        formatted = formatted.slice(0, 3) + '-' + formatted.slice(3, 7);
      }
      setHousewayBillNos(prev => ({ ...prev, [idx]: { value: formatted, _auto: false } }));
      
      // Save to localStorage if it's a complete waybill number
      if (/^\d{3}-\d{4}$/.test(formatted)) {
        saveLatestWaybillToStorage(formatted);
        // Update globalHousewayBill if this is higher
        const currentHighest = compareWaybillNumbers(globalHousewayBill || '000-0000', formatted);
        if (currentHighest === formatted) {
          setGlobalHousewayBill(formatted);
        }
      }
    }
  };

  // Helper to get the value for a ref no
  function getHousewayBill(idx) {
    return housewayBillNos[idx]?.value || '';
  }

  // Reset all auto-generated waybills
  const resetAllAutoWaybills = () => {
    if (!window.confirm('Are you sure you want to reset all auto-generated waybill numbers? This will regenerate waybills for all DRs based on the current base waybill.')) {
      return;
    }

    if (!jsonData || jsonData.length === 0) return;

    const groups = groupByParenthesis(jsonData);
    const baseWaybill = globalHousewayBill || latestStoredWaybill || '000-0001';
    
    setHousewayBillNos(prev => {
      const updated = { ...prev };
      Object.keys(groups).forEach((key, i) => {
        // Only reset auto-generated waybills (keep manually edited ones)
        if (prev[key] && prev[key]._auto) {
          updated[key] = { value: incrementHousewayBill(baseWaybill, i), _auto: true };
        }
      });
      return updated;
    });

    console.log('Reset all auto-generated waybills');
  };

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
      printHtml += `<div style='height: 700px;'></div>`;
      printHtml += getPrintHtml("CUSTOMER COPY");
      printHtml += `<div style='height: 700px;'></div>`;
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
    // printWindow.print();
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
      if (i > 0) printHtml += `<div style='height: 700px;'></div>`;
      printHtml += getPrintHtml(label);
    });
    printWindow.document.write('<html><head><title>Print Viewer</title>' + printStyle + '</head><body>' + printHtml + '</body></html>');
    printWindow.document.close();
    // printWindow.print();
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

  // === Add helper to group by parenthesis value ===
  function groupByParenthesis(data) {
    const groups = {};
    data.forEach((row, idx) => {
      const ref = row['REF NO.'];
      if (!ref) return; // Skip if no REF NO.
      
      let key;
      const match = ref.match(/\(([^)]*)\)/);
      if (match) {
        // If parentheses exist, use the content inside as the key
        key = match[1].trim();
      } else {
        // If no parentheses, use the REF NO. itself as the key
        // Try to extract DR # if it exists, otherwise use the full REF NO.
        const drMatch = ref.match(/DR\s*#\s*(\d+)/i);
        key = drMatch ? drMatch[1] : ref.trim();
      }
      
      if (!key) return; // Skip if key is empty
      
      if (!groups[key]) groups[key] = { rows: [], indices: [] };
      groups[key].rows.push(row);
      groups[key].indices.push(idx);
    });
    return groups;
  }

  const syncFileInputRef = useRef();

  // New: Sync function
  const handleSyncFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Read file as ArrayBuffer
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rowsArr = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (rowsArr.length < 8) {
      alert('Excel file does not have enough rows.');
      return;
    }

    const keys = rowsArr[6];
    const values = rowsArr.slice(7);
    const json = [];
    for (const row of values) {
      const isEnd = row.slice(0, 6).every(cell => !cell || cell.toString().trim() === '');
      if (isEnd) break;
      const obj = {};
      keys.forEach((key, i) => {
        obj[key?.toString().trim() || `col${i}`] = row[i]?.toString().trim() || '';
      });
      json.push(obj);
    }

    // Post all data to DR in Convex
    const formattedData = json.map(item => ({
      ref_no: item["REF NO."] || "",
      group_ref_no: "", // You need to decide where this comes from
      waybill_no: item["waybill_no"] || "",
      drsi_date: item["DR/SI DATE"] || null,
      name_of_dealer: item["NAME OF DEALER"] || null,
      contact_person: item["Contact Person"] || null,
      contact_no: item["Contact No."] || null,
      address: item["ADDRESS"] || null,
      declared_amount: item["DECLARED AMOUNT"] ? String(item["DECLARED AMOUNT"]) : null,
      no_of_boxes: item["No. Of Boxes"] ? parseFloat(item["No. Of Boxes"]) : null,
      no_of_bundles: item["NO. OF BUNDLES"] ? parseFloat(item["NO. OF BUNDLES"]) : null,
      dispatched_by: item["DISPATCHED BY:"] || null
    }));

    try {
      await saveDr({ data: formattedData });
      alert('Sync successful!');
    } catch (err) {
      alert('Sync failed!');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header Bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Spare Parts</h1>
          {dashboardFileName && (
            <span className="ml-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">{dashboardFileName}</span>
          )}
          <button
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 text-sm font-medium"
            onClick={() => window.location.href = '/billing'}
          >
            Billing
          </button>

          <button
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 text-sm font-medium"
            onClick={() => syncFileInputRef.current && syncFileInputRef.current.click()}
          >
            Sync
          </button>
          <input
            ref={syncFileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleSyncFile}
            className="hidden"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 text-sm font-medium transition shadow"
            onClick={() => window.location.reload()}
          >
            <HiOutlineRefresh className="w-5 h-5" /> Refresh
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 text-sm font-medium"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <HiOutlineUpload className="w-5 h-5" /> {dashboardFileName ? 'Change File' : 'Upload Excel'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
      {/* Upload Card (if no file) */}
      {!dashboardFileName && (
        <div className="flex flex-col items-center justify-center h-96">
          <div className="bg-white rounded-xl shadow-lg p-10 flex flex-col items-center border border-dashed border-blue-400">
            <HiOutlineUpload className="w-16 h-16 text-blue-500 mb-4" />
            <div className="text-lg font-semibold mb-2">Upload Spare Parts Excel File</div>
            <div className="text-gray-500 mb-4">Drag and drop or <span className="text-blue-600 underline cursor-pointer" onClick={() => fileInputRef.current && fileInputRef.current.click()}>browse</span> to select a file</div>
            <button
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 text-sm font-medium"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              <HiOutlineUpload className="w-5 h-5" /> Select File
            </button>
          </div>
        </div>
      )}
      {/* Table Card */}
      {jsonData && jsonData.length > 0 && (
        <div className="max-w-7xl mx-auto mt-10 bg-white rounded-2xl shadow-lg p-8">
          {/* Search Bar */}
          <div className="flex items-center gap-4 mb-6 relative">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search Spare Parts..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
              <HiOutlineSearch className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            </div>
            <span className="text-gray-400 text-sm">
              {Object.keys(groupByParenthesis(jsonData)).filter(key => reviewedRefs[key]).length} / {jsonData.length} records
              {getSavedDr && (
                <span className="ml-2 text-green-600">
                  • {getSavedDr.length} already saved in database
                </span>
              )}
            </span>
            <button
              className={`absolute right-0 flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition shadow ${jsonData && jsonData.length > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              onClick={() => setModalOpen(true)}
              disabled={!jsonData || jsonData.length === 0}
            >
              <HiOutlineEye className="w-5 h-5" /> Start Review & Print
            </button>
          </div>
          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700 bg-white rounded-xl shadow table-fixed">
              <thead className="sticky top-0 z-10 text-xs text-gray-700 uppercase bg-gray-100">
                <tr>
                  <th className="px-4 py-3 font-bold">#</th>
                  {Object.keys(jsonData[0]).map((key, idx) => (
                    <th key={key} className="px-4 py-3 font-bold">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jsonData
                  .filter((row) => {
                    if (row.totalG !== undefined && row.totalH !== undefined) return true;
                    if (!searchQuery) return true;
                    const values = Object.values(row).join(' ').toLowerCase();
                    return values.includes(searchQuery.toLowerCase());
                  })
                  .map((row, idx) => {
                    // Check if this row is already saved in Convex
                    const isSaved = getSavedDr?.some(savedDr => 
                      savedDr.ref_no === row["REF NO."]
                    );
                    
                    return (
                      <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors ${isSaved ? 'border-l-4 border-l-green-500' : ''}`}>
                        <td className="px-4 py-2 font-semibold text-center">
                          {row.totalG !== undefined && row.totalH !== undefined ? '' : idx + 1}
                          {isSaved && (
                            <div className="text-xs text-green-600 font-medium mt-1">✓ Saved</div>
                          )}
                        </td>
                        {Object.keys(jsonData[0]).map((key) => (
                          <td key={key} className="px-4 py-2 break-words whitespace-normal">{row[key]}</td>
                        ))}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {jsonData.length === 0 && (
              <div className="text-center text-gray-400 py-10">No data to display.</div>
            )}
          </div>
        </div>
      )}
      {/* Modal for Review */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 bg-opacity-50 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b px-8 py-5 bg-gray-50 sticky top-0 z-10">
              <div className="flex items-center gap-8">
                <h2 className="text-2xl font-bold text-gray-900">Spare Parts Details</h2>
                {latestStoredWaybill && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Last Waybill:</label>
                    {editingLatestWaybill ? (
                      <>
                        <input
                          type="text"
                          className="border rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="000-0000"
                          value={tempLatestWaybill}
                          onChange={e => {
                            let val = e.target.value.replace(/[^0-9]/g, '');
                            if (val.length > 3) {
                              val = val.slice(0, 3) + '-' + val.slice(3, 7);
                            }
                            setTempLatestWaybill(val);
                          }}
                          maxLength={8}
                          style={{ width: 100 }}
                          autoFocus
                        />
                        <button
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          onClick={() => {
                            if (/^\d{3}-\d{4}$/.test(tempLatestWaybill)) {
                              saveLatestWaybillToStorage(tempLatestWaybill);
                              setLatestStoredWaybill(tempLatestWaybill);
                              setGlobalHousewayBill(tempLatestWaybill);
                              setEditingLatestWaybill(false);
                            } else {
                              alert('Please enter a valid waybill format (000-0000)');
                            }
                          }}
                          disabled={!/^\d{3}-\d{4}$/.test(tempLatestWaybill)}
                        >
                          Save
                        </button>
                        <button
                          className="px-2 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500"
                          onClick={() => {
                            setTempLatestWaybill(latestStoredWaybill);
                            setEditingLatestWaybill(false);
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span 
                          className="px-3 py-1 text-sm rounded-full bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer hover:bg-blue-100 transition"
                          onClick={() => {
                            setTempLatestWaybill(latestStoredWaybill);
                            setEditingLatestWaybill(true);
                          }}
                          title="Click to edit"
                        >
                          {latestStoredWaybill}
                        </span>
                      </>
                    )}
                  </div>
                )}
                <div className="hidden houseway-bill-no-field flex items-center gap-2">
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
                          // Save to localStorage when global waybill is updated
                          if (/^\d{3}-\d{4}$/.test(tempGlobalHousewayBill)) {
                            saveLatestWaybillToStorage(tempGlobalHousewayBill);
                          }
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
              <div className="flex items-center gap-3">
                <button
                  className="text-gray-500 hover:text-gray-700 p-2 rounded hover:bg-gray-100 transition"
                  onClick={() => setSettingsModalOpen(true)}
                  title="Settings"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <button className="text-gray-500 hover:text-gray-700 text-3xl font-bold" onClick={() => setModalOpen(false)}>&times;</button>
              </div>
            </div>
            <div className="flex flex-1 overflow-hidden">
              {/* Left panel: REF NO. list */}
              {showLeftPanel && (
                <aside className="w-1/4 min-w-[380px] max-w-md bg-gray-50 border-r border-gray-200 p-4 flex flex-col gap-2 overflow-y-auto" /* Accessibility: wider for high zoom and single-line DR# */>
                  <div className="mb-2">
                    <input
                      type="text"
                      placeholder="Search REF NO."
                      value={leftPanelSearch}
                      onChange={e => setLeftPanelSearch(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {/* Filter controls */}
                  <div className="flex gap-2 mb-2">
                    <button
                      className={`px-3 py-1 rounded text-sm font-medium border transition ${refNoFilter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                      onClick={() => setRefNoFilter('all')}
                    >
                      All
                    </button>
                    <button
                      className={`px-3 py-1 rounded text-sm font-medium border transition ${refNoFilter === 'reviewed' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                      onClick={() => setRefNoFilter('reviewed')}
                    >
                      Reviewed
                    </button>
                    <button
                      className={`px-3 py-1 rounded text-sm font-medium border transition ${refNoFilter === 'unreviewed' ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                      onClick={() => setRefNoFilter('unreviewed')}
                    >
                      Unreviewed
                    </button>
                  </div>
                  {/* <h3 className="text-lg font-semibold mb-2 text-gray-700 flex items-center gap-2">
                    REF NO. List
                  </h3> */}
                  {/* Gamified reviewed progress bar */}
                  {(() => {
                    const groups = groupByParenthesis(jsonData);
                    const total = Object.keys(groups).length;
                    const reviewed = Object.keys(groups).filter(key => reviewedRefs[key]).length;
                    const percent = total > 0 ? Math.round((reviewed / total) * 100) : 0;
                    return (
                      <div className="w-full mb-3 relative">
                        <div className="relative h-5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`absolute left-0 top-0 h-5 rounded-full transition-all duration-300 ${percent === 100 ? 'bg-green-500' : percent > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                            style={{ width: `${percent}%` }}
                          ></div>
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-800">
                            {reviewed} / {total} reviewed
                          </div>
                          {/* Animated checkmark when full */}
                          {percent === 100 && (
                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <svg
                                className="w-6 h-6 text-white bg-green-500 rounded-full shadow-lg transition-all duration-500 transform scale-0 opacity-0 animate-checkmark"
                                style={{ animation: 'checkmark-pop 0.5s forwards' }}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                        </div>
                        {/* Keyframes for checkmark pop */}
                        <style>{`
                          @keyframes checkmark-pop {
                            0% { transform: scale(0); opacity: 0; }
                            60% { transform: scale(1.2); opacity: 1; }
                            100% { transform: scale(1); opacity: 1; }
                          }
                        `}</style>
                      </div>
                    );
                  })()}
                  <ul className="flex-1 overflow-y-auto pr-1">
                    {(() => {
                      const groups = groupByParenthesis(jsonData);
                      // console.log(groups);
                      const search = leftPanelSearch.trim().toLowerCase();
                      return Object.entries(groups)
                        .filter(([key, group]) => {
                          if (refNoFilter === 'reviewed') return reviewedRefs[key];
                          if (refNoFilter === 'unreviewed') return !reviewedRefs[key];
                          return true;
                        })
                        .filter(([key, group]) => {
                          if (!leftPanelSearch.trim()) return true;
                          return group.rows.some(r => (r['REF NO.'] || '').toLowerCase().includes(leftPanelSearch.trim().toLowerCase()));
                        })
                        .map(([key, group], i) => (
                          <li
                            key={key}
                            className={`cursor-pointer px-4 py-3 rounded-lg transition font-medium mb-3 shadow-sm flex items-center justify-between
                              border border-gray-200
                              ${reviewedRefs[key]
                                ? 'border-l-4 border-l-green-500 bg-green-100 text-green-900'
                                : selectedGroupKey === key
                                  ? 'border-l-4 border-l-blue-500 bg-blue-50 text-blue-700'
                                  : 'hover:bg-blue-100 text-gray-700'}
                            `}
                            onClick={() => {
                              setSelectedGroupKey(key);
                              setPrintChecks({ ttc: false, customer: false, carrier: false });
                              if(reviewedRefs[key])
                                setWaybillDisabled(true)
                              else
                                setWaybillDisabled(false)
                            }}
                          >
                            <div className="flex-1">
                              {(() => {
                                const refs = group.rows.map(r => r['REF NO.']?.replace(/\(([^)]*)\)/g, '( $1 )'));
                                return (
                                  <div className="space-y-1">
                                    {refs.map((ref, idx) => (
                                      <div key={idx} className="text-sm leading-tight">
                                        {ref}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                            {selectedGroupKey === key && (
                              <span className="ml-3 flex items-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                              </span>
                            )}
                          </li>
                        ));
                    })()}
                  </ul>
                </aside>
              )}
              {/* Right panel: details */}
              <section className="flex-1 p-8 overflow-y-auto bg-white flex flex-col gap-6">
                {selectedGroupKey !== null && (() => {
                  const groups = groupByParenthesis(jsonData);
                  const group = groups[selectedGroupKey];
                  if (!group) return <div className="text-gray-400 text-center mt-20">Select a REF NO. to view details</div>;
                  // Sum declared amount
                  const sumDeclared = group.rows.reduce((sum, row) => sum + Number(row['DECLARED AMOUNT'].replace(/,/g, '') || 0), 0);
                  // Use first row for other fields
                  const firstRow = group.rows[0];
                  return (
                    <>
                      <div className='flex flex-row gap-6'>
                        <div className="flex flex-wrap gap-4">
                          <div className="relative border border-gray-300 rounded p-4 flex flex-col gap-2 bg-gray-50 max-w-xs w-full shadow">
                            <div className="mb-2 font-semibold text-gray-700">Houseway Bill No</div>
                            <div className='flex flex-col h-full justify-between'>
                              <input
                                  type="text"
                                  className="border border-blue-200 rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm"
                                  placeholder="000-0000"
                                  value={getHousewayBill(selectedGroupKey)}
                                  onChange={e => handleHousewayBillChange(selectedGroupKey, e.target.value)}
                                  maxLength={8}
                                  style={{ width: '100%' }}
                                  disabled={waybillDisabled}
                                />
                                {(getHousewayBill(selectedGroupKey) && !/^\d{3}-\d{4}$/.test(getHousewayBill(selectedGroupKey))) && (
                                  <div className="text-red-500 text-xs">Format must be 000-0000</div>
                                )}
                                {reviewedRefs[selectedGroupKey] ? (
                                  <button
                                    className="px-5 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold shadow-sm transition"
                                    onClick={() => handleConfirmUnreview(selectedGroupKey)}
                                  >
                                    Mark as Unreviewed
                                  </button>
                                ) : (
                                  <button
                                    className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-sm transition"
                                    onClick={() => handleConfirmReview(selectedGroupKey)}
                                    disabled={!/^\d{3}-\d{4}$/.test(getHousewayBill(selectedGroupKey) || '')}
                                  >
                                    Mark as Reviewed
                                  </button>
                                )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Print options box */}
                        <div className="border border-gray-300 rounded p-4 flex flex-col gap-2 bg-gray-50 max-w-xs w-full shadow">
                          <div className="mb-2 font-semibold text-gray-700">Print Options</div>
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
                          <div className="flex gap-3 mt-2">
                            <button
                              className={`px-4 py-2 rounded font-semibold ${printChecks.ttc || printChecks.customer || printChecks.carrier ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                              onClick={() => handlePrintSelected(selectedGroupKey)}
                              disabled={!(printChecks.ttc || printChecks.customer || printChecks.carrier)}
                            >
                              Print
                            </button>
                            <button
                              className="px-4 py-2 rounded font-semibold bg-purple-600 text-white hover:bg-purple-700"
                              onClick={() => handlePrintAllBox(selectedGroupKey)}
                            >
                              Print All
                            </button>
                          </div>
                        </div>
                      </div>
                      
                    <div className="space-y-6">
                      {/* Review/Print Actions */}
                      <div className="flex flex-wrap gap-4 items-center mb-2">
                      </div>
                      {/* Printable section start (do not touch hidden/viewer-content) */}
                      <div className="relative mt-8 border rounded-lg shadow p-6 bg-gray-50 font-bold hidden" id={`viewer-content-${selectedGroupKey}`}>
                        <div className='font-bold text-[12px]'>
                          <div className='viewer-header flex'>
                            <div className='viewer-header-left'>
                              <div className='absolute top-0 left-0'>
                                <img src='assets/waybill-logo.PNG' alt='Waybill Logo' className='mt-[1px] ml-[1px] h-[68px] mb-[10px] w-auto' />
                              </div>
                              <div className='flex mt-[75px]'>
                                <div className='ml-1 w-[84px]'>Email address:</div>
                                <div className='ml-[36px] text-red-500 w-[360px]'>{EMAILS[0]}</div>
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
                                <div className='pt-1 pb-1 text-[16px] font-bold font-[Times New Roman] bg-[#fbe4d5] w-[160px] flex justify-center items-center'>{getHousewayBill(selectedGroupKey)}</div></div>
                              <div className="mt-[23px]">
                                <div className='underline text-red-500'>{EMAILS[1]}</div>
                                <div className='underline text-red-500'>{EMAILS[2]}</div>
                                <div className='underline text-red-500'>{EMAILS[3]}</div>
                              </div>
                            </div>
                          </div>
                          <div className='viewer-top-body flex mt-[15px]'>
                            <div className='viewer-top-body-left w-[445px]'>
                              <div className='flex'>
                                <div className='ml-1 w-[120px]'>SHIPPER NAME:</div>
                                <div className='font-normal h-[40px] flex items-center justify-center w-[215px] bg-[#fbe4d5]'>TRIMOTORS TECHNOLOGY CORP.</div>
                              </div>
                              <div className='flex mt-5'>
                                <div className='ml-1 w-[120px]'>DECLARED VALUE:</div>
                                <div className='pl-2 bg-[#fbe4d5]'>P<span className='font-normal ml-[90px]'>
                                  {sumDeclared.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span></div>
                              </div>
                            </div>
                            <div className='viewer-top-body-right'>
                              <div className='flex'>
                                <div className='w-[140px] pl-2'>CONSIGNEE NAME:</div>
                                <div className='font-normal pb-[20px] w-[350px] bg-[#fbe4d5] pl-2 mr-[2px]'>{firstRow['NAME OF DEALER']}</div>
                              </div>
                              <div className='flex'>
                                <div className=' pl-2'>CONSIGNEE CONTACT INFORMATION</div>
                                <div></div>
                              </div>
                              <div className='flex'>
                                <div className='w-[140px] flex items-center pl-2'>CONSIGNEE ADDRESS:</div>
                                <div className='font-normal pt-[10px] pb-[10px] flex items-center justify-center flex-1 bg-[#fbe4d5] pl-2 mr-[2px]'>{firstRow['ADDRESS']}</div>
                              </div>
                            </div>
                          </div>
                          <div className='viewer-bot-body flex justify-between'>
                            <div className='viewer-bot-body-left flex-1'>
                              <div className='items-center justify-center flex border border-l-0 pt-[10px] pb-[10px]'>{DOCUMENT_NUMBER}</div>
                              <div style={{backgroundColor: '#fbe4d5'}} className='h-[70px] flex items-center border border-l-0 border-t-0 pl-1 font-medium'>
                                {(() => {
                                  const refs = group.rows.map(r => r['REF NO.']?.replace(/\(([^)]*)\)/g, '( $1 )'));
                                  const lines = [];
                                  for (let i = 0; i < refs.length; i += 3) {
                                    lines.push(refs.slice(i, i + 3));
                                  }
                                  return (
                                    <div className='flex'>
                                      {lines.map((line, idx) => (
                                        <div className='flex flex-col' key={idx} style={idx > 0 ? { marginLeft: 24 } : {}}>
                                          {line.map((ref, j) => (
                                            <span key={j} style={{ display: 'inline-block', marginRight: 8 }}>{ref}</span>
                                          ))}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                              <div className='ml-1 flex h-[40px] items-center text-[14px] font-serif border-r-1'>REMARKS:</div>
                              <div className='ml-1 flex h-[54px] border-r-1'>{REMARKS}</div>
                              <div className='border-r-1 border-t-1 pb-[25px] pl-[30px]'>{SHIPPER_PRINTED}</div>
                              <div className='border-r-1 pb-5 border-b-1'>{RECEIVED_BY}</div>
                              <div className='border-r-1 ml-8'>{CONSIGNEE_PRINTED}</div>
                            </div>
                            <div className='viewer-bot-body-right flex-1'>
                              <div className='items-center justify-center flex border pt-[10px] pb-[10px] border-l-0 border-r-0'>{NUMBER_TYPE_PACKAGE}</div>
                              <div className='h-[70px] font-medium flex items-center border border-t-0 border-l-0 border-r-0 pl-1 bg-[#fbe4d5] mr-[2px]'>
                                {(() => {
                                  const boxVal = group.rows.find(r => r['No. Of Boxes'] && r['No. Of Boxes'].trim() !== '')?.['No. Of Boxes'] || '';
                                  const bundleVal = group.rows.find(r => r['NO. OF BUNDLES'] && r['NO. OF BUNDLES'].trim() !== '')?.['NO. OF BUNDLES'] || '';
                                  const numBox = parseInt(boxVal, 10);
                                  const numBundle = parseInt(bundleVal, 10);
                                  let result = '';
                                  if (boxVal) {
                                    result += `${numBox} ${numBox === 1 ? 'BOX' : 'BOXES'}`;
                                  }
                                  if (bundleVal) {
                                    if (result) result += ' & ';
                                    result += `${numBundle} ${numBundle === 1 ? 'BUNDLE' : 'BUNDLES'}`;
                                  }
                                  return result;
                                })()}
                              </div>
                              <div className='pt-[40px] pl-1'>{ERVY_LOGISTICS}</div>
                              <div className='pb-[18px] pl-1'>{AUTHORIZED_REPRESENTATIVE}</div>
                              <div className='pl-8 border-t-1'>PRINTED NAME AND SIGNATURE/DATE</div>
                              <div className='flex pl-1'>{TRUCK_PLATE_NO} <div className='ml-10 bg-[#fbe4d5] w-[200px] h-[25px]'></div></div>
                            </div>
                          </div>
                          <div className='text-center mt-2 border-[10px] text-[10px]' style={{ borderColor: '#fbe4d5', lineHeight: '13px'}}>
                            This is a non-negotiable consignment note subject to the terms and conditions set forth on the reverse of shipper's copy. In tendering this shipment, shipper agrees that ERVY Logistics shall and be liable for special, incidental or consequential damages arising from the carriage hereof. ERVY Logistics disclaims all warranties, express or implied, with respect to this shipment. Insurance coverage is available upon the shipper's request and payment thereof, ERVY LOGISTICS RESERVES THE RIGHT TO OPEN AND INSPECT THE SHIPMENT OFFERED FOR CARRIAGE
                          </div>
                        </div>
                      </div>
                      {/* Printable section end */}
                      {/* Details Table Accordion */}
                      <div className="mt-4">
                        <button
                          className="w-full flex items-center justify-between px-4 py-3 bg-gray-200 hover:bg-gray-300 rounded-t-lg focus:outline-none"
                          onClick={() => setDetailsAccordionOpen(v => !v)}
                          aria-expanded={detailsAccordionOpen}
                        >
                          <span className="font-semibold text-lg">Details Table</span>
                          <span className="ml-2">{detailsAccordionOpen ? '▲' : '▼'}</span>
                        </button>
                        {detailsAccordionOpen && (
                          <div className="bg-white rounded-b-2xl shadow-md border border-gray-200">
                            {/* Details Table */}
                            <div className="px-8 py-6 bg-gray-50 rounded-b-2xl shadow border border-gray-200">
                              <div className="space-y-4">
                                {group.rows.map((row, rowIndex) => (
                                  <div key={rowIndex} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="bg-blue-100 px-4 py-2 border-b border-gray-200">
                                      <h4 className="font-semibold text-blue-800">DR #{rowIndex + 1}</h4>
                                    </div>
                                    <div className="p-4">
                                      <table className="w-full border-separate border-spacing-y-1">
                                        <tbody>
                                          {Object.entries(row).map(([key, value], idx, arr) => (
                                            <tr
                                              key={key}
                                              className={
                                                (idx % 2 === 0 ? "bg-gray-50" : "bg-white") +
                                                " transition-colors hover:bg-blue-50"
                                              }
                                            >
                                              <td className={
                                                "font-semibold text-gray-700 text-sm pr-4 py-2 text-right align-top w-48" +
                                                (idx === 0 ? " rounded-tl-lg" : "") +
                                                (idx === arr.length - 1 ? " rounded-bl-lg" : "")
                                              }>
                                                {key}
                                              </td>
                                              <td className={
                                                "text-gray-900 text-sm pl-3 py-2 align-top" +
                                                (idx === 0 ? " rounded-tr-lg" : "") +
                                                (idx === arr.length - 1 ? " rounded-br-lg" : "")
                                              }>
                                                {value}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    </>
                  );
                })()}
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 bg-opacity-50 transition-all">
          <div className="bg-white rounded-xl shadow-lg p-6 min-w-[340px] max-w-[90vw] relative">
            <button 
              onClick={() => setSettingsModalOpen(false)} 
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold"
            >
              &times;
            </button>
            <h2 className="text-lg font-bold mb-4">Settings</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Waybill Management</h3>
                <button
                  className="w-full px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 border border-red-200 text-sm font-medium"
                  onClick={() => {
                    resetAllAutoWaybills();
                    setSettingsModalOpen(false);
                  }}
                  title="Reset all auto-generated waybill numbers to recalculate based on base waybill"
                >
                  Reset Auto Waybills
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  This will reset all auto-generated waybill numbers. Manually edited waybills will be preserved.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                onClick={() => setSettingsModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpareParts; 
