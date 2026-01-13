-- Migration pour ajouter le champ source (en ligne / hors ligne) aux adhésions
-- Version simplifiée sans CHECK constraint pour éviter les problèmes de permissions

-- Ajouter la colonne source
ALTER TABLE adhesions 
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'online';

-- Index pour les recherches par source
CREATE INDEX IF NOT EXISTS idx_adhesions_source ON adhesions(source);

