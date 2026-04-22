import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import GardenerLayout from './pages/gardener/GardenerLayout'
import LiveData from './pages/gardener/LiveData'
import Alerts from './pages/gardener/Alerts'
import Trends from './pages/gardener/Trends'
import OwnerDashboard from './pages/owner/OwnerDashboard'
import UserManagement from './pages/admin/UserManagement'

function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  if (user.role === 'gardener') return <Navigate to="/gardener/live" replace />
  if (user.role === 'owner')    return <Navigate to="/owner" replace />
  if (user.role === 'admin')    return <Navigate to="/admin" replace />
  return <Navigate to="/" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<RoleRedirect />} />

          {/* Gardener */}
          <Route path="/gardener" element={
            <ProtectedRoute allowedRoles={['gardener']}>
              <GardenerLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="live" replace />} />
            <Route path="live"   element={<LiveData />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="trends" element={<Trends />} />
          </Route>

          {/* Owner */}
          <Route path="/owner" element={
            <ProtectedRoute allowedRoles={['owner']}>
              <OwnerDashboard />
            </ProtectedRoute>
          } />

          {/* Admin */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UserManagement />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
