import {useEffect, useState} from 'react'
import {useQuery} from '@tanstack/react-query'
import supabase from '../utils/supabaseClient'
import {useAuth} from '../contexts/AuthContext'

function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  
  const { user } = useAuth()
  const currentUserId = user.id
  
  // Fetch initial notifications
  const { isLoading, error } = useQuery({
    queryKey: ['notifications', currentUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Notifications')
        .select('*, profiles:creator_id(name)')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      
      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.read).length || 0)
      return data
    }
  })
  
  // Set up realtime subscription
  useEffect(() => {
    // Subscribe to changes in the Notifications table
    const subscription = supabase
      .channel('notifications-channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'Notifications',
        filter: `user_id=eq.${currentUserId}`
      }, (payload) => {
        // Fetch the user info for the new notification
        const fetchUserInfo = async () => {
          if (payload.new && payload.new.creator_id) {
            const { data } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', payload.new.creator_id)
              .single()
            
            const newNotification = {
              ...payload.new,
              profiles: data
            }
            
            // Add to notifications state
            setNotifications(prev => [newNotification, ...prev])
            setUnreadCount(prev => prev + 1)
            
            // Show notification toast
            showToast(newNotification)
          }
        }
        
        fetchUserInfo()
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(subscription)
    }
  }, [currentUserId])
  
  // Show a toast notification
  const showToast = (notification) => {
    // You could use a library like react-toastify here
    // For now, we'll just log to console
    console.log('Toast notification:', notification.message)
  }
  
  // Mark notification as read
  const markAsRead = async (notificationId) => {
    const { error } = await supabase
      .from('Notifications')
      .update({ read: true })
      .eq('id', notificationId)
    
    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => prev - 1)
    }
  }
  
  // Mark all as read
  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    
    if (unreadIds.length === 0) return
    
    const { error } = await supabase
      .from('Notifications')
      .update({ read: true })
      .in('id', unreadIds)
    
    if (!error) {
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      )
      setUnreadCount(0)
    }
  }
  
  // Toggle notifications panel
  const toggleNotifications = () => {
    setShowNotifications(prev => !prev)
  }
  
  // Format notification time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  return (
    <div className="relative">
      <button 
        className="relative p-2 focus:outline-none cursor-pointer" 
        onClick={toggleNotifications}
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-2 inline-flex items-center justify-center py-1 px-1.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>
      
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-700">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer" 
                onClick={markAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Loading notifications...</div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">Error loading notifications</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No notifications yet</div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex flex-col">
                    <p className="text-sm text-gray-800 mb-1">
                      {notification.message}
                    </p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span className="font-medium">
                        {notification.profiles?.name || 'Unknown user'}
                      </span>
                      <span>
                        {formatTime(notification.created_at)}
                      </span>
                    </div>
                  </div>
                  {!notification.read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Notifications;