-- Convert transactions to a shared, no-auth table
DROP POLICY IF EXISTS own_select ON public.transactions;
DROP POLICY IF EXISTS own_insert ON public.transactions;
DROP POLICY IF EXISTS own_update ON public.transactions;
DROP POLICY IF EXISTS own_delete ON public.transactions;

ALTER TABLE public.transactions DROP COLUMN IF EXISTS user_id;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;

CREATE POLICY "public_read" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "public_insert" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update" ON public.transactions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_delete" ON public.transactions FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;