-- Migration pour créer les tables de comptabilité complète
-- Inclut : dépenses, catégories de dépenses, bilans

-- Table des catégories de dépenses
CREATE TABLE IF NOT EXISTS depense_categories (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    couleur VARCHAR(7) DEFAULT '#667eea',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des dépenses
CREATE TABLE IF NOT EXISTS depenses (
    id SERIAL PRIMARY KEY,
    libelle VARCHAR(255) NOT NULL,
    description TEXT,
    montant DECIMAL(10, 2) NOT NULL CHECK (montant > 0),
    categorie_id INTEGER REFERENCES depense_categories(id) ON DELETE SET NULL,
    date_depense DATE NOT NULL,
    moyen_paiement VARCHAR(50) CHECK (moyen_paiement IN ('especes', 'cheque', 'cb', 'virement', 'autre')),
    facture_url TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les dépenses
CREATE INDEX IF NOT EXISTS idx_depenses_date ON depenses(date_depense);
CREATE INDEX IF NOT EXISTS idx_depenses_categorie ON depenses(categorie_id);
CREATE INDEX IF NOT EXISTS idx_depenses_created_by ON depenses(created_by);

-- Table des bilans
CREATE TABLE IF NOT EXISTS bilans (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    type_bilan VARCHAR(50) DEFAULT 'mensuel' CHECK (type_bilan IN ('mensuel', 'trimestriel', 'annuel', 'personnalise')),
    total_revenus DECIMAL(10, 2) DEFAULT 0,
    total_depenses DECIMAL(10, 2) DEFAULT 0,
    solde DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    pdf_url TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison bilan-dépenses (pour traçabilité)
CREATE TABLE IF NOT EXISTS bilan_depenses (
    bilan_id INTEGER NOT NULL REFERENCES bilans(id) ON DELETE CASCADE,
    depense_id INTEGER NOT NULL REFERENCES depenses(id) ON DELETE CASCADE,
    PRIMARY KEY (bilan_id, depense_id)
);

-- Index pour les bilans
CREATE INDEX IF NOT EXISTS idx_bilans_date_debut ON bilans(date_debut);
CREATE INDEX IF NOT EXISTS idx_bilans_date_fin ON bilans(date_fin);
CREATE INDEX IF NOT EXISTS idx_bilans_type ON bilans(type_bilan);

-- Insertion des catégories par défaut
INSERT INTO depense_categories (nom, description, couleur) VALUES
    ('Location', 'Frais de location de locaux', '#e74c3c'),
    ('Matériel', 'Achat de matériel et équipements', '#3498db'),
    ('Communication', 'Frais de communication et marketing', '#9b59b6'),
    ('Transport', 'Frais de transport et déplacements', '#f39c12'),
    ('Formation', 'Frais de formation et développement', '#1abc9c'),
    ('Administration', 'Frais administratifs et juridiques', '#95a5a6'),
    ('Événements', 'Organisation d''événements', '#e67e22'),
    ('Autres', 'Autres dépenses diverses', '#34495e')
ON CONFLICT (nom) DO NOTHING;

-- Commentaires pour documentation
COMMENT ON TABLE depenses IS 'Table des dépenses de l''association';
COMMENT ON TABLE depense_categories IS 'Catégories de dépenses pour organisation';
COMMENT ON TABLE bilans IS 'Bilans financiers générés (mensuels, trimestriels, annuels)';
COMMENT ON TABLE bilan_depenses IS 'Liaison entre bilans et dépenses pour traçabilité';

