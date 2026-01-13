#!/usr/bin/env node

/**
 * Script de test de connexion à PostgreSQL
 * Usage: node scripts/test-connection.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
  console.log('🔍 Test de connexion à PostgreSQL...\n');

  try {
    // Test de connexion
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Connexion réussie !\n');
    console.log(`   Heure serveur: ${result.rows[0].current_time}`);
    console.log(`   Version PostgreSQL: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}\n`);

    // Vérifier les tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log(`📊 Tables trouvées (${tablesResult.rows.length}):`);
    tablesResult.rows.forEach((row) => {
      console.log(`   - ${row.table_name}`);
    });

    // Vérifier l'utilisateur admin
    const adminResult = await pool.query(
      "SELECT email, role FROM users WHERE role = 'super_admin'"
    );

    if (adminResult.rows.length > 0) {
      console.log('\n👤 Utilisateur admin trouvé:');
      console.log(`   Email: ${adminResult.rows[0].email}`);
      console.log(`   Rôle: ${adminResult.rows[0].role}`);
    } else {
      console.log('\n⚠️  Aucun utilisateur admin trouvé');
    }

    // Compter les enregistrements
    const counts = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM roles_fonctionnels'),
      pool.query('SELECT COUNT(*) FROM adhesions'),
    ]);

    console.log('\n📈 Statistiques:');
    console.log(`   Utilisateurs: ${counts[0].rows[0].count}`);
    console.log(`   Rôles fonctionnels: ${counts[1].rows[0].count}`);
    console.log(`   Adhésions: ${counts[2].rows[0].count}`);

    console.log('\n✅ Tous les tests sont passés !');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur de connexion:');
    console.error(`   ${error.message}\n`);

    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Vérifiez que PostgreSQL est démarré:');
      console.log('   macOS: brew services start postgresql@14');
      console.log('   Linux: sudo systemctl start postgresql\n');
    } else if (error.code === '28P01') {
      console.log('💡 Vérifiez vos identifiants dans le fichier .env\n');
    } else if (error.code === '3D000') {
      console.log('💡 La base de données n\'existe pas. Créez-la avec:');
      console.log('   createdb igca_db\n');
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();

