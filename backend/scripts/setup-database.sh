#!/bin/bash

# Script de configuration de la base de données PostgreSQL pour IGCA Paris

echo "=========================================="
echo "Configuration PostgreSQL - IGCA Paris"
echo "=========================================="
echo ""

# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier si PostgreSQL est installé
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL n'est pas installé${NC}"
    echo ""
    echo "Installez PostgreSQL :"
    echo "  macOS: brew install postgresql@14"
    echo "  Linux: sudo apt install postgresql"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL est installé${NC}"
echo ""

# Vérifier si PostgreSQL est en cours d'exécution
if ! pg_isready &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL n'est pas démarré${NC}"
    echo ""
    echo "Démarrez PostgreSQL :"
    echo "  macOS: brew services start postgresql@14"
    echo "  Linux: sudo systemctl start postgresql"
    echo ""
    read -p "Voulez-vous continuer quand même ? (o/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Oo]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✅ PostgreSQL est en cours d'exécution${NC}"
fi

echo ""

# Demander les informations de connexion
read -p "Nom d'utilisateur PostgreSQL (défaut: $(whoami)): " DB_USER
DB_USER=${DB_USER:-$(whoami)}

read -sp "Mot de passe PostgreSQL (laissez vide si pas de mot de passe): " DB_PASSWORD
echo ""

read -p "Nom de la base de données (défaut: igca_db): " DB_NAME
DB_NAME=${DB_NAME:-igca_db}

read -p "Hôte (défaut: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Port (défaut: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}

echo ""

# Construire la chaîne de connexion
if [ -z "$DB_PASSWORD" ]; then
    DB_URL="postgresql://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
else
    DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

echo "Configuration :"
echo "  Utilisateur: $DB_USER"
echo "  Base de données: $DB_NAME"
echo "  Hôte: $DB_HOST"
echo "  Port: $DB_PORT"
echo ""

# Tester la connexion
echo "Test de connexion..."
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "\q" &> /dev/null; then
    echo -e "${GREEN}✅ Connexion réussie${NC}"
else
    echo -e "${RED}❌ Échec de la connexion${NC}"
    echo ""
    echo "Vérifiez vos identifiants et que PostgreSQL est démarré."
    exit 1
fi

echo ""

# Vérifier si la base de données existe
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${YELLOW}⚠️  La base de données '$DB_NAME' existe déjà${NC}"
    read -p "Voulez-vous la supprimer et la recréer ? (o/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        echo "Suppression de la base de données existante..."
        PGPASSWORD="$DB_PASSWORD" dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
        echo -e "${GREEN}✅ Base de données supprimée${NC}"
    else
        echo "Utilisation de la base de données existante."
    fi
fi

# Créer la base de données si elle n'existe pas
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "Création de la base de données '$DB_NAME'..."
    if PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"; then
        echo -e "${GREEN}✅ Base de données créée${NC}"
    else
        echo -e "${RED}❌ Erreur lors de la création de la base de données${NC}"
        exit 1
    fi
fi

echo ""

# Exécuter les migrations
MIGRATION_FILE="migrations/001_initial_schema.sql"
if [ -f "$MIGRATION_FILE" ]; then
    echo "Exécution des migrations..."
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE" &> /dev/null; then
        echo -e "${GREEN}✅ Migrations exécutées avec succès${NC}"
    else
        echo -e "${RED}❌ Erreur lors de l'exécution des migrations${NC}"
        echo "Exécutez manuellement : psql -d $DB_NAME -f $MIGRATION_FILE"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Fichier de migration non trouvé: $MIGRATION_FILE${NC}"
fi

echo ""

# Créer ou mettre à jour le fichier .env
ENV_FILE=".env"
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  Le fichier .env existe déjà${NC}"
    read -p "Voulez-vous le mettre à jour avec la nouvelle configuration ? (o/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        # Mettre à jour DATABASE_URL
        if grep -q "DATABASE_URL=" "$ENV_FILE"; then
            sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=$DB_URL|" "$ENV_FILE"
            echo -e "${GREEN}✅ Fichier .env mis à jour${NC}"
        else
            echo "DATABASE_URL=$DB_URL" >> "$ENV_FILE"
            echo -e "${GREEN}✅ DATABASE_URL ajouté au fichier .env${NC}"
        fi
    fi
else
    echo "Création du fichier .env..."
    cat > "$ENV_FILE" << EOF
# Database
DATABASE_URL=$DB_URL

# JWT
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000

# File Upload
MAX_FILE_SIZE=10485760
EOF
    echo -e "${GREEN}✅ Fichier .env créé${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Configuration terminée !${NC}"
echo "=========================================="
echo ""
echo "Prochaines étapes :"
echo "  1. Vérifiez le fichier .env dans le dossier backend"
echo "  2. Installez les dépendances : npm install"
echo "  3. Démarrez le serveur : npm run dev"
echo ""

