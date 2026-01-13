# Backend IGCA Paris

API REST pour la plateforme de gestion des adhésions IGCA Paris.

## Technologies

- Node.js + Express
- TypeScript
- PostgreSQL
- JWT pour l'authentification
- Multer pour l'upload de fichiers

## Installation

```bash
npm install
```

## Configuration

Copiez `.env.example` vers `.env` et configurez :

```env
DATABASE_URL=postgresql://user:password@localhost:5432/igca_db
JWT_SECRET=your-secret-key
PORT=3001
```

## Démarrage

```bash
# Développement
npm run dev

# Production
npm run build
npm start
```

## Endpoints API

### Authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/register` - Inscription (membres)
- `GET /api/auth/me` - Informations utilisateur

### Adhésions
- `GET /api/adhesions` - Liste des adhésions
- `GET /api/adhesions/:id` - Détails d'une adhésion
- `POST /api/adhesions/import` - Import CSV
- `POST /api/adhesions/import/:id/validate` - Valider l'import
- `GET /api/adhesions/export/csv` - Export CSV

### Cartes
- `GET /api/cartes` - Liste des cartes
- `POST /api/cartes/generate/:adhesionId` - Générer une carte
- `GET /api/cartes/:id/preview` - Prévisualiser une carte
- `GET /api/cartes/:id/download` - Télécharger une carte
- `GET /api/cartes/me/carte` - Ma carte (membre)

### Vérification
- `GET /api/verification/check` - Vérifier une adhésion

### Transmission
- `GET /api/transmission` - Liste des cartes à remettre
- `POST /api/transmission/:carteId/remise` - Marquer comme remise
- `GET /api/transmission/adherent/:adhesionId` - Historique par adhérent
- `GET /api/transmission/export/event` - Export événementiel

### Comptabilité
- `GET /api/comptabilite/overview` - Vue d'ensemble
- `GET /api/comptabilite/adhesions/tarifs` - Répartition par tarif
- `GET /api/comptabilite/export/csv` - Export comptable

### Dons
- `GET /api/dons` - Liste des dons
- `POST /api/dons/import` - Import CSV
- `POST /api/dons/import/:id/validate` - Valider l'import

### Menu
- `GET /api/menu/jour` - Menu du jour
- `POST /api/menu` - Créer/modifier un menu
- `POST /api/menu/:menuId/duplicate` - Dupliquer un menu
- `GET /api/menu/historique` - Historique des menus

### Rôles
- `GET /api/roles/fonctionnels` - Liste des rôles fonctionnels
- `POST /api/roles/fonctionnels` - Créer un rôle fonctionnel
- `GET /api/roles/benevoles` - Liste des bénévoles
- `POST /api/roles/benevoles/:userId/role` - Attribuer un rôle

### Utilisateurs
- `GET /api/users` - Liste des utilisateurs
- `PATCH /api/users/:userId/desactivate` - Désactiver un utilisateur
- `PATCH /api/users/:userId/activate` - Réactiver un utilisateur
- `PATCH /api/users/:userId/role` - Modifier le rôle (super admin)

## Rôles et permissions

- **Super Admin** : Accès total
- **Admin IGCA** : Gestion adhésions, cartes, comptabilité, rôles
- **Bénévole** : Vérification, transmission (selon période d'accès)
- **Membre** : Accès à sa carte et au menu du jour

