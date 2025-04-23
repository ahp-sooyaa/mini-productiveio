import {useNavigate, useParams} from 'react-router'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import supabase from '../utils/supabaseClient'
import {useAuth} from '../contexts/AuthContext'
import {sendTaskUpdateNotification} from '../utils/notificationService'
import {z} from "zod";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form.jsx";
import {Input} from "@/components/ui/input.jsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.jsx";
import {Button} from "@/components/ui/button.jsx";
import {useEffect} from "react";
import CommentForm from "@/components/CommentForm.jsx";

export default function Task() {
    const {user} = useAuth()
    const {id} = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const schema = z.object({
        title: z.string(),
        status: z.string(),
        project: z.string(),
        assignee_id: z.string().uuid().optional(),
    });

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValue: {
            title: z.string(),
            status: z.string(),
            project: z.string(),
            assignee_id: z.string().uuid().optional(),
        }
    })

    // Query to fetch users
    const {isLoading: usersIsLoading, error: usersError, data: users} = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const {data, error} = await supabase
                .from('profiles')
                .select('*')

            if (error) throw error
            return data
        }
    })

    // Query to fetch the specific task
    const {isLoading: taskIsLoading, error: taskError, data: task} = useQuery({
        queryKey: ['task', id],
        queryFn: async () => {
            const {data, error} = await supabase
                .from('Tasks')
                .select('*')
                .eq('id', id)
                .maybeSingle()

            if (error) throw error
            return data
        },
        enabled: !!id // Only run query when id is available
    })

    // Reset form when task is loaded
    useEffect(() => {
        if (task) {
            form.reset({
                title: task.title ?? undefined,
                status: task.status ?? undefined,
                project: task.project ?? undefined,
                assignee_id: task.assignee_id ?? undefined,
            });
        }
    }, [task, form]);

    // Mutation to update the task
    const updateTaskMutation = useMutation({
        onMutate: () => {
            // Cancel any pending queries
            queryClient.cancelQueries({queryKey: ['task', id]})
            queryClient.setQueryData(['task', id], form.getValues())
        },
        mutationFn: async (updatedTask) => {
            const response = await supabase
                .from('Tasks')
                .update(updatedTask)
                .eq('id', id)

            if (response.error) throw response.error
            return response.data
        },
        onSuccess: () => {
            // Invalidate and refetch relevant queries
            queryClient.invalidateQueries({queryKey: ['task', id]})
            queryClient.invalidateQueries({queryKey: ['tasks']})

            // Send notification if task was assigned to someone
            const currentUserId = user.id;

            // Check if assignee was changed and is not the current user
            const currentValues = form.getValues();
            if (currentValues.assignee_id && currentValues.assignee_id !== currentUserId) {
                sendTaskUpdateNotification(
                    id,
                    currentValues.title,
                    currentValues.assignee_id,
                    currentUserId
                ).catch(err => console.error('Error sending task update notification:', err))
            }
        },
        onError: (error) => {
            console.error('Error updating task:', error)
        }
    })

    // Handle task deletion
    const deleteTaskMutation = useMutation({
        mutationFn: async () => {
            const {data, error} = await supabase
                .from('Tasks')
                .delete()
                .eq('id', id)
                .select();
            if (error) throw error;
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['tasks']})
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

    // Handle form submission
    const updateFormHandler = (values) => {
        updateTaskMutation.mutate(values)
    }

    if (taskError) return <div className="error">Error: {taskError.message}</div>

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="pl-6 py-3">
                <button onClick={() => navigate('/tasks')} className="btn-back">Back to Tasks</button>
            </div>

            <section className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-bold mb-6">Edit Task</h2>
                {taskIsLoading || usersIsLoading ? (
                    <div>Loading...</div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(updateFormHandler)} className="space-y-6">
                            <FormField
                                name="title"
                                control={form.control}
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Task Title</FormLabel>
                                        <FormControl key={form.watch('title')}>
                                            <Input type="text" {...field} />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="status"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select key={form.watch('status')} onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status"/>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="To Do">To Do</SelectItem>
                                                <SelectItem value="In Progress">In Progress</SelectItem>
                                                <SelectItem value="Completed">Completed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                name="project"
                                control={form.control}
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Project</FormLabel>
                                        <FormControl key={form.watch('project')}>
                                            <Input type="text" {...field} />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="assignee_id"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Assignee</FormLabel>
                                        <Select
                                            key={form.watch('assignee_id')}
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select assignee"/>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {users?.map((user) => (
                                                    <SelectItem key={user.id} value={user.id}>
                                                        {user.name || 'anonymous'}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <Button type="submit"
                                    disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Updating...' : 'Update Task'}</Button>
                            <Button onClick={handleDelete}
                                    disabled={deleteTaskMutation.isPending}
                                    className="ml-2"
                                    variant="destructive"
                            >
                                {deleteTaskMutation.isPending ? 'Deleting...' : 'Delete Task'}
                            </Button>
                        </form>
                    </Form>
                )}
            </section>

            <section className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2>Task comments</h2>

                {task && <CommentForm
                    task={task}
                />}
            </section>
        </div>
    )
}