-- Previne duplicatas ao reprocessar o mesmo exame ou ao salvar histórico embutido
CREATE UNIQUE INDEX IF NOT EXISTS biomarker_history_unique_entry
  ON biomarker_history (user_id, biomarker_slug, recorded_at);
