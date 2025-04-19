const DeleteConfirmationModal = ({ selectedTicket, isOpen, onClose, onConfirm, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
        <h2 className="text-lg font-bold mb-4">Confirm Deletion {selectedTicket.dsc_no}</h2>
        <p className="mb-6">Are you sure you want to delete this DSC?</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={isLoading} 
            className={`px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors ${
              isLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            }`}>Cancel</button>
          <button onClick={onConfirm} disabled={isLoading} 
            className={`px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors ${
              isLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            }`}>
              {isLoading ? 'Deleting...' : 'Delete'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
