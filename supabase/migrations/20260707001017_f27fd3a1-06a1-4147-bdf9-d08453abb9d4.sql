
CREATE TYPE public.mock_type AS ENUM ('company', 'weekly');

-- mock_tests
CREATE TABLE public.mock_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  company text,
  mock_type public.mock_type NOT NULL DEFAULT 'company',
  description text,
  duration_minutes int NOT NULL DEFAULT 60,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mock_tests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mock_tests TO authenticated;
GRANT ALL ON public.mock_tests TO service_role;
ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mock tests viewable by all" ON public.mock_tests FOR SELECT USING (true);
CREATE POLICY "Admins manage mock tests" ON public.mock_tests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- mock_sections
CREATE TABLE public.mock_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_test_id uuid NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  name text NOT NULL,
  section_order int NOT NULL DEFAULT 0,
  duration_minutes int NOT NULL DEFAULT 20
);
GRANT SELECT ON public.mock_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mock_sections TO authenticated;
GRANT ALL ON public.mock_sections TO service_role;
ALTER TABLE public.mock_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mock sections viewable by all" ON public.mock_sections FOR SELECT USING (true);
CREATE POLICY "Admins manage mock sections" ON public.mock_sections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- mock_section_questions
CREATE TABLE public.mock_section_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.mock_sections(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  question_order int NOT NULL DEFAULT 0,
  UNIQUE(section_id, question_id)
);
GRANT SELECT ON public.mock_section_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mock_section_questions TO authenticated;
GRANT ALL ON public.mock_section_questions TO service_role;
ALTER TABLE public.mock_section_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Section questions viewable by all" ON public.mock_section_questions FOR SELECT USING (true);
CREATE POLICY "Admins manage section questions" ON public.mock_section_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- mock_attempts
CREATE TABLE public.mock_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mock_test_id uuid NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  score int NOT NULL DEFAULT 0,
  total int NOT NULL DEFAULT 0,
  section_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mock_attempts TO authenticated;
GRANT ALL ON public.mock_attempts TO service_role;
ALTER TABLE public.mock_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own mock attempts" ON public.mock_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users view submitted attempts for leaderboard" ON public.mock_attempts FOR SELECT TO authenticated
  USING (submitted_at IS NOT NULL);
CREATE POLICY "Users insert own mock attempts" ON public.mock_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own mock attempts" ON public.mock_attempts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- doubt_messages
CREATE TABLE public.doubt_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id uuid REFERENCES public.questions(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.doubt_messages TO authenticated;
GRANT ALL ON public.doubt_messages TO service_role;
ALTER TABLE public.doubt_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own doubt messages" ON public.doubt_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own doubt messages" ON public.doubt_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own doubt messages" ON public.doubt_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_mock_attempts_user ON public.mock_attempts(user_id);
CREATE INDEX idx_mock_attempts_test ON public.mock_attempts(mock_test_id);
CREATE INDEX idx_doubt_messages_user_q ON public.doubt_messages(user_id, question_id, created_at);
