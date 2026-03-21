import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import DashboardLayout from './components/DashboardLayout.tsx'
import MainDashboard from './pages/MainDashboard.tsx'
import RealTimeDetection from './pages/RealTimeDetection.tsx'
import SystemHealth from './pages/SystemHealth.tsx'
import UserBehaviorAnalysis from './pages/UserBehaviorAnalysis.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<MainDashboard />} />
          <Route path="detection" element={<RealTimeDetection />} />
          <Route path="health" element={<SystemHealth />} />
          <Route path="users" element={<UserBehaviorAnalysis />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
