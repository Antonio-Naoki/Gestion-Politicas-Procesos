--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;

--
-- Tables
--

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    department TEXT NOT NULL,
    version TEXT,
    status TEXT NOT NULL,
    created_by INTEGER NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    file_url TEXT,
    tags JSONB
);

-- Approvals table
CREATE TABLE IF NOT EXISTS public.approvals (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES public.documents(id),
    user_id INTEGER NOT NULL REFERENCES public.users(id),
    status TEXT NOT NULL,
    comments TEXT,
    approved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to INTEGER NOT NULL REFERENCES public.users(id),
    assigned_by INTEGER NOT NULL REFERENCES public.users(id),
    document_id INTEGER REFERENCES public.documents(id),
    priority TEXT NOT NULL,
    status TEXT NOT NULL,
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Policy Acceptances table
CREATE TABLE IF NOT EXISTS public.policy_acceptances (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES public.documents(id),
    user_id INTEGER NOT NULL REFERENCES public.users(id),
    accepted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(document_id, user_id)
);

-- Activities table
CREATE TABLE IF NOT EXISTS public.activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    details JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Document Versions table
CREATE TABLE IF NOT EXISTS public.document_versions (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES public.documents(id),
    version TEXT NOT NULL,
    content TEXT NOT NULL,
    created_by INTEGER NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Session table for express-session
CREATE TABLE IF NOT EXISTS public.session (
    sid VARCHAR NOT NULL,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL,
    CONSTRAINT session_pkey PRIMARY KEY (sid)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON public.documents(created_by);
CREATE INDEX IF NOT EXISTS idx_approvals_document_id ON public.approvals(document_id);
CREATE INDEX IF NOT EXISTS idx_approvals_user_id ON public.approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_document_id ON public.tasks(document_id);
CREATE INDEX IF NOT EXISTS idx_policy_acceptances_document_id ON public.policy_acceptances(document_id);
CREATE INDEX IF NOT EXISTS idx_policy_acceptances_user_id ON public.policy_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_entity_type_id ON public.activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON public.document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_session_expire ON public.session(expire);

-- Insert admin user
INSERT INTO public.users (username, password, name, email, role, department, created_at)
VALUES (
  'admin',
  '74bc9f82b970e0a948ddcde6a95fe7a237bd091062b9e72f5d964f11222565f3d3323e55fc4f6dc1a63ae63069fc03b6399712d7528fbf63f54b581f702b7582.6e7c573d0438d9fd9300cb8766211d8a',
  'Administrador',
  'admin@cerater.com',
  'admin',
  'Administración',
  NOW()
) ON CONFLICT (username) DO NOTHING;

--
-- PostgreSQL database dump complete
--