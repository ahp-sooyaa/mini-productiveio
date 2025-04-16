# Delete User Edge Function

This Supabase Edge Function allows you to delete a user from the auth.users table using the Supabase Admin API.

## Deployment

To deploy this function to your Supabase project:

1. Install the Supabase CLI if you haven't already:
   ```bash
   brew install supabase/tap/supabase
   ```

2. Login to Supabase CLI:
   ```bash
   supabase login
   ```

3. Link your project (if not already linked):
   ```bash
   supabase link --project-ref inzukywdbfxtnusknyaj
   ```

4. Deploy the function:
   ```bash
   supabase functions deploy delete-user --project-ref inzukywdbfxtnusknyaj
   ```

5. Set the required secrets:
   ```bash
   supabase secrets set SERVICE_ROLE_KEY=your-service-role-key --project-ref inzukywdbfxtnusknyaj
   ```
   
   Optionally, set the project URL (defaults to https://inzukywdbfxtnusknyaj.supabase.co):
   ```bash
   supabase secrets set PROJECT_URL=https://inzukywdbfxtnusknyaj.supabase.co --project-ref inzukywdbfxtnusknyaj
   ```
   
   Optionally, set an admin API key for additional security:
   ```bash
   supabase secrets set ADMIN_API_KEY=your-custom-admin-key --project-ref inzukywdbfxtnusknyaj
   ```

## Usage

You can call this function using curl:

```bash
curl -X POST 'https://inzukywdbfxtnusknyaj.functions.supabase.co/delete-user' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{"user_id": "USER_UUID_TO_DELETE", "admin_key": "YOUR_ADMIN_API_KEY"}'
```

Replace:
- `YOUR_ANON_KEY` with your project's anon key
- `USER_UUID_TO_DELETE` with the UUID of the user you want to delete
- `YOUR_ADMIN_API_KEY` with the admin key you set in the secrets (if configured)

## Response

Successful response:
```json
{
  "success": true,
  "message": "User USER_UUID has been deleted successfully"
}
```

Error response:
```json
{
  "error": "Error message"
}
```

## Security Considerations

- This function uses the service role key which has admin privileges. Be careful with who has access to call this function.
- Consider adding additional authentication mechanisms beyond the optional admin key.
- In production, you should restrict CORS to only allow requests from your trusted domains.
