import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'

// Convex imports
import { ConvexProvider, ConvexReactClient } from 'convex/react'

// Create Convex client with your deployment URL
// (This is shown after running `npx convex dev`)
// Or store in `.env` as VITE_CONVEX_URL
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <ConvexProvider client={convex}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConvexProvider>
  // </StrictMode>,
)
