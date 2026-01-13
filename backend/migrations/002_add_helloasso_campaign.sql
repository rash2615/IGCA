-- Migration pour ajouter le champ helloasso_campaign_id à la table adhesions
-- Ce champ permet de lier les adhésions à la campagne HelloAsso d'IGCA Paris

-- Vérifier et ajouter la colonne si elle n'existe pas déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'adhesions' 
        AND column_name = 'helloasso_campaign_id'
    ) THEN
        ALTER TABLE adhesions ADD COLUMN helloasso_campaign_id VARCHAR(255);
    END IF;
END $$;

-- Créer l'index si nécessaire (avec gestion d'erreur)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'adhesions' 
        AND indexname = 'idx_adhesions_helloasso_campaign'
    ) THEN
        CREATE INDEX idx_adhesions_helloasso_campaign ON adhesions(helloasso_campaign_id);
    END IF;
EXCEPTION
    WHEN insufficient_privilege THEN
        -- Si on n'a pas les permissions, on continue quand même
        RAISE NOTICE 'Index non créé - permissions insuffisantes';
END $$;
