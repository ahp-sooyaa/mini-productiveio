import { Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import Notifications from './Notifications';

function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate('/login');
    }
  };

  return (
    <header className="bg-white shadow-md py-4">
      <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">
          <Link to="/tasks" className="text-blue-600 hover:text-blue-800">Task Manager</Link>
        </h1>
        <div className="flex items-center space-x-4">
          <Notifications />
          <nav className="flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/profile" className="text-gray-700 hover:text-blue-600">Profile</Link>
                <button 
                  onClick={handleSignOut} 
                  className="text-gray-700 hover:text-blue-600 bg-transparent border-none cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-blue-600">Login</Link>
                <Link to="/signup" className="text-gray-700 hover:text-blue-600">Sign Up</Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;
