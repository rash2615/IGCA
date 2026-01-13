#!/usr/bin/env node

/**
 * Script pour créer un compte Super Admin sécurisé
 * Génère un mot de passe fort aléatoire et crée le compte
 */

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Fonction pour générer un mot de passe fort
function generateStrongPassword(length = 16) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = uppercase + lowercase + numbers + symbols;

  // S'assurer qu'on a au moins un caractère de chaque type
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Remplir le reste avec des caractères aléatoires
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Mélanger le mot de passe
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

async function createSuperAdmin() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const email = 'admin@igca.paris';
    const nom = 'Administrateur';
    const prenom = 'Super';
    
    // Générer un mot de passe fort de 20 caractères
    const password = generateStrongPassword(20);
    
    // Hasher le mot de passe avec bcrypt (10 rounds)
    const passwordHash = await bcrypt.hash(password, 12);

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await client.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      // Mettre à jour l'utilisateur existant
      await client.query(
        `UPDATE users 
         SET password_hash = $1, 
             nom = $2, 
             prenom = $3, 
             role = 'super_admin',
             is_active = true
         WHERE email = $4`,
        [passwordHash, nom, prenom, email]
      );
      console.log('✅ Compte Super Admin mis à jour avec succès !');
    } else {
      // Créer un nouvel utilisateur
      await client.query(
        `INSERT INTO users (email, password_hash, nom, prenom, role, is_active)
         VALUES ($1, $2, $3, $4, 'super_admin', true)
         RETURNING id, email, nom, prenom, role`,
        [email, passwordHash, nom, prenom]
      );
      console.log('✅ Compte Super Admin créé avec succès !');
    }

    await client.query('COMMIT');

    // Afficher les informations de connexion
    console.log('\n' + '='.repeat(60));
    console.log('🔐 INFORMATIONS DE CONNEXION SUPER ADMIN');
    console.log('='.repeat(60));
    console.log(`📧 Email    : ${email}`);
    console.log(`🔑 Mot de passe : ${password}`);
    console.log('='.repeat(60));
    console.log('\n⚠️  IMPORTANT :');
    console.log('   1. Notez ce mot de passe dans un endroit sûr');
    console.log('   2. Changez-le après la première connexion');
    console.log('   3. Ne partagez jamais ces identifiants');
    console.log('   4. Ce mot de passe ne sera plus affiché');
    console.log('\n💾 Sauvegardez ces informations maintenant !\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur lors de la création du Super Admin:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Exécuter le script
createSuperAdmin().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});

