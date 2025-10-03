import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useMemo, useEffect, useRef } from "react";
import ExcelJS from 'exceljs';
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
  const saveDr = useMutation(api.dr.saveDr);
  const [search, setSearch] = useState("");
  const [billingSearch, setBillingSearch] = useState("");
  const [page, setPage] = useState(1);
  const [billingStatement, setBillingStatement] = useState([]);
  const pageSize = 5;
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [destinationOrder, setDestinationOrder] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [manualAddModalOpen, setManualAddModalOpen] = useState(false);
  const [manualAddForm, setManualAddForm] = useState({
    groupNo: '',
    drNo: '',
    waybillNo: '',
    declaredAmount: ''
  });
  const [isSavingDr, setIsSavingDr] = useState(false);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [filenameModalOpen, setFilenameModalOpen] = useState(false);
  const [exportFilename, setExportFilename] = useState('BILLING NO.');

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
    // Handle both old format (DR # 123456789) and new format (DR # 1234567 (1234))
    const match = str.match(/DR\s*#\s*(\d+)/i);
    return match ? match[1] : str;
  }

  // Add this state
  const [drList, setDrList] = useState([]);

  // When allDr changes, update local state and sort added items to end
  useEffect(() => {
    if (allDr) {
      setDrList(allDr);
    }
  }, [allDr]);

  // Removed expensive sorting useEffect - was causing lag with 40+ items

  // Auto-save billing statement and DR list to localStorage whenever they change
  useEffect(() => {
    if (billingStatement.length > 0) {
      const saveData = {
        billingStatement,
        drList,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      localStorage.setItem("billingStatement", JSON.stringify(saveData));
      console.log('Billing statement auto-saved:', billingStatement.length, 'items');
    }
  }, [billingStatement, drList]);

  // Create periodic backup every 5 minutes
  useEffect(() => {
    const backupInterval = setInterval(() => {
      if (billingStatement.length > 0) {
        const backupData = {
          billingStatement,
          drList,
          timestamp: new Date().toISOString(),
          version: '1.0',
          isBackup: true
        };
        localStorage.setItem("billingStatement_backup", JSON.stringify(backupData));
        console.log('Backup created at:', new Date().toLocaleTimeString());
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(backupInterval);
  }, [billingStatement, drList]);

  // Auto-load billing statement from localStorage on component mount
  useEffect(() => {
    const loadSavedData = (data, source) => {
      if (data.billingStatement && Array.isArray(data.billingStatement)) {
        setBillingStatement(data.billingStatement);
        console.log(`Billing statement auto-loaded from ${source}:`, data.billingStatement.length, 'items');
        
        // Restore DR list if available
        if (data.drList && Array.isArray(data.drList)) {
          setDrList(data.drList);
          console.log('DR list also restored:', data.drList.length, 'items');
        }
        
        // Show timestamp info
        if (data.timestamp) {
          const savedDate = new Date(data.timestamp);
          const timeDiff = Math.floor((Date.now() - savedDate.getTime()) / (1000 * 60)); // minutes
          console.log(`Data restored from ${timeDiff} minutes ago`);
        }
        return true;
      }
      return false;
    };

    // Try to load main data first
    const saved = localStorage.getItem("billingStatement");
    if (saved) {
      try {
        const parsedData = JSON.parse(saved);
        if (!loadSavedData(parsedData, 'main storage')) {
          throw new Error('Invalid data structure');
        }
      } catch (error) {
        console.error('Error loading saved billing statement:', error);
        // Try backup if main data is corrupted
        const backup = localStorage.getItem("billingStatement_backup");
        if (backup) {
          try {
            const backupData = JSON.parse(backup);
            if (loadSavedData(backupData, 'backup storage')) {
              console.log('Successfully restored from backup after main data corruption');
            }
          } catch (backupError) {
            console.error('Backup data also corrupted:', backupError);
            // Clear all corrupted data
            localStorage.removeItem("billingStatement");
            localStorage.removeItem("billingStatement_backup");
          }
        } else {
          // Clear corrupted main data
          localStorage.removeItem("billingStatement");
        }
      }
    }
  }, []); // Only run once on mount

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

  const getRateForDestination = (destination, fallback) => {
    const found = rates.find(r =>
      destination && destination.toLowerCase().includes(r.address.toLowerCase())
    );
    if (found) return [found.rate, found.address];
    // Retry with fallback (dr.address)
    if (fallback) {
      const foundFallback = rates.find(r =>
        fallback && fallback.toLowerCase().includes(r.address.toLowerCase())
      );
      if (foundFallback) return [foundFallback.rate, foundFallback.address];
    }
    return [0, ''];
  };

  // Add DR to billing statement
  const addToBillingStatement = (dr) => {
    if (isDRAdded(dr._id)) return;

    const [percent, address] = getRateForDestination(dr.name_of_dealer || '', dr.address || '');
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

    // No need to modify drList order - removed to prevent lag
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
    setBillingStatement(prev => {
      const newStatement = prev.filter(item => item.drId !== drId);
      // Clear localStorage if billing statement becomes empty
      if (newStatement.length === 0) {
        localStorage.removeItem("billingStatement");
        localStorage.removeItem("billingStatement_backup");
        console.log('Billing statement cleared, localStorage cleaned');
      }
      return newStatement;
    });
  };

  // Clear all items from billing statement
  const clearAllBillingStatement = () => {
    if (window.confirm('Are you sure you want to clear all items from the billing statement? This action cannot be undone.')) {
      setBillingStatement([]);
      localStorage.removeItem("billingStatement");
      localStorage.removeItem("billingStatement_backup");
      console.log('All billing statement items cleared');
    }
  };

  // Filter billing statement based on search
  const filteredBillingStatement = useMemo(() => {
    if (!billingSearch.trim()) return billingStatement;
    const s = billingSearch.toLowerCase();
    return billingStatement.filter(item =>
      item.waybillNo?.toLowerCase().includes(s) ||
      item.destination?.toLowerCase().includes(s) ||
      item.drNo?.toLowerCase().includes(s) // ||
      // item.wbDate?.toLowerCase().includes(s) ||
      // item.drDate?.toLowerCase().includes(s)
    );
  }, [billingStatement, billingSearch]);

  // Get unique destinations in current billing statement (in order of appearance)
  const uniqueDestinations = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const item of filteredBillingStatement) {
      if (!seen.has(item.destination)) {
        seen.add(item.destination);
        result.push(item.destination);
      }
    }
    return result;
  }, [filteredBillingStatement]);

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

  const totalItems = filteredBillingStatement.length;
  const incompleteItems = filteredBillingStatement.filter(
    (item) => !(item.wbDate && item.drDate)
  ).length;
  const totalDV = filteredBillingStatement.reduce((sum, item) => sum + item.dv, 0);
  const totalCharges = filteredBillingStatement.reduce((sum, item) => sum + item.charges, 0);


  const printRef = useRef();
  const newPrintRef = useRef();
  const handlePrint = () => {
    const printContent = newPrintRef.current.innerHTML;
    const printWindow = window.open("", "", "width=920,height=650");
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
        <body style="margin: 0; padding: 0;">
          <div style="visibility: hidden">
            <div style="position: absolute;top: 165px;left: 705px;background-color: green;width: 150px;height: 1px;"></div>
            <div style="position: absolute; top: 240px; left: 210px; background-color: green; width: 120px; height: 2px;"></div>
            <div style="position: absolute;top: 322px;left: 210px;background-color: green;width: 120px;height: 2px;"></div>
            <div style="position: absolute;top: 400px;left: 0px;background-color: green;width: 900px;height: 1px;"></div>
            <div style="position: absolute; top: 950px; left: 0; background-color: green; width: 900px; height: 1px;"></div>
          </div>
          <div style="visibility: hidden">
            <div style="position: absolute; top: 0; left: 0px; background-color: red; width: 1px; height: 1200px;"></div>
            <div style="position: absolute; top: 0; left: 100px; background-color: red; width: 1px; height: 1200px;"></div>
            <div style="position: absolute; top: 0; left: 200px; background-color: red; width: 1px; height: 1200px;"></div>
            <div style="position: absolute; top: 0; left: 300px; background-color: red; width: 1px; height: 1200px;"></div>
            <div style="position: absolute; top: 0; left: 400px; background-color: red; width: 1px; height: 1200px;"></div>
            <div style="position: absolute; top: 0; left: 500px; background-color: red; width: 1px; height: 1200px;"></div>
            <div style="position: absolute; top: 0; left: 600px; background-color: red; width: 1px; height: 1200px;"></div>
            <div style="position: absolute; top: 0; left: 700px; background-color: red; width: 1px; height: 1200px;"></div>
            <div style="position: absolute; top: 0; left: 800px; background-color: red; width: 1px; height: 1200px;"></div>
            
            <div style="position: absolute; top: 0px; left: 0; background-color: blue; width: 900px; height: 1px;"></div>
            <div style="position: absolute; top: 100px; left: 0; background-color: blue; width: 900px; height: 1px;"></div>
            <div style="position: absolute; top: 200px; left: 0; background-color: blue; width: 900px; height: 1px;"></div>
            <div style="position: absolute; top: 300px; left: 0; background-color: blue; width: 900px; height: 1px;"></div>
            <div style="position: absolute; top: 400px; left: 0; background-color: blue; width: 900px; height: 1px;"></div>
            <div style="position: absolute; top: 500px; left: 0; background-color: blue; width: 900px; height: 1px;"></div>
            <div style="position: absolute; top: 600px; left: 0; background-color: blue; width: 900px; height: 1px;"></div>
            <div style="position: absolute; top: 700px; left: 0; background-color: blue; width: 900px; height: 1px;"></div>
            <div style="position: absolute; top: 800px; left: 0; background-color: blue; width: 900px; height: 1px;"></div>
            <div style="position: absolute; top: 900px; left: 0; background-color: blue; width: 900px; height: 1px;"></div>
            <div style="position: absolute; top: 1000px; left: 0; background-color: blue; width: 900px; height: 1px;"></div>
            <div style="position: absolute; top: 1100px; left: 0; background-color: blue; width: 900px; height: 1px;"></div>
            <div style="position: absolute; top: 1200px; left: 0; background-color: blue; width: 900px; height: 1px;"></div>
            <div style="position: absolute; top: 1250px; left: 0; background-color: blue; width: 900px; height: 1px;"></div>
            <div style="position: absolute; top: 1300px; left: 0; background-color: blue; width: 900px; height: 1px;"></div>
          </div>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    // printWindow.print();
    // printWindow.close();
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

  const [editDestinationPopup, setEditDestinationPopup] = useState({ open: false, drId: null, value: "" });

  const openDestinationEdit = (drId, currentValue) => {
    setEditDestinationPopup({ open: true, drId, value: currentValue });
  };

  const closeDestinationEdit = () => {
    setEditDestinationPopup({ open: false, drId: null, value: "" });
  };

  const saveDestinationEdit = () => {
    updateBillingItem(editDestinationPopup.drId, "destination", editDestinationPopup.value);
    closeDestinationEdit();
  };

  function getDuplicateWaybills(statement) {
    const counts = {};
    statement.forEach(item => {
      if (!item.waybillNo) return;
      counts[item.waybillNo] = (counts[item.waybillNo] || 0) + 1;
    });
    return Object.keys(counts).filter(k => counts[k] > 1);
  }
  const duplicateWaybills = useMemo(() => getDuplicateWaybills(billingStatement), [billingStatement]);

  const [editPercentPopup, setEditPercentPopup] = useState({ open: false, drId: null, value: "" });

  const openPercentEdit = (drId, currentValue) => {
    setEditPercentPopup({ open: true, drId, value: currentValue });
  };

  const closePercentEdit = () => {
    setEditPercentPopup({ open: false, drId: null, value: "" });
  };

  const savePercentEdit = () => {
    // Ensure value is a number and update charges as well
    const percent = parseFloat(editPercentPopup.value) || 0;
    setBillingStatement(prev =>
      prev.map(item =>
        item.drId === editPercentPopup.drId
          ? { ...item, percent, charges: item.dv * (percent / 100) }
          : item
      )
    );
    closePercentEdit();
  };

  const [editDrNoPopup, setEditDrNoPopup] = useState({ open: false, drId: null, value: "" });

  const openDrNoEdit = (drId, currentValue) => {
    setEditDrNoPopup({ open: true, drId, value: currentValue });
  };

  const closeDrNoEdit = () => {
    setEditDrNoPopup({ open: false, drId: null, value: "" });
  };

  const saveDrNoEdit = () => {
    updateBillingItem(editDrNoPopup.drId, "drNo", editDrNoPopup.value);
    closeDrNoEdit();
  };

  // Manual Add DR functions
  const openManualAddModal = () => {
    setManualAddForm({ groupNo: '', drNo: '', waybillNo: '', declaredAmount: '' });
    setManualAddModalOpen(true);
  };

  const closeManualAddModal = () => {
    setManualAddModalOpen(false);
    setManualAddForm({ groupNo: '', drNo: '', waybillNo: '', declaredAmount: '' });
  };

  const handleManualAddFormChange = (field, value) => {
    setManualAddForm(prev => ({ ...prev, [field]: value }));
  };

  const saveManualDr = async () => {
    const { groupNo, drNo, waybillNo, declaredAmount } = manualAddForm;
    
    // Validation
    if (!groupNo.trim() || !drNo.trim() || !waybillNo.trim() || !declaredAmount.trim()) {
      alert('Please fill in all fields');
      return;
    }

    // Validate declared amount is a number
    const amount = parseFloat(declaredAmount);
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid declared amount');
      return;
    }

    setIsSavingDr(true);

    try {
      // Format the data according to requirements
      const formattedData = {
        ref_no: `DR # ${drNo} (${groupNo})`,
        group_ref_no: groupNo,
        waybill_no: waybillNo,
        declared_amount: amount.toString()
      };

      // Save to convex
      await saveDr({ data: [formattedData] });
      
      // Close modal and reset form
      closeManualAddModal();
      
      // Show success message
      alert('DR added successfully!');
      
    } catch (error) {
      console.error('Error saving manual DR:', error);
      alert('Error saving DR. Please try again.');
    } finally {
      setIsSavingDr(false);
    }
  };

  // Excel export function
  const exportToExcel = async () => {
    if (billingStatement.length === 0) {
      alert('No billing statement data to export');
      return;
    }

    // Open filename modal
    setExportFilename('BILLING NO.');
    setFilenameModalOpen(true);
  };

  // Actual export function with filename
  const performExport = async (userFilename) => {
    try {
      // Create a new workbook
      const workbook = new ExcelJS.Workbook();
      
      // Split billing statement into chunks of 22 items (like print functionality)
      const itemsPerPage = 22;
      const totalPages = Math.ceil(billingStatement.length / itemsPerPage);
      
      // Create worksheets for each page
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const startIndex = pageIndex * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, billingStatement.length);
        const pageItems = billingStatement.slice(startIndex, endIndex);
        
        // Calculate page totals
        const pageTotalDV = pageItems.reduce((sum, item) => sum + item.dv, 0);
        const pageTotalCharges = pageItems.reduce((sum, item) => sum + item.charges, 0);
        
        // Create worksheet for this page
        const worksheet = workbook.addWorksheet(`Page ${pageIndex + 1}`);

        // Add company header information
        worksheet.getCell('A1').value = 'TRIMOTORS TECHNOLOGY CORP.';
        worksheet.getCell('A1').font = { bold: true, size: 12 };

        worksheet.getCell('A2').value = 'KM 23 EAST SERVICE ROAD BO,CUPANG,ALABANG MUNTINLUPA MANILA';
        worksheet.getCell('A2').alignment = { wrapText: true };
        
        // Merge columns 1, 2, 3 in row 2
        worksheet.mergeCells('A2:C2');
        
        // Set font properties after merging
        worksheet.getCell('A2').font = { bold: true, size: 6, name: 'Arial' };

        worksheet.getCell('A3').value = '';

        // Set column widths manually
        worksheet.getColumn(1).width = 10; // Waybill No
        worksheet.getColumn(2).width = 10; // WB Date
        worksheet.getColumn(3).width = 12; // Destination
        worksheet.getColumn(4).width = 12; // DR No
        worksheet.getColumn(5).width = 10; // DR Date
        worksheet.getColumn(6).width = 14; // DV
        worksheet.getColumn(7).width = 10; // Percent
        worksheet.getColumn(8).width = 12; // Charges

        // Manually add table headers at row 9
        const headers = ['Waybill No', 'WB Date', 'Destination', 'DR No', 'DR Date', 'DV', 'Percent', 'Charges'];
        const headerRow = worksheet.getRow(9);
        
        headers.forEach((header, colIndex) => {
          const cell = headerRow.getCell(colIndex + 1);
          cell.value = header;
          cell.font = { bold: true };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' } // Light gray
          };
        });

        // Add data rows starting from row 10
        pageItems.forEach((item, index) => {
          const rowNumber = 10 + index; // Start from row 10
          const row = worksheet.getRow(rowNumber);
          
          // Set cell values
          row.getCell(1).value = item.waybillNo || '';
          row.getCell(2).value = item.wbDate ? formatDateShort(item.wbDate) : '';
          row.getCell(3).value = item.destination || '';
          row.getCell(4).value = item.drNo || '';
          row.getCell(5).value = item.drDate ? formatDateShort(item.drDate) : '';
          row.getCell(6).value = item.dv.toLocaleString(undefined, { minimumFractionDigits: 2 });
          row.getCell(7).value = item.percent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
          row.getCell(8).value = item.charges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

          // Add borders and alignment to data cells
          row.eachCell((cell, colNumber) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
            
            // Set alignment based on column
            if (colNumber === 6 || colNumber === 8) { // DV and Charges columns
              cell.alignment = { horizontal: 'right', vertical: 'middle' };
            } else { // All other columns (centered)
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
          });
        });

        // Add total row for this page
        const totalRowNumber = 10 + pageItems.length; // After all data rows for this page
        const totalRow = worksheet.getRow(totalRowNumber);
        
        // Set total row values
        totalRow.getCell(1).value = '';
        totalRow.getCell(2).value = '';
        totalRow.getCell(3).value = '';
        totalRow.getCell(4).value = '';
        totalRow.getCell(5).value = 'TOTAL:';
        totalRow.getCell(6).value = pageTotalDV.toLocaleString(undefined, { minimumFractionDigits: 2 });
        totalRow.getCell(7).value = '';
        totalRow.getCell(8).value = pageTotalCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Style the total row
        totalRow.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          
          // Set alignment based on column
          if (colNumber === 6 || colNumber === 8) { // DV and Charges columns
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          } else { // All other columns (centered)
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
          
          // Bold the total values
          if (colNumber === 5 || colNumber === 6 || colNumber === 8) { // TOTAL:, DV total, Charges total
            cell.font = { bold: true };
          }
        });

        // Add signature section after 3 empty rows
        const signatureRowNumber = totalRowNumber + 4; // 3 empty rows after total
        const signatureRow = worksheet.getRow(signatureRowNumber);
        
        // Add signature labels
        signatureRow.getCell(1).value = 'PREPARED BY:';
        signatureRow.getCell(3).value = '             CHECKED BY:';
        signatureRow.getCell(7).value = 'RECEIVED BY:';
        
        // Style signature labels
        signatureRow.getCell(1).font = { bold: true };
        signatureRow.getCell(3).font = { bold: true };
        signatureRow.getCell(7).font = { bold: true };

        // Add signature lines row (next row)
        const signatureLineRow = worksheet.getRow(signatureRowNumber + 1);
        
        // Add bottom border to columns 7 and 8 for signature lines
        signatureLineRow.getCell(7).border = {
          bottom: { style: 'thin' }
        };
        signatureLineRow.getCell(8).border = {
          bottom: { style: 'thin' }
        };

        // Add signature names row
        const signatureNamesRow = worksheet.getRow(signatureRowNumber + 2);
        
        // AILEEN MATUB (columns 1,2)
        signatureNamesRow.getCell(1).value = 'AILEEN MATUB';
        signatureNamesRow.getCell(1).font = { bold: true, size: 10 };
        signatureNamesRow.getCell(1).alignment = { horizontal: 'center' };
        worksheet.mergeCells(`A${signatureRowNumber + 2}:B${signatureRowNumber + 2}`);
        
        // ERVY YPARRAGUIRRE (columns 3,4)
        signatureNamesRow.getCell(3).value = 'ERVY YPARRAGUIRRE';
        signatureNamesRow.getCell(3).font = { bold: true, size: 10 };
        signatureNamesRow.getCell(3).alignment = { horizontal: 'center' };
        worksheet.mergeCells(`C${signatureRowNumber + 2}:D${signatureRowNumber + 2}`);

        // Add titles row
        const titlesRow = worksheet.getRow(signatureRowNumber + 3);
        
        // BRANCH MANAGER (columns 1,2)
        titlesRow.getCell(1).value = 'BRANCH MANAGER';
        titlesRow.getCell(1).font = { bold: true, italic: true, size: 8 };
        titlesRow.getCell(1).alignment = { horizontal: 'center' };
        worksheet.mergeCells(`A${signatureRowNumber + 3}:B${signatureRowNumber + 3}`);
        
        // COMPANY OWNER (columns 3,4)
        titlesRow.getCell(3).value = 'COMPANY OWNER';
        titlesRow.getCell(3).font = { bold: true, italic: true, size: 8 };
        titlesRow.getCell(3).alignment = { horizontal: 'center' };
        worksheet.mergeCells(`C${signatureRowNumber + 3}:D${signatureRowNumber + 3}`);
      }

      // Generate filename using user input
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `${userFilename}.xlsx`;

      // Save the file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel. Please try again.');
    }
  };

  // Excel import function
  const importFromExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      alert('Please select a valid Excel file (.xlsx)');
      return;
    }

    setIsImportingExcel(true);

    try {
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet('Billing Statement');
      if (!worksheet) {
        alert('Could not find "Billing Statement" worksheet in the Excel file');
        return;
      }

      // Find the data rows (starting from row 10, after headers at row 9)
      const importedData = [];
      let rowNumber = 10;

      while (true) {
        const row = worksheet.getRow(rowNumber);
        const waybillNo = row.getCell(1).value;
        const destination = row.getCell(3).value;
        const drNo = row.getCell(4).value;
        const drDate = row.getCell(5).value;
        const dv = row.getCell(6).value;
        
        // Check if this row has any meaningful data
        const hasData = waybillNo || destination || drNo || dv;
        
        // Stop if we hit a completely empty row or the total row
        if (!hasData || waybillNo?.toString().includes('TOTAL') || drDate?.toString().includes('TOTAL')) {
          break;
        }

        // Extract data from the row
        const wbDate = row.getCell(2).value;
        const percent = row.getCell(7).value;
        const charges = row.getCell(8).value;

        // Convert date values if they're Excel date numbers
        const formatExcelDate = (excelDate) => {
          if (!excelDate) return '';
          if (typeof excelDate === 'number') {
            // Excel date serial number
            const date = new Date((excelDate - 25569) * 86400 * 1000);
            return date.toISOString().split('T')[0];
          }
          return excelDate.toString();
        };

        // Convert numeric values
        const parseNumeric = (value) => {
          if (typeof value === 'string') {
            return parseFloat(value.replace(/,/g, '')) || 0;
          }
          return parseFloat(value) || 0;
        };

        importedData.push({
          drId: `imported_${Date.now()}_${rowNumber}`, // Generate unique ID for imported items
          waybillNo: waybillNo.toString(),
          wbDate: formatExcelDate(wbDate),
          destination: destination ? destination.toString() : '',
          drNo: drNo ? drNo.toString() : '',
          drDate: formatExcelDate(drDate),
          dv: parseNumeric(dv),
          percent: parseNumeric(percent),
          charges: parseNumeric(charges)
        });

        rowNumber++;
      }

      if (importedData.length === 0) {
        alert('No data found in the Excel file');
        return;
      }

      // Update billing statement with imported data
      setBillingStatement(importedData);
      
      alert(`Successfully imported ${importedData.length} items from Excel file`);
      
    } catch (error) {
      console.error('Error importing Excel:', error);
      alert('Error importing Excel file. Please make sure the file format is correct.');
    } finally {
      setIsImportingExcel(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Filename modal handlers
  const handleExportConfirm = () => {
    setFilenameModalOpen(false);
    performExport(exportFilename);
  };

  const handleExportCancel = () => {
    setFilenameModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 flex gap-6 px-6">
      {/* Billing Records Panel */}
      <div className="w-[50%] py-8 billing-records">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Billing Records</h1>
          <button
            onClick={openManualAddModal}
            disabled={isSavingDr}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSavingDr ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add DR
              </>
            )}
          </button>
        </div>
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
                {/* <th className="px-4 py-3">DV</th> */}
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="billing-records-table">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-gray-400 py-8">Loading records...</td>
                </tr>
              ) : (
                paginated.map((dr, idx) => (
                    <tr key={dr._id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm">{dr.waybill_no}</td>
                      <td className="px-4 py-3 text-sm">{dr.name_of_dealer}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{getDRNumber(dr.ref_no)}</td>
                      {/* <td className="px-4 py-3 text-sm">₱{(parseFloat(dr.declared_amount) || 0).toLocaleString()}</td> */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => addToBillingStatement(dr)}
                          disabled={isDRAdded(dr._id)}
                          className={`px-3 py-1 text-xs rounded font-medium transition flex items-center justify-center ${isDRAdded(dr._id)
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          title={isDRAdded(dr._id) ? 'Added' : 'Add'}
                        >
                          {isDRAdded(dr._id) ? (
                            // Check icon for added
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            // Plus icon for add
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          )}
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            <span>
              Billing Statement
              <span className="ml-3 text-sm text-gray-500">
                ({incompleteItems} items left)
              </span>
            </span>
          </h1>
          <div className="flex flex-col gap-2">
            {/* First row - Main action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 border border-red-200"
                onClick={clearAllBillingStatement}
                title="Clear All Items"
                disabled={billingStatement.length === 0}
              >
                Clear All
              </button>
              <button
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 border border-blue-200"
                onClick={openSortModal}
                title="Sort Destinations"
              >
                Sort
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Print
              </button>
            </div>
            
            {/* Second row - Excel buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                disabled={billingStatement.length === 0}
                title="Export to Excel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Excel
              </button>
              <label className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={importFromExcel}
                  className="hidden"
                  disabled={isImportingExcel}
                />
                {isImportingExcel ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Importing...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    Import Excel
                  </>
                )}
              </label>
            </div>
          </div>

        </div>

        {/* Billing Statement Search */}
        <div className="flex items-center mb-4 relative">
          <input
            placeholder="Search billing items by waybill, destination, DR number, or date..."
            value={billingSearch}
            onChange={(e) => setBillingSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          <button
            onClick={() => setBillingSearch("")}
            className="absolute right-[0.1rem] px-3 py-2 text-gray-400 hover:text-gray-700"
            title="Clear search"
          >
            ×
          </button>
        </div>

        {/* Scrollable table */}
        <div className="overflow-y-auto max-h-[400px] border border-gray-200 rounded-lg">
          <table className="w-full text-sm text-left text-gray-700 bg-white">
            <thead className="text-xs text-gray-700 bg-gray-100 sticky top-0 z-1">
              <tr>
                <th className="px-3 py-3">Waybill No</th>
                <th className="px-3 py-3">WB Date</th>
                <th className="px-3 py-3 flex items-center gap-2">
                  Destination
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
              {filteredBillingStatement.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-gray-400 py-8">
                    {billingSearch ? 'No items match your search.' : 'No items in billing statement.'}
                  </td>
                </tr>
              ) : (
                filteredBillingStatement.map((item, idx) => (
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
                      <div className="text-xs text-gray-500 absolute top-[17px] left-[19px] width-[90px]">
                        {formatDateShort(item.wbDate)}
                      </div>
                    </td>
                    <td
                      className="px-3 py-3 text-sm cursor-pointer hover:underline"
                      onClick={() => openDestinationEdit(item.drId, item.destination)}
                      title="Click to edit destination"
                    >
                      {item.destination || <span className="text-gray-400 italic">Set Destination</span>}
                    </td>
                    <td
                      className="px-3 py-3 text-sm font-medium cursor-pointer hover:underline"
                      onClick={() => openDrNoEdit(item.drId, item.drNo)}
                      title="Click to edit DR No"
                    >
                      {item.drNo}
                    </td>
                    <td className="px-3 py-3 relative">
                      <input
                        type="date"
                        value={item.drDate}
                        onChange={e => updateBillingItem(item.drId, 'drDate', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded mb-1 text-transparent"
                      />
                      <div className="text-xs text-gray-500 absolute top-[17px] left-[19px] width-[90px]">
                        {formatDateShort(item.drDate)}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm">{item.dv.toLocaleString()}</td>
                    <td
                      className="px-3 py-3 text-sm cursor-pointer hover:underline"
                      onClick={() => openPercentEdit(item.drId, item.percent)}
                      title="Click to edit percent"
                    >
                      {Number(item.percent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                    </td>
                    <td className="px-3 py-3 text-sm font-medium">
                      {item.charges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => removeFromBillingStatement(item.drId)}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center"
                        title="Remove"
                      >
                        {/* Trash icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-7 0h10" />
                        </svg>
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
        {filteredBillingStatement.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">
                {billingSearch ? `Filtered Items: ${totalItems}` : `Total Items: ${totalItems}`}
                {billingSearch && billingStatement.length > 0 && (
                  <span className="text-sm text-gray-500 ml-2">
                    (of {billingStatement.length} total)
                  </span>
                )}
              </span>
              <div className="flex gap-6">
                <span className="font-bold text-lg text-gray-900">
                  {billingSearch ? 'Filtered DV: ' : 'Total DV: '}₱{totalDV.toLocaleString()}
                </span>
                <span className="font-bold text-lg text-gray-900">
                  {billingSearch ? 'Filtered Charges: ' : 'Total Charges: '}₱{totalCharges.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        <Modal open={editDrNoPopup.open} onClose={closeDrNoEdit}>
          <h2 className="text-lg font-bold mb-4">Edit D.R No.</h2>
          <input
            type="text"
            value={editDrNoPopup.value}
            onChange={e => setEditDrNoPopup(p => ({ ...p, value: e.target.value }))}
            placeholder="Enter D.R No."
            className="w-full px-3 py-2 border border-gray-300 rounded mb-4"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') {
                saveDrNoEdit();
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              onClick={closeDrNoEdit}
            >Cancel</button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={saveDrNoEdit}
            >Save</button>
          </div>
        </Modal>

        <Modal open={editPercentPopup.open} onClose={closePercentEdit}>
          <h2 className="text-lg font-bold mb-4">Edit Percent</h2>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={editPercentPopup.value}
            onChange={e => setEditPercentPopup(p => ({ ...p, value: e.target.value }))}
            placeholder="Enter percent"
            className="w-full px-3 py-2 border border-gray-300 rounded mb-4"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') {
                savePercentEdit();
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              onClick={closePercentEdit}
            >Cancel</button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={savePercentEdit}
            >Save</button>
          </div>
        </Modal>
        <Modal open={editDestinationPopup.open} onClose={closeDestinationEdit}>
          <h2 className="text-lg font-bold mb-4">Edit Destination</h2>
          <input
            type="text"
            value={editDestinationPopup.value}
            onChange={e => setEditDestinationPopup(p => ({ ...p, value: e.target.value }))}
            placeholder="Enter destination"
            className="w-full px-3 py-2 border border-gray-300 rounded mb-4"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') {
                saveDestinationEdit();
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              onClick={closeDestinationEdit}
            >Cancel</button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={saveDestinationEdit}
            >Save</button>
          </div>
        </Modal>
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
                className={`flex items-center gap-2 mb-2 rounded px-3 py-2 border ${dragIndex === idx ? 'bg-blue-50 border-blue-300' : 'bg-gray-50'
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
            onKeyDown={e => {
              if (e.key === 'Enter') {
                saveWaybillEdit();
              }
            }}
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

        <Modal open={manualAddModalOpen} onClose={closeManualAddModal}>
          <h2 className="text-lg font-bold mb-4">Manual Add DR</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group No</label>
              <input
                type="text"
                value={manualAddForm.groupNo}
                onChange={e => handleManualAddFormChange('groupNo', e.target.value)}
                placeholder="Enter Group No"
                className="w-full px-3 py-2 border border-gray-300 rounded"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DR No</label>
              <input
                type="text"
                value={manualAddForm.drNo}
                onChange={e => handleManualAddFormChange('drNo', e.target.value)}
                placeholder="Enter DR No"
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Waybill No</label>
              <input
                type="text"
                value={manualAddForm.waybillNo}
                onChange={e => {
                  let val = e.target.value.replace(/[^0-9]/g, ''); // Only digits
                  if (val.length > 3) {
                    val = val.slice(0, 3) + '-' + val.slice(3, 7);
                  }
                  handleManualAddFormChange('waybillNo', val);
                }}
                placeholder="000-0000"
                className="w-full px-3 py-2 border border-gray-300 rounded"
                maxLength={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Declared Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={manualAddForm.declaredAmount}
                onChange={e => handleManualAddFormChange('declaredAmount', e.target.value)}
                placeholder="Enter declared amount"
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              onClick={closeManualAddModal}
            >Cancel</button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              onClick={saveManualDr}
              disabled={isSavingDr}
            >
              {isSavingDr ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Add DR'
              )}
            </button>
          </div>
        </Modal>

        {/* Filename Modal */}
        <Modal open={filenameModalOpen} onClose={handleExportCancel}>
          <h2 className="text-lg font-bold mb-4">Export Excel File</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filename:</label>
            <input
              type="text"
              value={exportFilename}
              onChange={(e) => setExportFilename(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleExportConfirm();
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              onClick={handleExportCancel}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={handleExportConfirm}
            >
              Export
            </button>
          </div>
        </Modal>
        {/* Hidden print version */}
        <div style={{ display: "none" }}>
                     <div ref={newPrintRef}>
             {(() => {
               const itemsPerPage = 22;
               const pages = [];
               
               for (let i = 0; i < billingStatement.length; i += itemsPerPage) {
                 const pageItems = billingStatement.slice(i, i + itemsPerPage);
                 const pageTotalDV = pageItems.reduce((sum, item) => sum + item.dv, 0);
                 const pageTotalCharges = pageItems.reduce((sum, item) => sum + item.charges, 0);
                 
                 pages.push(
                   <div key={i} style={{ position: 'relative', pageBreakAfter: 'always', minHeight: '1200px' }}>
                    
                     {/* Print Date */}
                     <div className="print-date" style={{ position: 'absolute', top: '145px', left: '710px' }}>
                       {new Date().toLocaleDateString('en-US', { 
                         year: 'numeric', 
                         month: '2-digit', 
                         day: '2-digit' 
                       })}
                     </div>

                     {/* Print Title */}
                     <div className="print-title" style={{ position: 'absolute', top: '221px', left: '210px' }}>TRIMOTORS TECHNOLOGY CORP.</div>
                     
                     {/* Print Address */}
                     <div className="print-address" style={{ position: 'absolute', top: '297px', left: '210px' }}>KM 23 EAST SERVICE ROAD BO,CUPANG,ALABANG, MUNTINLUPA MANILA</div>

                     {/* Print Data Table */}
                     <table className="print-data-table" style={{ position: 'absolute', top: '366px', left: '0px' }}>
                       <thead>
                         <tr>
                           <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '11px', fontWeight: 'bold' }}>Waybill No</th>
                           <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '11px', fontWeight: 'bold' }}>WB Date</th>
                           <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '11px', fontWeight: 'bold' }}>Destination</th>
                           <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '11px', fontWeight: 'bold' }}>D.R No.</th>
                           <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '11px', fontWeight: 'bold' }}>DR Date</th>
                           <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '11px', fontWeight: 'bold', width: '100px' }}>DV</th>
                           <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '11px', fontWeight: 'bold', width: '30px' }}>PERCENT</th>
                           <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '11px', fontWeight: 'bold', width: '40px' }}>CHARGES</th>
                         </tr>
                       </thead>
                       <tbody>
                         <tr>
                           <td>&nbsp;</td>
                           <td>&nbsp;</td>
                           <td>&nbsp;</td>
                           <td>&nbsp;</td>
                           <td>&nbsp;</td>
                           <td>&nbsp;</td>
                           <td>&nbsp;</td>
                           <td>&nbsp;</td>
                         </tr>
                         {pageItems.map((item) => (
                           <tr key={item.drId}>
                             <td
                               style={{
                                 fontFamily: 'Arial',
                                 fontSize: '11px',
                                 textAlign: 'center',
                                 backgroundColor: duplicateWaybills.includes(item.waybillNo) ? '#ffe5e5' : 'transparent',
                                 color: duplicateWaybills.includes(item.waybillNo) ? 'red' : 'inherit',
                               }}
                             >
                               {item.waybillNo}
                             </td>
                             <td style={{ fontFamily: 'Arial', fontSize: '11px', textAlign: "center" }}>{formatDateShort(item.wbDate) || ""}</td>
                             <td style={{ fontFamily: 'Arial', fontSize: '11px', textAlign: "center" }}>{item.destination}</td>
                             <td style={{ fontFamily: 'Arial', fontSize: '11px', textAlign: "center" }}>{item.drNo}</td>
                             <td style={{ fontFamily: 'Arial', fontSize: '11px', textAlign: "center" }}>{formatDateShort(item.drDate) || ""}</td>
                             <td style={{ fontFamily: 'Arial', fontSize: '11px', textAlign: "right" }}>{item.dv.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                             <td style={{ fontFamily: 'Arial', fontSize: '11px', textAlign: "center" }}>{item.percent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</td>
                             <td style={{ fontFamily: 'Arial', fontSize: '11px', textAlign: "right", paddingRight: '7px' }}>{item.charges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                           </tr>
                         ))}
                         {/* OLD TOTAL ROW */}
                         <tr style={{ display: 'none' }}>
                           <td colSpan={5} style={{ fontFamily: 'Arial', fontSize: '11px', fontWeight: 'bold', textAlign: 'right' }}>TOTAL</td>
                           <td style={{ fontFamily: 'Calibri', fontSize: '14px', fontWeight: 'bold', textAlign: 'right' }}>
                             {pageTotalDV.toLocaleString()}
                           </td>
                           <td></td>
                           <td style={{ fontFamily: 'Calibri', fontSize: '14px', fontWeight: 'bold', textAlign: 'right' }}>
                             {pageTotalCharges.toLocaleString()}
                           </td>
                         </tr>
                       </tbody>
                     </table>

                     {/* Print Footer */}
                     <div className="print-footer" style={{ position: 'absolute', left: '40px', top: '883px', width: '100%' }}>
                       <div style={{ display: 'flex', width: '100%' }}>
                         <div style={{ width: '230px' }}>
                           <div style={{ fontFamily: 'Calibri', fontSize: '14px', fontWeight: 'bold', marginBottom: '20px' }}>PREPARED BY:</div>
                           <div style={{ fontFamily: 'Calibri', fontSize: '14px', fontWeight: 'bold', width: '120px', textAlign: 'center' }}>AILEEN MATUB</div>
                           <div style={{ fontFamily: 'Calibri', fontSize: '12px', fontWeight: 'bold', fontStyle: 'italic', width: '120px', textAlign: 'center' }}>OFFICE STAFF</div>
                         </div>
                         <div>
                           <div style={{ fontFamily: 'Calibri', fontSize: '14px', fontWeight: 'bold', marginBottom: '20px' }}>CHECKED BY:</div>
                           <div style={{ fontFamily: 'Calibri', fontSize: '14px', fontWeight: 'bold', width: '150px', textAlign: 'left' }}>ERVY YPARRAGUIRRE</div>
                           <div style={{ fontFamily: 'Calibri', fontSize: '12px', fontWeight: 'bold', fontStyle: 'italic', width: '120px', textAlign: 'center' }}>OWNER</div>
                         </div>
                         <div style={{ position: 'absolute', right: '55px', top: '25px' }}>
                           <div style={{ fontFamily: 'Calibri', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>RECEIVED BY:</div>
                           <div>_________________________</div>
                         </div>
                       </div>
                     </div>
                     
                     <div style={{ position: 'absolute', top: '970px', left: '715px', fontSize: '20px', fontWeight: 'bold' }}>{pageTotalDV.toLocaleString()}</div>
                     
                     <div style={{ position: 'absolute', top: '1200px', left: '715px', fontSize: '20px', fontWeight: 'bold' }}>{pageTotalCharges.toLocaleString()}</div>

                     {/* Print Secret Footer */}
                     <div className="print-secret-footer" style={{ position: 'absolute', top: '952px', height: '358px', width: '100px', backgroundColor: 'blue', visibility: 'hidden' }}></div>
                   </div>
                 );
               }
               
               return pages;
             })()}
           </div>
          {/* <div> */}
          <div ref={printRef}>
            <div style={{ fontFamily: 'Arial Narrow', fontSize: '14px', fontWeight: 'bold' }}>
              TRIMOTORS TECHNOLOGY CORP.
            </div>
            <div style={{ fontFamily: 'Arial', fontSize: '8px', fontWeight: 'bold' }}>KM 23 EAST SERVICE ROAD BO,CUPANG,ALABANG</div>
            <div style={{ fontFamily: 'Arial', fontSize: '8px', fontWeight: 'bold', marginBottom: '160px' }}>MUNTINLUPA MANILA</div>
            {/* rulers*/}
            {/* <div style={{ position: 'absolute', top: '195px', left: '525px', backgroundColor: 'red', width: '10px', height: '10px' }}>[]</div>
            <div style={{ position: 'absolute', top: '112px', left: 0, backgroundColor: 'green', width: '10px', height: '10px' }}></div> */}
            {/* rulers*/}
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '11px', fontWeight: 'bold' }}>Waybill No</th>
                  <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '11px', fontWeight: 'bold' }}>WB Date</th>
                  <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '11px', fontWeight: 'bold' }}>Destination</th>
                  <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '11px', fontWeight: 'bold' }}>D.R No.</th>
                  <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '11px', fontWeight: 'bold' }}>DR Date</th>
                  <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '11px', fontWeight: 'bold', width: '100px' }}>DV</th>
                  <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '11px', fontWeight: 'bold', width: '30px' }}>PERCENT</th>
                  <th style={{ textAlign: "center", fontFamily: 'Arial', fontSize: '11px', fontWeight: 'bold', width: '40px' }}>CHARGES</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
                {billingStatement.map((item) => (
                  <tr key={item.drId}>
                    <td
                      style={{
                        fontFamily: 'Arial',
                        fontSize: '11px',
                        textAlign: 'center',
                        backgroundColor: duplicateWaybills.includes(item.waybillNo) ? '#ffe5e5' : 'transparent',
                        color: duplicateWaybills.includes(item.waybillNo) ? 'red' : 'inherit',
                      }}
                    >
                      {item.waybillNo}
                    </td>
                    <td style={{ fontFamily: 'Arial', fontSize: '11px', textAlign: "center" }}>{formatDateShort(item.wbDate) || ""}</td>
                    <td style={{ fontFamily: 'Arial', fontSize: '11px', textAlign: "center" }}>{item.destination}</td>
                    <td style={{ fontFamily: 'Arial', fontSize: '11px', textAlign: "center" }}>{item.drNo}</td>
                    <td style={{ fontFamily: 'Arial', fontSize: '11px', textAlign: "center" }}>{formatDateShort(item.drDate) || ""}</td>
                    <td style={{ fontFamily: 'Arial', fontSize: '11px', textAlign: "right" }}>{item.dv.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ fontFamily: 'Arial', fontSize: '11px', textAlign: "center" }}>{item.percent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</td>
                    <td style={{ fontFamily: 'Arial', fontSize: '11px', textAlign: "right" }}>{item.charges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={5} style={{ fontFamily: 'Arial', fontSize: '11px', fontWeight: 'bold', textAlign: 'right' }}>TOTAL</td>
                  <td style={{ fontFamily: 'Calibri', fontSize: '14px', fontWeight: 'bold', textAlign: 'right' }}>
                    {/* 3,991,436.29 */}
                    {totalDV.toLocaleString()}
                  </td>
                  <td></td>
                  <td style={{ fontFamily: 'Calibri', fontSize: '14px', fontWeight: 'bold', textAlign: 'right' }}>
                    {/* 31,249.181 */}
                    {totalCharges.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
            <div style={{ position: 'absolute', left: '40px', bottom: '38px', width: '100%' }}>
              <div style={{ display: 'flex', width: '100%' }}>
                <div style={{ width: '230px' }}>
                  <div style={{ fontFamily: 'Calibri', fontSize: '14px', fontWeight: 'bold', marginBottom: '20px' }}>PREPARED BY:</div>
                  <div style={{ fontFamily: 'Calibri', fontSize: '14px', fontWeight: 'bold', width: '120px', textAlign: 'center' }}>AILEEN MATUB</div>
                  <div style={{ fontFamily: 'Calibri', fontSize: '12px', fontWeight: 'bold', fontStyle: 'italic', width: '120px', textAlign: 'center' }}>OFFICE STAFF</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'Calibri', fontSize: '14px', fontWeight: 'bold', marginBottom: '20px' }}>CHECKED BY:</div>
                  <div style={{ fontFamily: 'Calibri', fontSize: '14px', fontWeight: 'bold', width: '150px', textAlign: 'left' }}>ERVY YPARRAGUIRRE</div>
                  <div style={{ fontFamily: 'Calibri', fontSize: '12px', fontWeight: 'bold', fontStyle: 'italic', width: '120px', textAlign: 'center' }}>OWNER</div>
                </div>
                <div style={{ position: 'absolute', right: '55px' }}>
                  <div style={{ fontFamily: 'Calibri', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>RECEIVED BY:</div>
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
