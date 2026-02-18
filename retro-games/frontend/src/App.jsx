import { Routes, Route, Navigate } from 'react-router-dom'
import LoginSignupPage from './pages/LoginSignupPage'
import LandingPage from './pages/LandingPage'
import AdminLogin from './pages/AdminLogin'
import UserDashboard from './pages/UserDashboard'
import AdminDashboard from './pages/AdminDashboard'
import UserSettings from './pages/UserSettings'
import AdminSettings from './pages/AdminSettings'
import VerifyPage from './pages/VerifyPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginSignupPage />} />
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="/login/user" element={<LoginSignupPage />} />
      <Route path="/games" element={<LandingPage />} />
      <Route path="/login/admin" element={<AdminLogin />} />
      <Route path="/user/dashboard" element={<UserDashboard />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/user/settings" element={<UserSettings />} />
      <Route path="/admin/settings" element={<AdminSettings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
