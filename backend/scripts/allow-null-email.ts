import { pool } from '../src/config/database';
import dotenv from 'dotenv';

dotenv.config();

async function allowNullEmail() {
  try {
    console.log('🔄 Modification de la colonne email pour permettre NULL...');
    
    // Modifier la colonne email pour permettre NULL
    await pool.query('ALTER TABLE adhesions ALTER COLUMN email DROP NOT NULL');
    
    console.log('✅ Colonne email modifiée avec succès ! Les emails peuvent maintenant être NULL.');
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Erreur lors de la modification:', error.message);
    console.error('\n💡 Si vous avez une erreur de permissions, exécutez cette commande SQL directement :');
    console.error('   ALTER TABLE adhesions ALTER COLUMN email DROP NOT NULL;');
    await pool.end();
    process.exit(1);
  }
}

allowNullEmail();

