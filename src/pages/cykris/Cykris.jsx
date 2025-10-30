import React, { useState, useEffect, useRef } from 'react';
import { HiOutlineRefresh, HiOutlineSearch, HiOutlineEye, HiChevronDown, HiChevronUp } from 'react-icons/hi';
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
const HOUSEWAY_BILL_NO = 'HOUSEWAY BILL NO:';

function Cykris() {
  const [jsonData, setJsonData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGroupKey, setSelectedGroupKey] = useState(null);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [reviewedRefs, setReviewedRefs] = useState({});
  const [housewayBillNos, setHousewayBillNos] = useState({});
  const [detailsAccordionOpen, setDetailsAccordionOpen] = useState(false);
  const [globalHousewayBill, setGlobalHousewayBill] = useState('');
  const [printChecks, setPrintChecks] = useState({ ttc: false, customer: false, carrier: false });
  const [leftPanelSearch, setLeftPanelSearch] = useState("");
  const [refNoFilter, setRefNoFilter] = useState('all');
  const [waybillDisabled, setWaybillDisabled] = useState(false);
  const [formOpen, setFormOpen] = useState(true);
  const [editingIndex, setEditingIndex] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    groupNo: '',
    drNo: '',
    drsiDate: '',
    nameOfDealer: '',
    contactPerson: '',
    contactNo: '',
    address: '',
    declaredAmount: '',
    noOfBoxes: '',
    noOfBundles: '',
    dispatchedBy: ''
  });

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cykrisData');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setJsonData(parsed);
      } catch (err) {
        console.error('Error loading cykris data:', err);
      }
    }
  }, []);

  // Save to localStorage whenever jsonData changes
  useEffect(() => {
    if (jsonData.length > 0) {
      localStorage.setItem('cykrisData', JSON.stringify(jsonData));
    }
  }, [jsonData]);

  // When selectedGroupKey changes, open the accordion by default
  useEffect(() => {
    setDetailsAccordionOpen(true);
  }, [selectedGroupKey]);

  // Helper to increment houseway bill numbers
  function incrementHousewayBill(base, inc) {
    const match = base.match(/^(\d{3})-(\d{4})$/);
    if (!match) return '';
    const prefix = match[1];
    const num = parseInt(match[2], 10) + inc + 1;
    return `${prefix}-${num.toString().padStart(4, '0')}`;
  }

  // Update useEffect for globalHousewayBill to use group keys
  useEffect(() => {
    if (!/^[\d]{3}-[\d]{4}$/.test(globalHousewayBill) || !jsonData || jsonData.length === 0) return;
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

  // On data load, initialize housewayBillNos and reviewedRefs by group key
  useEffect(() => {
    if (jsonData && jsonData.length > 0) {
      const groups = groupByParenthesis(jsonData);
      setHousewayBillNos(prev => {
        const updated = { ...prev };
        Object.keys(groups).forEach((key, i) => {
          if (!updated[key]) {
            updated[key] = { value: incrementHousewayBill(globalHousewayBill || '000-0001', i), _auto: true };
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
      if (!globalHousewayBill) setGlobalHousewayBill('000-0001');
    }
  }, [jsonData]);

  const getSavedCykris = useQuery(api.cykris.getSavedCykris, jsonData && jsonData.length > 0 ? {
    data: jsonData.map(item => ({
      ref_no: item["REF NO."] || "",
      waybill_no: item["waybill_no"] || ""
    }))
  } : "skip");

  // Check for saved Cykris DRs and mark them as reviewed
  useEffect(() => {
    if (getSavedCykris && jsonData && jsonData.length > 0) {
      const groups = groupByParenthesis(jsonData);
      
      setReviewedRefs(prev => {
        const updated = { ...prev };
        
        Object.keys(groups).forEach(groupKey => {
          const groupRows = groups[groupKey].rows;
          
          const hasSavedDr = groupRows.some(row => 
            getSavedCykris.some(savedDr => savedDr.ref_no === row["REF NO."] && savedDr.waybill_no !== "")
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
          
          const savedDr = getSavedCykris.find(savedDr => 
            groupRows.some(row => savedDr.ref_no === row["REF NO."])
          );
          
          if (savedDr && savedDr.waybill_no) {
            updated[groupKey] = { value: savedDr.waybill_no, _auto: false };
          }
        });
        
        return updated;
      });
    }
  }, [getSavedCykris, jsonData]);

  const saveCykris = useMutation(api.cykris.saveCykris);
  const deleteCykris = useMutation(api.cykris.deleteCykris);

  // Confirm review
  const handleConfirmReview = async (idx) => {
    setWaybillDisabled(true);
    let data = jsonData.filter(item =>
      item["REF NO."]?.includes(`(${idx})`)
    );

    data = data.map(item => ({
      ...item,
      waybill_no: housewayBillNos[idx].value
    }));

    try {
      const formattedData = data.map(item => ({
        ref_no: item["REF NO."] || "",
        group_ref_no: idx,
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
      await saveCykris({ data: formattedData });
      setReviewedRefs(prev => ({ ...prev, [idx]: true }));
    } catch (err) {
      console.error('Failed to save cykris:', err);
    }
  };

  const handleConfirmUnreview = async (idx) => {
    setWaybillDisabled(true);
    let data = jsonData.filter(item =>
      item["REF NO."]?.includes(`(${idx})`)
    );

    data = data.map(item => ({
      ...item,
      waybill_no: housewayBillNos[idx].value
    }));

    try {
      const formattedData = data.map(item => ({
        ref_no: item["REF NO."] || "",
        group_ref_no: idx,
        waybill_no: item["waybill_no"] || ""
      }));
      await deleteCykris({ data: formattedData });
      setReviewedRefs(prev => ({ ...prev, [idx]: false }));
      setWaybillDisabled(false);
    } catch (err) {
      console.error('Failed to delete cykris:', err);
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
      const match = ref && ref.match(/\(([^)]*)\)/);
      if (match) {
        const key = match[1];
        if (!groups[key]) groups[key] = { rows: [], indices: [] };
        groups[key].rows.push(row);
        groups[key].indices.push(idx);
      }
    });
    return groups;
  }

  // Handle form input change
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Clear form
  const clearForm = () => {
    setFormData({
      groupNo: '',
      drNo: '',
      drsiDate: '',
      nameOfDealer: '',
      contactPerson: '',
      contactNo: '',
      address: '',
      declaredAmount: '',
      noOfBoxes: '',
      noOfBundles: '',
      dispatchedBy: ''
    });
    setEditingIndex(null);
  };

  // Add or update DR
  const handleSubmitDR = () => {
    if (!formData.groupNo.trim() || !formData.drNo.trim()) {
      alert('Group No and DR No are required');
      return;
    }

    const newDR = {
      "REF NO.": `DR # ${formData.drNo} (${formData.groupNo})`,
      "DR/SI DATE": formData.drsiDate,
      "NAME OF DEALER": formData.nameOfDealer,
      "Contact Person": formData.contactPerson,
      "Contact No.": formData.contactNo,
      "ADDRESS": formData.address,
      "DECLARED AMOUNT": formData.declaredAmount,
      "No. Of Boxes": formData.noOfBoxes,
      "NO. OF BUNDLES": formData.noOfBundles,
      "DISPATCHED BY:": formData.dispatchedBy,
      "waybill_no": ""
    };

    if (editingIndex !== null) {
      // Update existing
      setJsonData(prev => {
        const updated = [...prev];
        updated[editingIndex] = newDR;
        return updated;
      });
    } else {
      // Add new
      setJsonData(prev => [...prev, newDR]);
    }

    clearForm();
  };

  // Edit DR
  const handleEdit = (index) => {
    const dr = jsonData[index];
    const refMatch = dr["REF NO."].match(/DR\s*#\s*(\d+)\s*\(([^)]+)\)/);
    
    setFormData({
      groupNo: refMatch ? refMatch[2] : '',
      drNo: refMatch ? refMatch[1] : '',
      drsiDate: dr["DR/SI DATE"] || '',
      nameOfDealer: dr["NAME OF DEALER"] || '',
      contactPerson: dr["Contact Person"] || '',
      contactNo: dr["Contact No."] || '',
      address: dr["ADDRESS"] || '',
      declaredAmount: dr["DECLARED AMOUNT"] || '',
      noOfBoxes: dr["No. Of Boxes"] || '',
      noOfBundles: dr["NO. OF BUNDLES"] || '',
      dispatchedBy: dr["DISPATCHED BY:"] || ''
    });
    setEditingIndex(index);
    setFormOpen(true);
  };

  // Delete DR
  const handleDelete = (index) => {
    if (window.confirm('Are you sure you want to delete this DR?')) {
      setJsonData(prev => prev.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header Bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Cykris</h1>
          <button
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 text-sm font-medium"
            onClick={() => window.location.href = '/cykris-billing'}
          >
            Billing
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 text-sm font-medium transition shadow"
            onClick={() => window.location.reload()}
          >
            <HiOutlineRefresh className="w-5 h-5" /> Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-6 px-6">
        {/* Collapsible Add DR Form */}
        <div className="bg-white rounded-2xl shadow-lg mb-6">
          <button
            onClick={() => setFormOpen(!formOpen)}
            className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-2xl hover:from-blue-100 hover:to-blue-200 transition"
          >
            <h2 className="text-xl font-bold text-gray-900">
              {editingIndex !== null ? 'Edit DR' : 'Add New DR'}
            </h2>
            {formOpen ? <HiChevronUp className="w-6 h-6" /> : <HiChevronDown className="w-6 h-6" />}
          </button>
          
          {formOpen && (
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Group No *</label>
                  <input
                    type="text"
                    value={formData.groupNo}
                    onChange={(e) => handleFormChange('groupNo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., ABC"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DR No *</label>
                  <input
                    type="text"
                    value={formData.drNo}
                    onChange={(e) => handleFormChange('drNo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 12345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DR/SI Date</label>
                  <input
                    type="date"
                    value={formData.drsiDate}
                    onChange={(e) => handleFormChange('drsiDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name of Dealer</label>
                  <input
                    type="text"
                    value={formData.nameOfDealer}
                    onChange={(e) => handleFormChange('nameOfDealer', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => handleFormChange('contactPerson', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact No</label>
                  <input
                    type="text"
                    value={formData.contactNo}
                    onChange={(e) => handleFormChange('contactNo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleFormChange('address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Declared Amount</label>
                  <input
                    type="text"
                    value={formData.declaredAmount}
                    onChange={(e) => handleFormChange('declaredAmount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No. of Boxes</label>
                  <input
                    type="text"
                    value={formData.noOfBoxes}
                    onChange={(e) => handleFormChange('noOfBoxes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No. of Bundles</label>
                  <input
                    type="text"
                    value={formData.noOfBundles}
                    onChange={(e) => handleFormChange('noOfBundles', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dispatched By</label>
                  <input
                    type="text"
                    value={formData.dispatchedBy}
                    onChange={(e) => handleFormChange('dispatchedBy', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSubmitDR}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-sm transition"
                >
                  {editingIndex !== null ? 'Update DR' : 'Add DR'}
                </button>
                {editingIndex !== null && (
                  <button
                    onClick={clearForm}
                    className="px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 font-semibold shadow-sm transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* DRs Table */}
        {jsonData && jsonData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Search Bar */}
            <div className="flex items-center gap-4 mb-6 relative">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search Cykris..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
                <HiOutlineSearch className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
              </div>
              <span className="text-gray-400 text-sm">
                {Object.keys(groupByParenthesis(jsonData)).filter(key => reviewedRefs[key]).length} / {Object.keys(groupByParenthesis(jsonData)).length} groups reviewed
                {getSavedCykris && (
                  <span className="ml-2 text-green-600">
                    • {getSavedCykris.length} saved in database
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
              <table className="w-full text-sm text-left text-gray-700 bg-white rounded-xl shadow">
                <thead className="sticky top-0 z-10 text-xs text-gray-700 uppercase bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 font-bold">#</th>
                    <th className="px-4 py-3 font-bold">REF NO.</th>
                    <th className="px-4 py-3 font-bold">DR/SI DATE</th>
                    <th className="px-4 py-3 font-bold">NAME OF DEALER</th>
                    <th className="px-4 py-3 font-bold">ADDRESS</th>
                    <th className="px-4 py-3 font-bold">DECLARED AMOUNT</th>
                    <th className="px-4 py-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jsonData
                    .filter((row) => {
                      if (!searchQuery) return true;
                      const values = Object.values(row).join(' ').toLowerCase();
                      return values.includes(searchQuery.toLowerCase());
                    })
                    .map((row, idx) => {
                      const isSaved = getSavedCykris?.some(savedDr => 
                        savedDr.ref_no === row["REF NO."]
                      );
                      
                      return (
                        <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors ${isSaved ? 'border-l-4 border-l-green-500' : ''}`}>
                          <td className="px-4 py-2 font-semibold text-center">
                            {idx + 1}
                            {isSaved && (
                              <div className="text-xs text-green-600 font-medium mt-1">✓ Saved</div>
                            )}
                          </td>
                          <td className="px-4 py-2">{row["REF NO."]}</td>
                          <td className="px-4 py-2">{row["DR/SI DATE"]}</td>
                          <td className="px-4 py-2">{row["NAME OF DEALER"]}</td>
                          <td className="px-4 py-2 break-words">{row["ADDRESS"]}</td>
                          <td className="px-4 py-2">{row["DECLARED AMOUNT"]}</td>
                          <td className="px-4 py-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(idx)}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(idx)}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {jsonData.length === 0 && (
                <div className="text-center text-gray-400 py-10">No data to display. Add a DR to get started.</div>
              )}
            </div>
          </div>
        )}

        {jsonData.length === 0 && (
          <div className="flex flex-col items-center justify-center h-96">
            <div className="text-center">
              <p className="text-xl font-semibold text-gray-700 mb-2">No DRs Added Yet</p>
              <p className="text-gray-500">Use the form above to add your first DR</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Review - keeping the existing modal code */}
      {modalOpen && jsonData && jsonData.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 bg-opacity-50 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b px-8 py-5 bg-gray-50 sticky top-0 z-10">
              <div className="flex items-center gap-8">
                <h2 className="text-2xl font-bold text-gray-900">Cykris Review & Print</h2>
              </div>
              <button className="text-gray-500 hover:text-gray-700 text-3xl font-bold" onClick={() => setModalOpen(false)}>&times;</button>
            </div>
            <div className="flex flex-1 overflow-hidden">
              {/* Left panel: REF NO. list */}
              {showLeftPanel && (
                <aside className="w-1/4 min-w-[380px] max-w-md bg-gray-50 border-r border-gray-200 p-4 flex flex-col gap-2 overflow-y-auto">
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
                  {/* Progress bar */}
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
                        </div>
                      </div>
                    );
                  })()}
                  <ul className="flex-1 overflow-y-auto pr-1">
                    {(() => {
                      const groups = groupByParenthesis(jsonData);
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
              {/* Right panel: details - continuing in next message due to length */}
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
                      {/* Printable section start */}
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
                              <div className='items-center justify-center flex border border-l-0 pt-[10px] pb-[10px]'>DOCUMENT NUMBER</div>
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
                              <div className='ml-1 flex h-[54px] border-r-1'>WARRANT THAT ALL DETAILS GIVEN ARE TRUE AND CORRECT</div>
                              <div className='border-r-1 border-t-1 pb-[25px] pl-[30px]'>SHIPPER'S PRINTED NAME AND SIGNATURE/DATE</div>
                              <div className='border-r-1 pb-5 border-b-1'>RECEIVED BY:</div>
                              <div className='border-r-1 ml-8'>CONSIGNEE PRINTED NAME AND SIGNATURE/DATE</div>
                            </div>
                            <div className='viewer-bot-body-right flex-1'>
                              <div className='items-center justify-center flex border pt-[10px] pb-[10px] border-l-0 border-r-0'>NUMBER AND TYPE OF PACKAGE</div>
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
                              <div className='pt-[40px] pl-1'>ERVY LOGISTICS</div>
                              <div className='pb-[18px] pl-1'>AUTHORIZED REPRESENTATIVE</div>
                              <div className='pl-8 border-t-1'>PRINTED NAME AND SIGNATURE/DATE</div>
                              <div className='flex pl-1'>TRUCK PLATE NO. <div className='ml-10 bg-[#fbe4d5] w-[200px] h-[25px]'></div></div>
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
    </div>
  );
}

export default Cykris;
