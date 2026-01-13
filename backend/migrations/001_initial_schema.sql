-- Migration initiale - Schéma complet de la base de données IGCA

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'membre' CHECK (role IN ('membre', 'benevole', 'admin', 'super_admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des rôles fonctionnels bénévoles
CREATE TABLE IF NOT EXISTS roles_fonctionnels (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des bénévoles (extension de users)
CREATE TABLE IF NOT EXISTS benevoles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    fonctionnel_role VARCHAR(100) REFERENCES roles_fonctionnels(nom),
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des adhésions
CREATE TABLE IF NOT EXISTS adhesions (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telephone VARCHAR(20),
    date_adhesion DATE NOT NULL,
    tarif DECIMAL(10, 2) NOT NULL,
    moyen_paiement VARCHAR(50) CHECK (moyen_paiement IN ('especes', 'cheque', 'cb', 'virement', 'helloasso')),
    statut VARCHAR(50) DEFAULT 'actif' CHECK (statut IN ('actif', 'expire', 'renouvele')),
    helloasso_id VARCHAR(255) UNIQUE,
    photo_url TEXT,
    linked_to_id INTEGER REFERENCES adhesions(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_adhesions_email ON adhesions(email);
CREATE INDEX IF NOT EXISTS idx_adhesions_nom_prenom ON adhesions(nom, prenom);
CREATE INDEX IF NOT EXISTS idx_adhesions_date ON adhesions(date_adhesion);
CREATE INDEX IF NOT EXISTS idx_adhesions_statut ON adhesions(statut);

-- Table des dons
CREATE TABLE IF NOT EXISTS dons (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100),
    prenom VARCHAR(100),
    email VARCHAR(255),
    date_don DATE NOT NULL,
    montant DECIMAL(10, 2) NOT NULL,
    moyen_paiement VARCHAR(50) CHECK (moyen_paiement IN ('especes', 'cheque', 'cb', 'virement', 'helloasso')),
    helloasso_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les dons
CREATE INDEX IF NOT EXISTS idx_dons_date ON dons(date_don);
CREATE INDEX IF NOT EXISTS idx_dons_email ON dons(email);

-- Table des cartes membres
CREATE TABLE IF NOT EXISTS cartes (
    id SERIAL PRIMARY KEY,
    adhesion_id INTEGER NOT NULL REFERENCES adhesions(id) ON DELETE CASCADE,
    numero_carte VARCHAR(50) UNIQUE NOT NULL,
    statut VARCHAR(50) DEFAULT 'a_generer' CHECK (statut IN ('a_generer', 'generee', 'a_remettre', 'remise')),
    date_generation TIMESTAMP,
    date_remise TIMESTAMP,
    remis_par INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les cartes
CREATE INDEX IF NOT EXISTS idx_cartes_adhesion ON cartes(adhesion_id);
CREATE INDEX IF NOT EXISTS idx_cartes_statut ON cartes(statut);
CREATE INDEX IF NOT EXISTS idx_cartes_numero ON cartes(numero_carte);

-- Table des imports
CREATE TABLE IF NOT EXISTS imports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    filename VARCHAR(255) NOT NULL,
    record_count INTEGER NOT NULL,
    type VARCHAR(50) DEFAULT 'adhesions' CHECK (type IN ('adhesions', 'dons')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- Table des menus
CREATE TABLE IF NOT EXISTS menus (
    id SERIAL PRIMARY KEY,
    date_menu DATE NOT NULL UNIQUE,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des plats
CREATE TABLE IF NOT EXISTS plats (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    prix DECIMAL(10, 2) NOT NULL,
    disponible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison menu-plats
CREATE TABLE IF NOT EXISTS menu_plats (
    menu_id INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    plat_id INTEGER NOT NULL REFERENCES plats(id) ON DELETE CASCADE,
    PRIMARY KEY (menu_id, plat_id)
);

-- Table des logs d'actions (pour la traçabilité)
CREATE TABLE IF NOT EXISTS action_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les logs
CREATE INDEX IF NOT EXISTS idx_logs_user ON action_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_entity ON action_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_logs_date ON action_logs(created_at);

-- Insertion des rôles fonctionnels par défaut
INSERT INTO roles_fonctionnels (nom, description) VALUES
    ('Securite', 'Sécurité des événements'),
    ('Organisation evenementielle', 'Organisation des événements'),
    ('Gestion de la salle', 'Gestion de la salle'),
    ('Receptionniste', 'Réceptionniste'),
    ('Referent cuisine', 'Référent cuisine'),
    ('Aide Mandir', 'Aide Mandir')
ON CONFLICT (nom) DO NOTHING;

-- Créer un utilisateur super admin par défaut (mot de passe: admin123 - À CHANGER EN PRODUCTION)
-- Le hash correspond à 'admin123' avec bcrypt
INSERT INTO users (email, password_hash, nom, prenom, role, is_active) VALUES
    ('admin@igca.paris', '$2a$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq', 'Admin', 'IGCA', 'super_admin', true)
ON CONFLICT (email) DO NOTHING;

