import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from "lucide-react";
import { API_URL } from '../../../shared/constants';

const AddTicketPage = () => {
    // console.log(existingTicket);
    const location = useLocation();
    const existingTicket = location.state?.sidebarTicket;
    // console.log(existingTicket)

    const [formData, setFormData] = useState({
        dsc_no: existingTicket?.dsc_no || "",
        dsc_date: existingTicket?.dsc_date || "",
        dsc_vsm: existingTicket?.dsc_vsm || "",
        dsc_area: existingTicket?.dsc_area || "",
      });

    const navigate = useNavigate();
    const [vsmList, setVsmList] = useState([]);
    const [areaList, setAreaList] = useState([]);
    const [progress, setProgress] = useState(0);
    const [showProgressBar, setShowProgressBar] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [mainFileName, setMainFileName] = useState('Choose a file');

    useEffect(() => {
        getVSM();
        getAREA();
    }, []);

    const getVSM = async () => {
        try {
            const req = await fetch(`${API_URL}/get-vsm`);
            const res = await req.json();
            setVsmList(res.data);
        } catch (e) {
            console.error(e)
        }
    };

    const getAREA = async () => {
        try {
            const req = await fetch(`${API_URL}/get-area`);
            const res = await req.json();
            setAreaList(res.data);
        } catch (e) {
            console.error(e)
        }
    };

    // const handleSave = () => {
    //     // your save logic
    //     console.log("Saving...");
    // };

    const handleSave = async () => {
        const formData = new FormData();
        formData.append("dsc_no", form.dsc_no);
        formData.append("vsm", form.vsm);
        formData.append("area", form.area);
        formData.append("dsc_date", form.dsc_date);
      
        // Only append new main file if it's a File object
        if (form.dsc_file instanceof File) {
          formData.append("dsc_file", form.dsc_file);
        }
      
        // Only send new sub_dsc_files (File objects)
        form.sub_dsc_files.forEach((file) => {
          if (file instanceof File) {
            formData.append("sub_dsc_files", file);
          }
        });
      
        setIsSaving(true);
        try {
          const endpoint = existingTicket
            ? `${API_URL}/update-dsc?id=${existingTicket.id}`
            : `${API_URL}/save-dsc`;
      
          const res = await fetch(endpoint, {
            method: "POST",
            body: formData,
          });
      
          const result = await res.json();
          setIsSaving(false);
      
          if (res.ok) {
            alert("Ticket saved!");
            navigate("/gardenia");
          } else {
            alert(result.error || result.message);
          }
        } catch (error) {
          setIsSaving(false);
          alert("An error occurred.");
          console.error(error);
        }
      };          

    const handleClear = () => {
        // your clear logic
        console.log("Clearing form...");
    };

    const [form, setForm] = useState({
        dsc_no: existingTicket?.dsc_no || "",
        dsc_date: existingTicket?.dsc_date ? new Date(existingTicket?.dsc_date).toISOString().split('T')[0] : "",
        vsm: existingTicket?.dsc_vsm || "",
        area: existingTicket?.dsc_area || "",
        dsc_file: null,
        sub_dsc_files: [],
    });

    const [filePreview, setFilePreview] = useState(null);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleMainFile = (e) => {
        const file = e.target.files[0];
        setMainFileName(file.name);
        setForm({ ...form, dsc_file: file });
        setFilePreview(URL.createObjectURL(file));
    };

    const handleAddSubFile = (e) => {
        const file = e.target.files[0];
        if (file) {
            setForm({
                ...form,
                sub_dsc_files: [...form.sub_dsc_files, file],
            });
            setFilePreview(URL.createObjectURL(file));
        }
    };

    const removeSubFile = (index) => {
        const updatedFiles = [...form.sub_dsc_files];
        updatedFiles.splice(index, 1);
        setForm({ ...form, sub_dsc_files: updatedFiles });
        setFilePreview(null);
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <button
                        className="text-gray-700 hover:text-black"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-semibold">Add New DSC</h1>
                </div>

                <div className="space-x-2">
                    <button
                        onClick={handleClear}
                        className={`px-4 py-2 text-sm rounded ${
                            isSaving
                              ? "bg-gray-200 cursor-not-allowed"
                              : "bg-gray-200 hover:bg-gray-300 cursor-pointer"
                          }`}
                        disabled={isSaving}
                    >
                        Clear
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`px-4 py-2 text-sm text-white rounded ${
                            isSaving
                              ? "bg-blue-300 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                          }`}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            {/* {showProgressBar && (
            <div className="top-0 left-0 w-full h-1 bg-gray-200 z-50">
                <div
                className="h-full bg-blue-500 transition-all duration-300 ease-linear"
                style={{ width: `${progress}%` }}
                />
            </div>
            )} */}
            <div className="flex gap-6">
                {/* Left column */}
                <div className="w-1/3 space-y-6">
                    {/* DSC Info */}
                    <div className="space-y-4 bg-white shadow rounded p-4">
                        <h2 className="text-lg font-semibold">Information</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">DSC No</label>
                            <input
                                type="text"
                                name="dsc_no"
                                value={form.dsc_no}
                                onChange={handleChange}
                                className="mt-1 block w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Date</label>
                            <input
                                type="date"
                                name="dsc_date"
                                value={form.dsc_date}
                                onChange={handleChange}
                                className="mt-1 block w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">VSM</label>
                            <select
                                name="vsm"
                                value={form.vsm}
                                onChange={handleChange}
                                className="mt-1 block w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select VSM</option>
                                {vsmList.map(({id, name}) => {
                                    return <option value={id} key={id}>{name}</option>
                                })}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium">AREA</label>
                            <select
                                name="area"
                                value={form.area}
                                onChange={handleChange}
                                className="mt-1 block w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select AREA</option>
                                {areaList.map(({id, name}) => {
                                    return <option value={id} key={id}>{name}</option>
                                })}
                            </select>
                        </div>
                    </div>

                    {/* File Management */}
                    <div className="space-y-4 bg-white shadow rounded p-4">
                        <h2 className="text-lg font-semibold">DSC Files</h2>

                        {/* Main DSC File */}
                        <div class="w-full">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Main DSC File</label>
                            <label
                                for="main-dsc-file"
                                class="flex items-center justify-center w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-white text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                            >
                                {mainFileName}
                                <input id="main-dsc-file" type="file" class="hidden"
                                onChange={handleMainFile} />
                            </label>
                        </div>

                        {/*
                        <div>
                            <label className="block text-sm font-medium">Main DSC File</label>
                            <input
                                type="file"
                                onChange={handleMainFile}
                                className="w-full mt-1"
                            />
                        </div>
                        */}

                        {/* Sub DSC Files */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Sub DSC Files</label>

                            {form.sub_dsc_files.map((file, index) => (
                                <div
                                key={index}
                                className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded-md mb-2"
                                >
                                <span
                                    onClick={() => setFilePreview(URL.createObjectURL(file))}
                                    className="cursor-pointer hover:underline text-sm text-blue-600 truncate max-w-[85%]"
                                    title={file.name}
                                >
                                    {file.name}
                                </span>
                                <button
                                    onClick={() => removeSubFile(index)}
                                    className="text-red-500 hover:text-red-700 text-sm font-bold"
                                    aria-label="Remove file"
                                >
                                    ✕
                                </button>
                                </div>
                            ))}

                            <label
                                htmlFor="sub-dsc-files"
                                className="mt-2 inline-block cursor-pointer px-4 py-2 text-sm bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition"
                            >
                                Add Sub File
                            </label>
                            <input
                                id="sub-dsc-files"
                                type="file"
                                onChange={handleAddSubFile}
                                className="hidden"
                            />
                        </div>
                    </div>
                </div>

                {/* Right column */}
                <div className="w-full bg-white shadow rounded p-4">
                    <h2 className="text-lg font-semibold mb-2">File Preview</h2>
                    {filePreview && form.dsc_file ? (
                        form.dsc_file.type.startsWith("image/") ? (
                            <img
                                src={filePreview}
                                alt="Preview"
                                className="w-full max-h-[500px] object-contain rounded"
                            />
                        ) : form.dsc_file.type === "application/pdf" ? (
                            <iframe
                                src={filePreview}
                                title="PDF Preview"
                                className="w-full h-[500px] rounded"
                            />
                        ) : (
                            <div className="text-gray-500 text-sm">
                                Cannot preview this file type: <strong>{form.dsc_file.type}</strong>
                            </div>
                        )
                    ) : (
                        <p className="text-gray-400 text-sm">Select a file to preview</p>
                    )}
                </div>

            </div>
        </div>

    );
};

export default AddTicketPage;
