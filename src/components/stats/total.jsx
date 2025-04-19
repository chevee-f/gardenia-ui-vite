import { ArrowUpRight } from "lucide-react";

const TicketsTodayCard = ({ count = 23, percentage = 12.5 }) => {
  return (
    <div className="p-4 bg-white shadow rounded-2xl w-full max-w-xs">
      <h3 className="text-sm font-medium text-gray-500">Tickets Today</h3>
      <div className="flex items-center mt-2">
        <span className="text-3xl font-semibold text-gray-900">{count}</span>
        <span className="flex items-center ml-2 text-sm font-medium text-green-600">
          <ArrowUpRight className="w-4 h-4 mr-1" />
          {percentage}%
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-400 flex items-center">
        <svg
          className="w-4 h-4 mr-1 text-gray-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="M4 4.5V19a1 1 0 0 0 1 1h15M7 14l4-4 4 4 5-5m0 0h-3.207M20 9v3.207" />
        </svg>
        vs last day
      </p>
    </div>
  );
};

export default TicketsTodayCard;