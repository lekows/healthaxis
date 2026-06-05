-- Adiciona campo sexo ao perfil do usuário (necessário para referências laboratoriais personalizadas)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sex text CHECK (sex IN ('masculino', 'feminino', 'outro'));
