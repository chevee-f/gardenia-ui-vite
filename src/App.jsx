import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/sidebar/sidebar'
import Gardenia from './pages/gardenia/gardenia';
import AddTicketPage from './pages/gardenia/add/gardenia-new';

function App() {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <header className="h-15 flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm">
            {/* Optional: Brand or left content */}
            {/* <div></div> */}

            {/* Search */}
            <div hidden className="relative w-full max-w-md mx-auto">
              <input
                type="text"
                placeholder="Search..."
                className="w-full px-4 py-2 text-sm border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Dropdown button */}
            <div className="relative">
              <button hidden
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-10 h-10 flex items-center justify-center text-sm font-medium text-white bg-gray-800 rounded-full hover:bg-gray-700 focus:outline-none"
              >
                ☰
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 z-10 mt-2 w-48 bg-white rounded-md shadow-lg border">
                  <ul className="py-1 text-sm text-gray-700">
                    <li>
                      <a href="#" className="block px-4 py-2 hover:bg-gray-100">Profile</a>
                    </li>
                    <li>
                      <a href="#" className="block px-4 py-2 hover:bg-gray-100">Settings</a>
                    </li>
                    <li>
                      <a href="#" className="block px-4 py-2 hover:bg-gray-100">Logout</a>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/gardenia" element={<Gardenia />}>
              </Route>
              
              <Route path='/gardenia/new' element={<AddTicketPage />} />
              {/* other routes */}
            </Routes>
          </main>
        </div>
      </div>

    </>
  )
}

export default App
