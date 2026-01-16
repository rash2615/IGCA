require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  const migrationFile = path.join(__dirname, '../migrations/002_update_adhesions_statut.sql');
  const sql = fs.readFileSync(migrationFile, 'utf8');
  
  try {
    console.log('🔄 Exécution de la migration 002_update_adhesions_statut.sql...');
    await pool.query(sql);
    console.log('✅ Migration exécutée avec succès !');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution de la migration:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();

