import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { Layout } from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MoodleData from './pages/MoodleData'
import Automations from './pages/Automations'
import Users from './pages/Users'
import Settings from './pages/Settings'
import { ROLE_PERMISSIONS } from './types'

function ProtectedRoute({ children, resource }: { children: React.ReactNode; resource: string }) {
  const { appUser } = useAuth()
  if (!appUser) return <Navigate to="/login" replace />
  if (!ROLE_PERMISSIONS[appUser.role].includes(resource)) return <Navigate to="/dashboard" replace />
  return <Layout>{children}</Layout>
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { appUser } = useAuth()
  if (appUser) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute resource="dashboard"><Dashboard /></ProtectedRoute>} />
      <Route path="/moodle" element={<ProtectedRoute resource="moodle"><MoodleData /></ProtectedRoute>} />
      <Route path="/automations" element={<ProtectedRoute resource="automations"><Automations /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute resource="users"><Users /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute resource="settings"><Settings /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
