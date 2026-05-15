-- Migración: añadir campos CRM a la tabla candidates
-- Aplicada: 2026-04-10

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS crm_id                   TEXT,
  ADD COLUMN IF NOT EXISTS dni                      TEXT,
  ADD COLUMN IF NOT EXISTS birthdate                DATE,
  ADD COLUMN IF NOT EXISTS etapa                    TEXT,   -- ajmcm_etapa_c
  ADD COLUMN IF NOT EXISTS asamblea_movimiento_es   TEXT,   -- ajmcm_asamblea_movimiento_es_c
  ADD COLUMN IF NOT EXISTS asamblea_responsabilidad TEXT,   -- ajmcm_asamblea_responsabilid_c
  ADD COLUMN IF NOT EXISTS monitor_desde            TEXT,   -- ajmcm_monitor_desde_c (año)
  ADD COLUMN IF NOT EXISTS monitor_de               TEXT,   -- ajmcm_monitor_de_c
  ADD COLUMN IF NOT EXISTS grupo_mcm                TEXT,   -- futuro: nombre grupo vía relaciones
  ADD COLUMN IF NOT EXISTS crm_source               TEXT;   -- 'sinergiacrm' | 'manual' | 'csv'

-- Evitar duplicados: misma persona (crm_id) en la misma votación (round_id)
CREATE UNIQUE INDEX IF NOT EXISTS candidates_round_crm_id_uniq
  ON public.candidates(round_id, crm_id)
  WHERE crm_id IS NOT NULL;
