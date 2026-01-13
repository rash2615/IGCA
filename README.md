# Plateforme IGCA Paris - Gestion des Adhésions

Plateforme web et mobile complète pour la gestion centralisée des adhésions, cartes membres, dons et menu du jour pour l'association IGCA Paris.

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+ et npm
- PostgreSQL 14+

### Installation

1. **Base de données PostgreSQL**
   ```bash
   createdb igca_db
   psql -d igca_db -f backend/migrations/001_initial_schema.sql
   ```

2. **Backend**
   ```bash
   cd backend
   npm install
   cp env.example .env
   # Éditer .env avec vos paramètres (DATABASE_URL, JWT_SECRET)
   npm run dev
   ```

3. **Frontend Admin (Vue.js)**
   ```bash
   cd frontend-admin
   npm install
   npm run dev
   ```

4. **Application Mobile (optionnel)**
   ```bash
   cd mobile
   npm install
   npm start
   ```

## 📋 Accès

- **Frontend Admin** : http://localhost:3000
- **Backend API** : http://localhost:3001
- **Créer le compte Super Admin** :
  ```bash
  cd backend
  node scripts/create-super-admin.js
  ```
  Le script génère un mot de passe fort aléatoire et l'affiche.

⚠️ **IMPORTANT** : 
- Notez le mot de passe généré dans un endroit sûr
- Changez-le après la première connexion
- Ne partagez jamais les identifiants

## 🏗️ Architecture

```
IGCA/
├── backend/              # API REST (Node.js + Express + TypeScript)
├── frontend-admin/       # Interface admin (Vue.js 3 + TypeScript)
└── mobile/               # Application mobile (React Native)
```

## ✨ Fonctionnalités

- ✅ Import CSV HelloAsso avec gestion des doublons
- ✅ Gestion des adhésions (liste, filtres, recherche)
- ✅ Génération et gestion des cartes membres
- ✅ Vérification d'adhésion rapide
- ✅ Suivi de la transmission des cartes
- ✅ Comptabilité séparée (adhésions vs dons)
- ✅ Menu du jour
- ✅ Gestion des rôles (Super Admin, Admin, Bénévole, Membre)
- ✅ Gestion des rôles fonctionnels bénévoles

## 🔧 Configuration

### Backend (.env)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/igca_db
JWT_SECRET=votre-secret-jwt
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

### Frontend

L'URL de l'API est configurée automatiquement. Pour la modifier, créez un fichier `.env` :

```env
VITE_API_URL=http://localhost:3001/api
```

## 📚 Documentation

- **Installation détaillée** : `INSTALLATION.md`
- **Configuration PostgreSQL** : `CONFIGURATION_POSTGRESQL.md`
- **Backend** : `backend/README.md`
- **Frontend Vue** : `frontend-admin/README.md`

## 🛠️ Commandes utiles

### Backend
```bash
npm run dev      # Développement
npm run build    # Production
npm start        # Production
```

### Frontend
```bash
npm run dev      # Développement
npm run build    # Production
npm run preview  # Prévisualiser le build
```

## 🔒 Sécurité

- Authentification JWT
- Gestion des rôles et permissions
- Protection CORS
- Rate limiting
- Conformité RGPD

## 📝 Notes

- Le backend doit être démarré avant le frontend
- La base de données doit être créée et les migrations exécutées
- Le mot de passe admin par défaut doit être changé en production

## 🆘 Support

En cas de problème :
1. Vérifiez que PostgreSQL est démarré
2. Vérifiez les logs du backend
3. Vérifiez la console du navigateur (F12)
4. Consultez les fichiers de documentation
