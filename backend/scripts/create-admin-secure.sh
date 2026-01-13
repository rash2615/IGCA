#!/bin/bash

# Script shell pour créer un Super Admin sécurisé
# Utilise le script Node.js avec gestion d'erreurs

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.." || exit 1

echo "🔐 Création d'un compte Super Admin sécurisé"
echo ""

# Vérifier que .env existe
if [ ! -f ".env" ]; then
    echo "❌ Erreur: Fichier .env introuvable"
    echo "   Copiez env.example vers .env et configurez-le"
    exit 1
fi

# Vérifier que node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

# Exécuter le script Node.js
node scripts/create-super-admin.js

