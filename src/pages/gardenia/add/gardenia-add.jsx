import { useEffect, useState } from "react";
import { API_URL } from '../../../shared/constants';

const GardeniaAdd = ({ isOpen, onClose, onSave }) => {
    
    // const API_URL = "http://127.0.0.1:5000";
    const [vsmList, setVsmList] = useState([]);
    const [formData, setFormData] = useState({
        dsc_no: "",
        dsc_date: "",
        dsc_vsm: "",
        dsc_area: "",
        dsc_file: null,
    });

    useEffect(()=> {
        getVSM();
    }, []);

    const getVSM = async () => {
        try {
            const req = await fetch(`${API_URL}/get-vsm`);
            const res = await req.json();
            setVsmList(res.data);
        } catch(e) {
            console.error(e)
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const { files } = e.target;
        setFormData((prev) => ({ ...prev, dsc_file: files[0] }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Submit form data to API or handle it here
        // console.log(formData);
        const newTicket = {
            ...formData,
            id: Date.now(),
            dsc_file: mainFile,
            sub_dsc_files: subFiles,
            status: "Pending"
        };
        onSave(newTicket);
        console.log(newTicket);
        onClose();
    };

    const [mainFile, setMainFile] = useState(null);
    const [subFiles, setSubFiles] = useState([]);

    const handleMainFileChange = (e) => {
        setMainFile(e.target.files[0]);
    };

    const addSubFile = () => {
        setSubFiles([...subFiles, null]);
    };

    const handleSubFileChange = (e, index) => {
        const newFiles = [...subFiles];
        newFiles[index] = e.target.files[0];
        setSubFiles(newFiles);
    };

    const removeSubFile = (index) => {
        const newFiles = [...subFiles];
        newFiles.splice(index, 1);
        setSubFiles(newFiles);
    };

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-500/50">
                    <div className="w-full max-w-lg bg-white rounded-lg p-6 shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-gray-800">Create New Ticket</h2>
                            <button
                                onClick={onClose}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Ticket No</label>
                                <input
                                    type="text"
                                    name="dsc_no"
                                    value={formData.dsc_no}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Date</label>
                                <input
                                    type="date"
                                    name="dsc_date"
                                    value={formData.dsc_date}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">VSM</label>
                                <select
                                    name="dsc_vsm"
                                    value={formData.dsc_vsm}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Select VSM</option>
                                    {vsmList.map(({id, name}) => {
                                        return <option value={id}>{name}</option>
                                    })}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Area</label>
                                <select
                                    name="dsc_area"
                                    value={formData.dsc_area}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Select Area</option>
                                    <option value="Area 1">Area 1</option>
                                    <option value="Area 2">Area 2</option>
                                    <option value="Area 3">Area 3</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Upload File (Optional)</label>
                                <input
                                    type="file"
                                    name="dsc_file"
                                    onChange={handleMainFileChange}
                                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block font-medium text-sm mb-2">Sub DSC Files</label>

                                {subFiles.map((file, index) => (
                                    <div key={index} className="flex items-center mb-2">
                                        <input
                                            type="file"
                                            onChange={(e) => handleSubFileChange(e, index)}
                                            className="mr-2"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeSubFile(index)}
                                            className="text-red-600 text-sm hover:underline"
                                        >
                                            ✖
                                        </button>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={addSubFile}
                                    className="mt-2 px-3 py-1 text-sm text-white bg-blue-500 rounded hover:bg-blue-600"
                                >
                                    Add Another File
                                </button>
                            </div>
                            <div className="flex justify-end mt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-300 rounded-md hover:bg-gray-400 mr-2"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                >
                                    Create Ticket
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default GardeniaAdd;
