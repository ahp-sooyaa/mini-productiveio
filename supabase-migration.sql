-- Create profiles table to store user profile information
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create a trigger to create a profile entry when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add user_id column to Tasks table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE "Tasks" ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add RLS (Row Level Security) to Tasks table
ALTER TABLE "Tasks" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own tasks
CREATE POLICY "Users can view their own tasks" ON "Tasks"
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own tasks
CREATE POLICY "Users can insert their own tasks" ON "Tasks"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own tasks
CREATE POLICY "Users can update their own tasks" ON "Tasks"
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own tasks
CREATE POLICY "Users can delete their own tasks" ON "Tasks"
  FOR DELETE USING (auth.uid() = user_id);

-- Add RLS to profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see their own profile
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Add RLS to Comments table
ALTER TABLE "Comments" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see comments on tasks they own
CREATE POLICY "Users can view comments on their tasks" ON "Comments"
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM "Tasks" WHERE id = task_id
    )
  );

-- Create policy to allow users to insert comments
CREATE POLICY "Users can insert comments" ON "Comments"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own comments
CREATE POLICY "Users can update their own comments" ON "Comments"
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own comments
CREATE POLICY "Users can delete their own comments" ON "Comments"
  FOR DELETE USING (auth.uid() = user_id);
