-- Migration pour créer la table des crédits manuels
-- Les crédits représentent les entrées d'argent (virements, dons, aides, etc.)

CREATE TABLE IF NOT EXISTS credits (
    id SERIAL PRIMARY KEY,
    libelle VARCHAR(255) NOT NULL,
    description TEXT,
    montant DECIMAL(10, 2) NOT NULL CHECK (montant > 0),
    type_credit VARCHAR(50) DEFAULT 'autre' CHECK (type_credit IN ('virement', 'don', 'aide', 'subvention', 'autre')),
    date_credit DATE NOT NULL,
    moyen_reception VARCHAR(50) CHECK (moyen_reception IN ('virement', 'cheque', 'especes', 'autre')),
    reference VARCHAR(255),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les crédits
CREATE INDEX IF NOT EXISTS idx_credits_date ON credits(date_credit);
CREATE INDEX IF NOT EXISTS idx_credits_type ON credits(type_credit);
CREATE INDEX IF NOT EXISTS idx_credits_created_by ON credits(created_by);

-- Table de liaison bilan-crédits (pour traçabilité)
CREATE TABLE IF NOT EXISTS bilan_credits (
    bilan_id INTEGER NOT NULL REFERENCES bilans(id) ON DELETE CASCADE,
    credit_id INTEGER NOT NULL REFERENCES credits(id) ON DELETE CASCADE,
    PRIMARY KEY (bilan_id, credit_id)
);

-- Index pour la liaison
CREATE INDEX IF NOT EXISTS idx_bilan_credits_bilan ON bilan_credits(bilan_id);
CREATE INDEX IF NOT EXISTS idx_bilan_credits_credit ON bilan_credits(credit_id);

-- Commentaires
COMMENT ON TABLE credits IS 'Crédits manuels (virements, dons, aides, subventions)';
COMMENT ON TABLE bilan_credits IS 'Liaison entre bilans et crédits pour traçabilité';

