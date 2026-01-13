-- Migration pour ajouter le champ helloasso_campaign_id à la table adhesions
-- Version avec gestion des permissions

-- Donner les permissions nécessaires à l'utilisateur igca (si vous êtes postgres)
-- GRANT ALL PRIVILEGES ON TABLE adhesions TO igca;
-- ALTER TABLE adhesions OWNER TO igca;

-- Vérifier et ajouter la colonne si elle n'existe pas déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'adhesions' 
        AND column_name = 'helloasso_campaign_id'
    ) THEN
        ALTER TABLE adhesions ADD COLUMN helloasso_campaign_id VARCHAR(255);
        RAISE NOTICE 'Colonne helloasso_campaign_id ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne helloasso_campaign_id existe déjà';
    END IF;
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE EXCEPTION 'Permissions insuffisantes. Exécutez en tant que postgres ou donnez les permissions : GRANT ALL PRIVILEGES ON TABLE adhesions TO igca;';
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erreur lors de l''ajout de la colonne: %', SQLERRM;
END $$;

-- Créer l'index si nécessaire
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public'
        AND tablename = 'adhesions' 
        AND indexname = 'idx_adhesions_helloasso_campaign'
    ) THEN
        CREATE INDEX idx_adhesions_helloasso_campaign ON adhesions(helloasso_campaign_id);
        RAISE NOTICE 'Index idx_adhesions_helloasso_campaign créé avec succès';
    ELSE
        RAISE NOTICE 'Index idx_adhesions_helloasso_campaign existe déjà';
    END IF;
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Index non créé - permissions insuffisantes (non bloquant)';
    WHEN OTHERS THEN
        RAISE NOTICE 'Erreur lors de la création de l''index: % (non bloquant)', SQLERRM;
END $$;

