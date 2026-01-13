# Installation - Plateforme IGCA Paris

## Prérequis

- Node.js 18+ et npm
- PostgreSQL 14+

## Installation rapide

### 1. Base de données

```bash
# Créer la base de données
createdb igca_db

# Exécuter les migrations
psql -d igca_db -f backend/migrations/001_initial_schema.sql
```

### 2. Backend

```bash
cd backend
npm install
cp env.example .env
# Éditer .env avec vos paramètres
npm run dev
```

### 3. Frontend Vue.js

```bash
cd frontend-admin
npm install
npm run dev
```

## Configuration

### Backend (.env)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/igca_db
JWT_SECRET=votre-secret-jwt-fort
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

### Créer le compte Super Admin sécurisé

```bash
cd backend
node scripts/create-super-admin.js
```

Le script génère automatiquement un mot de passe fort de 20 caractères.
**IMPORTANT** : Notez le mot de passe affiché, il ne sera plus visible après !

## Démarrage

### Option 1 : Script automatique

```bash
./start.sh
```

### Option 2 : Manuel

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend-admin-vue
npm run dev
```

## Accès

- Frontend : http://localhost:3000
- Backend API : http://localhost:3001
- Connexion : `admin@igca.paris` / `admin123`

## Documentation

- Configuration PostgreSQL : `CONFIGURATION_POSTGRESQL.md`
- README principal : `README.md`
