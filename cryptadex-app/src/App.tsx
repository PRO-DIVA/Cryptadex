import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import MainDashboard from './pages/MainDashboard';
import RealTimeDetection from './pages/RealTimeDetection';
import SystemHealth from './pages/SystemHealth';
import UserBehaviorAnalysis from './pages/UserBehaviorAnalysis';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<MainDashboard />} />
          <Route path="/detection" element={<RealTimeDetection />} />
          <Route path="/health" element={<SystemHealth />} />
          <Route path="/users" element={<UserBehaviorAnalysis />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
