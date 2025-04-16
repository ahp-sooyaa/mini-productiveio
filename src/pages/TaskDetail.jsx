import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import supabase from '../utils/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { sendTaskUpdateNotification, sendCommentNotification } from '../utils/notificationService'

// Comment Form Component
function CommentForm({ taskId, taskTitle, taskAssignee, queryClient, taskOwnerId }) {
    const [content, setContent] = useState('')
    
    // Get current user from auth context
    const { user } = useAuth()
    const currentUserId = user.id
    
    const addCommentMutation = useMutation({
        mutationFn: async (newComment) => {
            const { data, error } = await supabase
                .from('Comments')
                .insert([newComment])
            
            if (error) throw error
            return data
        },
        onSuccess: () => {
            // Invalidate and refetch comments query
            queryClient.invalidateQueries({ queryKey: ['comments', taskId] })
            setContent('') // Clear the form
            
            const users = [taskOwnerId];

            if (taskAssignee) {
                users.push(taskAssignee)
            }

            users.forEach(user => {
                if (user !== currentUserId) {
                    if(currentUserId === taskOwnerId) {
                        sendCommentNotification(taskId, taskTitle, user, currentUserId)
                            .catch(err => console.error('Error sending comment notification:', err))
                    }
                }
            })
        },
        onError: (error) => {
            console.error('Error adding comment:', error)
        }
    })
    
    const handleSubmit = (e) => {
        e.preventDefault()
        if (!content.trim()) return
        
        const newComment = {
            task_id: taskId,
            user_id: currentUserId,
            content: content.trim(),
        }
        
        addCommentMutation.mutate(newComment)
    }
    
    return (
        <form className="comment-form" onSubmit={handleSubmit}>
            <textarea
                placeholder="Add a comment..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button 
                type="submit" 
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors mr-3 cursor-pointer"
                disabled={addCommentMutation.isPending || !content.trim()}
            >
                {addCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
            </button>
        </form>
    )
}

export default function Task() {
    const { id } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { user } = useAuth()
    const statusOptions = ['To Do', 'In Progress', 'Completed']

    const {isLoading: usersLoading, error: usersError, data: users} = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
            
            if (error) throw error
            return data
        }
    })
    
    // State for the form
    const [taskForm, setTaskForm] = useState({
        title: '',
        status: 'To Do',
        project: '',
        user_id: user.id,
        assignee_id: null
    })

    // Query to fetch the specific task
    const { isLoading, error, data: task } = useQuery({
        queryKey: ['task', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('Tasks')
                .select('*')
                .eq('id', id)
                .maybeSingle()
            
            if (error) throw error
            return data
        },
        enabled: !!id // Only run query when id is available
    })

    // Query to fetch comments for the task with user data
    const { isLoading: commentsLoading, error: commentError, data: comments} = useQuery({
        queryKey: ['comments', id],
        queryFn: async () => {
            // Using Supabase's join capability to get comments with user data
            const { data, error} = await supabase
                .from('Comments')
                .select(`
                    id,
                    content,
                    created_at,
                    user_id,
                    profiles:user_id (id, name, avatar_url)
                `)
                .eq('task_id', id)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data
        },
        enabled: !!id // Only run query when id is available
    })

    // Update form state when task data is loaded
    useEffect(() => {
        if (task) {
            setTaskForm({
                title: task.title || '',
                status: task.status || 'To Do',
                project: task.project || '',
                user_id: task.user_id || user.id,
                assignee_id: task.assignee_id || null
            })
        }
    }, [task])

    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target

        setTaskForm(prev => ({
            ...prev,
            [name]: value
        }))
    }

    // Mutation to update the task
    const updateTaskMutation = useMutation({
        onMutate: () => {
            // Cancel any pending queries
            queryClient.cancelQueries({ queryKey: ['task', id]})
            queryClient.setQueryData(['task', id], taskForm)
        },
        mutationFn: async (updatedTask) => {
            const { data, error } = await supabase
                .from('Tasks')
                .update(updatedTask)
                .eq('id', id)
                .select()
            
            if (error) throw error
            return data
        },
        onSuccess: () => {
            // Invalidate and refetch relevant queries
            queryClient.invalidateQueries({ queryKey: ['task', id] })
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            
            // Send notification if task was assigned to someone
            // For a real app, you would get the current user ID from authentication
            const currentUserId = user.id // Replace with actual user ID from auth
            
            // Check if assignee was changed and is not the current user
            if (taskForm.assignee_id && taskForm.assignee_id !== currentUserId) {
                sendTaskUpdateNotification(
                    id, 
                    taskForm.title, 
                    taskForm.assignee, 
                    currentUserId
                ).catch(err => console.error('Error sending task update notification:', err))
            }
            
            // Navigate back to the task list
            // navigate('/')
        },
        onError: (error) => {
            console.error('Error updating task:', error)
        }
    })

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault()
        updateTaskMutation.mutate(taskForm)
    }

    // Handle task deletion
    const deleteTaskMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('Tasks')
                .delete()
                .eq('id', id)
            
            if (error) throw error
            return true
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            navigate('/')
        },
        onError: (error) => {
            console.error('Error deleting task:', error)
        }
    })

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            deleteTaskMutation.mutate()
        }
    }

    if (isLoading) return <div className="loading">Loading task...</div>
    if (error) return <div className="error">Error: {error.message}</div>

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="pl-6 py-3">
                <button onClick={() => navigate('/tasks')} className="btn-back">Back to Tasks</button>
            </div>
            
            <section className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-bold mb-6">Edit Task</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="title" className="block font-medium text-gray-700">Task Title</label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={taskForm.title}
                            onChange={handleChange}
                            placeholder="Enter task title"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label htmlFor="status" className="block font-medium text-gray-700">Status</label>
                        <select
                            id="status"
                            name="status"
                            value={taskForm.status}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {statusOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="space-y-2">
                        <label htmlFor="project" className="block font-medium text-gray-700">Project</label>
                        <input
                            type="text"
                            id="project"
                            name="project"
                            value={taskForm.project}
                            onChange={handleChange}
                            placeholder="Enter project name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label htmlFor="assignee_id" className="block font-medium text-gray-700">Assignee</label>
                        <select
                            id="assignee_id"
                            name="assignee_id"
                            value={taskForm.assignee_id || ""}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select an assignee</option>
                            {
                                usersLoading ? (
                                    <option value="" disabled>Loading users...</option>
                                ) : usersError ? (
                                    <option value="" disabled>Error loading users</option>
                                ) : users && users.length > 0 ? (
                                    users.map(user => (
                                        <option key={user.id} value={user.id}>{user.name}</option>
                                    ))
                                ) : (
                                    <option value="" disabled>No users available</option>
                                )
                            }
                        </select>
                    </div>
                    
                    <div>
                        <button disabled={updateTaskMutation.isPending} type='submit' className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors mr-3 cursor-pointer">{updateTaskMutation.isPending ? 'Updating...' : 'Update Task'}</button>
                        <button disabled={deleteTaskMutation.isPending} onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors cursor-pointer">{deleteTaskMutation.isPending ? 'Deleting...' : 'Delete Task'}</button>
                    </div>
                </form>
            </section>

            <section className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2>Task comments</h2>
                {commentError && <div className="error">{commentError.message}</div>}
                
                {/* Comment Form */}
                <CommentForm 
                    taskId={id} 
                    taskTitle={taskForm.title}
                    taskAssignee={taskForm.assignee_id || null}
                    queryClient={queryClient} 
                    taskOwnerId={taskForm.user_id}
                />
                
                {commentsLoading ? (
                    <div className="loading">Loading comments...</div>
                ) : (
                    <div className="comments-list">
                        {comments && comments.length > 0 ? (
                            comments.map((comment) => (
                                <div key={comment.id} className="comment-item">
                                    <div className="comment-header">
                                        {comment.profiles?.avatar_url && (
                                            <img 
                                                src={comment.profiles.avatar_url} 
                                                alt="User avatar" 
                                                className="comment-avatar" 
                                            />
                                        )}
                                        <div className="comment-meta">
                                            <strong>{comment.profiles?.name || 'Anonymous'}</strong>
                                            <span className="comment-date">
                                                {new Date(comment.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="comment-content">{comment.content}</p>
                                </div>
                            ))
                        ) : (
                            <p>No comments yet.</p>
                        )}
                    </div>
                )}
            </section>
        </div>
    )
}