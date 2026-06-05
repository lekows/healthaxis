-- Guia para limpar dados de exames incorretos enviados durante testes.
-- Execute cada bloco separadamente no SQL Editor do Supabase.

-- PASSO 1: Encontre seu user_id (substitua pelo seu email)
SELECT id, email FROM auth.users WHERE email = 'seu@email.com';

-- PASSO 2: Com o id do passo anterior, apague o histórico de biomarcadores
DELETE FROM biomarker_history WHERE user_id = '<cole-seu-user-id-aqui>';

-- PASSO 3: Apague os biomarcadores
DELETE FROM biomarkers WHERE user_id = '<cole-seu-user-id-aqui>';

-- PASSO 4: (Opcional) Apague os documentos para re-enviar tudo do zero
DELETE FROM documents WHERE user_id = '<cole-seu-user-id-aqui>';

-- PASSO 5: (Opcional) Apague médicos extraídos incorretamente
DELETE FROM doctors WHERE user_id = '<cole-seu-user-id-aqui>';
