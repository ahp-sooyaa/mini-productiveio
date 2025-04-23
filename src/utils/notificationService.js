import supabase from './supabaseClient'

/**
 * Create a notification in the database
 * @param {Object} notification - The notification object
 * @param {number} notification.user_id - The ID of the user to notify
 * @param {number} notification.creator_id - The ID of the user who created the notification
 * @param {string} notification.message - The notification message
 * @param {string} notification.type - The notification type (e.g., 'task_assigned', 'comment_added')
 * @param {number} notification.reference_id - The ID of the related entity (e.g., task ID)
 * @returns {Promise} - The result of the database operation
 */
export const createNotification = async (notification) => {
  console.log('notification', notification)
  const { data, error } = await supabase
    .from('Notifications')
    .insert([notification])

  if (error) {
    console.error('Error creating notification:', error)
    throw error
  }
  
  return data
}

/**
 * Send a task assignment notification
 * @param {number} taskId - The ID of the task
 * @param {string} taskTitle - The title of the task
 * @param {number} assigneeId - The ID of the user being assigned
 * @param {number} assignerId - The ID of the user making the assignment
 */
export const sendTaskAssignmentNotification = async (taskId, taskTitle, assigneeId, assignerId) => {
  if (assigneeId === assignerId) return // Don't notify if user assigns to themselves
  
  return createNotification({
    user_id: assigneeId,
    creator_id: assignerId,
    message: `You've been assigned to the task: ${taskTitle}`,
    type: 'task_assigned',
    reference_id: taskId
  })
}

/**
 * Send a task update notification
 * @param {number} taskId - The ID of the task
 * @param {string} taskTitle - The title of the task
 * @param {number} assigneeId - The ID of the user assigned to the task
 * @param {number} updaterId - The ID of the user making the update
 */
export const sendTaskUpdateNotification = async (taskId, taskTitle, assigneeId, updaterId) => {
  if (assigneeId === updaterId) return // Don't notify if user updates their own task
  
  return createNotification({
    user_id: assigneeId,
    creator_id: updaterId,
    message: `Task "${taskTitle}" has been updated`,
    type: 'task_updated',
    reference_id: taskId
  })
}

/**
 * Send a comment notification
 * @param {number} taskId - The ID of the task
 * @param {string} taskTitle - The title of the task
 * @param {number} userId - The ID of the user receiving the notification
 * @param {number} commenterId - The ID of the user making the comment
 */
export const sendCommentNotification = async (taskId, taskTitle, userId, commenterId) => {
  // task creator, task assignee, task subscriber
  return createNotification({
    user_id: userId,
    creator_id: commenterId,
    message: `New comment on your task: ${taskTitle}`,
    type: 'comment_added',
    reference_id: taskId
  })
}

/**
 * Mark a notification as read
 * @param {number} notificationId - The ID of the notification
 */
export const markNotificationAsRead = async (notificationId) => {
  const { error } = await supabase
    .from('Notifications')
    .update({ read: true })
    .eq('id', notificationId)
  
  if (error) {
    console.error('Error marking notification as read:', error)
    throw error
  }
  
  return true
}

/**
 * Mark all notifications as read for a user
 * @param {number} userId - The ID of the user
 */
export const markAllNotificationsAsRead = async (userId) => {
  const { error } = await supabase
    .from('Notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
  
  if (error) {
    console.error('Error marking all notifications as read:', error)
    throw error
  }
  
  return true
}
