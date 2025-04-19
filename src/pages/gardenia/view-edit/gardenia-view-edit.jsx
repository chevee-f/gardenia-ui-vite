import { useEffect, useState } from "react";

const ViewTicketModal = ({ isOpen, onClose, ticket, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(ticket || {});

    useEffect(() => {
        setFormData(ticket)
    }, [ticket])

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        onUpdate(formData);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setFormData(ticket);
        setIsEditing(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
            <div className="w-full max-w-lg bg-white rounded-lg p-6 shadow-lg relative">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Ticket Details</h2>
                    <button onClick={onClose} className="text-xl font-bold text-gray-600">×</button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Ticket No</label>
                        <input
                            type="text"
                            name="dsc_no"
                            value={formData?.dsc_no}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full border rounded px-3 py-2 mt-1"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Date</label>
                        <input
                            type="date"
                            name="dsc_date"
                            value={formData?.dsc_date}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full border rounded px-3 py-2 mt-1"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">VSM</label>
                        <select
                            name="dsc_vsm"
                            value={formData?.dsc_vsm}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full border rounded px-3 py-2 mt-1"
                        >
                            <option value="">Select</option>
                            <option value="VSM 1">VSM 1</option>
                            <option value="VSM 2">VSM 2</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Area</label>
                        <select
                            name="dsc_area"
                            value={formData?.dsc_area}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full border rounded px-3 py-2 mt-1"
                        >
                            <option value="">Select</option>
                            <option value="Area A">Area A</option>
                            <option value="Area B">Area B</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">File</label>
                        <input
                            type="file"
                            name="dsc_file"
                            disabled={!isEditing}
                            className="w-full border rounded px-3 py-2 mt-1"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    {isEditing ? (
                        <>
                            <button onClick={handleCancel} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
                        </>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-yellow-500 text-white rounded">Edit</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ViewTicketModal;
