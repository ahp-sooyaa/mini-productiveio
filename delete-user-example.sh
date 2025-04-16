#!/bin/bash

# Replace USER_UUID_TO_DELETE with the actual user ID you want to delete
USER_UUID_TO_DELETE="feaf9aeb-1729-4b83-9c6f-f8d042cb6605"

# Get your anon key from .env file
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluenVreXdkYmZ4dG51c2tueWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5OTQyNDksImV4cCI6MjA1OTU3MDI0OX0.vO4UzlhAr2wMp02jmHcySrdCLUhqwOPkoO7HHhfDGQ0"

# Call the Edge Function
curl -X POST 'https://inzukywdbfxtnusknyaj.functions.supabase.co/delete-user' \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{\"user_id\": \"$USER_UUID_TO_DELETE\"}"
