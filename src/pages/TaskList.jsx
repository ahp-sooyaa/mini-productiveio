import { useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import supabase from '../utils/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

function TaskList() {
  const queryClient = useQueryClient()
  const titleInput = useRef()
  const projectInput = useRef()
  const statusInput = useRef()

  // Get current user from auth context
  const { user } = useAuth()

  // Query to fetch tasks
  const { isLoading, error, data } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Tasks')
        .select()
      if (error) throw error
      return data
    },
    enabled: !!user // Only run query if user is authenticated
  })

  // Mutation to add a new task
  const addTaskMutation = useMutation({
    mutationFn: async (task) => {
      const { data, error } = await supabase
        .from('Tasks')
        .insert([task])
      
      if (error) throw error
      return data
    },
    onMutate: async (newTask) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['tasks', user?.id] })

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(['tasks', user?.id])

      // Optimistically update the UI with the new task
      queryClient.setQueryData(['tasks', user?.id], old => {
        // Handle the case where old is undefined
        return old ? [...old, newTask] : [newTask]
      })

      // Return a context object with the previous tasks
      return { previousTasks }
    },
    onSuccess: () => {
      // Invalidate and refetch to get the actual server data
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] })
    },
    onError: (error, context) => {
      console.error('Error adding task:', error)
      // Revert to the previous state if there was an error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', user?.id], context.previousTasks)
      }
    }
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  // Add new task
  const addTask = (e) => {
    e.preventDefault()
    if (!titleInput.current.value || !projectInput.current.value) return
    
    const task = {
      title: titleInput.current.value,
      status: statusInput.current.value,
      project: projectInput.current.value,
      user_id: user.id
    }
    
    // Use the mutation to add the task
    addTaskMutation.mutate(task)
    e.currentTarget.reset()
  }

  // Status options
  const statusOptions = ['To Do', 'In Progress', 'Completed']

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <section className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-bold mb-6">Add New Task</h2>
        <form onSubmit={addTask} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="title" className="block font-medium text-gray-700">Task Title</label>
            <input
              type="text"
              id="title"
              name="title"
              placeholder="Enter task title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              ref={titleInput}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="status" className="block font-medium text-gray-700">Status</label>
            <select
              id="status"
              name="status"
              ref={statusInput}
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
              placeholder="Enter project name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              ref={projectInput}
            />
          </div>
          
          <button 
            type="submit" 
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
          >
            {addTaskMutation.isPending ? 'Adding...' : 'Add Task'}
          </button>
        </form>
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
                data && data.length > 0 
                ? (data.map((task, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{task.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${task.status === 'To Do' ? 'bg-yellow-100 text-yellow-800' : 
                        task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 
                        'bg-green-100 text-green-800'}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{task.project}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <a href={`/tasks/${task.id}`} className="text-blue-600 hover:text-blue-900">Edit</a>
                  </td>
                </tr>)))
                : <tr><td colSpan="4" className="text-center py-4">No tasks found</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default TaskList
