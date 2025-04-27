-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to select profiles"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow users to update their own profiles"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- 2. Trigger Function to Insert into Profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
INSERT INTO public.profiles (id, email, display_name)
VALUES (
           NEW.id,
           NEW.email,
           NEW.raw_user_meta_data->>'display_name'
       );
RETURN NEW;
END;
$$;

-- 3. Trigger on auth.users Table
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. Projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    is_active BOOLEAN DEFAULT TRUE,
    due_date DATE,
    priority INTEGER
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to select projects"
    ON projects
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert projects"
    ON projects
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow project owners to update and delete their projects"
    ON projects
    FOR UPDATE, DELETE
    USING (auth.uid() = user_id);

-- 3. Statuses Table
CREATE TABLE statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to insert statuses"
    ON statuses
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to select statuses"
    ON statuses
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update statuses"
    ON statuses
    FOR UPDATE
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow task creators to delete their statuses"
    ON statuses
    FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- 4. Tasks Table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status_id UUID REFERENCES statuses(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    due_date DATE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    completed_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to insert tasks"
    ON tasks
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to select tasks"
    ON tasks
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update tasks"
    ON tasks
    FOR UPDATE
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow task creators to delete their tasks"
    ON tasks
    FOR DELETE
USING (auth.uid() = created_by);

-- 5. Feed Table (Comments & Activity Logs)
CREATE TABLE feed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT CHECK(type IN ('comment', 'activity')),
    content TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

ALTER TABLE feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to select feed entries"
    ON feed
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow users to insert their own feed entries"
    ON feed
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update and delete their own feed entries"
    ON feed
    FOR UPDATE, DELETE
    USING (auth.uid() = user_id);

-- 6. Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_id UUID NOT NULL,
    reference_type TEXT NOT NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notifier_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to select their own notifications"
    ON notifications
    FOR SELECT
    USING (auth.uid() = notifier_id);

CREATE POLICY "Prevent updates and deletions of notifications"
    ON notifications
    FOR UPDATE, DELETE
    USING (false);

-- 7. Subscribers Table
CREATE TABLE subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscribed_at TIMESTAMP DEFAULT now(),
    unsubscribed_at TIMESTAMP
);

ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to select subscribers"
    ON subscribers
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert subscribers"
    ON subscribers
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update subscribers"
    ON subscribers
    FOR UPDATE
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete subscribers"
    ON subscribers
    FOR DELETE
USING (auth.uid() IS NOT NULL);

-- 8. Time Logs Table
CREATE TABLE time_logs (
   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
   task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
   start_time TIMESTAMP,
   end_time TIMESTAMP,
   time_spent INTERVAL,
   description TEXT,
   created_at TIMESTAMP DEFAULT now(),
   updated_at TIMESTAMP DEFAULT now()
);

ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to select their own time logs"
    ON time_logs
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own time logs"
    ON time_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update and delete their own time logs"
    ON time_logs
    FOR UPDATE, DELETE
    USING (auth.uid() = user_id);