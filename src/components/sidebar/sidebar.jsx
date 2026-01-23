import { NavLink } from 'react-router-dom';
import logo from "../../assets/Ercy Group Logo.jpg";

const TopNav = () => {
  return (
    <nav className="w-full bg-white border-b shadow-sm flex items-center px-8 py-2 justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <img className="h-12 w-auto" src={logo} alt="Logo" />
        <span className="font-bold text-lg text-gray-800">Ervy Brokerage</span>
      </div>
      <div className="flex gap-2">
        <NavLink
          to="/gardenia"
          className={({ isActive }) =>
            `py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-100 transition ${isActive ? 'bg-gray-200 font-semibold' : 'text-gray-700'}`
          }
        >
          Gardenia
        </NavLink>
        <NavLink
          to="/spare-parts"
          className={({ isActive }) =>
            `py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-100 transition ${isActive ? 'bg-gray-200 font-semibold' : 'text-gray-700'}`
          }
        >
          Spare Parts
        </NavLink>
        <NavLink
          to="/billing"
          className={({ isActive }) =>
            `py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-100 transition ${isActive ? 'bg-gray-200 font-semibold' : 'text-gray-700'}`
          }
        >
          Billing
        </NavLink>
        <NavLink
          to="/cykris"
          className={({ isActive }) =>
            `py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-100 transition ${isActive ? 'bg-gray-200 font-semibold' : 'text-gray-700'}`
          }
        >
          Cykris
        </NavLink>
      </div>
    </nav>
  );
};

export default TopNav;
