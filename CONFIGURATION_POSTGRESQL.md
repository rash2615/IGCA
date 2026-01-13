# Guide de configuration PostgreSQL - IGCA Paris

Ce guide vous explique comment installer et configurer PostgreSQL pour la plateforme IGCA Paris.

## 1. Installation de PostgreSQL

### Sur macOS

#### Option A : Avec Homebrew (recommandé)
```bash
# Installer Homebrew si ce n'est pas déjà fait
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Installer PostgreSQL
brew install postgresql@14

# Démarrer PostgreSQL
brew services start postgresql@14
```

#### Option B : Avec Postgres.app
1. Télécharger Postgres.app depuis https://postgresapp.com/
2. Installer l'application
3. Lancer Postgres.app depuis Applications

### Sur Linux (Ubuntu/Debian)
```bash
# Mettre à jour les paquets
sudo apt update

# Installer PostgreSQL
sudo apt install postgresql postgresql-contrib

# Démarrer le service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Sur Windows
1. Télécharger PostgreSQL depuis https://www.postgresql.org/download/windows/
2. Exécuter l'installateur
3. Suivre les instructions d'installation
4. Noter le mot de passe du superutilisateur `postgres` que vous définissez

## 2. Vérifier l'installation

```bash
# Vérifier que PostgreSQL est installé
psql --version

# Vérifier que le service est actif
# Sur macOS/Linux :
brew services list | grep postgresql
# ou
pg_isready

# Sur Windows, vérifier dans les services Windows
```

## 3. Créer la base de données

### Méthode 1 : Via la ligne de commande (recommandé)

```bash
# Se connecter à PostgreSQL (par défaut, l'utilisateur est votre nom d'utilisateur système)
psql postgres

# Ou si vous utilisez l'utilisateur postgres par défaut :
psql -U postgres
```

Une fois connecté, exécutez les commandes suivantes :

```sql
-- Créer un utilisateur pour IGCA (optionnel mais recommandé)
CREATE USER igca_user WITH PASSWORD 'votre_mot_de_passe_securise';

-- Créer la base de données
CREATE DATABASE igca_db OWNER igca_user;

-- Donner tous les privilèges à l'utilisateur
GRANT ALL PRIVILEGES ON DATABASE igca_db TO igca_user;

-- Quitter psql
\q
```

### Méthode 2 : Via une commande directe

```bash
# Créer la base de données directement
createdb igca_db

# Ou avec un utilisateur spécifique
createdb -U postgres igca_db
```

## 4. Exécuter les migrations

```bash
# Depuis le répertoire racine du projet
cd /Users/imac2023/Desktop/IGCA

# Exécuter le script SQL de migration
psql -d igca_db -f backend/migrations/001_initial_schema.sql

# Ou si vous utilisez un utilisateur spécifique :
psql -U igca_user -d igca_db -f backend/migrations/001_initial_schema.sql
```

Si tout s'est bien passé, vous devriez voir :
```
CREATE TABLE
CREATE TABLE
...
INSERT 0 6
INSERT 0 1
```

## 5. Vérifier que la base de données est créée

```bash
# Se connecter à la base de données
psql -d igca_db

# Lister les tables
\dt

# Vous devriez voir les tables suivantes :
# - users
# - roles_fonctionnels
# - benevoles
# - adhesions
# - dons
# - cartes
# - imports
# - menus
# - plats
# - menu_plats
# - action_logs

# Vérifier que l'utilisateur admin a été créé
SELECT email, role FROM users WHERE role = 'super_admin';

# Quitter
\q
```

## 6. Configurer la connexion dans le backend

### Créer le fichier .env

```bash
cd backend
cp env.example .env
```

### Éditer le fichier .env

Ouvrez `backend/.env` et configurez la connexion :

```env
# Si vous avez créé un utilisateur spécifique
DATABASE_URL=postgresql://igca_user:votre_mot_de_passe@localhost:5432/igca_db

# Ou si vous utilisez l'utilisateur par défaut (votre nom d'utilisateur système)
DATABASE_URL=postgresql://votre_username@localhost:5432/igca_db

# Ou si vous utilisez l'utilisateur postgres
DATABASE_URL=postgresql://postgres:mot_de_passe_postgres@localhost:5432/igca_db
```

**Format de DATABASE_URL :**
```
postgresql://[utilisateur]:[mot_de_passe]@[hôte]:[port]/[nom_base_de_données]
```

### Exemples de configuration

#### Configuration locale simple (utilisateur système)
```env
DATABASE_URL=postgresql://localhost:5432/igca_db
```

#### Configuration avec utilisateur et mot de passe
```env
DATABASE_URL=postgresql://igca_user:mon_mot_de_passe@localhost:5432/igca_db
```

#### Configuration avec port personnalisé
```env
DATABASE_URL=postgresql://igca_user:mon_mot_de_passe@localhost:5433/igca_db
```

## 7. Tester la connexion

### Méthode 1 : Script automatique (recommandé)

```bash
cd backend
npm install

# Exécuter le script de test
node scripts/test-connection.js
```

### Méthode 2 : Script de configuration automatique

```bash
cd backend
./scripts/setup-database.sh
```

Ce script vous guide à travers toute la configuration.

### Méthode 3 : Test manuel

```bash
cd backend
npm install
npm run dev
```

Si la connexion fonctionne, vous devriez voir dans les logs :
```
Database connected successfully
Server running on port 3001
```

Vous pouvez aussi tester l'endpoint de santé :
```bash
curl http://localhost:3001/api/health
```

Réponse attendue :
```json
{"status":"ok","database":"connected"}
```

## 8. Résolution des problèmes courants

### Erreur : "psql: error: connection to server failed"

**Solution :** Vérifiez que PostgreSQL est démarré
```bash
# macOS avec Homebrew
brew services start postgresql@14

# Linux
sudo systemctl start postgresql

# Vérifier le statut
pg_isready
```

### Erreur : "password authentication failed"

**Solution :** Vérifiez vos identifiants dans le fichier `.env`
- Assurez-vous que le mot de passe est correct
- Vérifiez que l'utilisateur existe : `psql -U postgres -c "\du"`

### Erreur : "database does not exist"

**Solution :** Créez la base de données
```bash
createdb igca_db
```

### Erreur : "permission denied"

**Solution :** Donnez les permissions à l'utilisateur
```sql
GRANT ALL PRIVILEGES ON DATABASE igca_db TO votre_utilisateur;
```

### Erreur : "port 5432 already in use"

**Solution :** Vérifiez quel processus utilise le port
```bash
# macOS/Linux
lsof -i :5432

# Arrêter PostgreSQL si nécessaire
brew services stop postgresql@14
# Puis redémarrer
brew services start postgresql@14
```

## 9. Commandes utiles PostgreSQL

```bash
# Se connecter à la base de données
psql -d igca_db

# Lister toutes les bases de données
psql -l

# Lister tous les utilisateurs
psql -U postgres -c "\du"

# Sauvegarder la base de données
pg_dump igca_db > backup.sql

# Restaurer la base de données
psql -d igca_db < backup.sql

# Supprimer la base de données (ATTENTION : supprime toutes les données)
dropdb igca_db
```

## 10. Outils graphiques recommandés

Pour faciliter la gestion de PostgreSQL, vous pouvez utiliser :

- **pgAdmin** : https://www.pgadmin.org/
- **DBeaver** : https://dbeaver.io/
- **TablePlus** : https://tableplus.com/ (macOS)
- **Postico** : https://eggerapps.at/postico/ (macOS)

## 11. Sécurité en production

⚠️ **IMPORTANT pour la production :**

1. **Changez le mot de passe par défaut** de l'utilisateur postgres
2. **Utilisez un utilisateur dédié** avec des permissions limitées
3. **Activez SSL** pour les connexions distantes
4. **Configurez un firewall** pour limiter l'accès
5. **Faites des sauvegardes régulières**

Exemple de configuration sécurisée :
```env
DATABASE_URL=postgresql://igca_user:mot_de_passe_fort@localhost:5432/igca_db?sslmode=require
```

## Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs PostgreSQL
2. Consultez la documentation PostgreSQL : https://www.postgresql.org/docs/
3. Vérifiez que tous les services sont démarrés

