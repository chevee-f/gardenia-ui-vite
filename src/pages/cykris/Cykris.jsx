import React, { useState, useEffect, useRef } from 'react';
import { HiOutlineRefresh, HiOutlineSearch, HiOutlineEye, HiOutlineChevronDown, HiOutlineChevronUp } from 'react-icons/hi';
import { HiOutlineXCircle } from 'react-icons/hi';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useNavigate } from 'react-router-dom';

// === CONSTANTS ===
const COPY_LABELS = {
  ttc: 'CYKRIS COPY',
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

// Pricing configuration for types
const TYPE_PRICING = {
  "Promo Helmets": 35,
  "Bajaj Geniune Oil": 55,
  "Parts Including Wind Shield": 205,
  "Bajaj Tires (Small)": 45,
  "Truck Tires (Big)": 205,
  "Brake Pipes": 205,
  "Frame": 250,
};

// Description options (can be extended, but users can also type custom values)
const DESCRIPTION_OPTIONS = [
  "FULL FACE HELMET",
  "HALF FACE HELMET",
  "BAJAJ GENIUNE OIL",
  "BAJAJ GENIUNE PARTS",
  "HELMET M300",
  "FULL FACE CUSTOMIZED",
  "PROMO HELMETS",
  "SPARE PARTS",
];

// Table column widths
const QUANTITY_COLUMN_WIDTH = '150px';
const UNIT_COLUMN_WIDTH = '200px';
const DESCRIPTION_COLUMN_WIDTH = 'auto';
const BOXES_COLUMN_WIDTH = '150px';

// Destination options (can be extended, but users can also type custom values)
const DESTINATION_OPTIONS = [
  "AGDAO, DAVAO CITY",
  "BAYUGAN",
  "BISLIG",
  "BUKIDNON",
  "BUHANGIN",
  "BUTUAN",
  "CALINAN",
  "CAGAYAN",
  "CDO BORJA",
  "DIGOS",
  "DINAGAT",
  "DIPOLOG",
  "ILIGAN",
  "IMELDA",
  "IPIL",
  "KORONADAL",
  "COTABATO",
  "LILOY",
  "LUPON",
  "MANGAGOY, BISLIG",
  "MARANDING, LALA",
  "MATI",
  "MATINA",
  "MOLAVE",
  "NABUNTURAN",
  "OZAMIS",
  "PAGADIAN",
  "PANABO",
  "SAMAL",
  "SAN FRANCISCO",
  "SAN MIGUEL",
  "SINDANGAN",
  "SURIGAO CITY",
  "TAGUM",
  "TORIL",
  "TRENTO",
  "ZAMBO NUÑEZ",
  "ZAMBOANGA",
  "SOUTH COTABATO",
  "MISAMIS OCCIDENTAL",
  "SULTAN KUDARAT"
];

function Cykris() {
  const navigate = useNavigate();
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
  const [formOpen, setFormOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isAddDRloading, setIsAddDRloading] = useState(false);
  const [addDRError, setAddDRError] = useState(null);
  const [hasLocalCykrisData, setHasLocalCykrisData] = useState(false);
  const [expandedDRGroups, setExpandedDRGroups] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    drNo: '',
    destination: '',
    rows: [
      {
        quantity: '',
        unit: '',
        type: '',
        description: '',
        boxes: ''
      }
    ]
  });

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cykrisData');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setJsonData(parsed);
          setHasLocalCykrisData(true);
        }
      } catch (err) {
        console.error('Error loading cykris data:', err);
      }
    }
  }, []);

  // Shared DRs (database) - visible to other users
  const allCykrisDr = useQuery(api.cykris.getAllCykris) || [];

  // If the user has no local saved list, fall back to database so everyone sees shared DRs
  useEffect(() => {
    if (hasLocalCykrisData) return;
    if (!allCykrisDr || allCykrisDr.length === 0) return;

    const mapped = allCykrisDr.map((dr) => ({
      "REF NO.": dr.ref_no || "",
      "DR/SI DATE": dr.drsi_date ?? "",
      "NAME OF DEALER": dr.name_of_dealer ?? "",
      "Contact Person": dr.contact_person ?? "",
      "Contact No.": dr.contact_no ?? "",
      "ADDRESS": dr.address ?? dr.destination ?? "",
      "DECLARED AMOUNT": dr.declared_amount ?? "",
      "No. Of Boxes": dr.no_of_boxes ?? "",
      "NO. OF BUNDLES": dr.no_of_bundles ?? "",
      "DISPATCHED BY:": dr.dispatched_by ?? "",
      "QUANTITY": dr.quantity ?? "",
      "UNIT": dr.unit ?? "",
      "TYPE": dr.type ?? "",
      "DESCRIPTION": dr.description ?? "",
      "DESTINATION": dr.destination ?? dr.address ?? "",
      "waybill_no": dr.waybill_no ?? "",
    }));

    setJsonData(mapped);
  }, [allCykrisDr, hasLocalCykrisData]);

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

  // Check for saved Cykris DRs and mark them as reviewed based on reviewed field
  useEffect(() => {
    if (getSavedCykris && jsonData && jsonData.length > 0) {
      const groups = groupByParenthesis(jsonData);
      
      setReviewedRefs(prev => {
        const updated = { ...prev };
        
        Object.keys(groups).forEach(groupKey => {
          const groupRows = groups[groupKey].rows;
          
          // Check if any row in the group is reviewed
          const hasReviewedDr = groupRows.some(row => 
            getSavedCykris.some(savedDr => 
              savedDr.ref_no === row["REF NO."] && savedDr.reviewed === true
            )
          );
          
          if (hasReviewedDr) {
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

    // Get existing saved data to preserve all fields and use correct waybill_no
    const existingSavedData = getSavedCykris?.filter(savedDr => 
      data.some(item => savedDr.ref_no === item["REF NO."])
    ) || [];

    try {
      const formattedData = data.map(item => {
        const existing = existingSavedData.find(savedDr => savedDr.ref_no === item["REF NO."]);
        
        if (existing) {
          // Update existing record - preserve all data, just set reviewed to true
          return {
            ref_no: existing.ref_no,
            group_ref_no: existing.group_ref_no,
            waybill_no: existing.waybill_no || "",
            drsi_date: existing.drsi_date,
            name_of_dealer: existing.name_of_dealer,
            contact_person: existing.contact_person,
            contact_no: existing.contact_no,
            address: existing.address,
            declared_amount: existing.declared_amount,
            no_of_boxes: existing.no_of_boxes,
            no_of_bundles: existing.no_of_bundles,
            dispatched_by: existing.dispatched_by,
            type: existing.type,
            description: existing.description,
            destination: existing.destination,
            quantity: existing.quantity,
            unit: existing.unit,
            reviewed: true
          };
        } else {
          // If not found in saved data, use current jsonData (new record)
          return {
            ref_no: item["REF NO."] || "",
            group_ref_no: idx,
            waybill_no: item["waybill_no"] || "",
            drsi_date: item["DR/SI DATE"] || null,
            name_of_dealer: item["NAME OF DEALER"] || null,
            contact_person: item["Contact Person"] || null,
            contact_no: item["Contact No."] || null,
            address: item["ADDRESS"] || item["DESTINATION"] || null,
            declared_amount: item["DECLARED AMOUNT"] ? String(item["DECLARED AMOUNT"]) : null,
            no_of_boxes: item["No. Of Boxes"] ? parseFloat(item["No. Of Boxes"]) : null,
            no_of_bundles: item["NO. OF BUNDLES"] ? parseFloat(item["NO. OF BUNDLES"]) : null,
            dispatched_by: item["DISPATCHED BY:"] || null,
            type: item["TYPE"] || null,
            description: item["DESCRIPTION"] || null,
            destination: item["DESTINATION"] || item["ADDRESS"] || null,
            quantity: item["QUANTITY"] || null,
            unit: item["UNIT"] || null,
            reviewed: true
          };
        }
      });
      
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

    // Get existing saved data to preserve all fields
    const existingSavedData = getSavedCykris?.filter(savedDr => 
      data.some(item => savedDr.ref_no === item["REF NO."])
    ) || [];

    try {
      // Update reviewed status to false while preserving all other data
      const formattedData = data.map(item => {
        const existing = existingSavedData.find(savedDr => savedDr.ref_no === item["REF NO."]);
        
        if (existing) {
          // Preserve all existing data from database, just set reviewed to false
          return {
            ref_no: existing.ref_no,
            group_ref_no: existing.group_ref_no,
            waybill_no: existing.waybill_no || "",
            drsi_date: existing.drsi_date,
            name_of_dealer: existing.name_of_dealer,
            contact_person: existing.contact_person,
            contact_no: existing.contact_no,
            address: existing.address,
            declared_amount: existing.declared_amount,
            no_of_boxes: existing.no_of_boxes,
            no_of_bundles: existing.no_of_bundles,
            dispatched_by: existing.dispatched_by,
            type: existing.type,
            description: existing.description,
            destination: existing.destination,
            quantity: existing.quantity,
            unit: existing.unit,
            reviewed: false
          };
        } else {
          // If not found in saved data, use current jsonData
          return {
            ref_no: item["REF NO."] || "",
            group_ref_no: idx,
            waybill_no: item["waybill_no"] || "",
            drsi_date: item["DR/SI DATE"] || null,
            name_of_dealer: item["NAME OF DEALER"] || null,
            contact_person: item["Contact Person"] || null,
            contact_no: item["Contact No."] || null,
            address: item["ADDRESS"] || item["DESTINATION"] || null,
            declared_amount: item["DECLARED AMOUNT"] ? String(item["DECLARED AMOUNT"]) : null,
            no_of_boxes: item["No. Of Boxes"] ? parseFloat(item["No. Of Boxes"]) : null,
            no_of_bundles: item["NO. OF BUNDLES"] ? parseFloat(item["NO. OF BUNDLES"]) : null,
            dispatched_by: item["DISPATCHED BY:"] || null,
            type: item["TYPE"] || null,
            description: item["DESCRIPTION"] || null,
            destination: item["DESTINATION"] || item["ADDRESS"] || null,
            quantity: item["QUANTITY"] || null,
            unit: item["UNIT"] || null,
            reviewed: false
          };
        }
      });
      
      await saveCykris({ data: formattedData });
      setReviewedRefs(prev => ({ ...prev, [idx]: false }));
      setWaybillDisabled(false);
    } catch (err) {
      console.error('Failed to update cykris:', err);
      setWaybillDisabled(false);
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
    let spaceHeight = '607px';
    if (type === 'all') {
      printHtml += getPrintHtml('CYKRIS COPY');
      printHtml += `<div style='height: ${spaceHeight};'></div>`;
      printHtml += getPrintHtml("CUSTOMER COPY");
      printHtml += `<div style='height: ${spaceHeight};'></div>`;
      printHtml += getPrintHtml('CARRIER COPY');
    } else {
      let label = '';
      if (type === 'ttc') label = 'CYKRIS COPY';
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
          <div style='position: absolute;right: 20px;font-size: 14px;font-weight: bold;'>
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
      if (type === 'ttc') label = 'CYKRIS COPY';
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

  // Helper to extract DR# from REF NO.
  function getDRNumber(refNo) {
    if (!refNo) return '';
    const match = refNo.match(/DR\s*#\s*([^\s\(]+)/);
    return match ? match[1] : refNo;
  }

  // Handle form input change
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Clear form
  const clearForm = () => {
    setFormData({
      drNo: '',
      destination: '',
      rows: [
        {
          quantity: '',
          unit: '',
          type: '',
          description: '',
          boxes: ''
        }
      ]
    });
    setEditingIndex(null);
    setAddDRError(null);
  };

  // Add a new row to the form
  const addFormRow = () => {
    setFormData(prev => ({
      ...prev,
      rows: [...prev.rows, {
        quantity: '',
        unit: '',
        type: '',
        description: '',
        boxes: ''
      }]
    }));
  };

  // Remove a row from the form
  const removeFormRow = (index) => {
    if (formData.rows.length <= 1) {
      alert('At least one row is required');
      return;
    }
    setFormData(prev => ({
      ...prev,
      rows: prev.rows.filter((_, i) => i !== index)
    }));
  };

  // Handle form row change
  const handleFormRowChange = (rowIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      rows: prev.rows.map((row, i) => 
        i === rowIndex ? { ...row, [field]: value } : row
      )
    }));
  };

  // Add or update DR
  const handleSubmitDR = async () => {
    setIsAddDRloading(true);
    setAddDRError(null);
    
    if (!formData.drNo.trim()) {
      setAddDRError('DR # is required');
      setIsAddDRloading(false);
      return;
    }
    if (!formData.destination.trim()) {
      setAddDRError('Destination is required');
      setIsAddDRloading(false);
      return;
    }
    if (formData.rows.length === 0) {
      setAddDRError('At least one row is required');
      setIsAddDRloading(false);
      return;
    }

    // Validate all rows
    for (let i = 0; i < formData.rows.length; i++) {
      const row = formData.rows[i];
      const quantity = String(row.quantity || '').trim();
      const boxes = String(row.boxes || '').trim();
      
      if (!quantity) {
        setAddDRError(`Row ${i + 1}: Quantity is required`);
        setIsAddDRloading(false);
        return;
      }
      if (!/^\d+$/.test(quantity)) {
        setAddDRError(`Row ${i + 1}: Quantity must be a number`);
        setIsAddDRloading(false);
        return;
      }
      if (!boxes) {
        setAddDRError(`Row ${i + 1}: Boxes is required`);
        setIsAddDRloading(false);
        return;
      }
      if (!/^\d+$/.test(boxes)) {
        setAddDRError(`Row ${i + 1}: Boxes must be a number`);
        setIsAddDRloading(false);
        return;
      }
    }

    // When editing, use the original DR number from editingIndex; otherwise use the new DR number
    const originalDrNo = editingIndex !== null ? editingIndex : null;
    const newDrNo = formData.drNo; // New DR number (may be same or different if DR# changed)
    const groupNo = newDrNo; // Use DR number as group number

    // Create multiple DR entries - one for each row
    const newDRs = formData.rows.map((row, index) => {
      // Calculate amount based on type and quantity
      let calculatedAmount = '';
      if (row.type && row.quantity) {
        const price = TYPE_PRICING[row.type];
        if (price) {
          const qty = parseFloat(row.quantity);
          calculatedAmount = (qty * price).toFixed(2);
        }
      }

      const refNo = `DR # ${formData.drNo} (${groupNo})`;

      return {
        "REF NO.": refNo,
        "DR/SI DATE": '',
        "NAME OF DEALER": '',
        "Contact Person": '',
        "Contact No.": '',
        "ADDRESS": formData.destination,
        "DECLARED AMOUNT": calculatedAmount,
        "No. Of Boxes": row.boxes,
        "NO. OF BUNDLES": '',
        "DISPATCHED BY:": '',
        "QUANTITY": row.quantity,
        "UNIT": row.unit,
        "TYPE": row.type,
        "DESCRIPTION": row.description,
        "DESTINATION": formData.destination,
        "waybill_no": ""
      };
    });

    // Prepare data for database - one entry per row
    const dbDataArray = formData.rows.map((row) => {
      let calculatedAmount = '';
      if (row.type && row.quantity) {
        const price = TYPE_PRICING[row.type];
        if (price) {
          const qty = parseFloat(row.quantity);
          calculatedAmount = (qty * price).toFixed(2);
        }
      }

      const refNo = `DR # ${formData.drNo} (${groupNo})`;

      return {
        ref_no: refNo,
        group_ref_no: groupNo,
        waybill_no: "",
        drsi_date: null,
        name_of_dealer: null,
        contact_person: null,
        contact_no: null,
        address: formData.destination || null,
        declared_amount: calculatedAmount || null,
        no_of_boxes: parseFloat(row.boxes) || null,
        no_of_bundles: null,
        dispatched_by: null,
        type: row.type || null,
        description: row.description || null,
        destination: formData.destination || null,
        quantity: row.quantity || null,
        unit: row.unit || null,
        reviewed: false,
      };
    });

    try {
      if (editingIndex !== null && originalDrNo) {
        // For editing, we need to remove all existing rows for this DR from database FIRST
        // Use the ORIGINAL DR number to find existing rows
        const existingRows = jsonData.filter(item => {
          const itemRef = item["REF NO."];
          const itemMatch = itemRef && itemRef.match(/DR\s*#\s*([^\s]+)/);
          return itemMatch && itemMatch[1] === originalDrNo;
        });
        
        // Delete old rows from database BEFORE saving new ones
        if (existingRows.length > 0) {
          const deleteData = existingRows.map(item => {
            // Extract group_ref_no from existing item's REF NO
            const refMatch = item["REF NO."].match(/\(([^)]+)\)/);
            const existingGroupNo = refMatch ? refMatch[1] : originalDrNo;
            
            return {
              ref_no: item["REF NO."],
              group_ref_no: existingGroupNo,
              waybill_no: item["waybill_no"] || ""
            };
          });
          console.log('Editing DR: Deleting old rows for original DR#', originalDrNo, ':', deleteData.length, 'rows');
          console.log('Editing DR: Will save new rows with new DR#', newDrNo, ':', dbDataArray.length, 'rows');
          try {
            await deleteCykris({ data: deleteData });
            console.log('Successfully deleted old rows');
          } catch (deleteErr) {
            console.error('Failed to delete old rows:', deleteErr);
            // Continue anyway - we'll still save the new rows
          }
        }
      }

      // Save to database (all rows - both new and edited)
      console.log('Saving DR with multiple rows:', {
        drNo: formData.drNo,
        rowCount: dbDataArray.length,
        rows: dbDataArray.map((row, idx) => ({
          index: idx,
          description: row.description,
          quantity: row.quantity,
          unit: row.unit,
          type: row.type
        }))
      });
      await saveCykris({ data: dbDataArray });
      console.log('Successfully saved', dbDataArray.length, 'rows for DR#', formData.drNo);

      // Update local state
      if (editingIndex !== null && originalDrNo) {
        // Remove old rows from local state and add new ones
        // Use the ORIGINAL DR number to filter out old rows
        setJsonData(prev => {
          const filtered = prev.filter(item => {
            const itemRef = item["REF NO."];
            const itemMatch = itemRef && itemRef.match(/DR\s*#\s*([^\s]+)/);
            return !itemMatch || itemMatch[1] !== originalDrNo;
          });
          return [...filtered, ...newDRs];
        });
      } else {
        // Add new
        setJsonData(prev => [...prev, ...newDRs]);
      }

      clearForm();
      setFormOpen(false);
      setAddDRError(null);
    } catch (err) {
      console.error('Failed to save DR:', err);
      setAddDRError(err.message || 'Failed to save DR. Please try again.');
    } finally {
      setIsAddDRloading(false);
    }
  };

  // Edit DR - finds all rows for the same DR number
  const handleEdit = (index) => {
    const dr = jsonData[index];
    const refMatch = dr["REF NO."].match(/DR\s*#\s*([^\s]+)/);
    
    if (!refMatch) {
      alert('Invalid DR format');
      return;
    }

    const drNo = refMatch[1];
    
    // Find all rows with the same DR number
    const allRowsForDR = jsonData.filter(item => {
      const itemRef = item["REF NO."];
      const itemMatch = itemRef && itemRef.match(/DR\s*#\s*([^\s]+)/);
      return itemMatch && itemMatch[1] === drNo;
    });

    // Extract rows data
    const rows = allRowsForDR.map(row => ({
      quantity: row["QUANTITY"] || '',
      unit: row["UNIT"] || '',
      type: row["TYPE"] || '',
      description: row["DESCRIPTION"] || '',
      boxes: row["No. Of Boxes"] || ''
    }));

    // Get destination from first row (should be same for all)
    const destination = allRowsForDR[0]?.["DESTINATION"] || allRowsForDR[0]?.["ADDRESS"] || '';
    
    setFormData({
      drNo: drNo,
      destination: destination,
      rows: rows.length > 0 ? rows : [{
        quantity: '',
        unit: '',
        type: '',
        description: '',
        boxes: ''
      }]
    });
    
    // Store the original DR number for editing
    setEditingIndex(drNo);
    setFormOpen(true);
  };

  // Delete DR
  const handleDelete = async (index) => {
    if (!window.confirm('Are you sure you want to delete this DR?')) {
      return;
    }

    const drToDelete = jsonData[index];
    const refNo = drToDelete["REF NO."];
    const refMatch = refNo.match(/DR\s*#\s*([^\s]+)\s*\(([^)]+)\)/);
    const groupNo = refMatch ? refMatch[2] : '';
    const waybillNo = drToDelete["waybill_no"] || "";

    try {
      // Delete from database if it exists
      if (refNo && groupNo) {
        await deleteCykris({ 
          data: [{
            ref_no: refNo,
            group_ref_no: groupNo,
            waybill_no: waybillNo
          }]
        });
      }

      // Remove from local state
      setJsonData(prev => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error('Failed to delete DR:', err);
      alert('Failed to delete DR. Please try again.');
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
            onClick={() => navigate('/cykris-billing')}
          >
            Billing
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 text-sm font-medium transition"
            onClick={() => {
              clearForm();
              setFormOpen(true);
            }}
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

        {/* DRs Table */}
        {jsonData && jsonData.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-4">
            {/* Search Bar */}
            <div className="flex items-center gap-3 mb-3 relative">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search Cykris..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border rounded bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                />
                <HiOutlineSearch className="absolute left-2 top-1.5 text-gray-400 w-4 h-4" />
              </div>
              <span className="text-gray-500 text-xs">
                {Object.keys(groupByParenthesis(jsonData)).filter(key => reviewedRefs[key]).length} / {Object.keys(groupByParenthesis(jsonData)).length} groups reviewed
                {getSavedCykris && (
                  <span className="ml-2 text-green-600">
                    • {getSavedCykris.length} saved in database
                  </span>
                )}
              </span>
              <button
                className={`absolute right-0 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition shadow ${jsonData && jsonData.length > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                onClick={() => setModalOpen(true)}
                disabled={!jsonData || jsonData.length === 0}
              >
                <HiOutlineEye className="w-4 h-4" /> Start Review & Print
              </button>
            </div>
            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-gray-700 bg-white rounded shadow">
                <thead className="sticky top-0 z-10 text-xs text-gray-700 uppercase bg-gray-100">
                  <tr>
                    <th className="px-2 py-1.5 font-semibold">#</th>
                    <th className="px-2 py-1.5 font-semibold">DR#</th>
                    <th className="px-2 py-1.5 font-semibold">Destination</th>
                    <th className="px-2 py-1.5 font-semibold">Type</th>
                    <th className="px-2 py-1.5 font-semibold">Description</th>
                    <th className="px-2 py-1.5 font-semibold">Qty</th>
                    <th className="px-2 py-1.5 font-semibold">Unit</th>
                    <th className="px-2 py-1.5 font-semibold">Amount</th>
                    <th className="px-2 py-1.5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Filter data first
                    const filteredData = jsonData.filter((row) => {
                      if (!searchQuery) return true;
                      const values = Object.values(row).join(' ').toLowerCase();
                      return values.includes(searchQuery.toLowerCase());
                    });
                    
                    // Group by DR
                    const groups = groupByParenthesis(filteredData);
                    const groupKeys = Object.keys(groups);
                    
                    if (groupKeys.length === 0) {
                      return null;
                    }
                    
                    let rowCounter = 0;
                    return groupKeys.map((groupKey) => {
                      const group = groups[groupKey];
                      const firstRow = group.rows[0];
                      const drNo = getDRNumber(firstRow["REF NO."]);
                      const destination = firstRow["DESTINATION"] || firstRow["ADDRESS"] || '-';
                      const isGroupSaved = group.rows.some(row => 
                        getSavedCykris?.some(savedDr => savedDr.ref_no === row["REF NO."])
                      );
                      const hasMultipleRows = group.rows.length > 1;
                      const isExpanded = expandedDRGroups[groupKey] || false;
                      
                      return (
                        <React.Fragment key={groupKey}>
                          {hasMultipleRows ? (
                            // Multi-row DR: Show collapsed header when closed, all rows when expanded
                            <>
                              {!isExpanded ? (
                                // Collapsed state: Show only a header row with accordion button
                                <tr className="bg-gray-100 hover:bg-gray-200 transition-colors border-b border-gray-300">
                                  <td className="px-2 py-2 font-medium text-center">
                                    <button
                                      onClick={() => setExpandedDRGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))}
                                      className="flex items-center gap-2 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded border border-blue-300 transition-colors"
                                      title={`Expand (${group.rows.length} items)`}
                                    >
                                      <HiOutlineChevronDown className="w-5 h-5" />
                                      <span className="text-sm font-semibold">{group.rows.length} items</span>
                                    </button>
                                  </td>
                                  <td className="px-2 py-2 font-semibold text-blue-800">{drNo}</td>
                                  <td className="px-2 py-2 break-words">{destination}</td>
                                  <td colSpan={6} className="px-2 py-2">
                                    <div className="flex gap-1.5">
                                      <button
                                        onClick={() => handleEdit(group.indices[0])}
                                        className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDelete(group.indices[0])}
                                        className="px-2 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                // Expanded state: Show all rows
                                group.rows.map((row, rowIdx) => {
                                  const originalIdx = group.indices[rowIdx];
                                  const isSaved = getSavedCykris?.some(savedDr => 
                                    savedDr.ref_no === row["REF NO."]
                                  );
                                  rowCounter++;
                                  
                                  return (
                                    <tr key={`${groupKey}-${rowIdx}`} className={`${rowCounter % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors ${isSaved ? 'border-l-4 border-l-green-500' : ''}`}>
                                      <td className="px-2 py-1.5 font-medium text-center">
                                        {rowIdx === 0 ? (
                                          <div className="flex items-center justify-center gap-2">
                                            <button
                                              onClick={() => setExpandedDRGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))}
                                              className="flex items-center gap-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded border border-blue-300 transition-colors"
                                              title="Collapse"
                                            >
                                              <HiOutlineChevronUp className="w-5 h-5" />
                                              <span className="text-xs font-semibold">{group.rows.length}</span>
                                            </button>
                                            <span>{rowCounter}</span>
                                          </div>
                                        ) : (
                                          <span>{rowCounter}</span>
                                        )}
                                        {isSaved && (
                                          <div className="text-xs text-green-600 font-medium mt-0.5">✓ Saved</div>
                                        )}
                                      </td>
                                      <td className="px-2 py-1.5">{getDRNumber(row["REF NO."])}</td>
                                      <td className="px-2 py-1.5 break-words">{row["DESTINATION"] || row["ADDRESS"] || '-'}</td>
                                      <td className="px-2 py-1.5">{row["TYPE"] || '-'}</td>
                                      <td className="px-2 py-1.5">{row["DESCRIPTION"] || '-'}</td>
                                      <td className="px-2 py-1.5">{row["QUANTITY"] || '-'}</td>
                                      <td className="px-2 py-1.5">{row["UNIT"] || '-'}</td>
                                      <td className="px-2 py-1.5">
                                        {(() => {
                                          const storedAmount = row["DECLARED AMOUNT"];
                                          if (storedAmount) return storedAmount;
                                          const type = row["TYPE"];
                                          const quantity = row["QUANTITY"];
                                          if (type && quantity) {
                                            const price = TYPE_PRICING[type];
                                            if (price) {
                                              const qty = parseFloat(quantity);
                                              return (qty * price).toFixed(2);
                                            }
                                          }
                                          return '-';
                                        })()}
                                      </td>
                                      <td className="px-2 py-1.5">
                                        {rowIdx === 0 ? (
                                          <div className="flex gap-1.5">
                                            <button
                                              onClick={() => handleEdit(originalIdx)}
                                              className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                            >
                                              Edit
                                            </button>
                                            <button
                                              onClick={() => handleDelete(originalIdx)}
                                              className="px-2 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition"
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        ) : null}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </>
                          ) : (
                            // Single-row DR: Always show normally
                            (() => {
                              const originalIdx = group.indices[0];
                              const isSaved = getSavedCykris?.some(savedDr => 
                                savedDr.ref_no === firstRow["REF NO."]
                              );
                              rowCounter++;
                              
                              return (
                                <tr className={`${rowCounter % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors ${isSaved ? 'border-l-4 border-l-green-500' : ''}`}>
                                  <td className="px-2 py-1.5 font-medium text-center">
                                    <span>{rowCounter}</span>
                                    {isSaved && (
                                      <div className="text-xs text-green-600 font-medium mt-0.5">✓ Saved</div>
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5">{drNo}</td>
                                  <td className="px-2 py-1.5 break-words">{destination}</td>
                                  <td className="px-2 py-1.5">{firstRow["TYPE"] || '-'}</td>
                                  <td className="px-2 py-1.5">{firstRow["DESCRIPTION"] || '-'}</td>
                                  <td className="px-2 py-1.5">{firstRow["QUANTITY"] || '-'}</td>
                                  <td className="px-2 py-1.5">{firstRow["UNIT"] || '-'}</td>
                                  <td className="px-2 py-1.5">
                                    {(() => {
                                      const storedAmount = firstRow["DECLARED AMOUNT"];
                                      if (storedAmount) return storedAmount;
                                      const type = firstRow["TYPE"];
                                      const quantity = firstRow["QUANTITY"];
                                      if (type && quantity) {
                                        const price = TYPE_PRICING[type];
                                        if (price) {
                                          const qty = parseFloat(quantity);
                                          return (qty * price).toFixed(2);
                                        }
                                      }
                                      return '-';
                                    })()}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div className="flex gap-1.5">
                                      <button
                                        onClick={() => handleEdit(originalIdx)}
                                        className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDelete(originalIdx)}
                                        className="px-2 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })()
                          )}
                        </React.Fragment>
                      );
                    });
                  })()}
                </tbody>
              </table>
              {jsonData.length === 0 && (
                <div className="text-center text-gray-400 py-6 text-xs">No data to display. Add a DR to get started.</div>
              )}
            </div>
          </div>
        )}

        {jsonData.length === 0 && (
          <div className="flex flex-col items-center justify-center h-96">
            <div className="text-center">
              <p className="text-xl font-semibold text-gray-700 mb-2">No DRs Added Yet</p>
              <p className="text-gray-500">Click "Add DR" button to add your first DR</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Add/Edit DR */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 bg-opacity-50 transition-all">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b px-4 py-2.5 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingIndex !== null ? 'Edit DR' : 'Add New DR'}
              </h2>
              <button 
                className={`text-gray-500 text-2xl font-bold leading-none ${isAddDRloading ? 'cursor-not-allowed opacity-50' : 'hover:text-gray-700'}`}
                onClick={() => {
                  if (!isAddDRloading) {
                    clearForm();
                    setFormOpen(false);
                    setAddDRError(null);
                  }
                }}
                disabled={isAddDRloading}
              >
                &times;
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              {/* Error Message */}
              {addDRError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <HiOutlineXCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 flex-1">{addDRError}</p>
                  <button
                    onClick={() => setAddDRError(null)}
                    className="text-red-600 hover:text-red-800 text-lg font-bold leading-none"
                    disabled={isAddDRloading}
                  >
                    &times;
                  </button>
                </div>
              )}
              
              {/* DR# and Destination - Single fields */}
              <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">DR # *</label>
                  <input
                    type="text"
                    value={formData.drNo}
                    onChange={(e) => handleFormChange('drNo', e.target.value)}
                    disabled={isAddDRloading}
                    className={`w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${isAddDRloading ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                    placeholder="e.g., 12345"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Destination *</label>
                  <input
                    type="text"
                    list="destination-options"
                    value={formData.destination}
                    onChange={(e) => handleFormChange('destination', e.target.value)}
                    disabled={isAddDRloading}
                    className={`w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${isAddDRloading ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                    placeholder="Select or type destination"
                    required
                  />
                  <datalist id="destination-options">
                    {DESTINATION_OPTIONS.map((dest) => (
                      <option key={dest} value={dest} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Rows Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">Items (Rows)</label>
                  <button
                    type="button"
                    onClick={addFormRow}
                    disabled={isAddDRloading}
                    className={`px-3 py-1 text-xs bg-blue-600 text-white rounded font-medium ${isAddDRloading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                  >
                    + Add Row
                  </button>
                </div>

                {formData.rows.map((row, rowIndex) => (
                  <div key={rowIndex} className={`border border-gray-300 rounded-lg p-3 ${isAddDRloading ? 'bg-gray-100' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600">Row {rowIndex + 1}</span>
                      {formData.rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFormRow(rowIndex)}
                          disabled={isAddDRloading}
                          className={`px-2 py-1 text-xs bg-red-500 text-white rounded font-medium ${isAddDRloading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600'}`}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Quantity *</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={row.quantity}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d+$/.test(value)) {
                              handleFormRowChange(rowIndex, 'quantity', value);
                            }
                          }}
                          disabled={isAddDRloading}
                          className={`w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${isAddDRloading ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                          placeholder="Enter quantity"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Unit</label>
                        <select
                          value={row.unit}
                          onChange={(e) => handleFormRowChange(rowIndex, 'unit', e.target.value)}
                          disabled={isAddDRloading}
                          className={`w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${isAddDRloading ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                        >
                          <option value="">Select Unit</option>
                          <option value="PCS">PCS</option>
                          <option value="BOXES">BOXES</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Type</label>
                        <select
                          value={row.type}
                          onChange={(e) => handleFormRowChange(rowIndex, 'type', e.target.value)}
                          disabled={isAddDRloading}
                          className={`w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${isAddDRloading ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                        >
                          <option value="">Select Type</option>
                          {Object.keys(TYPE_PRICING).map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Boxes *</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={row.boxes}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d+$/.test(value)) {
                              handleFormRowChange(rowIndex, 'boxes', value);
                            }
                          }}
                          disabled={isAddDRloading}
                          className={`w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${isAddDRloading ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                          placeholder="Enter number of boxes"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Description</label>
                        <input
                          type="text"
                          list={`description-options-${rowIndex}`}
                          value={row.description}
                          onChange={(e) => handleFormRowChange(rowIndex, 'description', e.target.value)}
                          disabled={isAddDRloading}
                          className={`w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${isAddDRloading ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                          placeholder="Select or type description"
                        />
                        <datalist id={`description-options-${rowIndex}`}>
                          {DESCRIPTION_OPTIONS.map((desc) => (
                            <option key={desc} value={desc} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="flex gap-2 px-4 py-2.5 border-t bg-gray-50">
              <button
                onClick={handleSubmitDR}
                disabled={isAddDRloading}
                className={`px-4 py-1.5 text-sm bg-green-600 text-white rounded font-medium shadow-sm transition flex items-center gap-2 ${
                  isAddDRloading 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'hover:bg-green-700'
                }`}
              >
                {isAddDRloading && (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isAddDRloading ? 'Saving...' : (editingIndex !== null ? 'Update DR' : 'Add DR')}
              </button>
              
              <button
                onClick={() => {
                  if (!isAddDRloading) {
                    clearForm();
                    setFormOpen(false);
                    setAddDRError(null);
                  }
                }}
                disabled={isAddDRloading}
                className={`px-4 py-1.5 text-sm bg-gray-400 text-white rounded font-medium shadow-sm transition ${
                  isAddDRloading 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-gray-500'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
                                const refs = group.rows.map(r => {
                                  const refNo = r['REF NO.'] || '';
                                  // Extract just "DR # 333" without the group number
                                  const match = refNo.match(/DR\s*#\s*([^\s\(]+)/);
                                  return match ? `DR # ${match[1]}` : refNo.replace(/\(([^)]*)\)/g, '').trim();
                                });
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
                  console.log(firstRow);
                  return (
                    <>
                      <div className='flex flex-col gap-3'>
                        {/* Review Status Button */}
                        <div className="flex items-center justify-end gap-2">
                          {reviewedRefs[selectedGroupKey] ? (
                            <button
                              className="px-4 py-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600 font-medium text-sm shadow-sm transition"
                              onClick={() => handleConfirmUnreview(selectedGroupKey)}
                            >
                              Mark as Unreviewed
                            </button>
                          ) : (
                            <button
                              className="px-4 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 font-medium text-sm shadow-sm transition"
                              onClick={() => handleConfirmReview(selectedGroupKey)}
                            >
                              Mark as Reviewed
                            </button>
                          )}
                          <button
                            className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium text-sm shadow-sm transition"
                            onClick={() => navigate('/cykris-billing')}
                          >
                            Billing
                          </button>
                        </div>
                        
                        {/* Print Options Box */}
                        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 shadow-sm">
                          <div className="mb-2 text-xs font-semibold text-gray-700 uppercase tracking-wide">Print Options</div>
                          <div className="space-y-1.5 mb-3">
                            <label className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={printChecks.ttc}
                                onChange={e => setPrintChecks(c => ({ ...c, ttc: e.target.checked }))}
                                className="w-3.5 h-3.5"
                              />
                              Cykris Copy
                            </label>
                            <label className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={printChecks.customer}
                                onChange={e => setPrintChecks(c => ({ ...c, customer: e.target.checked }))}
                                className="w-3.5 h-3.5"
                              />
                              Customer's Copy
                            </label>
                            <label className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={printChecks.carrier}
                                onChange={e => setPrintChecks(c => ({ ...c, carrier: e.target.checked }))}
                                className="w-3.5 h-3.5"
                              />
                              Carrier Copy
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <button
                              className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition ${printChecks.ttc || printChecks.customer || printChecks.carrier ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                              onClick={() => handlePrintSelected(selectedGroupKey)}
                              disabled={!(printChecks.ttc || printChecks.customer || printChecks.carrier)}
                            >
                              Print
                            </button>
                            <button
                              className="flex-1 px-3 py-1.5 rounded text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 transition"
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
                            </div>
                          </div>
                          <div className='mt-[70px]'>
                            <div className='border-b font-bold text-[20px] mt-[90px] pl-[10px] pb-[20px]'>DELIVERY RECEIPT</div>
                              <div className='border-b font-bold text-[16px] mt-[15px] pb-[15px] pl-[10px] flex justify-between items-center'>
                                <div>DESTINATION: {firstRow['ADDRESS']}</div>
                                <div className='pr-[10px]'>DR# {(() => {
                                  const refNo = firstRow['REF NO.'] || '';
                                  const match = refNo.match(/DR\s*#\s*([^\s\(]+)/);
                                  return match ? match[1] : refNo.replace(/[()]/g, '');
                                })()}</div>
                              </div>
                            <table className="w-full border-collapse border-0" style={{ minHeight: '400px', marginLeft: "-1px", width: "calc(100% + 2px)" }}>
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border border-black px-4 py-2 text-center font-semibold" style={{ borderTop: 0, width: QUANTITY_COLUMN_WIDTH }}>Quantity</th>
                                  <th className="border border-black px-4 py-2 text-center font-semibold" style={{ borderTop: 0, width: UNIT_COLUMN_WIDTH }}>Unit</th>
                                  <th className="border border-black px-4 py-2 text-center font-semibold" style={{ borderTop: 0, width: DESCRIPTION_COLUMN_WIDTH }}>Description</th>
                                  <th className="border border-black px-4 py-2 text-center font-semibold" style={{ borderTop: 0, width: BOXES_COLUMN_WIDTH }}>No. Of Boxes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const maxRows = 7;
                                  const actualRows = group.rows;
                                  const rowsToShow = Math.min(actualRows.length, maxRows);
                                  const emptyRowsNeeded = maxRows - rowsToShow;
                                  
                                  return (
                                    <>
                                      {actualRows.slice(0, rowsToShow).map((row, rowIndex) => (
                                        <tr key={rowIndex} style={{ height: '40px' }}>
                                          <td className="text-center py-2 border-l border-r border-black" style={{ width: QUANTITY_COLUMN_WIDTH }}>{row['QUANTITY']}</td>
                                          <td className="text-center py-2 border-l border-r border-black" style={{ width: UNIT_COLUMN_WIDTH }}>{row['UNIT']}</td>
                                          <td className="text-center py-2 border-l border-r border-black" style={{ width: DESCRIPTION_COLUMN_WIDTH }}>{row['DESCRIPTION']}</td>
                                          <td className="text-center py-2 border-l border-r border-black" style={{ width: BOXES_COLUMN_WIDTH }}>{row['No. Of Boxes']}</td>
                                        </tr>
                                      ))}
                                      {Array.from({ length: emptyRowsNeeded }).map((_, emptyIndex) => (
                                        <tr key={`empty-${emptyIndex}`} style={{ height: '40px' }}>
                                          <td className="text-center py-[10px] border-l border-r border-black" style={{ width: QUANTITY_COLUMN_WIDTH }}>&nbsp;</td>
                                          <td className="text-center py-[10px] border-l border-r border-black" style={{ width: UNIT_COLUMN_WIDTH }}>&nbsp;</td>
                                          <td className="text-center py-[10px] border-l border-r border-black" style={{ width: DESCRIPTION_COLUMN_WIDTH }}>&nbsp;</td>
                                          <td className="text-center py-[10px] border-l border-r border-black" style={{ width: BOXES_COLUMN_WIDTH }}>&nbsp;</td>
                                        </tr>
                                      ))}
                                    </>
                                  );
                                })()}
                                <tr style={{ height: '120px' }} className='text-[14px]'>
                                  <td colSpan={2} className="border border-black" style={{ height: '120px', padding: '8px', verticalAlign: 'top' }}>
                                    <div className="flex flex-col justify-between" style={{ height: '100%' }}>
                                      <div>RECEIVE THE ABOVE GOODS IN GOOD CONDITION</div>
                                      <div className='text-[14px]'>CONSIGNEE'S PRINTED NAME & SIGNATURE</div>
                                    </div>
                                  </td>
                                  <td className="border border-black" style={{ height: '120px', padding: '8px', verticalAlign: 'top' }}>
                                    <div className="flex flex-col justify-between" style={{ height: '100%' }}>
                                      <div>
                                        <div>DELIVERED BY: ERVY LOGISTICS</div>
                                        <div>AUTHORIZED REPRESENTATIVE</div>
                                      </div>
                                      <div className='text-[14px]'>PRINTED NAME AND SIGNATURE</div>
                                    </div>
                                  </td>
                                  <td className="border border-black" style={{ height: '120px', padding: '8px', verticalAlign: 'top' }}>
                                    <div className="flex flex-col justify-between" style={{ height: '100%' }}>
                                      <div>
                                        <div>Date: {(() => {
                                          const date = new Date();
                                          const day = String(date.getDate()).padStart(2, '0');
                                          const month = String(date.getMonth() + 1).padStart(2, '0');
                                          const year = date.getFullYear();
                                          return `${day}-${month}-${year}`;
                                        })()}</div>
                                      </div>
                                      <div>
                                        <div>TIME</div>
                                        <div>AM</div>
                                        <div>PM</div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
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
                                          {Object.entries(row)
                                            .filter(([key]) => {
                                              // Remove these fields from details table
                                              const fieldsToRemove = [
                                                'DR/SI DATE',
                                                'NAME OF DEALER',
                                                'Contact Person',
                                                'Contact No.',
                                                'NO. OF BUNDLES',
                                                'DISPATCHED BY:',
                                                'waybill_no'
                                              ];
                                              return !fieldsToRemove.includes(key);
                                            })
                                            .map(([key, value], idx, arr) => (
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
