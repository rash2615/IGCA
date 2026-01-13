import express from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

const router = express.Router();
// AUTHENTIFICATION DÉSACTIVÉE
// router.use(authenticate);
// router.use(requireRole('admin', 'super_admin'));

// Vue globale des paiements
router.get('/overview', async (req, res) => {
  try {
    const { date_debut, date_fin } = req.query;

    // Filtres pour adhésions
    let adhesionsDateFilter = '';
    const adhesionsParams: any[] = [];
    if (date_debut && date_fin) {
      adhesionsDateFilter = 'WHERE date_adhesion BETWEEN $1 AND $2';
      adhesionsParams.push(date_debut, date_fin);
    }

    // Filtres pour dons
    let donsDateFilter = '';
    const donsParams: any[] = [];
    if (date_debut && date_fin) {
      donsDateFilter = 'WHERE date_don BETWEEN $1 AND $2';
      donsParams.push(date_debut, date_fin);
    }

    // Adhésions
    const adhesionsResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COALESCE(SUM(tarif), 0) as total_montant,
        COUNT(*) FILTER (WHERE moyen_paiement = 'especes') as especes_count,
        COUNT(*) FILTER (WHERE moyen_paiement = 'cheque') as cheque_count,
        COUNT(*) FILTER (WHERE moyen_paiement = 'cb') as cb_count,
        COUNT(*) FILTER (WHERE moyen_paiement = 'virement') as virement_count,
        COUNT(*) FILTER (WHERE moyen_paiement = 'helloasso') as helloasso_count,
        COALESCE(SUM(tarif) FILTER (WHERE moyen_paiement = 'especes'), 0) as especes_montant,
        COALESCE(SUM(tarif) FILTER (WHERE moyen_paiement = 'cheque'), 0) as cheque_montant,
        COALESCE(SUM(tarif) FILTER (WHERE moyen_paiement = 'cb'), 0) as cb_montant,
        COALESCE(SUM(tarif) FILTER (WHERE moyen_paiement = 'virement'), 0) as virement_montant,
        COALESCE(SUM(tarif) FILTER (WHERE moyen_paiement = 'helloasso'), 0) as helloasso_montant
       FROM adhesions
       ${adhesionsDateFilter}`,
      adhesionsParams
    );

    // Dons
    const donsResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COALESCE(SUM(montant), 0) as total_montant,
        COUNT(*) FILTER (WHERE moyen_paiement = 'especes') as especes_count,
        COUNT(*) FILTER (WHERE moyen_paiement = 'cheque') as cheque_count,
        COUNT(*) FILTER (WHERE moyen_paiement = 'cb') as cb_count,
        COUNT(*) FILTER (WHERE moyen_paiement = 'virement') as virement_count,
        COUNT(*) FILTER (WHERE moyen_paiement = 'helloasso') as helloasso_count,
        COALESCE(SUM(montant) FILTER (WHERE moyen_paiement = 'especes'), 0) as especes_montant,
        COALESCE(SUM(montant) FILTER (WHERE moyen_paiement = 'cheque'), 0) as cheque_montant,
        COALESCE(SUM(montant) FILTER (WHERE moyen_paiement = 'cb'), 0) as cb_montant,
        COALESCE(SUM(montant) FILTER (WHERE moyen_paiement = 'virement'), 0) as virement_montant,
        COALESCE(SUM(montant) FILTER (WHERE moyen_paiement = 'helloasso'), 0) as helloasso_montant
       FROM dons
       ${donsDateFilter}`,
      donsParams
    );

    const adhesions = adhesionsResult.rows[0] || {};
    const dons = donsResult.rows[0] || {};

    res.json({
      success: true,
      data: {
        adhesions: {
          total: parseInt(adhesions.total) || 0,
          total_montant: parseFloat(adhesions.total_montant) || 0,
          par_moyen_paiement: {
            especes: {
              count: parseInt(adhesions.especes_count) || 0,
              montant: parseFloat(adhesions.especes_montant) || 0,
            },
            cheque: {
              count: parseInt(adhesions.cheque_count) || 0,
              montant: parseFloat(adhesions.cheque_montant) || 0,
            },
            cb: {
              count: parseInt(adhesions.cb_count) || 0,
              montant: parseFloat(adhesions.cb_montant) || 0,
            },
            virement: {
              count: parseInt(adhesions.virement_count) || 0,
              montant: parseFloat(adhesions.virement_montant) || 0,
            },
            helloasso: {
              count: parseInt(adhesions.helloasso_count) || 0,
              montant: parseFloat(adhesions.helloasso_montant) || 0,
            },
          },
        },
        dons: {
          total: parseInt(dons.total) || 0,
          total_montant: parseFloat(dons.total_montant) || 0,
          par_moyen_paiement: {
            especes: {
              count: parseInt(dons.especes_count) || 0,
              montant: parseFloat(dons.especes_montant) || 0,
            },
            cheque: {
              count: parseInt(dons.cheque_count) || 0,
              montant: parseFloat(dons.cheque_montant) || 0,
            },
            cb: {
              count: parseInt(dons.cb_count) || 0,
              montant: parseFloat(dons.cb_montant) || 0,
            },
            virement: {
              count: parseInt(dons.virement_count) || 0,
              montant: parseFloat(dons.virement_montant) || 0,
            },
            helloasso: {
              count: parseInt(dons.helloasso_count) || 0,
              montant: parseFloat(dons.helloasso_montant) || 0,
            },
          },
        },
      },
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération de la vue comptable:', error);
    logger.error('Détails de l\'erreur:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      error: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Répartition par tarif (adhésions)
router.get('/adhesions/tarifs', async (req, res) => {
  try {
    const { date_debut, date_fin } = req.query;

    let dateFilter = '';
    const params: any[] = [];
    if (date_debut && date_fin) {
      dateFilter = 'WHERE date_adhesion BETWEEN $1 AND $2';
      params.push(date_debut, date_fin);
    }

    const result = await pool.query(
      `SELECT 
        tarif,
        COUNT(*) as count,
        SUM(tarif) as total_montant
       FROM adhesions
       ${dateFilter}
       GROUP BY tarif
       ORDER BY tarif DESC`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des tarifs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Export comptable CSV
router.get('/export/csv', async (req, res) => {
  try {
    const { date_debut, date_fin, type } = req.query; // type: 'adhesions' | 'dons' | 'all'

    let csv = '';

    if (type === 'adhesions' || type === 'all') {
      let query = 'SELECT * FROM adhesions WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (date_debut) {
        query += ` AND date_adhesion >= $${paramIndex}`;
        params.push(date_debut);
        paramIndex++;
      }

      if (date_fin) {
        query += ` AND date_adhesion <= $${paramIndex}`;
        params.push(date_fin);
        paramIndex++;
      }

      const adhesionsResult = await pool.query(query, params);

      csv += '=== ADHÉSIONS ===\n';
      csv += 'Nom,Prénom,Email,Date,Tarif,Moyen de paiement\n';
      csv += adhesionsResult.rows
        .map(
          (row) =>
            `${row.nom},${row.prenom},${row.email},${row.date_adhesion},${row.tarif},${row.moyen_paiement}`
        )
        .join('\n');
      csv += '\n\n';
    }

    if (type === 'dons' || type === 'all') {
      let query = 'SELECT * FROM dons WHERE 1=1';
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

      const donsResult = await pool.query(query, params);

      csv += '=== DONS ===\n';
      csv += 'Nom,Prénom,Email,Date,Montant,Moyen de paiement\n';
      csv += donsResult.rows
        .map(
          (row) =>
            `${row.nom || ''},${row.prenom || ''},${row.email || ''},${row.date_don},${row.montant},${row.moyen_paiement}`
        )
        .join('\n');
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=comptabilite.csv');
    res.send(csv);
  } catch (error: any) {
    logger.error('Erreur lors de l\'export comptable:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Statistiques de paiements par année (pour le dashboard)
router.get('/paiements-annee', async (req, res) => {
  try {
    const { annee } = req.query;
    const year = annee || new Date().getFullYear().toString();

    // Adhésions de l'année avec calculs précis
    const adhesionsResult = await pool.query(
      `SELECT 
        moyen_paiement,
        COUNT(*) as count,
        COALESCE(SUM(tarif), 0) as montant
       FROM adhesions
       WHERE EXTRACT(YEAR FROM date_adhesion) = $1
       GROUP BY moyen_paiement
       ORDER BY montant DESC`,
      [year]
    );

    // Dons de l'année
    const donsResult = await pool.query(
      `SELECT 
        moyen_paiement,
        COUNT(*) as count,
        COALESCE(SUM(montant), 0) as montant
       FROM dons
       WHERE EXTRACT(YEAR FROM date_don) = $1
       GROUP BY moyen_paiement
       ORDER BY montant DESC`,
      [year]
    );

    // Combiner adhésions et dons par moyen de paiement
    const paiements: Record<string, { count: number; montant: number }> = {};

    adhesionsResult.rows.forEach((row: any) => {
      const moyen = row.moyen_paiement || 'autre';
      if (!paiements[moyen]) {
        paiements[moyen] = { count: 0, montant: 0 };
      }
      paiements[moyen].count += parseInt(row.count) || 0;
      paiements[moyen].montant += parseFloat(row.montant) || 0;
    });

    donsResult.rows.forEach((row: any) => {
      const moyen = row.moyen_paiement || 'autre';
      if (!paiements[moyen]) {
        paiements[moyen] = { count: 0, montant: 0 };
      }
      paiements[moyen].count += parseInt(row.count) || 0;
      paiements[moyen].montant += parseFloat(row.montant) || 0;
    });

    res.json({
      success: true,
      data: {
        annee: year,
        paiements,
        total_montant: Object.values(paiements).reduce((sum, p) => sum + p.montant, 0),
        total_count: Object.values(paiements).reduce((sum, p) => sum + p.count, 0),
      },
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des paiements par année:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

