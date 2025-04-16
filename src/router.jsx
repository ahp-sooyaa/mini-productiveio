import { createBrowserRouter, Navigate } from 'react-router'
import Login from './components/auth/Login'
import Signup from './components/auth/Signup'
import ForgotPassword from './components/auth/ForgotPassword'
import ResetPassword from './components/auth/ResetPassword'
import Profile from './components/auth/Profile'
import ProtectedRoute from './components/auth/ProtectedRoute'
import TaskList from './pages/TaskList'
import TaskDetail from './pages/TaskDetail'
import AppLayout from './layouts/App'

// Create router with authentication-aware routes
const router = createBrowserRouter([
    // Public routes (no layout)
    {
      path: '/login',
      element: <Login />,
    },
    {
      path: '/signup',
      element: <Signup />,
    },
    {
      path: '/forgot-password',
      element: <ForgotPassword />,
    },
    {
      path: '/reset-password',
      element: <ResetPassword />,
    },
    
    // Protected routes with AppLayout
    {
      path: '/',
      element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
      children: [
        {
          path: 'tasks',
          element: <TaskList />,
        },
        {
          path: 'tasks/:id',
          element: <TaskDetail />,
        },
        {
          path: 'profile',
          element: <Profile />,
        },
      ],
    },
    
    // Fallback route
    {
      path: '*',
      element: <Navigate to="/" replace />,
    }
  ])

  export default router