import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import supabase from '../../utils/supabaseClient';

function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');

  // Load user profile data
  useState(() => {
    const fetchProfile = async () => {
      try {
        if (!user) return;
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        if (data) {
          setName(data.name || '');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    
    fetchProfile();
  }, [user]);

  const updateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      // Update profile in the profiles table
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) throw error;
      setMessage('Profile updated successfully!');
    } catch (error) {
      setError(error.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="flex justify-center items-center min-h-screen p-5 text-gray-700">Please log in to view your profile.</div>;
  }

  return (
    <div className="flex justify-center items-center min-h-screen p-5 bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6">Your Profile</h2>
        {error && <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-md">{error}</div>}
        {message && <div className="p-3 mb-4 text-sm text-green-700 bg-green-100 rounded-md">{message}</div>}
        
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <p className="mb-2"><span className="font-semibold">Email:</span> {user.email}</p>
          <p className="mb-2"><span className="font-semibold">User ID:</span> <span className="text-sm text-gray-500">{user.id}</span></p>
        </div>
        
        <form onSubmit={updateProfile} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="block font-medium text-gray-700">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50" 
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
        
        <button 
          onClick={async () => {
            const { error } = await signOut();
            if (!error) {
              navigate('/login');
            }
          }} 
          className="w-full mt-6 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default Profile;
