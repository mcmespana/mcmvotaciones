-- Añade la columna crm_relationship_types a candidates
-- Almacena los tipos de relación del contacto en SinergiaCRM (ej: "grupo,monitor")
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS crm_relationship_types text;
