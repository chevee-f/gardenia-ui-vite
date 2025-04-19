import { Link, NavLink } from 'react-router-dom';
import logo from "../../assets/Ercy Group Logo.jpg"

const Sidebar = () => {
  return (
    <aside className="w-64 h-screen bg-white border-r shadow-sm">
      <div className="p-4 font-bold text-lg">
        <img className="w-[200px] pt-[20px] pb-[20px]" src={logo} />
      </div>
      <nav className="flex flex-col gap-1 px-4">
        <NavLink
          to="/gardenia"
          className={({ isActive }) =>
            `py-2 px-3 rounded-md text-sm hover:bg-gray-100 ${isActive ? 'bg-gray-200 font-semibold' : ''}`
          }
        >
          Gardenia
        </NavLink>
        <NavLink
          to="/spare-parts"
          className={({ isActive }) =>
            `py-2 px-3 rounded-md text-sm hover:bg-gray-100 ${isActive ? 'bg-gray-200 font-semibold' : ''}`
          }
        >
          Spare Parts
        </NavLink>
        <NavLink
          to="/tickets"
          className={({ isActive }) =>
            `py-2 px-3 rounded-md text-sm hover:bg-gray-100 ${isActive ? 'bg-gray-200 font-semibold' : ''}`
          }
        >
          Cykris
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;
