import {useAuth} from "@/contexts/AuthContext.jsx";
import supabase from "@/utils/supabaseClient.js";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {sendCommentNotification} from "@/utils/notificationService.js";
import {useState} from "react";

export default function CommentForm({ task }) {
    const [content, setContent] = useState('')

    // Get current user from auth context
    const { user } = useAuth()
    const currentUserId = user.id
    const queryClient = useQueryClient()
    console.log('task', task)

    // Query to fetch comments for the task with user data
    const {isLoading, error, data} = useQuery({
        queryKey: ['comments', task.id],
        queryFn: async () => {
            // Using Supabase's join capability to get comments with user data
            const {data, error} = await supabase
                .from('Comments')
                .select(`
                    id,
                    content,
                    created_at,
                    user_id,
                    profiles:user_id (id, name, avatar_url)
                `)
                .eq('task_id', task.id)
                .order('created_at', {ascending: false})

            if (error) throw error
            return data
        },
        enabled: !!task.id // Only run query when id is available
    })

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
            queryClient.invalidateQueries({ queryKey: ['comments', task.id] })
            setContent('') // Clear the form

            const users = [task.user_id];

            if (task.assignee_id) {
                users.push(task.assignee_id)
            }

            users.forEach(user => {
                if (user !== currentUserId) {
                    if(currentUserId === task.user_id) {
                        sendCommentNotification(task.id, task.title, user, currentUserId)
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
        console.log('task id', task.id)
        const newComment = {
            task_id: task.id,
            user_id: currentUserId,
            content: content.trim(),
        }

        addCommentMutation.mutate(newComment)
    }

    if (error) return <div>Comment form loading error: {error.message}</div>

    return (
        <>
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

            {isLoading ? (
                <div className="loading">Loading comments...</div>
            ) : (
                <div className="comments-list">
                    {data && data.length > 0 ? (
                        data.map((comment) => (
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
        </>
    )
}