import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

const router = express.Router();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

// AUTHENTIFICATION DÉSACTIVÉE
// router.use(authenticate);
// router.use(requireRole('admin', 'super_admin'));

// Liste des dons
router.get('/', async (req, res) => {
  try {
    const {
      date_debut,
      date_fin,
      moyen_paiement,
      search,
      page = '1',
      limit = '50',
    } = req.query;

    let query = `
      SELECT 
        d.*,
        COUNT(*) OVER() as total_count
      FROM dons d
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (date_debut) {
      query += ` AND d.date_don >= $${paramIndex}`;
      params.push(date_debut);
      paramIndex++;
    }

    if (date_fin) {
      query += ` AND d.date_don <= $${paramIndex}`;
      params.push(date_fin);
      paramIndex++;
    }

    if (moyen_paiement) {
      query += ` AND d.moyen_paiement = $${paramIndex}`;
      params.push(moyen_paiement);
      paramIndex++;
    }

    if (search) {
      query += ` AND (
        d.nom ILIKE $${paramIndex} OR
        d.prenom ILIKE $${paramIndex} OR
        d.email ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    query += ` ORDER BY d.date_don DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
      },
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des dons:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Import CSV des dons
router.post('/import', upload.single('csv'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Fichier CSV requis' });
    }

    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Mapping des champs (à adapter selon le format HelloAsso)
    const mappedRecords = records
      .filter((record: any) => {
        // Filtrer uniquement les dons (pas les adhésions)
        const montant = parseFloat(record.Montant || record.montant || '0');
        return montant > 0 && !record['Type']?.includes('adhésion');
      })
      .map((record: any) => ({
        nom: record.Nom || record.nom || '',
        prenom: record.Prénom || record.prenom || '',
        email: record.Email || record.email || '',
        date_don: record['Date'] || record.date_don,
        montant: parseFloat(record.Montant || record.montant || '0'),
        moyen_paiement: record['Moyen de paiement'] || record.moyen_paiement,
        helloasso_id: record['ID HelloAsso'] || record.helloasso_id,
      }));

    // Enregistrer l'import
    const importResult = await pool.query(
      `INSERT INTO imports (user_id, filename, record_count, type, status)
       VALUES ($1, $2, $3, 'dons', 'pending')
       RETURNING id`,
      [1, req.file.originalname, mappedRecords.length] // AUTHENTIFICATION DÉSACTIVÉE - user ID par défaut
    );

    const importId = importResult.rows[0].id;

    res.json({
      success: true,
      importId,
      records: mappedRecords,
      message: 'Fichier importé avec succès. Veuillez valider l\'import.',
    });
  } catch (error: any) {
    logger.error('Erreur lors de l\'import CSV des dons:', error);
    res.status(500).json({ error: 'Erreur lors de l\'import' });
  }
});

// Valider l'import des dons
router.post('/import/:importId/validate', async (req: AuthRequest, res) => {
  try {
    const { importId } = req.params;
    const { records } = req.body;

    let inserted = 0;
    let errors: any[] = [];

    for (const record of records) {
      try {
        await pool.query(
          `INSERT INTO dons (
            nom, prenom, email, date_don, montant, moyen_paiement, helloasso_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (helloasso_id) DO NOTHING`,
          [
            record.nom,
            record.prenom,
            record.email,
            record.date_don,
            record.montant,
            record.moyen_paiement,
            record.helloasso_id,
          ]
        );
        inserted++;
      } catch (error: any) {
        errors.push({ record, error: error.message });
      }
    }

    // Mettre à jour le statut de l'import
    await pool.query(
      'UPDATE imports SET status = $1, processed_at = NOW() WHERE id = $2',
      ['completed', importId]
    );

    logger.info(`Import dons ${importId} validé: ${inserted} insérés`);

    res.json({
      success: true,
      inserted,
      errors,
    });
  } catch (error: any) {
    logger.error('Erreur lors de la validation de l\'import des dons:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Liste récente des dons (pour le dashboard)
router.get('/recent', async (req, res) => {
  try {
    const { limit = '10' } = req.query;

    const result = await pool.query(
      `SELECT 
        id,
        nom,
        prenom,
        email,
        date_don,
        montant,
        moyen_paiement,
        helloasso_id,
        created_at
       FROM dons
       ORDER BY date_don DESC, created_at DESC
       LIMIT $1`,
      [parseInt(limit as string)]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des dons récents:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

