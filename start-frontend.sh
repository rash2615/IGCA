#!/bin/bash

# Script pour démarrer uniquement le frontend

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/frontend-admin" || exit 1

echo "🌐 Démarrage du frontend IGCA Paris"
echo "📁 Répertoire: $(pwd)"
echo ""

# Vérifier que package.json existe
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: package.json introuvable"
    exit 1
fi

# Vérifier si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

echo "🚀 Démarrage du serveur de développement..."
npm run dev

