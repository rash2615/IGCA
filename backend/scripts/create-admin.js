#!/usr/bin/env node

/**
 * Script pour créer ou réinitialiser l'utilisateur admin
 * Usage: node scripts/create-admin.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createAdmin() {
  console.log('🔧 Création/Réinitialisation de l\'utilisateur admin...\n');

  try {
    const email = 'admin@igca.paris';
    const password = 'admin123';
    const nom = 'Admin';
    const prenom = 'IGCA';

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Mot de passe hashé\n');

    // Vérifier si l'utilisateur existe
    const existingUser = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      console.log('⚠️  L\'utilisateur admin existe déjà. Mise à jour du mot de passe...\n');
      
      // Mettre à jour le mot de passe
      await pool.query(
        'UPDATE users SET password_hash = $1, nom = $2, prenom = $3, role = $4, is_active = true WHERE email = $5',
        [hashedPassword, nom, prenom, 'super_admin', email]
      );
      
      console.log('✅ Mot de passe de l\'admin mis à jour\n');
    } else {
      console.log('📝 Création du nouvel utilisateur admin...\n');
      
      // Créer l'utilisateur
      await pool.query(
        `INSERT INTO users (email, password_hash, nom, prenom, role, is_active)
         VALUES ($1, $2, $3, $4, 'super_admin', true)`,
        [email, hashedPassword, nom, prenom]
      );
      
      console.log('✅ Utilisateur admin créé\n');
    }

    console.log('========================================');
    console.log('✅ Configuration terminée !');
    console.log('========================================\n');
    console.log('Identifiants de connexion :');
    console.log(`  Email: ${email}`);
    console.log(`  Mot de passe: ${password}\n`);
    console.log('⚠️  IMPORTANT : Changez ce mot de passe après la première connexion !\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error('\nDétails:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createAdmin();

