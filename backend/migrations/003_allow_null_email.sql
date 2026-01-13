-- Migration pour permettre les emails NULL dans la table adhesions
-- Certains adhérents n'ont pas d'email

DO $$ 
BEGIN
    -- Modifier la colonne email pour permettre NULL
    ALTER TABLE adhesions ALTER COLUMN email DROP NOT NULL;
    
    RAISE NOTICE 'Colonne email modifiée pour permettre NULL';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erreur lors de la modification de la colonne email: %', SQLERRM;
END $$;

