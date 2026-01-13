import { pool } from '../src/config/database';
import dotenv from 'dotenv';

dotenv.config();

async function clearAdhesions() {
  try {
    console.log('🗑️  Suppression de toutes les adhésions...');
    
    // Supprimer toutes les adhésions (les cartes seront supprimées automatiquement via CASCADE)
    const result = await pool.query('DELETE FROM adhesions');
    
    console.log(`✅ ${result.rowCount} adhésion(s) supprimée(s)`);
    
    // Optionnel : supprimer aussi les imports
    const importResult = await pool.query('DELETE FROM imports');
    console.log(`✅ ${importResult.rowCount} import(s) supprimé(s)`);
    
    console.log('\n✅ Base de données nettoyée ! Vous pouvez maintenant refaire l\'import.');
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Erreur lors de la suppression:', error.message);
    await pool.end();
    process.exit(1);
  }
}

clearAdhesions();

