
-- 1) Convert has_role to SECURITY INVOKER. user_roles has an RLS policy allowing
-- users to read their own roles, so has_role(auth.uid(), ...) continues to work.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 2) Profiles: restrict SELECT to self.
DROP POLICY IF EXISTS "Profiles are viewable by authenticated" ON public.profiles;
CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Leaderboard helper: expose only display names for a given set of user ids.
CREATE OR REPLACE FUNCTION public.get_profile_names(_ids uuid[])
RETURNS TABLE (id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name FROM public.profiles p WHERE p.id = ANY(_ids)
$$;

REVOKE ALL ON FUNCTION public.get_profile_names(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_names(uuid[]) TO authenticated;

-- 3) Questions: restrict SELECT to authenticated users (no anon reads).
DROP POLICY IF EXISTS "Questions viewable by all" ON public.questions;
CREATE POLICY "Questions viewable by authenticated"
ON public.questions FOR SELECT
TO authenticated
USING (true);
