import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import logo from "../../assets/Ercy Group Logo.jpg";

const TopNav = () => {
  const location = useLocation();
  const [sparePartsOpen, setSparePartsOpen] = useState(false);
  const [cykrisOpen, setCykrisOpen] = useState(false);
  const sparePartsRef = useRef(null);
  const cykrisRef = useRef(null);

  // Check if current route is under Spare Parts
  const isSparePartsActive = location.pathname === '/spare-parts' || location.pathname === '/billing';
  // Check if current route is under Cykris
  const isCykrisActive = location.pathname === '/cykris' || location.pathname === '/cykris-billing';

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sparePartsRef.current && !sparePartsRef.current.contains(event.target)) {
        setSparePartsOpen(false);
      }
      if (cykrisRef.current && !cykrisRef.current.contains(event.target)) {
        setCykrisOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="w-full bg-white border-b shadow-sm flex items-center px-8 py-2 justify-between sticky top-0 z-50 overflow-visible">
      <div className="flex items-center gap-4">
        <img className="h-12 w-auto" src={logo} alt="Logo" />
        {/* <span className="font-bold text-lg text-gray-800">Ervy Brokerage</span> */}
      </div>
      <div className="flex gap-2 items-center overflow-visible">
        <NavLink
          to="/gardenia"
          className={({ isActive }) =>
            `py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-100 transition ${isActive ? 'bg-gray-200 font-semibold' : 'text-gray-700'}`
          }
        >
          Gardenia
        </NavLink>
        
        {/* Spare Parts Dropdown */}
        <div className="relative overflow-visible" ref={sparePartsRef}>
          <button
            onClick={() => {
              setSparePartsOpen(!sparePartsOpen);
              setCykrisOpen(false);
            }}
            className={`py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-100 transition flex items-center gap-1 ${
              isSparePartsActive ? 'bg-gray-200 font-semibold' : 'text-gray-700'
            }`}
          >
            Spare Parts
            <svg
              className={`w-4 h-4 transition-transform ${sparePartsOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {sparePartsOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50" style={{ position: 'absolute' }}>
              <NavLink
                to="/spare-parts"
                onClick={() => setSparePartsOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-2 text-sm hover:bg-gray-100 ${isActive ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-700'}`
                }
              >
                Create DR
              </NavLink>
              <NavLink
                to="/billing"
                onClick={() => setSparePartsOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-2 text-sm hover:bg-gray-100 ${isActive ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-700'}`
                }
              >
                Billing
              </NavLink>
            </div>
          )}
        </div>

        {/* Cykris Dropdown */}
        <div className="relative overflow-visible" ref={cykrisRef}>
          <button
            onClick={() => {
              setCykrisOpen(!cykrisOpen);
              setSparePartsOpen(false);
            }}
            className={`py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-100 transition flex items-center gap-1 ${
              isCykrisActive ? 'bg-gray-200 font-semibold' : 'text-gray-700'
            }`}
          >
            Cykris
            <svg
              className={`w-4 h-4 transition-transform ${cykrisOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {cykrisOpen && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50" style={{ position: 'absolute' }}>
              <NavLink
                to="/cykris"
                onClick={() => setCykrisOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-2 text-sm hover:bg-gray-100 ${isActive ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-700'}`
                }
              >
                Create DR
              </NavLink>
              <NavLink
                to="/cykris-billing"
                onClick={() => setCykrisOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-2 text-sm hover:bg-gray-100 ${isActive ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-700'}`
                }
              >
                Billing
              </NavLink>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default TopNav;
