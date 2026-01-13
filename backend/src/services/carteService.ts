import { pool } from '../config/database';
import { logger } from '../utils/logger';

export async function generateCarte(adhesion: any) {
  // Générer un numéro de carte unique
  const numeroCarte = await generateNumeroCarte();

  // Créer la carte dans la base de données
  const result = await pool.query(
    `INSERT INTO cartes (
      adhesion_id, numero_carte, statut, date_generation
    ) VALUES ($1, $2, 'generee', NOW())
    RETURNING *`,
    [adhesion.id, numeroCarte]
  );

  logger.info(`Carte générée: ${numeroCarte} pour l'adhérent ${adhesion.id}`);

  return result.rows[0];
}

async function generateNumeroCarte(): Promise<string> {
  // Format: IGCA-YYYY-NNNN (ex: IGCA-2024-0001)
  const year = new Date().getFullYear();
  const prefix = `IGCA-${year}-`;

  // Trouver le dernier numéro de l'année
  const lastCarte = await pool.query(
    `SELECT numero_carte FROM cartes
     WHERE numero_carte LIKE $1
     ORDER BY numero_carte DESC
     LIMIT 1`,
    [`${prefix}%`]
  );

  let nextNumber = 1;
  if (lastCarte.rows.length > 0) {
    const lastNum = lastCarte.rows[0].numero_carte;
    const lastNumber = parseInt(lastNum.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

