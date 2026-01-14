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

// Statistiques des dons
router.get('/stats', async (req, res) => {
  try {
    const { annee } = req.query;

    let dateFilter = '';
    const params: any[] = [];
    if (annee) {
      dateFilter = 'WHERE EXTRACT(YEAR FROM date_don) = $1';
      params.push(annee);
    }

    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COALESCE(SUM(montant), 0) as total_montant,
        COUNT(DISTINCT EXTRACT(MONTH FROM date_don)) as mois_avec_dons,
        AVG(montant) as montant_moyen,
        MAX(montant) as montant_max,
        MIN(montant) as montant_min
       FROM dons
       ${dateFilter}`,
      params
    );

    const moyenPaiementResult = await pool.query(
      `SELECT 
        moyen_paiement,
        COUNT(*) as count,
        COALESCE(SUM(montant), 0) as total
       FROM dons
       ${dateFilter}
       GROUP BY moyen_paiement
       ORDER BY total DESC`,
      params
    );

    res.json({
      success: true,
      data: {
        stats: statsResult.rows[0],
        moyen_paiement: moyenPaiementResult.rows,
      },
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des statistiques des dons:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Détails d'un don
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM dons WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Don introuvable' });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération du don:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un don
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { nom, prenom, email, date_don, montant, moyen_paiement, helloasso_id } = req.body;

    if (!date_don || !montant) {
      return res.status(400).json({ error: 'Date et montant requis' });
    }

    const result = await pool.query(
      `INSERT INTO dons (nom, prenom, email, date_don, montant, moyen_paiement, helloasso_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [nom || null, prenom || null, email || null, date_don, montant, moyen_paiement || null, helloasso_id || null]
    );

    logger.info(`Don créé: ${result.rows[0].id}`);
    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Erreur lors de la création du don:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier un don
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { nom, prenom, email, date_don, montant, moyen_paiement, helloasso_id } = req.body;

    const result = await pool.query(
      `UPDATE dons 
       SET nom = $1, prenom = $2, email = $3, date_don = $4, montant = $5, moyen_paiement = $6, helloasso_id = $7
       WHERE id = $8
       RETURNING *`,
      [nom || null, prenom || null, email || null, date_don, montant, moyen_paiement || null, helloasso_id || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Don introuvable' });
    }

    logger.info(`Don modifié: ${id}`);
    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Erreur lors de la modification du don:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un don
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM dons WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Don introuvable' });
    }

    logger.info(`Don supprimé: ${id}`);
    res.json({
      success: true,
      message: 'Don supprimé avec succès',
    });
  } catch (error: any) {
    logger.error('Erreur lors de la suppression du don:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Export CSV des dons
router.get('/export/csv', async (req, res) => {
  try {
    const {
      date_debut,
      date_fin,
      moyen_paiement,
      search,
    } = req.query;

    let query = `
      SELECT 
        nom,
        prenom,
        email,
        date_don,
        montant,
        moyen_paiement,
        helloasso_id
      FROM dons
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (date_debut) {
      query += ` AND date_don >= $${paramIndex}`;
      params.push(date_debut);
      paramIndex++;
    }

    if (date_fin) {
      query += ` AND date_don <= $${paramIndex}`;
      params.push(date_fin);
      paramIndex++;
    }

    if (moyen_paiement) {
      query += ` AND moyen_paiement = $${paramIndex}`;
      params.push(moyen_paiement);
      paramIndex++;
    }

    if (search) {
      query += ` AND (
        nom ILIKE $${paramIndex} OR
        prenom ILIKE $${paramIndex} OR
        email ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY date_don DESC`;

    const result = await pool.query(query, params);

    // Helper function to escape CSV values
    function escapeCsvValue(value: any): string {
      if (value === null || value === undefined) {
        return '';
      }
      let stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }

    const csvRows = [
      ['Nom', 'Prénom', 'Email', 'Date don', 'Montant', 'Moyen de paiement', 'HelloAsso ID'].map(escapeCsvValue).join(','),
      ...result.rows.map((row) =>
        [
          row.nom || '',
          row.prenom || '',
          row.email || '',
          row.date_don,
          row.montant,
          row.moyen_paiement || '',
          row.helloasso_id || '',
        ].map(escapeCsvValue).join(',')
      ),
    ];
    const csv = csvRows.join('\n');
    const bom = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=dons_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(bom + csv);
  } catch (error: any) {
    logger.error('Erreur lors de l\'export CSV des dons:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

