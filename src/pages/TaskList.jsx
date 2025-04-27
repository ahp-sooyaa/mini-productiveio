import {Button} from "@/components/ui/button.jsx";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form.jsx";
import {Input} from "@/components/ui/input.jsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.jsx";
import {zodResolver} from "@hookform/resolvers/zod";
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {useForm} from "react-hook-form";
import {z} from "zod";
import {useAuth} from '../contexts/AuthContext'
import supabase from '../utils/supabaseClient'
import {useEffect} from "react";

function TaskList() {
    const {user} = useAuth()
    const queryClient = useQueryClient()

    const schema = z.object({
        name: z.string().trim().min(1, {message: 'Task title is required.'}),
        description: z.string().trim(),
        project_id: z.string({message: 'Project is required.'}),
        status_id: z.string({message: 'Status is required.'}),
        assigned_to: z.string().optional(),
    });

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            name: '',
            description: '',
        }
    })

    // Query to fetch users
    const {data: users} = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const {data, error} = await supabase
                .from('profiles')
                .select()

            if (error) throw error
            return data
        }
    })

    // Query to fetch statuses
    const { data: statuses, isSuccess } = useQuery({
        queryKey: ['statuses'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('statuses')
                .select()

            if (error) throw error
            return data
        }
    })

    // Set default status when data is loaded
    useEffect(() => {
        if (isSuccess && statuses && statuses.length > 0) {
            // Set the first status as default
            form.setValue('status_id', statuses[0].id);
            console.log('Default status set:', statuses[0].name);
        }
    }, [isSuccess, statuses, form]);

    // Query to fetch projects
    const {data: projects} = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const {data, error} = await supabase
                .from('projects')
                .select()

            if (error) throw error
            return data
        }
    })

    // Query to fetch tasks
    const {data: tasks, isLoading, error} = useQuery({
        queryKey: ['tasks'],
        queryFn: async () => {
            const {data, error} = await supabase
                .from('tasks')
                .select("*, project:project_id(name), status:status_id(name)")

            if (error) throw error
            return data
        },
        enabled: !!user
    })

    // Mutation to add a new task
    const addTaskMutation = useMutation({
        mutationFn: async (task) => {
            const {data, error} = await supabase
                .from('tasks')
                .insert([task])

            if (error) throw error
            return data
        },
        onMutate: async (newTask) => {
            await queryClient.cancelQueries({queryKey: ['tasks']})
            const previousTasks = queryClient.getQueryData(['tasks'])
            
            // Find the status and project based on their IDs
            const status = statuses?.find(s => s.id === newTask.status_id)
            const project = projects?.find(p => p.id === newTask.project_id)
            
            // Create an augmented task with the nested structure that matches the query result
            const augmentedTask = {
                ...newTask,
                id: 'temp-id-' + Date.now(), // Temporary ID that will be replaced when the server responds
                status: { name: status?.name || 'Loading...' },
                project: { name: project?.name || 'Loading...' }
            }
            
            queryClient.setQueryData(['tasks'], old => [...old, augmentedTask])
            
            return {previousTasks}
        },
        onError: (error, context) => {
            queryClient.setQueryData(['tasks'], context.previousTasks)
        },
        onSettled: () => {
            queryClient.invalidateQueries({queryKey: ['tasks']})
        }
    })

    // Add a new task
    const onSubmit = (data) => {
        const task = {
            ...data,
            created_by: user.id,
        }

        addTaskMutation.mutate(task)
    }

    if (isLoading) return <div>Loading...</div>
    if (error) return <div>Error: {error.message}</div>

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <section className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-bold mb-6">Add New Task</h2>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            name="project_id"
                            control={form.control}
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Project</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Project"/>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {
                                                projects && projects.length > 0
                                                    ? (projects.map(project => (
                                                            <SelectItem key={project.id}
                                                                        value={project.id}>{project.name}</SelectItem>
                                                        ))
                                                    ) : (
                                                        <SelectItem value="none">No projects found</SelectItem>
                                                    )
                                            }
                                        </SelectContent>
                                    </Select>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <FormField
                            name="name"
                            control={form.control}
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Task Title</FormLabel>
                                    <FormControl>
                                        <Input type="text" {...field} />
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
                                        <Input type="text" {...field} />
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
                                    <Select onValueChange={field.onChange} value={field.value}>
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
                                    <Select onValueChange={field.onChange} value={field.value}>
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
                        <Button type="submit">{addTaskMutation.isPending ? 'Creating...' : 'Create'}</Button>
                    </form>
                </Form>
            </section>

            <section className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-6">Tasks</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        {
                            tasks && tasks.length > 0
                                ? (tasks.map((task, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">{task.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                              ${task.status.name === 'To Do' ? 'bg-yellow-100 text-yellow-800' :
                                                task.status.name === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-green-100 text-green-800'}`}>
                                              {task.status.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{task.project.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <a href={`/tasks/${task.id}`}
                                               className="text-blue-600 hover:text-blue-900">Edit</a>
                                        </td>
                                    </tr>)))
                                : (<tr>
                                    <td colSpan="4" className="text-center py-4">No tasks found</td>
                                </tr>)
                        }
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    )
}

export default TaskList