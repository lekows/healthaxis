CREATE TABLE public.doctor_access_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_type text NOT NULL CHECK (access_type IN ('panel_view', 'link_created', 'link_revoked')),
  accessed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doctor reads own access logs"
  ON public.doctor_access_logs FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "patient reads own access logs"
  ON public.doctor_access_logs FOR SELECT
  USING (auth.uid() = patient_id);
