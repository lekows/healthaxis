-- HealthAxis — Storage: bucket exam-files
-- Execute no Supabase: SQL Editor → New query → cole tudo → Run
-- (separado do schema.sql pois requer extensão storage habilitada)

-- =============================================
-- BUCKET
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exam-files',
  'exam-files',
  true,
  10485760,  -- 10 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- POLÍTICAS RLS
-- Arquivos ficam em: {user_id}/{timestamp}.{ext}
-- Cada usuário só acessa sua própria pasta
-- =============================================

-- Upload
CREATE POLICY "Usuários fazem upload na própria pasta"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exam-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Leitura (pública via URL — bucket já é public)
CREATE POLICY "Usuários lêem os próprios arquivos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'exam-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Deleção
CREATE POLICY "Usuários deletam os próprios arquivos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'exam-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
