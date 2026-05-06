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
// Vite inlines env at build time — on Render, set VITE_CONVEX_URL on the *build* environment or the bundle gets undefined.
const convexUrl = import.meta.env.VITE_CONVEX_URL
if (!convexUrl) {
  throw new Error(
    'Missing VITE_CONVEX_URL. Set it in .env locally and in Render → Environment (build-time vars), then rebuild.'
  )
}
const convex = new ConvexReactClient(convexUrl)

createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <ConvexProvider client={convex}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConvexProvider>
  // </StrictMode>,
)
