import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

// This function handles HTTP requests
serve(async (req) => {
  try {
    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Content-Type': 'application/json',
    }

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers })
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { status: 405, headers }
      )
    }

    // Parse request body
    const { user_id, admin_key } = await req.json()

    // Validate input
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id parameter' }),
        { status: 400, headers }
      )
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('PROJECT_URL') || 'https://inzukywdbfxtnusknyaj.supabase.co'
    const supabaseServiceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')

    // Validate service role key
    if (!supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing SERVICE_ROLE_KEY environment variable' }),
        { status: 500, headers }
      )
    }

    // Optional admin key validation for extra security
    const expectedAdminKey = Deno.env.get('ADMIN_API_KEY')
    if (expectedAdminKey && admin_key !== expectedAdminKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Invalid admin key.' }),
        { status: 401, headers }
      )
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Delete the user
    const { error } = await supabase.auth.admin.deleteUser(user_id)

    if (error) {
      console.error('Error deleting user:', error)
      return new Response(
        JSON.stringify({ error: `Failed to delete user: ${error.message}` }),
        { status: 500, headers }
      )
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${user_id} has been deleted successfully` 
      }),
      { status: 200, headers }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: `Unexpected error: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
