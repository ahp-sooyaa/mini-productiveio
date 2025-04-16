import { Outlet } from 'react-router'
import Header from '../components/Header'
import { useAuth } from '../contexts/AuthContext'

function AppLayout() {
  const { user } = useAuth()
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 w-full">
      {/* Header is shown on all pages */}
      <Header />
      
      {/* Main content area */}
      <main className="flex-grow w-full">
        <Outlet />
      </main>
      
      {/* Footer */}
      <footer className="bg-white shadow-inner py-6 w-full">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Task Manager. All rights reserved.
          </div>
          
          {user && (
            <div className="text-sm text-gray-500">
              Logged in as: <span className="font-medium">{user.email}</span>
            </div>
          )}
        </div>
      </footer>
    </div>
  )
}

export default AppLayout
