import { CalendarDays, CalendarRange, CalendarCheck2 } from "lucide-react";
import { format, isToday, isThisWeek, isThisMonth, parseISO } from "date-fns";

export default function TicketsAddedStats({ tickets }) {
    const safeParse = (date) => {
        try {
            return parseISO(date);
        } catch {
            return null;
        }
    };

    // console.log(isToday(safeParse(tickets[0].created_at)))
    // console.log(safeParse(tickets[0].created_at))
    // console.log(tickets[0].created_at)
    const addedToday = tickets.filter((t) => t.created_at && isToday(safeParse(t.created_at))).length;

    const addedThisWeek = tickets.filter((t) => t.created_at && isThisWeek(parseISO(t.created_at))).length;
    const addedThisMonth = tickets.filter((t) => t.created_at && isThisMonth(parseISO(t.created_at))).length;


    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {/* Today */}
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="flex items-center mb-2">
                    <CalendarDays className="w-5 h-5 text-blue-500 mr-2" />
                    <span className="text-sm font-medium text-gray-500">Tickets Added Today</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{addedToday}</p>
                <p className="text-xs text-gray-400 mt-1">{format(new Date(), "MMMM d, yyyy")}</p>
            </div>

            {/* This Week */}
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="flex items-center mb-2">
                    <CalendarRange className="w-5 h-5 text-green-500 mr-2" />
                    <span className="text-sm font-medium text-gray-500">Tickets This Week</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{addedThisWeek}</p>
                <p className="text-xs text-gray-400 mt-1">Week of {format(new Date(), "MMMM d")}</p>
            </div>

            {/* This Month */}
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="flex items-center mb-2">
                    <CalendarCheck2 className="w-5 h-5 text-purple-500 mr-2" />
                    <span className="text-sm font-medium text-gray-500">Tickets This Month</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{addedThisMonth}</p>
                <p className="text-xs text-gray-400 mt-1">{format(new Date(), "MMMM yyyy")}</p>
            </div>
        </div>
    );
}
