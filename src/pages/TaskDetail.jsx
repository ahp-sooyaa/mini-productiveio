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
import {useEffect, useState} from "react";
import CommentForm from "@/components/CommentForm.jsx";

export default function Task() {
    const {user} = useAuth()
    const {id} = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    // Query to fetch statuses
    const {data: statuses, isLoading: isLoadingStatuses} = useQuery({
        queryKey: ['statuses'],
        queryFn: async () => {
            const {data, error} = await supabase
                .from('statuses')
                .select()

            if (error) throw error
            return data
        }
    })

    // Query to fetch projects
    const {data: projects, isLoading: isLoadingProjects} = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            console.log("Starting projects query (with delay)..."); // Optional log

            // --- Start Delay ---
            // Create a promise that resolves after 10000 milliseconds (10 seconds)
            await new Promise(resolve => setTimeout(resolve, 10000)); 
            // --- End Delay ---

            console.log("Fetching projects data from Supabase..."); // Optional log

            // Fetch the actual data after the delay
            const {data, error} = await supabase
                .from('projects')
                .select()

            if (error) {
                console.error("Error fetching projects:", error); // Log errors
                throw error;
            }
            
            console.log("Projects data fetched successfully."); // Optional log
            return data;
        }
    })

    // Query to fetch users
    const {isLoading: isLoadingUsers, data: users} = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const {data, error} = await supabase
                .from('profiles')
                .select()

            if (error) throw error
            return data
        }
    })

    // Query to fetch the specific task
    const {isLoading: isLoadingTask, error: taskError, data: task} = useQuery({
        queryKey: ['task', id],
        queryFn: async () => {
            const {data, error} = await supabase
                .from('tasks')
                .select()
                .eq('id', id)
                .maybeSingle()

            if (error) throw error
            return data
        },
        enabled: !!id // Only run query when id is available
    })

    const schema = z.object({
        name: z.string().trim().min(1, {message: 'Task title is required.'}),
        description: z.string().trim(),
        project_id: z.string({message: 'Project is required.'}),
        status_id: z.string({message: 'Status is required.'}),
        assigned_to: z.string().optional(),
    });

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValue: {
            name: '',
            description: '',
            project_id: '',
            status_id: '',
            assigned_to: '',
        }
    })

    const [isFormLoading, setIsFormLoading] = useState(true);

    useEffect(() => {
        console.log('running useEffect() in TaskDetail.jsx')
        if (isFormLoading && task) {
            const formData = {
                name: task.name || '',
                description: task.description || '',
                project_id: task.project_id || '',
                status_id: task.status_id || '',
                assigned_to: task.assigned_to || '',
            };
            console.log("Attempting form reset with:", formData);
            form.reset(formData);
            setIsFormLoading(false);
        }
    }, [task, statuses, users, form, isFormLoading]); // Ensure ALL data sources + reset are here

    // Mutation to update the task
    const updateTaskMutation = useMutation({
        onMutate: () => {
            // Cancel any pending queries
            queryClient.cancelQueries({queryKey: ['task', id]})
            queryClient.setQueryData(['task', id], form.getValues())
        },
        mutationFn: async (updatedTask) => {
            const response = await supabase
                .from('tasks')
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
                .from('tasks')
                .delete()
                .eq('id', id)
                .select();
            if (error) throw error;
            return data;
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
    const onSubmit = (values) => {
        updateTaskMutation.mutate(values)
    }

    if (taskError) return <div className="error">Error: {taskError.message}</div>
    if (isFormLoading) return <div>Loading task detail...</div>
    console.log("Task object in render:", task)

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="pl-6 py-3">
                <button onClick={() => navigate('/tasks')} className="btn-back">Back to Tasks</button>
            </div>

            <section className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-bold mb-6">Edit Task</h2>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="project_id" // Correct field name?
                            render={({field}) => {
                                // Add log here: Check the value react-hook-form thinks it has
                                console.log(`Rendering project_id Select. Field value:`, field.value);

                                return (
                                    <FormItem>
                                        <FormLabel>Project</FormLabel>
                                        <Select
                                            // Crucial: Ensure the Select gets the value from RHF
                                            // Use ?? '' to handle potential initial undefined/null safely
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            disabled={isLoadingProjects}
                                            // defaultValue={field.value ?? ''} // defaultValue is less critical here if value is used
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={isLoadingProjects ? 'Loading...' : 'Select Project'}/>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {/* Ensure 'projects' data is actually available here */}
                                                {/* Ensure 'project.id' type matches 'field.value' type */}
                                                {projects && projects.length > 0 ? (
                                                    projects.map(project => (
                                                        <SelectItem
                                                            key={project.id}
                                                            // Ensure this value prop EXACTLY matches potential field.value
                                                            value={project.id} // Or String(project.id) if needed
                                                        >
                                                            {project.name}
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                                                )}
                                                {/* Maybe add an explicit 'None' option if applicable */}
                                                {/* <SelectItem value="">None</SelectItem> */}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage/>
                                    </FormItem>
                                );
                            }}
                        />
                        <FormField
                            name="name"
                            control={form.control}
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Task Title</FormLabel>
                                    <FormControl>
                                        <Input type="text" {...field} value={field.value ?? ''}/>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <FormField
                            name="description"
                            control={form.control}
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Task Description</FormLabel>
                                    <FormControl>
                                        <Input type="text" {...field} value={field.value ?? ''}/>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <FormField
                            name="status_id"
                            control={form.control}
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select status"/>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {
                                                statuses && statuses.length > 0
                                                    ? (statuses.map(status => (
                                                            <SelectItem key={status.id}
                                                                        value={status.id}>{status.name}</SelectItem>
                                                        ))
                                                    ) : (
                                                        <SelectItem value="none">No statuses found</SelectItem>
                                                    )
                                            }
                                        </SelectContent>
                                    </Select>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <FormField
                            name="assigned_to"
                            control={form.control}
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Assignee</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Assignee"/>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {
                                                users && users.length > 0
                                                    ? (users.map(user => (
                                                            <SelectItem key={user.id}
                                                                        value={user.id}>{user.display_name}</SelectItem>
                                                        ))
                                                    ) : (
                                                        <SelectItem value="none">No users found</SelectItem>
                                                    )
                                            }
                                        </SelectContent>
                                    </Select>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <Button type="submit">{updateTaskMutation.isPending ? 'Updating...' : 'Update'}</Button>
                    </form>
                </Form>
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