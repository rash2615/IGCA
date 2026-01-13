#!/bin/bash

# Script de démarrage de la plateforme IGCA Paris

# Obtenir le répertoire du script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

echo "🚀 Démarrage de la plateforme IGCA Paris"
echo "📁 Répertoire: $SCRIPT_DIR"
echo ""

# Vérifier que PostgreSQL est démarré
if ! pg_isready &> /dev/null; then
    echo "⚠️  PostgreSQL n'est pas démarré"
    echo "   Démarrez-le avec: brew services start postgresql@14"
    echo ""
fi

# Vérifier que le dossier backend existe
if [ ! -d "backend" ]; then
    echo "❌ Erreur: Le dossier backend n'existe pas"
    exit 1
fi

# Démarrer le backend
echo "📦 Démarrage du backend..."
cd "$SCRIPT_DIR/backend" || exit 1

if [ ! -f ".env" ]; then
    echo "⚠️  Fichier .env manquant, copiez env.example vers .env"
    cd "$SCRIPT_DIR" || exit 1
    exit 1
fi

# Démarrer le backend en arrière-plan
npm run dev &
BACKEND_PID=$!
cd "$SCRIPT_DIR" || exit 1

# Attendre un peu que le backend démarre
sleep 3

# Vérifier que le dossier frontend-admin existe
if [ ! -d "frontend-admin" ]; then
    echo "❌ Erreur: Le dossier frontend-admin n'existe pas"
    echo "   Arrêt du backend..."
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Démarrer le frontend
echo "🌐 Démarrage du frontend..."
cd "$SCRIPT_DIR/frontend-admin" || exit 1

# Vérifier que package.json existe
if [ ! -f "package.json" ]; then
    echo "⚠️  package.json manquant, installation des dépendances..."
    npm install
fi

npm run dev &
FRONTEND_PID=$!
cd "$SCRIPT_DIR" || exit 1

echo ""
echo "✅ Plateforme démarrée !"
echo ""
echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:3000"
echo ""
echo "Connexion: admin@igca.paris / admin123"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter les serveurs"

# Fonction de nettoyage
cleanup() {
    echo ""
    echo "🛑 Arrêt des serveurs..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Capturer Ctrl+C
trap cleanup INT TERM

# Attendre que l'utilisateur arrête
wait
