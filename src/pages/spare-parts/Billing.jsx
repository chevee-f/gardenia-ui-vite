import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useMemo, useEffect, useRef } from "react";
import ExcelJS from 'exceljs';
import rates from './rates.json';
import { SPARE_PARTS_BILLING_EMAIL } from '../../constants/email';

// Feature flag: Enable waybill storage save for Billing
// Set to true to enable, false to disable (for testing)
const ENABLE_BILLING_WAYBILL_STORAGE = false;

function Modal({ open, onClose, children, dismissible = true }) {
  if (!open) return null;
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={dismissible ? onClose : undefined}
    >
      <div 
        className="bg-white rounded-xl shadow-lg p-6 min-w-[340px] max-w-[90vw] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {dismissible && (
          <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold">&times;</button>
        )}
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
  
  // Save/Load functionality state
  const [currentStatementName, setCurrentStatementName] = useState('Untitled');
  const [savedStatements, setSavedStatements] = useState({});
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [saveStatementName, setSaveStatementName] = useState('');
  const [newStatementModalOpen, setNewStatementModalOpen] = useState(false);
  const [newStatementSaveName, setNewStatementSaveName] = useState('');
  
  // Billing records section toggle
  const [showBillingRecords, setShowBillingRecords] = useState(true);
  
  // Print options modal
  const [printOptionsModalOpen, setPrintOptionsModalOpen] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [showDivider, setShowDivider] = useState(false);

  // Email notification hooks
  const sendBillingEmail = useAction(api.sendEmail.sendSparePartsBillingEmail);
  const recordBillingPrint = useMutation(api.billing.recordBillingPrint);
  const recordPrint = useMutation(api.billing.recordPrint);
  const updatePrintEmailSent = useMutation(api.billing.updatePrintEmailSent);
  const unsentEmailCount = useQuery(api.billing.getUnsentEmailCount) || 0;
  
  // Email prompt modal state
  const [emailPromptOpen, setEmailPromptOpen] = useState(false);
  const [latestPrintId, setLatestPrintId] = useState(null);
  const [pendingPrintType, setPendingPrintType] = useState(null);

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

  // Save latest waybill to localStorage
  const saveLatestWaybillToStorage = (waybill) => {
    // Check feature flag before saving
    if (!ENABLE_BILLING_WAYBILL_STORAGE) return;
    
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

  // Helper to increment waybill number
  const incrementWaybill = (waybill) => {
    if (!waybill || !/^\d{3}-\d{4}$/.test(waybill)) return '000-0001';
    const [prefix, num] = waybill.split('-');
    const nextNum = (parseInt(num, 10) + 1).toString().padStart(4, '0');
    return `${prefix}-${nextNum}`;
  };

  // Add this state
  const [drList, setDrList] = useState([]);

  // When allDr changes, update local state and sort added items to end
  useEffect(() => {
    if (allDr) {
      setDrList(allDr);
    }
  }, [allDr]);

  // Removed expensive sorting useEffect - was causing lag with 40+ items

  const isQuotaExceededError = (err) => {
    if (!err) return false;
    const name = err?.name || err?.constructor?.name;
    return (
      name === 'QuotaExceededError' ||
      name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.number === -2147024882
    );
  };

  const safeLocalStorageSet = (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err) {
      if (isQuotaExceededError(err)) {
        console.warn(`Storage quota exceeded while saving "${key}".`, err);
        return false;
      }
      console.error(`Error saving "${key}" to localStorage:`, err);
      return false;
    }
  };

  const compactStatementSnapshot = (statement) => {
    if (!Array.isArray(statement)) return [];
    return statement.map((item) => ({
      drId: item.drId,
      waybillNo: item.waybillNo,
      wbDate: item.wbDate,
      destination: item.destination,
      drNo: item.drNo,
      drDate: item.drDate,
      dv: item.dv,
      percent: item.percent,
      charges: item.charges,
    }));
  };

  const pruneSavedStatements = (statements, keepMax = 5) => {
    if (!statements || typeof statements !== 'object') return {};
    const entries = Object.entries(statements);
    entries.sort((a, b) => {
      const ta = Date.parse(a?.[1]?.timestamp || '') || 0;
      const tb = Date.parse(b?.[1]?.timestamp || '') || 0;
      return tb - ta;
    });
    return Object.fromEntries(entries.slice(0, keepMax));
  };

  // Auto-save billing statement and DR list to localStorage whenever they change
  useEffect(() => {
    if (billingStatement.length > 0 && currentStatementName !== 'Untitled') {
      const saveData = {
        billingStatement: compactStatementSnapshot(billingStatement),
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      
      // Update the saved statements with current data using functional update
      setSavedStatements(prevSavedStatements => {
        const updatedSavedStatements = {
          ...prevSavedStatements,
          [currentStatementName]: saveData
        };

        const serialized = JSON.stringify(updatedSavedStatements);
        if (!safeLocalStorageSet("savedBillingStatements", serialized)) {
          // Try pruning older statements first.
          const pruned = pruneSavedStatements(updatedSavedStatements, 3);
          const prunedSerialized = JSON.stringify(pruned);
          if (safeLocalStorageSet("savedBillingStatements", prunedSerialized)) {
            return pruned;
          }

          // Last resort: keep only the current statement.
          const minimal = { [currentStatementName]: saveData };
          safeLocalStorageSet("savedBillingStatements", JSON.stringify(minimal));
          return minimal;
        }
        // console.log(`Billing statement "${currentStatementName}" auto-saved:`, billingStatement.length, 'items');
        
        return updatedSavedStatements;
      });
    }
  }, [billingStatement, drList, currentStatementName]);

  // Create periodic backup every 5 minutes
  useEffect(() => {
    const backupInterval = setInterval(() => {
      if (billingStatement.length > 0 && currentStatementName !== 'Untitled') {
        const backupData = {
          billingStatement: compactStatementSnapshot(billingStatement),
          timestamp: new Date().toISOString(),
          version: '1.0',
          isBackup: true,
          statementName: currentStatementName
        };
        safeLocalStorageSet("billingStatement_backup", JSON.stringify(backupData));
        console.log(`Backup created for "${currentStatementName}" at:`, new Date().toLocaleTimeString());
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(backupInterval);
  }, [billingStatement, drList, currentStatementName]);

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

    // First, try to load from the new save/load system
    const currentStatementName = localStorage.getItem("currentStatementName");
    const savedStatements = localStorage.getItem("savedBillingStatements");
    
    if (currentStatementName && savedStatements) {
      try {
        const parsedStatements = JSON.parse(savedStatements);
        const currentStatement = parsedStatements[currentStatementName];
        
        if (currentStatement && currentStatement.billingStatement) {
          setBillingStatement(currentStatement.billingStatement);
          if (currentStatement.drList) {
            setDrList(currentStatement.drList);
          }
          setCurrentStatementName(currentStatementName);
          setSavedStatements(parsedStatements);
          console.log(`Restored current billing statement "${currentStatementName}" with ${currentStatement.billingStatement.length} items`);
          return; // Exit early if we successfully loaded from new system
        } else {
          console.warn(`Current statement "${currentStatementName}" not found in saved statements`);
        }
      } catch (error) {
        console.error('Error loading from save/load system:', error);
        // Clear corrupted data
        localStorage.removeItem("currentStatementName");
        localStorage.removeItem("savedBillingStatements");
      }
    }

    // Fallback to old system if new system doesn't have data
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

  // Load saved statements on component mount (handled in main auto-load effect above)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl/Cmd + B to toggle billing records
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        setShowBillingRecords(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Save/Load functionality
  const loadSavedStatements = () => {
    try {
      const saved = localStorage.getItem("savedBillingStatements");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSavedStatements(parsed);
      }
    } catch (error) {
      console.error('Error loading saved statements:', error);
    }
  };

  const saveCurrentStatement = (statementName) => {
    if (!statementName.trim()) {
      alert('Please enter a name for the billing statement');
      return;
    }

    const statementData = {
      billingStatement: compactStatementSnapshot(billingStatement),
      timestamp: new Date().toISOString(),
      version: '1.0'
    };

    const updatedSavedStatements = {
      ...savedStatements,
      [statementName]: statementData
    };

    setSavedStatements(updatedSavedStatements);
    setCurrentStatementName(statementName);
    
    // Save to localStorage
    const serialized = JSON.stringify(updatedSavedStatements);
    if (!safeLocalStorageSet("savedBillingStatements", serialized)) {
      const pruned = pruneSavedStatements(updatedSavedStatements, 3);
      if (!safeLocalStorageSet("savedBillingStatements", JSON.stringify(pruned))) {
        safeLocalStorageSet("savedBillingStatements", JSON.stringify({ [statementName]: statementData }));
      }
      setSavedStatements(pruned);
    }
    localStorage.setItem("currentStatementName", statementName);
    
    console.log(`Billing statement "${statementName}" saved with ${billingStatement.length} items`);
  };

  const loadStatement = (statementName) => {
    const statementData = savedStatements[statementName];
    if (statementData) {
      setBillingStatement(statementData.billingStatement || []);
      if (statementData.drList) {
        setDrList(statementData.drList);
      }
      setCurrentStatementName(statementName);
      localStorage.setItem("currentStatementName", statementName);
      console.log(`Loaded billing statement "${statementName}" with ${statementData.billingStatement?.length || 0} items`);
    }
  };

  const deleteStatement = (statementName) => {
    if (window.confirm(`Are you sure you want to delete "${statementName}"? This action cannot be undone.`)) {
      const updatedSavedStatements = { ...savedStatements };
      delete updatedSavedStatements[statementName];
      
      setSavedStatements(updatedSavedStatements);
      safeLocalStorageSet("savedBillingStatements", JSON.stringify(updatedSavedStatements));
      
      // If we're deleting the current statement, clear it
      if (currentStatementName === statementName) {
        setBillingStatement([]);
        setCurrentStatementName('Untitled');
        localStorage.removeItem("currentStatementName");
      }
      
      console.log(`Deleted billing statement "${statementName}"`);
    }
  };

  const startNewStatement = () => {
    // If there are items in the current statement, show confirmation modal
    if (billingStatement.length > 0) {
      // Generate a default name based on current date/time
      const now = new Date();
      const defaultName = `Statement_${now.toISOString().slice(0, 10)}_${now.toTimeString().slice(0, 5).replace(':', '-')}`;
      setNewStatementSaveName(defaultName);
      setNewStatementModalOpen(true);
      return;
    }
    
    // If no items, just start new
    clearAndStartNew();
  };

  const clearAndStartNew = () => {
    setBillingStatement([]);
    setCurrentStatementName('Untitled');
    localStorage.removeItem("currentStatementName");
    console.log('Started new billing statement');
  };

  const handleSaveAndNew = () => {
    const statementName = newStatementSaveName.trim() || `Statement_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
    
    // Save current statement
    const statementData = {
      billingStatement: compactStatementSnapshot(billingStatement),
      timestamp: new Date().toISOString(),
      version: '1.0'
    };

    const updatedSavedStatements = {
      ...savedStatements,
      [statementName]: statementData
    };

    setSavedStatements(updatedSavedStatements);
    
    // Save to localStorage
    const serialized = JSON.stringify(updatedSavedStatements);
    if (!safeLocalStorageSet("savedBillingStatements", serialized)) {
      const pruned = pruneSavedStatements(updatedSavedStatements, 3);
      if (!safeLocalStorageSet("savedBillingStatements", JSON.stringify(pruned))) {
        safeLocalStorageSet("savedBillingStatements", JSON.stringify({ [statementName]: statementData }));
      }
      setSavedStatements(pruned);
    }
    
    // Clear and start new
    clearAndStartNew();
    setNewStatementModalOpen(false);
    setNewStatementSaveName('');
    console.log(`Saved billing statement "${statementName}" and started new`);
  };

  const handleNewWithoutSaving = () => {
    clearAndStartNew();
    setNewStatementModalOpen(false);
    setNewStatementSaveName('');
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

  // Helper function to send billing email notification
  const notifyBillingPrint = async (printType) => {
    // Calculate billing summary
    const totalSales = totalDV;
    const totalDue = totalCharges;
    const itemCount = filteredBillingStatement.length;
    const recipientEmail = SPARE_PARTS_BILLING_EMAIL;
    // Prepare detailed items (match fields visible in print table)
    const emailItems = filteredBillingStatement.map((item) => ({
      // Spare-parts print table columns
      waybillNo: item.waybillNo || "",
      wbDate: item.wbDate || "",
      destination: item.destination || "",
      drNo: item.drNo || "",
      drDate: item.drDate || "",
      // Monetary fields
      percent: typeof item.percent === "number" ? item.percent : parseFloat(item.percent || "0") || 0,
      charges: typeof item.charges === "number" ? item.charges : parseFloat(item.charges || "0") || 0,
      // Map to shared fields expected by backend
      amount: typeof item.dv === "number" ? item.dv : parseFloat(item.dv || "0") || 0,
    }));
    
    setEmailSending(true);
    
    try {
      // Send email notification
      await sendBillingEmail({
        printType,
        totalSales,
        totalDue,
        itemCount,
        recipientEmail: recipientEmail,
        items: emailItems,
      });
      
      // If there's a pending print record, mark it as email sent
      if (latestPrintId) {
        await updatePrintEmailSent({ printId: latestPrintId });
        setLatestPrintId(null);
      } else {
        // Create a new print record and mark it as email sent immediately
        const result = await recordPrint({
          printType,
          totalSales,
          totalDue,
          itemCount,
          recipientEmail: recipientEmail
        });
        // Immediately mark it as email sent
        if (result.id) {
          await updatePrintEmailSent({ printId: result.id });
        }
      }
      
      console.log("✅ Billing notification sent successfully");
      setEmailSending(false);
      setEmailPromptOpen(false);
      return { success: true };
    } catch (error) {
      console.error("❌ Failed to send billing notification:", error);
      setEmailSending(false);
      return { success: false, error };
    }
  };

  const printRef = useRef();
  const newPrintRef = useRef();
  
  // Open print options modal
  const handlePrint = () => {
    setPrintOptionsModalOpen(true);
  };

  // Print without labels (current behavior)
  const printWithoutLabels = async () => {
    // Don't close print options modal - keep it open
    setShowDivider(false);
    
    // Record print event
    const totalSales = totalDV;
    const totalDue = totalCharges;
    const itemCount = filteredBillingStatement.length;
    const recipientEmail = SPARE_PARTS_BILLING_EMAIL;
    
    try {
      const result = await recordPrint({
        printType: "Email Report",
        totalSales,
        totalDue,
        itemCount,
        recipientEmail
      });
      setLatestPrintId(result.id);
      setPendingPrintType("Email Report");
    } catch (error) {
      console.error("Failed to record print:", error);
    }
    
    // Show email prompt modal immediately
    setEmailPromptOpen(true);
    
    // Wait for React to re-render without the divider
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
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
      });
    });
  };

  // Print with labels
  const printWithLabels = async () => {
    // Don't close print options modal - keep it open
    setShowDivider(true);
    
    // Record print event
    const totalSales = totalDV;
    const totalDue = totalCharges;
    const itemCount = filteredBillingStatement.length;
    const recipientEmail = SPARE_PARTS_BILLING_EMAIL;
    
    try {
      const result = await recordPrint({
        printType: "Email Report",
        totalSales,
        totalDue,
        itemCount,
        recipientEmail
      });
      setLatestPrintId(result.id);
      setPendingPrintType("Email Report");
    } catch (error) {
      console.error("Failed to record print:", error);
    }
    
    // Show email prompt modal immediately
    setEmailPromptOpen(true);
    
    // Wait for React to re-render with the divider
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const printContent = newPrintRef.current.innerHTML;
    const printWindow = window.open("", "", "width=920,height=650");
    printWindow.document.write(`
      <html>
        <head>
          <title>Billing Statement (With Labels)</title>
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
      });
    });
  };

  const [editWaybillPopup, setEditWaybillPopup] = useState({ open: false, drId: null, value: "" });

  const openWaybillEdit = (drId, currentValue) => {
    setEditWaybillPopup({ open: true, drId, value: currentValue });
  };

  const closeWaybillEdit = () => {
    setEditWaybillPopup({ open: false, drId: null, value: "" });
  };

  const saveWaybillEdit = () => {
    const waybillNo = editWaybillPopup.value;
    updateBillingItem(editWaybillPopup.drId, "waybillNo", waybillNo);
    
    // Save to localStorage if it's a valid waybill number
    if (waybillNo && /^\d{3}-\d{4}$/.test(waybillNo)) {
      saveLatestWaybillToStorage(waybillNo);
    }
    
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

  function formatDateForInput(dateStr) {
    if (!dateStr) return "";
    // If it's already in yyyy-MM-dd format, return as is
    if (dateStr.includes('-') && dateStr.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    // Otherwise, try to convert to yyyy-MM-dd format
    try {
      const date = new Date(dateStr);
      if (isNaN(date)) return "";
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.warn('Error formatting date for input:', dateStr, error);
      return "";
    }
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
    // Load latest waybill and suggest the next one
    // (Reading from storage is allowed even if saving is disabled)
    const latestWaybill = loadLatestWaybillFromStorage();
    const suggestedWaybill = latestWaybill ? incrementWaybill(latestWaybill) : '000-0001';
    
    setManualAddForm({ 
      groupNo: '', 
      drNo: '', 
      waybillNo: suggestedWaybill, 
      declaredAmount: '' 
    });
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
      
      // Save waybill to localStorage if it's a valid waybill number
      if (waybillNo && /^\d{3}-\d{4}$/.test(waybillNo)) {
        saveLatestWaybillToStorage(waybillNo);
      }
      
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

  const getNetOfVAT = (totalSales) => {
    const numAmount = typeof totalSales === 'string' ? parseFloat(totalSales.replace(/,/g, '')) : parseFloat(totalSales);
    return (numAmount / 1.12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getVAT = (totalSales) => {
    const numAmount = typeof totalSales === 'string' ? parseFloat(totalSales.replace(/,/g, '')) : parseFloat(totalSales);
    const netOfVAT = numAmount / 1.12;
    return (netOfVAT * 0.12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getWithholdingTax = (netOfVAT) => {
    const numNetOfVAT = typeof netOfVAT === 'string' ? parseFloat(netOfVAT.replace(/,/g, '')) : parseFloat(netOfVAT);
    return (numNetOfVAT * 0.02).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getTotalAmountDue = (totalSales, withholdingTax) => {
    const numTotalSales = typeof totalSales === 'string' ? parseFloat(totalSales.replace(/,/g, '')) : parseFloat(totalSales);
    const numWithholdingTax = typeof withholdingTax === 'string' ? parseFloat(withholdingTax.replace(/,/g, '')) : parseFloat(withholdingTax);
    return (numTotalSales - numWithholdingTax).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-5 flex gap-6 px-6">
      {/* Billing Records Panel */}
      {showBillingRecords && (
        <div className="w-[50%] py-8 billing-records">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Billing Records</h1>
            {/* <button
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-200"
              onClick={() => setShowBillingRecords(false)}
              title="Hide Billing Records (Ctrl+B)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Hide
            </button> */}
          </div>
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
      )}

      {/* Billing Statement Panel */}
      <div className={`${showBillingRecords ? 'w-full' : 'w-full'} bg-white rounded-2xl shadow-lg p-8 billing-statement flex flex-col`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex flex-wrap gap-2">
              <button
                className={`px-4 py-2 rounded border ${
                  showBillingRecords 
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200'
                }`}
                onClick={() => setShowBillingRecords(!showBillingRecords)}
                title={showBillingRecords ? "Hide Billing Records (Ctrl+B)" : "Show Billing Records (Ctrl+B)"}
              >
                {showBillingRecords ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
              <button
                className="px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 border border-green-200"
                onClick={() => setSaveModalOpen(true)}
                title="Save Current Billing Statement"
              >
                Save
              </button>
              <button
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 border border-purple-200"
                onClick={() => {
                  loadSavedStatements();
                  setLoadModalOpen(true);
                }}
                title="Load Saved Billing Statement"
              >
                Load
              </button>
              <button
                className="px-4 py-2 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 border border-orange-200"
                onClick={startNewStatement}
                title="Start New Billing Statement"
              >
                New
              </button>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              <span>
                Billing Statement
                <span className="ml-3 text-sm text-gray-500">
                  ({incompleteItems} items left)
                </span>
              </span>
            </h1>
            <div className="text-sm text-gray-600 mt-1">
              Current: <span className="font-medium text-blue-600">{currentStatementName}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {/* First row - Main action buttons */}
            <div className="flex flex-wrap gap-2">
              {/* <button
                className="px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 border border-green-200"
                onClick={() => setSaveModalOpen(true)}
                title="Save Current Billing Statement"
              >
                Save
              </button>
              <button
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 border border-purple-200"
                onClick={() => setLoadModalOpen(true)}
                title="Load Saved Billing Statement"
              >
                Load
              </button>
              <button
                className="px-4 py-2 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 border border-orange-200"
                onClick={startNewStatement}
                title="Start New Billing Statement"
              >
                New
              </button> */}
              {/* <button
                className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 border border-red-200"
                onClick={clearAllBillingStatement}
                title="Clear All Items"
                disabled={billingStatement.length === 0}
              >
                Clear All
              </button> */}
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
                        value={formatDateForInput(item.wbDate)}
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
                        value={formatDateForInput(item.drDate)}
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

        {/* Save Billing Statement Modal */}
        <Modal open={saveModalOpen} onClose={() => setSaveModalOpen(false)}>
          <h2 className="text-lg font-bold mb-4">Save Billing Statement</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Statement Name:</label>
            <input
              type="text"
              value={saveStatementName}
              onChange={(e) => setSaveStatementName(e.target.value)}
              placeholder="Enter billing statement name"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveCurrentStatement(saveStatementName);
                  setSaveModalOpen(false);
                  setSaveStatementName('');
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              onClick={() => {
                setSaveModalOpen(false);
                setSaveStatementName('');
              }}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={() => {
                saveCurrentStatement(saveStatementName);
                setSaveModalOpen(false);
                setSaveStatementName('');
              }}
            >
              Save
            </button>
          </div>
        </Modal>

        {/* Load Billing Statement Modal */}
        <Modal open={loadModalOpen} onClose={() => setLoadModalOpen(false)}>
          <h2 className="text-lg font-bold mb-4">Load Billing Statement</h2>
          {Object.keys(savedStatements).length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No saved billing statements found.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {/* Recent Statements Section */}
              {(() => {
                // Sort statements by timestamp (most recent first)
                const sortedStatements = Object.entries(savedStatements).sort((a, b) => {
                  const timeA = a[1].timestamp ? new Date(a[1].timestamp).getTime() : 0;
                  const timeB = b[1].timestamp ? new Date(b[1].timestamp).getTime() : 0;
                  return timeB - timeA; // Most recent first
                });

                // Get recent statements (last 10)
                const recentStatements = sortedStatements.slice(0, 10);
                const otherStatements = sortedStatements.slice(10);

                return (
                  <div className="space-y-4">
                    {/* Recent Statements */}
                    {recentStatements.length > 0 && (
                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-2 px-2">
                          Recent Statements ({recentStatements.length})
                        </div>
                        <div className="space-y-2">
                          {recentStatements.map(([name, data]) => (
                            <div
                              key={name}
                              className={`flex items-center justify-between p-3 border rounded-lg ${
                                currentStatementName === name ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{name}</div>
                                <div className="text-sm text-gray-500">
                                  {data.billingStatement?.length || 0} items • 
                                  {data.timestamp ? (
                                    <>
                                      {new Date(data.timestamp).toLocaleDateString()} at {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </>
                                  ) : (
                                    'Unknown date'
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                  onClick={() => {
                                    loadStatement(name);
                                    setLoadModalOpen(false);
                                  }}
                                  disabled={currentStatementName === name}
                                >
                                  {currentStatementName === name ? 'Current' : 'Load'}
                                </button>
                                <button
                                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                  onClick={() => deleteStatement(name)}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other Statements */}
                    {otherStatements.length > 0 && (
                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-2 px-2">
                          All Statements ({otherStatements.length})
                        </div>
                        <div className="space-y-2">
                          {otherStatements.map(([name, data]) => (
                            <div
                              key={name}
                              className={`flex items-center justify-between p-3 border rounded-lg ${
                                currentStatementName === name ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{name}</div>
                                <div className="text-sm text-gray-500">
                                  {data.billingStatement?.length || 0} items • 
                                  {data.timestamp ? (
                                    <>
                                      {new Date(data.timestamp).toLocaleDateString()} at {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </>
                                  ) : (
                                    'Unknown date'
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                  onClick={() => {
                                    loadStatement(name);
                                    setLoadModalOpen(false);
                                  }}
                                  disabled={currentStatementName === name}
                                >
                                  {currentStatementName === name ? 'Current' : 'Load'}
                                </button>
                                <button
                                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                  onClick={() => deleteStatement(name)}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              onClick={() => setLoadModalOpen(false)}
            >
              Close
            </button>
          </div>
        </Modal>

        {/* New Statement Confirmation Modal */}
        <Modal open={newStatementModalOpen} onClose={() => setNewStatementModalOpen(false)}>
          <h2 className="text-lg font-bold mb-4">Start New Billing Statement</h2>
          <div className="mb-4">
            <p className="text-gray-700 mb-4">
              You have <strong>{billingStatement.length} items</strong> in your current billing statement. 
              What would you like to do?
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Save current statement as (optional):
              </label>
              <input
                type="text"
                value={newStatementSaveName}
                onChange={(e) => setNewStatementSaveName(e.target.value)}
                placeholder="Enter statement name"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newStatementSaveName.trim()) {
                    handleSaveAndNew();
                  }
                }}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              onClick={() => setNewStatementModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 border border-orange-200"
              onClick={handleNewWithoutSaving}
            >
              New without Saving
            </button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={handleSaveAndNew}
            >
              Save & New
            </button>
          </div>
        </Modal>

        {/* Print Options Modal */}
        <Modal open={printOptionsModalOpen} onClose={() => setPrintOptionsModalOpen(false)}>
          <h2 className="text-lg font-bold mb-4">Print Options</h2>
          <p className="text-gray-600 mb-6">Choose how you would like to print the billing statement:</p>
          <div className="space-y-3">
            <button
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
              onClick={printWithoutLabels}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Invoice
            </button>
            <button
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
              onClick={printWithLabels}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Print Copy
            </button>
            <button
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed relative"
              onClick={() => notifyBillingPrint("Email Report")}
              disabled={emailSending || billingStatement.length === 0}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {emailSending ? 'Sending...' : 'Send Email Report'}
              {unsentEmailCount > 0 && (
                <span className="hidden absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                  {unsentEmailCount}
                </span>
              )}
            </button>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              onClick={() => setPrintOptionsModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </Modal>

        {/* Email Prompt Modal - Non-dismissible */}
        <Modal 
          open={emailPromptOpen} 
          onClose={() => setEmailPromptOpen(false)}
          dismissible={false}
        >
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">📧 Send Email Report?</h2>
            <p className="text-gray-600 mb-6">
              You just printed the billing statement. Would you like to send the email report now?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  setEmailPromptOpen(false);
                  setPrintOptionsModalOpen(false);
                }}
                disabled={emailSending}
              >
                Skip
              </button>
              <button
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                onClick={async () => {
                  if (pendingPrintType) {
                    await notifyBillingPrint(pendingPrintType);
                    setPrintOptionsModalOpen(false);
                  }
                }}
                disabled={emailSending}
              >
                {emailSending ? 'Sending...' : 'Send Email Now'}
              </button>
            </div>
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

                    {showDivider && (
                      <div className="divider" style={{ position: 'absolute', top: '960px', width: '100%', height: '1px', backgroundColor: 'black' }}></div>
                    )}
                     {/* Print Footer */}
                     <div className="print-footer" style={{ position: 'absolute', left: '40px', top: '887px', width: '100%' }}>
                       <div style={{ display: 'flex', width: '100%' }}>
                        <div style={{ width: '230px', position: 'relative' }}>
                          <div style={{ fontFamily: 'Calibri', fontSize: '14px', fontWeight: 'bold', marginBottom: '20px' }}>PREPARED BY:</div>
                          <img src="/assets/Aileen%20(1).png" alt="Aileen Matub" style={{ width: '120px', height: 'auto', position: 'absolute', top: '-40px', left: '-15px' }} />
                           <div style={{ fontFamily: 'Calibri', fontSize: '14px', fontWeight: 'bold', width: '120px', textAlign: 'center' }}>AILEEN MATUB</div>
                           <div style={{ fontFamily: 'Calibri', fontSize: '12px', fontWeight: 'bold', fontStyle: 'italic', width: '120px', textAlign: 'center' }}>OFFICE STAFF</div>
                         </div>
                         <div style={{ position: 'relative' }}>
                           <div style={{ fontFamily: 'Calibri', fontSize: '14px', fontWeight: 'bold', marginBottom: '20px' }}>CHECKED BY:</div>
                           <img src="/assets/Ervy.png" alt="Ervy Yparraguirre" style={{ width: '210px', height: 'auto', position: 'absolute', top: '-40px', left: '-60px' }} />
                           <div style={{ fontFamily: 'Calibri', fontSize: '14px', fontWeight: 'bold', width: '150px', textAlign: 'left' }}>ERVY YPARRAGUIRRE</div>
                           <div style={{ fontFamily: 'Calibri', fontSize: '12px', fontWeight: 'bold', fontStyle: 'italic', width: '120px', textAlign: 'center' }}>OWNER</div>
                         </div>
                         <div style={{ display: 'none', position: 'absolute', right: '55px', top: '25px' }}>
                           <div style={{ fontFamily: 'Calibri', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>RECEIVED BY:</div>
                           <div>_________________________</div>
                         </div>
                       </div>
                     </div>
                     
                     {/* Total Sales */}
                     <div style={{ position: 'absolute', top: '970px', left: '715px', fontSize: '20px', fontWeight: 'bold' }}>{pageTotalCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>

                    {/* LEFT: VAT */}
                    <div style={{ position: 'absolute', top: '1015px', left: '225px', fontSize: '20px', fontWeight: 'bold' }}>{getVAT(pageTotalCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</div>
                    {/* Less:VAT */}
                    <div style={{ position: 'absolute', top: '1010px', left: '715px', fontSize: '20px', fontWeight: 'bold' }}>{getVAT(pageTotalCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</div>
                    
                    {/* Labels - only show when printing with labels (showDivider is true) */}
                    {showDivider && (
                      <>
                        {/* Labels for header section */}
                        <div style={{ position: 'absolute', top: '145px', left: '550px', fontSize: '14px', fontWeight: 'bold' }}>Date:</div>
                        <div style={{ position: 'absolute', top: '221px', left: '50px', fontSize: '14px', fontWeight: 'bold' }}>Registered Name:</div>
                        <div style={{ position: 'absolute', top: '297px', left: '50px', fontSize: '14px', fontWeight: 'bold' }}>Business Address:</div>
                        
                        {/* Labels for financial calculations */}
                        <div style={{ position: 'absolute', top: '970px', left: '550px', fontSize: '14px', fontWeight: 'bold' }}>Total Sales:</div>
                        <div style={{ position: 'absolute', top: '975px', left: '50px', fontSize: '14px', fontWeight: 'bold' }}>VATable Sales:</div>
                        <div style={{ position: 'absolute', top: '1010px', left: '550px', fontSize: '14px', fontWeight: 'bold' }}>Less: VAT:</div>
                        <div style={{ position: 'absolute', top: '1015px', left: '50px', fontSize: '14px', fontWeight: 'bold' }}>VAT:</div>
                        <div style={{ position: 'absolute', top: '1040px', left: '550px', fontSize: '14px', fontWeight: 'bold' }}>Amount: Net of VAT:</div>
                        <div style={{ position: 'absolute', top: '1115px', left: '550px', fontSize: '14px', fontWeight: 'bold' }}>Add: VAT:</div>
                        <div style={{ position: 'absolute', top: '1155px', left: '550px', fontSize: '14px', fontWeight: 'bold' }}>Less: Withholding Tax:</div>
                        <div style={{ position: 'absolute', top: '1200px', left: '550px', fontSize: '14px', fontWeight: 'bold' }}>Total Amount Due:</div>
                      </>
                    )}

                    {/* LEFT: VATable Sales */}
                    <div style={{ position: 'absolute', top: '975px', left: '225px', fontSize: '20px', fontWeight: 'bold' }}>{getNetOfVAT(pageTotalCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</div>
                    {/* Amount: Net of VAT */}
                    <div style={{ position: 'absolute', top: '1040px', left: '715px', fontSize: '20px', fontWeight: 'bold' }}>{getNetOfVAT(pageTotalCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</div>
                     
                     {/* Less: Discound */}
                     {/* <div style={{ position: 'absolute', top: '1075px', left: '715px', fontSize: '20px', fontWeight: 'bold' }}>{pageTotalCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div> */}

                    {/* Add: VAT */}
                    <div style={{ position: 'absolute', top: '1115px', left: '715px', fontSize: '20px', fontWeight: 'bold' }}>{getVAT(pageTotalCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</div>

                    {/* Less: Withholding Tax */}
                    <div style={{ position: 'absolute', top: '1155px', left: '715px', fontSize: '20px', fontWeight: 'bold' }}>{getWithholdingTax(getNetOfVAT(pageTotalCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })))}</div>

                    {/* Total Amount Due */}
                    <div style={{ position: 'absolute', top: '1200px', left: '715px', fontSize: '20px', fontWeight: 'bold' }}>{getTotalAmountDue(pageTotalCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), getWithholdingTax(getNetOfVAT(pageTotalCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))))}</div>

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
