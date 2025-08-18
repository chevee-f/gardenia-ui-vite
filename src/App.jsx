import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TopNav from './components/sidebar/sidebar'
import Gardenia from './pages/gardenia/gardenia';
import AddTicketPage from './pages/gardenia/add/gardenia-new';
import SpareParts from './pages/spare-parts/SpareParts';
import Billing from './pages/spare-parts/Billing';

function App() {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <>
      <div className="bg-gray-50 flex flex-col h-screen">
        <TopNav />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/gardenia" element={<Gardenia />}>
              </Route>
              
              <Route path='/gardenia/new' element={<AddTicketPage />} />
              <Route path='/spare-parts' element={<SpareParts />} />
              <Route path='/spare-parts/billing' element={<Billing />} />
              {/* other routes */}
            </Routes>
          </main>
        </div>
      </div>
    </>
  )
}

export default App
