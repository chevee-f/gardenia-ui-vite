import { useEffect, useState } from "react";
import GardeniaAdd from "./add/gardenia-add";
import ViewTicketModal from "./view-edit/gardenia-view-edit";
import DeleteConfirmationModal from "../../components/confirmation/confirmation";
import AppToast from "../../components/modal/toast";
import TicketStats from "../../components/stats/stats";
import TicketsAddedStats from "../../components/stats/added";
import TicketsTodayCard from "../../components/stats/total";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FilePreviewModal from "../../components/modal/file-preview";
import { API_URL } from '../../../shared/constants';

function Gardenia() {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const openModal = () => {
    // setIsModalOpen(true); // old add modal
    navigate("/gardenia/new");
  }
  const closeModal = () => setIsModalOpen(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [tickets, setTickets] = useState([]);
  
  // const [tickets, setTickets] = useState([
  //   {
  //     id: 1,
  //     dsc_no: "TCKT-001",
  //     dsc_date: "2025-04-10",
  //     dsc_vsm: "VSM 1",
  //     dsc_area: "Area A",
  //     dsc_file: null,
  //     created_at: "2025-04-12T08:30:00Z",
  //     status: "pending"
  //   },
  //   {
  //     id: 2,
  //     dsc_no: "TCKT-002",
  //     dsc_date: "2025-04-10",
  //     dsc_vsm: "VSM 2",
  //     dsc_area: "Area B",
  //     dsc_file: null,created_at: "2025-04-10T13:15:00Z", // This week
  // status: "solved"
  //   },
  // ]);
  
  const [vsmList, setVsmList] = useState([]);
  const [areaList, setAreaList] = useState([]); 
  useEffect(() => {
    getVSM();
  }, []);
  // const API_URL = "http://127.0.0.1:5000";
  const getDscList = async () => {
    try {
      const req = await fetch(`${API_URL}/get-dsc`);
      const res = await req.json();
      // console.log(res)
      setTickets(res)
  } catch (error) {
      console.error(error)
  }     
  }
  
  const getVSM = async () => {
    try {
        const req = await fetch(`${API_URL}/get-vsm`);
        const res = await req.json();
        setVsmList(res.data);
        getAREA();
    } catch (e) {
        console.error(e)
    }
};

const getAREA = async () => {
    try {
        const req = await fetch(`${API_URL}/get-area`);
        const res = await req.json();
        setAreaList(res.data);
        getDscList();
    } catch (e) {
        console.error(e)
    }
};

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleUpdate = (updatedTicket) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
    );
    setShowViewModal(false);
  };

  const handleDelete = async () => {
    // const confirmed = window.confirm("Are you sure you want to delete this DSC?");
    // if (!confirmed) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/delete-dsc?id=${selectedTicket.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      setIsLoading(false);
      setSidebarOpen(false);
      if (response.ok) {
        console.log("Success:", result.message);
        alert("DSC deleted!");
        // Refresh list or navigate
        setShowDeleteModal(false);
        setTickets((prev) => prev.filter((t) => t.id !== selectedTicket.id));
      } else {
        console.error("Error:", result.error || result.message);
        alert(result.error || result.message);
      }
    } catch (error) {
      console.error("Request failed:", error);
      alert("An error occurred while deleting the DSC.");
    }
  };
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  const handleAddTicket = async (newTicket) => {
    try {
      const req = await fetch(`${API_URL}/save-dsc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTicket),
      });
    
      const res = await req.json();
    
      setIsModalOpen(false);
      if (req.ok) {
        console.log('✅ Success:', res);
        console.log((prev) => [...prev, newTicket]);
        setTickets((prev) => [...prev, newTicket]);
        console.log((prev) => [...prev, newTicket]);

        setToastMessage("Ticket created successfully!");
        setToastType("success");
        // You can trigger a toast or other UI feedback here too
      } else {
        console.error('❌ Failed:', res);

        setToastMessage("Failed: " + res);
        setToastType("error");
      }
    } catch (error) {
      console.error('🚨 Error occurred:', error);

      setToastMessage("Error: " + error);
      setToastType("error");
    }
  };
  
  const updateDSC = async (id, updatedFields) => {
    try {
      const response = await fetch(`${API_URL}/update-dsc?id=${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedFields),
      });
  
      const result = await response.json();
  
      if (response.ok) {
        console.log('✅ Updated successfully:', result);
      } else {
        console.error('❌ Update failed:', result);
      }
    } catch (err) {
      console.error('🚨 Error sending request:', err);
    }
  };
  
  const handleError = () => {
    setToastMessage("An error occurred. Please try again.");
    setToastType("error"); // error type
  };
  
  const [sidebarTicket, setSidebarTicket] = useState(null);
  const [fileModal, setFileModal] = useState({ isOpen: false, fileName: '', fileUrl: '' });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleRowClick = (ticket) => {
    console.log(ticket)
    setSidebarTicket(ticket);
    setSidebarOpen(true);
    setActiveRowId(ticket.id);
  };

  const closeSidebar = () => {
    // setSidebarTicket(null);
    setSidebarOpen(false);
    setTimeout(() => {
      setSidebarTicket(null);
      setActiveRowId(null); // 👈 Clear highlight
    }, 300);
  };

  const [showFileModal, setShowFileModal] = useState(false);
  const [filePreviewData, setFilePreviewData] = useState(null);
  const [filePreviewName, setFilePreviewName] = useState('');

  const openFileModal = async (type, fileName) => {
    try {
      const res = await fetch(`${API_URL}/get-file`, {
        method: 'POST',
        body: JSON.stringify({ fileName }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      const fileData = await res.blob(); // Get the file as a Blob (binary data)
  
      // Convert the Blob to a Uint8Array (ArrayBuffer)
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const file = new File([fileData], "loaded.pdf", { type: "application/pdf" });
  
      // Set the PDF data state for react-pdf
      // setFilePreviewData(uint8Array);
      setFilePreviewData(file);
      setFilePreviewName(fileName);
      setShowFileModal(true);
    } catch (error) {
      console.error('Error fetching file data:', error);
    }
    // setFileModal({ isOpen: true, fileName, fileUrl });
  };

  const closeFileModal = () => {
    setShowFileModal(false)
    // setFileModal({ isOpen: false, fileName: '', fileUrl: '' });
  };

  const [activeRowId, setActiveRowId] = useState(null);

  return (
    <div className="relative min-h-screen bg-gray-50 overflow-hidden">
      <div
        className={`p-6 transition-all duration-300 ease-in-out ${sidebarOpen ? "mr-80" : "mr-0"
          }`}
      >

        {/* Breadcrumb */}
        <div className="mb-4">
          <nav className="text-sm text-gray-500">
            <ol className="list-reset flex">
              <li>
                <a href="#" className="text-blue-600 hover:underline">Home</a>
              </li>
              <li><span className="mx-2">/</span></li>
              <li className="text-gray-700 font-medium">Gardenia</li>
            </ol>
          </nav>
          <h1 className="text-2xl font-semibold text-gray-800 mt-2">Daily Stock Control (DSC)</h1>
        </div>
        {/* <TicketsTodayCard count={tickets.length} percentage={17.8} /> */}
        {/* <br /> */}
        {/* <TicketsAddedStats tickets={tickets} /> */}
        <TicketStats
          total={tickets.length}
          pending={tickets.filter((t) => t.status.toLowerCase() === "pending").length}
          completed={tickets.filter((t) => t.status.toLowerCase() === "completed").length}
          failed={tickets.filter((t) => t.status.toLowerCase() === "failed").length}
          returned={tickets.filter((t) => t.status.toLowerCase() === "returned").length}
        />
        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between mb-4">
          <div className="relative w-full md:w-1/3 mb-2 md:mb-0">
            <input
              type="text"
              placeholder="Search DSC"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              🔍
            </div>
          </div>
          <button
            onClick={openModal}
            className="cursor-pointer flex items-center gap-2 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow transition"
          >
            <Plus className="w-4 h-4" />
            Add DSC
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 bg-white rounded-lg shadow">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
              <tr>
                <th scope="col" className="px-6 py-3">DSC No</th>
                <th scope="col" className="px-6 py-3">Date</th>
                <th scope="col" className="px-6 py-3">VSM</th>
                <th scope="col" className="px-6 py-3">Area</th>
                <th scope="col" className="px-6 py-3">Status</th>
                {/* <th scope="col" className="px-6 py-3 w-[15%]">Actions</th> */}
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                    Loading DSC list...
                  </td>
                </tr>
              ) : (tickets
                .filter((ticket) => {
                  const query = searchQuery.toLowerCase();
                  return (
                    ticket.dsc_no.toLowerCase().includes(query) ||
                    ticket.dsc_date.toLowerCase().includes(query) ||
                    ticket.dsc_vsm?.toLowerCase().includes(query) ||
                    ticket.dsc_area?.toLowerCase().includes(query) ||
                    ticket.status.toLowerCase().includes(query)
                  );
                })
                .map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={`border-t cursor-pointer hover:bg-gray-100 transition-colors ${activeRowId === ticket.id ? "bg-blue-50 border-l-4 border-blue-500" : ""
                      }`}
                    onClick={() => handleRowClick(ticket)}
                  >
                    <td className="px-4 py-2">{ticket.dsc_no}</td>
                    <td className="px-4 py-2">{ticket.dsc_date}</td>
                    <td className="px-4 py-2">{vsmList.find(vsm => vsm.id === ticket.dsc_vsm)?.name || ''}</td>
                    <td className="px-4 py-2">{areaList.find(area => area.id === ticket.dsc_area)?.name || ''}</td>
                    <td className="px-4 py-2">
                    <span
                        className={`px-2 py-1 text-sm font-medium rounded-full
                          ${
                            ticket.status === "Complete"
                              ? "bg-green-100 text-green-800"
                              : ticket.status === "Incomplete"
                              ? "bg-yellow-100 text-yellow-800"
                              : ticket.status === "Failed"
                              ? "bg-red-100 text-red-800"
                              : ticket.status === "Returned"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                      >
                        {ticket.status}
                      </span>
                    </td>
                    {/* <td className="px-4 py-2 space-x-2">
                      <button
                        className="px-3 py-1 text-white bg-blue-600 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTicket(ticket);
                          setShowViewModal(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="px-3 py-1 text-white bg-red-600 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTicket(ticket);
                          setShowDeleteModal(true);
                        }}
                      >
                        Delete
                      </button>
                    </td> */}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        

      {/* Right Sidebar */}
      <div
        className={`fixed mt-[60px] top-0 right-0 w-80 h-full bg-white shadow-lg z-50 transition-transform duration-300 ease-in-out transform ${sidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {sidebarTicket && (
          <div className="w-80 h-screen bg-white shadow-lg overflow-y-auto transition-all duration-300 border-l border-gray-200">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">Files</h2>
              <button onClick={closeSidebar}>❌</button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex justify-between">
                <button 
                  className="cursor-pointer px-3 py-1 text-white bg-blue-600 rounded"
                  
                  onClick={() => {
                    setSelectedTicket(sidebarTicket);
                    navigate("/gardenia/new", { sidebarTicket });
                  }}>Edit</button>
                <button 
                  className="cursor-pointer px-3 py-1 text-white bg-red-600 rounded"
                  onClick={() => {
                    setSelectedTicket(sidebarTicket);
                    setShowDeleteModal(true);
                  }}
                  >Delete</button>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">DSC No</h3>
                <div>{sidebarTicket.dsc_no}</div>
                <div>{sidebarTicket.dsc_date}</div>
                <div>{vsmList.find(vsm => vsm.id === sidebarTicket.dsc_vsm)?.name || ''}</div>
                <div>{areaList.find(area => area.id === sidebarTicket.dsc_area)?.name || ''}</div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Main DSC File</h3>
                {sidebarTicket.file_name ? (
                  <button
                    onClick={() => openFileModal('Main DSC File', sidebarTicket.file_name)}
                    className="text-blue-600 underline"
                  >
                    {sidebarTicket.file_name || "View File"}
                  </button>
                ) : (
                  <p className="text-gray-500 text-sm">No file uploaded</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Sub Files</h3>
                <ul className="space-y-1">
                  {(sidebarTicket.sub_dsc_files || []).map((subFile, idx) => (
                    <li key={idx}>
                      <button
                        onClick={() => openFileModal(`Sub File ${idx + 1}`, subFile)}
                        className="text-blue-600 underline"
                      >
                        {subFile.name || `Sub File ${idx + 1}`}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

        {/* <GardeniaAdd
          isOpen={isModalOpen}
          onClose={closeModal}
          onSave={handleAddTicket} /> */}

        {/* View & Edit Modal */}
        <ViewTicketModal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          ticket={selectedTicket}
          onUpdate={handleUpdate}
        />

        {/* Delete Confirmation */}
        <DeleteConfirmationModal
          selectedTicket={selectedTicket}
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          isLoading={isLoading}
        />


        {fileModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999]">
            <div className="bg-white p-6 rounded-lg w-[90%] max-w-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{fileModal.fileName}</h3>
                <button onClick={closeFileModal}>❌</button>
              </div>
              <img
                src={URL.createObjectURL(fileModal.fileUrl)}
                alt={fileModal.fileName}
                className="max-h-[400px] object-contain w-full"
              />
            </div>
          </div>
        )}

        {showFileModal && (
            <FilePreviewModal
              fileName={filePreviewName} 
              fileData={filePreviewData} 
              onClose={closeFileModal}
            />
          )}
      </div>

      {toastMessage && (
        <AppToast
          message={toastMessage}
          onClose={() => setToastMessage("")}
          type={toastType}
        />
      )}
    </div>
  );
}

export default Gardenia;