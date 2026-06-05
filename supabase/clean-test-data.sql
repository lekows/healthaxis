-- Limpa dados de exames incorretos enviados durante testes.
-- Substitua o email abaixo pelo seu email de cadastro e execute tudo de uma vez.

DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'leonardo.karino@gmail.com';

  IF uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado. Verifique o email.';
  END IF;

  DELETE FROM biomarker_history WHERE user_id = uid;
  DELETE FROM biomarkers        WHERE user_id = uid;
  DELETE FROM documents         WHERE user_id = uid;
  DELETE FROM doctors           WHERE user_id = uid;

  RAISE NOTICE 'Dados limpos para o usuário %', uid;
END $$;
