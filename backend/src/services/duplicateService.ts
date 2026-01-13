import { pool } from '../config/database';
import { logger } from '../utils/logger';

export interface DuplicateMatch {
  record: any;
  matches: Array<{
    id: number;
    nom: string;
    prenom: string;
    email: string;
    similarity: number;
  }>;
}

export async function detectDuplicates(records: any[]): Promise<DuplicateMatch[]> {
  const duplicates: DuplicateMatch[] = [];

  for (const record of records) {
    const matches: any[] = [];

    // Recherche par email (identifiant unique)
    if (record.email) {
      const emailMatches = await pool.query(
        'SELECT id, nom, prenom, email FROM adhesions WHERE email = $1',
        [record.email]
      );

      if (emailMatches.rows.length > 0) {
        matches.push(...emailMatches.rows.map((row) => ({
          ...row,
          similarity: 100,
          matchType: 'email',
        })));
      }
    }

    // Recherche par HelloAsso ID
    if (record.helloasso_id) {
      const helloassoMatches = await pool.query(
        'SELECT id, nom, prenom, email FROM adhesions WHERE helloasso_id = $1',
        [record.helloasso_id]
      );

      if (helloassoMatches.rows.length > 0) {
        matches.push(...helloassoMatches.rows.map((row) => ({
          ...row,
          similarity: 100,
          matchType: 'helloasso_id',
        })));
      }
    }

    // Recherche par nom + prénom (similarité)
    if (record.nom && record.prenom) {
      const nameMatches = await pool.query(
        `SELECT id, nom, prenom, email,
         CASE
           WHEN LOWER(nom) = LOWER($1) AND LOWER(prenom) = LOWER($2) THEN 100
           WHEN LOWER(nom) = LOWER($1) OR LOWER(prenom) = LOWER($2) THEN 50
           ELSE 0
         END as similarity
         FROM adhesions
         WHERE (LOWER(nom) = LOWER($1) AND LOWER(prenom) = LOWER($2))
            OR (LOWER(nom) = LOWER($1) AND LOWER(prenom) != LOWER($2))
            OR (LOWER(nom) != LOWER($1) AND LOWER(prenom) = LOWER($2))
         LIMIT 5`,
        [record.nom, record.prenom]
      );

      // Filtrer les doublons déjà trouvés par email
      const newMatches = nameMatches.rows.filter(
        (match) => !matches.some((m) => m.id === match.id)
      );

      matches.push(...newMatches.map((row) => ({
        id: row.id,
        nom: row.nom,
        prenom: row.prenom,
        email: row.email,
        similarity: row.similarity,
        matchType: 'name',
      })));
    }

    if (matches.length > 0) {
      duplicates.push({
        record,
        matches: matches,
      });
    }
  }

  return duplicates;
}

export async function linkRenewal(existingAdhesionId: number, newRecord: any) {
  // Créer une nouvelle adhésion liée à l'existante
  const result = await pool.query(
    `INSERT INTO adhesions (
      nom, prenom, email, telephone, date_adhesion,
      tarif, moyen_paiement, helloasso_id, photo_url, statut, linked_to_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'actif', $10)
    RETURNING id`,
    [
      newRecord.nom,
      newRecord.prenom,
      newRecord.email,
      newRecord.telephone,
      newRecord.date_adhesion,
      newRecord.tarif,
      newRecord.moyen_paiement,
      newRecord.helloasso_id,
      newRecord.photo_url,
      existingAdhesionId,
    ]
  );

  // Mettre à jour le statut de l'ancienne adhésion
  await pool.query(
    'UPDATE adhesions SET statut = $1 WHERE id = $2',
    ['renouvele', existingAdhesionId]
  );

  logger.info(`Renouvellement lié: ${existingAdhesionId} -> ${result.rows[0].id}`);

  return result.rows[0];
}

