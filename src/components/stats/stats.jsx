import { TicketCheck, Hourglass, CheckCircle, Trash2, Trash } from "lucide-react";

export default function TicketStats({ total, pending, completed, failed, returned }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {/* Total Tickets */}
      <div className="flex items-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200">
        <div className="p-3 mr-4 bg-blue-100 rounded-full text-blue-600">
          <TicketCheck className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Total DSC</p>
          <p className="text-xl font-semibold text-gray-900">{total}</p>
        </div>
      </div>

      {/* Pending Tickets */}
      <div className="flex items-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200">
        <div className="p-3 mr-4 bg-yellow-100 rounded-full text-yellow-600">
          <Hourglass className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Pending DSC</p>
          <p className="text-xl font-semibold text-gray-900">{pending}</p>
        </div>
      </div>

      {/* Solved Tickets */}
      <div className="flex items-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200">
        <div className="p-3 mr-4 bg-green-100 rounded-full text-green-600">
          <CheckCircle className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Completed DSC</p>
          <p className="text-xl font-semibold text-gray-900">{completed}</p>
        </div>
      </div>

        {/* Deleted Tickets */}
        <div className="flex items-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200">
        <div className="p-3 mr-4 bg-red-100 rounded-full text-red-600">
            <Trash className="w-6 h-6" />
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">Failed DSC</p>
            <p className="text-xl font-semibold text-gray-900">{failed}</p>
        </div>
        </div>

        {/* Deleted Tickets */}
        <div className="flex items-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200">
        <div className="p-3 mr-4 bg-red-100 rounded-full text-red-600">
            <Trash2 className="w-6 h-6" />
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">Returned DSC</p>
            <p className="text-xl font-semibold text-gray-900">{returned}</p>
        </div>
        </div>
    </div>
  );
}
