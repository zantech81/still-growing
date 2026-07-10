-- Admins need to see ALL reflections (including hidden ones) and be able to
-- toggle is_hidden for moderation. The existing reader policy only allows
-- select when is_hidden = false OR own row.

CREATE POLICY "admins read all reflections" ON public.reflections
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "admins moderate reflections" ON public.reflections
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "admins delete any reflection" ON public.reflections
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );
