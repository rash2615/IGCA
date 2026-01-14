-- Migration pour ajouter quantité et image aux plats

-- Ajouter la colonne quantite à la table plats
ALTER TABLE plats 
ADD COLUMN IF NOT EXISTS quantite INTEGER DEFAULT 1 CHECK (quantite >= 0);

-- Ajouter la colonne image_url à la table plats
ALTER TABLE plats 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Ajouter un index pour les recherches par disponibilité
CREATE INDEX IF NOT EXISTS idx_plats_disponible ON plats(disponible);

-- Commentaires
COMMENT ON COLUMN plats.quantite IS 'Quantité disponible du plat';
COMMENT ON COLUMN plats.image_url IS 'URL de l''image du plat';

