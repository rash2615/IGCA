import express from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

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

// ========== GESTION DES DÉPENSES ==========

// Liste des catégories de dépenses
router.get('/depenses/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM depense_categories WHERE is_active = true ORDER BY nom'
    );
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer une catégorie
router.post('/depenses/categories', async (req, res) => {
  try {
    const { nom, description, couleur } = req.body;
    if (!nom) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }
    const result = await pool.query(
      'INSERT INTO depense_categories (nom, description, couleur) VALUES ($1, $2, $3) RETURNING *',
      [nom, description || null, couleur || '#667eea']
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Cette catégorie existe déjà' });
    }
    logger.error('Erreur lors de la création de la catégorie:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Liste des dépenses
router.get('/depenses', async (req, res) => {
  try {
    const { date_debut, date_fin, categorie_id, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        d.*,
        dc.nom as categorie_nom,
        dc.couleur as categorie_couleur,
        u.nom as created_by_nom,
        u.prenom as created_by_prenom
      FROM depenses d
      LEFT JOIN depense_categories dc ON d.categorie_id = dc.id
      LEFT JOIN users u ON d.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (date_debut) {
      query += ` AND d.date_depense >= $${paramIndex}`;
      params.push(date_debut);
      paramIndex++;
    }
    if (date_fin) {
      query += ` AND d.date_depense <= $${paramIndex}`;
      params.push(date_fin);
      paramIndex++;
    }
    if (categorie_id) {
      query += ` AND d.categorie_id = $${paramIndex}`;
      params.push(categorie_id);
      paramIndex++;
    }

    query += ` ORDER BY d.date_depense DESC, d.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);

    // Compter le total
    let countQuery = 'SELECT COUNT(*) FROM depenses WHERE 1=1';
    const countParams: any[] = [];
    let countParamIndex = 1;
    if (date_debut) {
      countQuery += ` AND date_depense >= $${countParamIndex}`;
      countParams.push(date_debut);
      countParamIndex++;
    }
    if (date_fin) {
      countQuery += ` AND date_depense <= $${countParamIndex}`;
      countParams.push(date_fin);
      countParamIndex++;
    }
    if (categorie_id) {
      countQuery += ` AND categorie_id = $${countParamIndex}`;
      countParams.push(categorie_id);
    }
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des dépenses:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer une dépense
router.post('/depenses', async (req: AuthRequest, res) => {
  try {
    const { libelle, description, montant, categorie_id, date_depense, moyen_paiement, facture_url } = req.body;
    
    if (!libelle || !montant || !date_depense) {
      return res.status(400).json({ error: 'Libellé, montant et date sont requis' });
    }

    const result = await pool.query(
      `INSERT INTO depenses (libelle, description, montant, categorie_id, date_depense, moyen_paiement, facture_url, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [libelle, description || null, montant, categorie_id || null, date_depense, moyen_paiement || null, facture_url || null, req.user?.id || null]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    logger.error('Erreur lors de la création de la dépense:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier une dépense
router.put('/depenses/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { libelle, description, montant, categorie_id, date_depense, moyen_paiement, facture_url } = req.body;

    const result = await pool.query(
      `UPDATE depenses 
       SET libelle = $1, description = $2, montant = $3, categorie_id = $4, 
           date_depense = $5, moyen_paiement = $6, facture_url = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [libelle, description || null, montant, categorie_id || null, date_depense, moyen_paiement || null, facture_url || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dépense introuvable' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    logger.error('Erreur lors de la modification de la dépense:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer une dépense
router.delete('/depenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM depenses WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dépense introuvable' });
    }

    res.json({ success: true, message: 'Dépense supprimée' });
  } catch (error: any) {
    logger.error('Erreur lors de la suppression de la dépense:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Statistiques des dépenses
router.get('/depenses/stats', async (req, res) => {
  try {
    const { date_debut, date_fin } = req.query;

    let dateFilter = '';
    const params: any[] = [];
    if (date_debut && date_fin) {
      dateFilter = 'WHERE date_depense BETWEEN $1 AND $2';
      params.push(date_debut, date_fin);
    }

    // Total des dépenses
    const totalResult = await pool.query(
      `SELECT COALESCE(SUM(montant), 0) as total FROM depenses ${dateFilter}`,
      params
    );

    // Par catégorie
    let categorieQuery = `
      SELECT 
        dc.id,
        dc.nom,
        dc.couleur,
        COALESCE(SUM(d.montant), 0) as total,
        COUNT(d.id) as count
       FROM depense_categories dc
       LEFT JOIN depenses d ON dc.id = d.categorie_id`;
    
    if (dateFilter) {
      categorieQuery += ` AND d.date_depense BETWEEN $1 AND $2`;
    }
    
    categorieQuery += ` WHERE dc.is_active = true
       GROUP BY dc.id, dc.nom, dc.couleur
       ORDER BY total DESC`;
    
    const categorieResult = await pool.query(
      categorieQuery,
      dateFilter ? params : []
    );

    // Par moyen de paiement
    const moyenResult = await pool.query(
      `SELECT 
        moyen_paiement,
        COALESCE(SUM(montant), 0) as total,
        COUNT(*) as count
       FROM depenses
       ${dateFilter}
       GROUP BY moyen_paiement
       ORDER BY total DESC`,
      params
    );

    res.json({
      success: true,
      data: {
        total: parseFloat(totalResult.rows[0].total) || 0,
        par_categorie: categorieResult.rows,
        par_moyen_paiement: moyenResult.rows,
      },
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des stats de dépenses:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========== GESTION DES CRÉDITS ==========

// Liste des crédits
router.get('/credits', async (req, res) => {
  try {
    const { date_debut, date_fin, type_credit, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        c.*,
        u.nom as created_by_nom,
        u.prenom as created_by_prenom
      FROM credits c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (date_debut) {
      query += ` AND c.date_credit >= $${paramIndex}`;
      params.push(date_debut);
      paramIndex++;
    }
    if (date_fin) {
      query += ` AND c.date_credit <= $${paramIndex}`;
      params.push(date_fin);
      paramIndex++;
    }
    if (type_credit) {
      query += ` AND c.type_credit = $${paramIndex}`;
      params.push(type_credit);
      paramIndex++;
    }

    query += ` ORDER BY c.date_credit DESC, c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);

    // Compter le total
    let countQuery = 'SELECT COUNT(*) FROM credits WHERE 1=1';
    const countParams: any[] = [];
    let countParamIndex = 1;
    if (date_debut) {
      countQuery += ` AND date_credit >= $${countParamIndex}`;
      countParams.push(date_debut);
      countParamIndex++;
    }
    if (date_fin) {
      countQuery += ` AND date_credit <= $${countParamIndex}`;
      countParams.push(date_fin);
      countParamIndex++;
    }
    if (type_credit) {
      countQuery += ` AND type_credit = $${countParamIndex}`;
      countParams.push(type_credit);
    }
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des crédits:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un crédit
router.post('/credits', async (req: AuthRequest, res) => {
  try {
    const { libelle, description, montant, type_credit, date_credit, moyen_reception, reference } = req.body;
    
    if (!libelle || !montant || !date_credit) {
      return res.status(400).json({ error: 'Libellé, montant et date sont requis' });
    }

    const result = await pool.query(
      `INSERT INTO credits (libelle, description, montant, type_credit, date_credit, moyen_reception, reference, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [libelle, description || null, montant, type_credit || 'autre', date_credit, moyen_reception || null, reference || null, req.user?.id || null]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    logger.error('Erreur lors de la création du crédit:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier un crédit
router.put('/credits/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { libelle, description, montant, type_credit, date_credit, moyen_reception, reference } = req.body;

    const result = await pool.query(
      `UPDATE credits 
       SET libelle = $1, description = $2, montant = $3, type_credit = $4, 
           date_credit = $5, moyen_reception = $6, reference = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [libelle, description || null, montant, type_credit || 'autre', date_credit, moyen_reception || null, reference || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Crédit introuvable' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    logger.error('Erreur lors de la modification du crédit:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un crédit
router.delete('/credits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM credits WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Crédit introuvable' });
    }

    res.json({ success: true, message: 'Crédit supprimé' });
  } catch (error: any) {
    logger.error('Erreur lors de la suppression du crédit:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========== GESTION DES BILANS ==========

// Liste des bilans
router.get('/bilans', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const result = await pool.query(
      `SELECT 
        b.*,
        u.nom as created_by_nom,
        u.prenom as created_by_prenom
       FROM bilans b
       LEFT JOIN users u ON b.created_by = u.id
       ORDER BY b.date_debut DESC, b.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit as string), parseInt(offset as string)]
    );

    const countResult = await pool.query('SELECT COUNT(*) FROM bilans');
    
    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des bilans:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir un bilan spécifique
router.get('/bilans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bilanResult = await pool.query(
      `SELECT 
        b.*,
        u.nom as created_by_nom,
        u.prenom as created_by_prenom
       FROM bilans b
       LEFT JOIN users u ON b.created_by = u.id
       WHERE b.id = $1`,
      [id]
    );

    if (bilanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bilan introuvable' });
    }

    const bilan = bilanResult.rows[0];

    // Récupérer les dépenses liées
    const depensesResult = await pool.query(
      `SELECT d.*, dc.nom as categorie_nom, dc.couleur as categorie_couleur
       FROM depenses d
       LEFT JOIN depense_categories dc ON d.categorie_id = dc.id
       INNER JOIN bilan_depenses bd ON d.id = bd.depense_id
       WHERE bd.bilan_id = $1
       ORDER BY d.date_depense DESC`,
      [id]
    );

    // Récupérer les crédits liés
    const creditsResult = await pool.query(
      `SELECT c.*
       FROM credits c
       INNER JOIN bilan_credits bc ON c.id = bc.credit_id
       WHERE bc.bilan_id = $1
       ORDER BY c.date_credit DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...bilan,
        depenses: depensesResult.rows,
        credits: creditsResult.rows,
      },
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération du bilan:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Générer un bilan
router.post('/bilans/generate', async (req: AuthRequest, res) => {
  try {
    const { titre, date_debut, date_fin, type_bilan, notes } = req.body;

    if (!date_debut || !date_fin) {
      return res.status(400).json({ error: 'Les dates de début et de fin sont requises' });
    }

    // Calculer les revenus automatiques (adhésions + dons)
    const adhesionsResult = await pool.query(
      `SELECT COALESCE(SUM(tarif), 0) as total
       FROM adhesions
       WHERE date_adhesion BETWEEN $1 AND $2`,
      [date_debut, date_fin]
    );

    const donsResult = await pool.query(
      `SELECT COALESCE(SUM(montant), 0) as total
       FROM dons
       WHERE date_don BETWEEN $1 AND $2`,
      [date_debut, date_fin]
    );

    // Calculer les crédits manuels
    const creditsResult = await pool.query(
      `SELECT COALESCE(SUM(montant), 0) as total
       FROM credits
       WHERE date_credit BETWEEN $1 AND $2`,
      [date_debut, date_fin]
    );

    const revenus_automatiques = parseFloat(adhesionsResult.rows[0].total) + parseFloat(donsResult.rows[0].total);
    const credits_manuels = parseFloat(creditsResult.rows[0].total) || 0;
    const total_revenus = revenus_automatiques + credits_manuels;

    // Calculer les dépenses
    const depensesResult = await pool.query(
      `SELECT COALESCE(SUM(montant), 0) as total
       FROM depenses
       WHERE date_depense BETWEEN $1 AND $2`,
      [date_debut, date_fin]
    );

    const total_depenses = parseFloat(depensesResult.rows[0].total) || 0;
    const solde = total_revenus - total_depenses;

    // Récupérer toutes les dépenses de la période
    const allDepensesResult = await pool.query(
      `SELECT d.*, dc.nom as categorie_nom, dc.couleur as categorie_couleur
       FROM depenses d
       LEFT JOIN depense_categories dc ON d.categorie_id = dc.id
       WHERE d.date_depense BETWEEN $1 AND $2
       ORDER BY d.date_depense DESC`,
      [date_debut, date_fin]
    );

    // Récupérer tous les crédits de la période
    const allCreditsResult = await pool.query(
      `SELECT *
       FROM credits
       WHERE date_credit BETWEEN $1 AND $2
       ORDER BY date_credit DESC`,
      [date_debut, date_fin]
    );

    // Créer le bilan
    const bilanResult = await pool.query(
      `INSERT INTO bilans (titre, date_debut, date_fin, type_bilan, total_revenus, total_depenses, solde, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        titre || `Bilan ${type_bilan || 'personnalise'} ${date_debut} - ${date_fin}`,
        date_debut,
        date_fin,
        type_bilan || 'personnalise',
        total_revenus,
        total_depenses,
        solde,
        notes || null,
        req.user?.id || null,
      ]
    );

    const bilan = bilanResult.rows[0];

    // Lier les dépenses au bilan
    if (allDepensesResult.rows.length > 0) {
      const values = allDepensesResult.rows.map((_, index) => `($1, $${index + 2})`).join(', ');
      const depenseIds = allDepensesResult.rows.map((d) => d.id);
      await pool.query(
        `INSERT INTO bilan_depenses (bilan_id, depense_id) VALUES ${values}`,
        [bilan.id, ...depenseIds]
      );
    }

    // Lier les crédits au bilan
    if (allCreditsResult.rows.length > 0) {
      const values = allCreditsResult.rows.map((_, index) => `($1, $${index + 2})`).join(', ');
      const creditIds = allCreditsResult.rows.map((c) => c.id);
      await pool.query(
        `INSERT INTO bilan_credits (bilan_id, credit_id) VALUES ${values}`,
        [bilan.id, ...creditIds]
      );
    }

    res.json({
      success: true,
      data: {
        ...bilan,
        depenses: allDepensesResult.rows,
        credits: allCreditsResult.rows,
        revenus_automatiques,
        credits_manuels,
      },
    });
  } catch (error: any) {
    logger.error('Erreur lors de la génération du bilan:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Générer le PDF d'un bilan
router.get('/bilans/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Début de la génération du PDF pour le bilan ${id}`);

    // Récupérer le bilan avec ses détails
    const bilanResult = await pool.query(
      `SELECT 
        b.*,
        u.nom as created_by_nom,
        u.prenom as created_by_prenom
       FROM bilans b
       LEFT JOIN users u ON b.created_by = u.id
       WHERE b.id = $1`,
      [id]
    );

    if (bilanResult.rows.length === 0) {
      logger.warn(`Bilan ${id} introuvable`);
      return res.status(404).json({ error: 'Bilan introuvable' });
    }

    const bilan = bilanResult.rows[0];
    logger.info(`Bilan trouvé: ${bilan.titre}, période: ${bilan.date_debut} - ${bilan.date_fin}`);

    // Récupérer les revenus détaillés
    logger.info(`Récupération des adhésions pour la période ${bilan.date_debut} - ${bilan.date_fin}`);
    const adhesionsResult = await pool.query(
      `SELECT 
        COUNT(*) as count,
        COALESCE(SUM(tarif), 0) as total
       FROM adhesions
       WHERE date_adhesion BETWEEN $1 AND $2`,
      [bilan.date_debut, bilan.date_fin]
    );
    logger.info(`Adhésions trouvées: ${adhesionsResult.rows.length} résultat(s)`);

    logger.info(`Récupération des dons pour la période ${bilan.date_debut} - ${bilan.date_fin}`);
    const donsResult = await pool.query(
      `SELECT 
        COUNT(*) as count,
        COALESCE(SUM(montant), 0) as total
       FROM dons
       WHERE date_don BETWEEN $1 AND $2`,
      [bilan.date_debut, bilan.date_fin]
    );
    logger.info(`Dons trouvés: ${donsResult.rows.length} résultat(s)`);

    // Récupérer les dépenses par catégorie
    logger.info(`Récupération des dépenses par catégorie pour le bilan ${id}`);
    const depensesCategorieResult = await pool.query(
      `SELECT 
        dc.nom as categorie,
        dc.couleur,
        COALESCE(SUM(d.montant), 0) as total,
        COUNT(d.id) as count
       FROM depenses d
       LEFT JOIN depense_categories dc ON d.categorie_id = dc.id
       INNER JOIN bilan_depenses bd ON d.id = bd.depense_id
       WHERE bd.bilan_id = $1
       GROUP BY dc.id, dc.nom, dc.couleur
       ORDER BY total DESC`,
      [id]
    );
    logger.info(`Dépenses par catégorie trouvées: ${depensesCategorieResult.rows.length} catégorie(s)`);

    // Récupérer toutes les dépenses
    const depensesResult = await pool.query(
      `SELECT d.*, dc.nom as categorie_nom
       FROM depenses d
       LEFT JOIN depense_categories dc ON d.categorie_id = dc.id
       INNER JOIN bilan_depenses bd ON d.id = bd.depense_id
       WHERE bd.bilan_id = $1
       ORDER BY d.date_depense DESC`,
      [id]
    );

    // Récupérer les crédits manuels
    const creditsResult = await pool.query(
      `SELECT 
        COUNT(*) as count,
        COALESCE(SUM(montant), 0) as total
       FROM credits
       WHERE date_credit BETWEEN $1 AND $2`,
      [bilan.date_debut, bilan.date_fin]
    );

    // Récupérer tous les crédits détaillés
    const allCreditsResult = await pool.query(
      `SELECT c.*
       FROM credits c
       INNER JOIN bilan_credits bc ON c.id = bc.credit_id
       WHERE bc.bilan_id = $1
       ORDER BY c.date_credit DESC`,
      [id]
    ).catch((err) => {
      logger.error('Erreur lors de la récupération des crédits détaillés:', err);
      return { rows: [] };
    });

    // Générer le PDF
    logger.info(`Début de la création du document PDF`);
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers: Buffer[] = [];
    
    doc.on('data', (chunk: Buffer) => {
      buffers.push(chunk);
    });
    
    doc.on('end', () => {
      try {
        logger.info(`PDF terminé, concaténation des buffers (${buffers.length} chunks)`);
        const pdfBuffer = Buffer.concat(buffers);
        logger.info(`PDF généré pour le bilan ${id}, taille: ${pdfBuffer.length} bytes`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=bilan_${bilan.id}_${bilan.date_debut}_${bilan.date_fin}.pdf`);
        res.setHeader('Content-Length', pdfBuffer.length.toString());
        res.send(pdfBuffer);
        logger.info(`PDF envoyé avec succès`);
      } catch (error: any) {
        logger.error('Erreur lors de l\'envoi du PDF:', error);
        logger.error('Stack trace:', error.stack);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Erreur lors de la génération du PDF' });
        }
      }
    });
    
    doc.on('error', (error: any) => {
      logger.error('Erreur PDFKit:', error);
      logger.error('Stack trace:', error.stack);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur lors de la génération du PDF' });
      }
    });

    // En-tête
    doc.fontSize(24)
      .fillColor('#1e3a8a')
      .text('BILAN FINANCIER', { align: 'center' });

    doc.fontSize(14)
      .fillColor('#64748b')
      .text(bilan.titre, { align: 'center' })
      .moveDown(0.5);

    doc.fontSize(12)
      .fillColor('#475569')
      .text(`Période : ${new Date(bilan.date_debut).toLocaleDateString('fr-FR')} - ${new Date(bilan.date_fin).toLocaleDateString('fr-FR')}`, { align: 'center' })
      .moveDown(1);

    // Ligne de séparation
    doc.moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .stroke();

    doc.moveDown(1);

    // CRÉDITS (Section)
    doc.fontSize(18)
      .fillColor('#059669')
      .text('CRÉDITS', { underline: true })
      .moveDown(0.5);

    // Revenus automatiques
    doc.fontSize(12)
      .fillColor('#64748b')
      .text('Revenus automatiques:', 70, doc.y)
      .moveDown(0.3);

    const revenusAdhesions = adhesionsResult.rows.length > 0 ? parseFloat(adhesionsResult.rows[0].total) || 0 : 0;
    const revenusDons = donsResult.rows.length > 0 ? parseFloat(donsResult.rows[0].total) || 0 : 0;
    const adhesionsCount = adhesionsResult.rows.length > 0 ? (parseInt(adhesionsResult.rows[0].count) || 0) : 0;
    const donsCount = donsResult.rows.length > 0 ? (parseInt(donsResult.rows[0].count) || 0) : 0;

    doc.fontSize(11)
      .fillColor('#111827')
      .text(`  • Adhésions (${adhesionsCount}):`, 90, doc.y)
      .text(`${revenusAdhesions.toFixed(2)} €`, 400, doc.y, { align: 'right', width: 100 })
      .moveDown(0.3);

    doc.text(`  • Dons (${donsCount}):`, 90, doc.y)
      .text(`${revenusDons.toFixed(2)} €`, 400, doc.y, { align: 'right', width: 100 })
      .moveDown(0.3);

    const revenusAutomatiques = revenusAdhesions + revenusDons;
    doc.fontSize(12)
      .fillColor('#475569')
      .text('  Sous-total revenus automatiques:', 90, doc.y)
      .text(`${revenusAutomatiques.toFixed(2)} €`, 400, doc.y, { align: 'right', width: 100 })
      .moveDown(0.5);

    // Crédits manuels
    const creditsManuels = creditsResult.rows.length > 0 ? parseFloat(creditsResult.rows[0].total) || 0 : 0;
    if (creditsManuels > 0 && allCreditsResult.rows.length > 0) {
      doc.fontSize(12)
        .fillColor('#64748b')
        .text('Crédits manuels:', 70, doc.y)
        .moveDown(0.3);

      allCreditsResult.rows.forEach((credit: any) => {
        const typeLabels: Record<string, string> = {
          virement: 'Virement',
          don: 'Don',
          aide: 'Aide',
          subvention: 'Subvention',
          autre: 'Autre',
        };
        doc.fontSize(11)
          .fillColor('#111827')
          .text(`  • ${credit.libelle} (${typeLabels[credit.type_credit] || credit.type_credit}):`, 90, doc.y)
          .text(`${parseFloat(credit.montant).toFixed(2)} €`, 400, doc.y, { align: 'right', width: 100 })
          .moveDown(0.3);
      });

      doc.fontSize(12)
        .fillColor('#475569')
        .text('  Sous-total crédits manuels:', 90, doc.y)
        .text(`${creditsManuels.toFixed(2)} €`, 400, doc.y, { align: 'right', width: 100 })
        .moveDown(0.5);
    }

    // Total crédits
    doc.fontSize(14)
      .fillColor('#059669')
      .text('TOTAL CRÉDITS:', 70, doc.y, { bold: true })
      .text(`${bilan.total_revenus.toFixed(2)} €`, 400, doc.y, { align: 'right', width: 100, bold: true })
      .moveDown(1);

    // DÉBITS (Section)
    doc.fontSize(18)
      .fillColor('#dc2626')
      .text('DÉBITS', { underline: true })
      .moveDown(0.5);

    depensesCategorieResult.rows.forEach((cat: any) => {
      doc.fontSize(12)
        .fillColor('#111827')
        .text(`${cat.categorie || 'Sans catégorie'} (${cat.count || 0}):`, 70, doc.y)
        .text(`${parseFloat(cat.total).toFixed(2)} €`, 400, doc.y, { align: 'right', width: 100 })
        .moveDown(0.3);
    });

    doc.moveDown(0.5);
    doc.fontSize(14)
      .fillColor('#dc2626')
      .text('TOTAL DÉBITS:', 70, doc.y, { bold: true })
      .text(`${bilan.total_depenses.toFixed(2)} €`, 400, doc.y, { align: 'right', width: 100, bold: true })
      .moveDown(1.5);

    // SOLDE
    doc.moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .stroke();

    doc.moveDown(0.5);

    const soldeColor = bilan.solde >= 0 ? '#059669' : '#dc2626';
    doc.fontSize(20)
      .fillColor(soldeColor)
      .text('SOLDE:', 70, doc.y, { bold: true })
      .text(`${bilan.solde.toFixed(2)} €`, 400, doc.y, { align: 'right', width: 100, bold: true })
      .moveDown(1);

    // Notes
    if (bilan.notes) {
      doc.moveDown(1);
      doc.fontSize(12)
        .fillColor('#64748b')
        .text('Notes:', { underline: true })
        .moveDown(0.3);
      doc.fontSize(11)
        .fillColor('#475569')
        .text(bilan.notes, { width: 495 });
    }

    // Pied de page
    const pageHeight = 842;
    const footerY = pageHeight - 50;
    doc.fontSize(10)
      .fillColor('#94a3b8')
      .text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 50, footerY, { align: 'center', width: 495 });

    doc.end();
  } catch (error: any) {
    logger.error('Erreur lors de la génération du PDF du bilan:', error);
    logger.error('Stack trace:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Erreur serveur lors de la génération du PDF',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

// Export Excel d'un bilan
router.get('/bilans/:id/excel', async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer le bilan avec ses détails
    const bilanResult = await pool.query(
      `SELECT 
        b.*,
        u.nom as created_by_nom,
        u.prenom as created_by_prenom
       FROM bilans b
       LEFT JOIN users u ON b.created_by = u.id
       WHERE b.id = $1`,
      [id]
    );

    if (bilanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bilan introuvable' });
    }

    const bilan = bilanResult.rows[0];

    // Récupérer les revenus automatiques
    const adhesionsResult = await pool.query(
      `SELECT 
        COUNT(*) as count,
        COALESCE(SUM(tarif), 0) as total
       FROM adhesions
       WHERE date_adhesion BETWEEN $1 AND $2`,
      [bilan.date_debut, bilan.date_fin]
    );

    const donsResult = await pool.query(
      `SELECT 
        COUNT(*) as count,
        COALESCE(SUM(montant), 0) as total
       FROM dons
       WHERE date_don BETWEEN $1 AND $2`,
      [bilan.date_debut, bilan.date_fin]
    );

    // Récupérer les crédits manuels
    const creditsResult = await pool.query(
      `SELECT c.*
       FROM credits c
       INNER JOIN bilan_credits bc ON c.id = bc.credit_id
       WHERE bc.bilan_id = $1
       ORDER BY c.date_credit DESC`,
      [id]
    );

    // Récupérer les dépenses
    const depensesResult = await pool.query(
      `SELECT d.*, dc.nom as categorie_nom
       FROM depenses d
       LEFT JOIN depense_categories dc ON d.categorie_id = dc.id
       INNER JOIN bilan_depenses bd ON d.id = bd.depense_id
       WHERE bd.bilan_id = $1
       ORDER BY d.date_depense DESC`,
      [id]
    );

    // Générer le CSV (format Excel compatible)
    const bom = '\uFEFF'; // UTF-8 BOM pour Excel
    let csv = bom;

    // En-tête
    csv += `BILAN FINANCIER\n`;
    csv += `${bilan.titre}\n`;
    csv += `Période: ${new Date(bilan.date_debut).toLocaleDateString('fr-FR')} - ${new Date(bilan.date_fin).toLocaleDateString('fr-FR')}\n`;
    csv += `\n`;

    // Section CRÉDITS
    csv += `CRÉDITS\n`;
    csv += `Type;Libellé;Date;Montant\n`;
    
    // Revenus automatiques
    const revenusAdhesions = adhesionsResult.rows.length > 0 ? parseFloat(adhesionsResult.rows[0].total) || 0 : 0;
    const revenusDons = donsResult.rows.length > 0 ? parseFloat(donsResult.rows[0].total) || 0 : 0;
    const adhesionsCount = adhesionsResult.rows.length > 0 ? (parseInt(adhesionsResult.rows[0].count) || 0) : 0;
    const donsCount = donsResult.rows.length > 0 ? (parseInt(donsResult.rows[0].count) || 0) : 0;
    
    if (revenusAdhesions > 0) {
      csv += `Revenus automatiques;Adhésions (${adhesionsCount});${bilan.date_debut} - ${bilan.date_fin};${revenusAdhesions.toFixed(2)}\n`;
    }
    if (revenusDons > 0) {
      csv += `Revenus automatiques;Dons (${donsCount});${bilan.date_debut} - ${bilan.date_fin};${revenusDons.toFixed(2)}\n`;
    }

    // Crédits manuels
    creditsResult.rows.forEach((credit: any) => {
      const typeLabels: Record<string, string> = {
        virement: 'Virement',
        don: 'Don',
        aide: 'Aide',
        subvention: 'Subvention',
        autre: 'Autre',
      };
      csv += `Crédit manuel;${credit.libelle};${new Date(credit.date_credit).toLocaleDateString('fr-FR')};${parseFloat(credit.montant).toFixed(2)}\n`;
    });

    csv += `TOTAL CRÉDITS;;;${bilan.total_revenus.toFixed(2)}\n`;
    csv += `\n`;

    // Section DÉBITS
    csv += `DÉBITS\n`;
    csv += `Catégorie;Libellé;Date;Montant\n`;

    depensesResult.rows.forEach((depense: any) => {
      csv += `${depense.categorie_nom || 'Sans catégorie'};${depense.libelle};${new Date(depense.date_depense).toLocaleDateString('fr-FR')};${parseFloat(depense.montant).toFixed(2)}\n`;
    });

    csv += `TOTAL DÉBITS;;;${bilan.total_depenses.toFixed(2)}\n`;
    csv += `\n`;

    // SOLDE
    csv += `SOLDE;;;${bilan.solde.toFixed(2)}\n`;

    if (bilan.notes) {
      csv += `\nNotes:\n${bilan.notes}\n`;
    }

    logger.info(`CSV généré pour le bilan ${id}, taille: ${Buffer.byteLength(csv, 'utf8')} bytes`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=bilan_${bilan.id}_${bilan.date_debut}_${bilan.date_fin}.csv`);
    res.setHeader('Content-Length', Buffer.byteLength(csv, 'utf8').toString());
    res.send(csv);
  } catch (error: any) {
    logger.error('Erreur lors de l\'export Excel du bilan:', error);
    logger.error('Stack trace:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Erreur serveur lors de l\'export Excel',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

// Supprimer un bilan
router.delete('/bilans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM bilans WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bilan introuvable' });
    }

    res.json({ success: true, message: 'Bilan supprimé' });
  } catch (error: any) {
    logger.error('Erreur lors de la suppression du bilan:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Évolution du chiffre d'affaires par année
router.get('/evolution-ca-annee', async (req, res) => {
  try {
    // Récupérer le chiffre d'affaires (adhésions + dons + crédits) par année
    const result = await pool.query(`
      SELECT 
        EXTRACT(YEAR FROM date_adhesion) as annee,
        COALESCE(SUM(tarif), 0) as montant_adhesions
      FROM adhesions
      WHERE date_adhesion IS NOT NULL
      GROUP BY EXTRACT(YEAR FROM date_adhesion)
      ORDER BY annee ASC
    `);

    const donsResult = await pool.query(`
      SELECT 
        EXTRACT(YEAR FROM date_don) as annee,
        COALESCE(SUM(montant), 0) as montant_dons
      FROM dons
      WHERE date_don IS NOT NULL
      GROUP BY EXTRACT(YEAR FROM date_don)
      ORDER BY annee ASC
    `);

    const creditsResult = await pool.query(`
      SELECT 
        EXTRACT(YEAR FROM date_credit) as annee,
        COALESCE(SUM(montant), 0) as montant_credits
      FROM credits
      WHERE date_credit IS NOT NULL
      GROUP BY EXTRACT(YEAR FROM date_credit)
      ORDER BY annee ASC
    `);

    // Combiner les données par année
    const caParAnnee: Record<number, { adhesions: number; dons: number; credits: number; total: number }> = {};

    // Adhésions
    result.rows.forEach((row: any) => {
      const annee = parseInt(row.annee);
      if (!caParAnnee[annee]) {
        caParAnnee[annee] = { adhesions: 0, dons: 0, credits: 0, total: 0 };
      }
      caParAnnee[annee].adhesions = parseFloat(row.montant_adhesions) || 0;
    });

    // Dons
    donsResult.rows.forEach((row: any) => {
      const annee = parseInt(row.annee);
      if (!caParAnnee[annee]) {
        caParAnnee[annee] = { adhesions: 0, dons: 0, credits: 0, total: 0 };
      }
      caParAnnee[annee].dons = parseFloat(row.montant_dons) || 0;
    });

    // Crédits
    creditsResult.rows.forEach((row: any) => {
      const annee = parseInt(row.annee);
      if (!caParAnnee[annee]) {
        caParAnnee[annee] = { adhesions: 0, dons: 0, credits: 0, total: 0 };
      }
      caParAnnee[annee].credits = parseFloat(row.montant_credits) || 0;
    });

    // Calculer le total par année et formater les données
    const evolution = Object.keys(caParAnnee)
      .map(annee => parseInt(annee))
      .sort((a, b) => a - b)
      .map(annee => {
        const data = caParAnnee[annee];
        data.total = data.adhesions + data.dons + data.credits;
        return {
          annee,
          ...data,
        };
      });

    res.json({
      success: true,
      data: evolution,
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération de l\'évolution du CA:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Vue d'ensemble complète (revenus + dépenses)
router.get('/overview-complete', async (req, res) => {
  try {
    const { date_debut, date_fin } = req.query;

    // Calculer tous les revenus et dépenses
    const overviewResponse = await pool.query(
      `SELECT 
        (SELECT COALESCE(SUM(tarif), 0) FROM adhesions ${date_debut && date_fin ? 'WHERE date_adhesion BETWEEN $1 AND $2' : ''}) as adhesions_total,
        (SELECT COALESCE(SUM(montant), 0) FROM dons ${date_debut && date_fin ? 'WHERE date_don BETWEEN $1 AND $2' : ''}) as dons_total,
        (SELECT COALESCE(SUM(montant), 0) FROM credits ${date_debut && date_fin ? 'WHERE date_credit BETWEEN $1 AND $2' : ''}) as credits_total,
        (SELECT COALESCE(SUM(montant), 0) FROM depenses ${date_debut && date_fin ? 'WHERE date_depense BETWEEN $1 AND $2' : ''}) as depenses_total`,
      date_debut && date_fin ? [date_debut, date_fin] : []
    );

    const totals = overviewResponse.rows[0];
    const revenus_automatiques = parseFloat(totals.adhesions_total) + parseFloat(totals.dons_total);
    const credits_manuels = parseFloat(totals.credits_total) || 0;
    const total_revenus = revenus_automatiques + credits_manuels;
    const total_depenses = parseFloat(totals.depenses_total) || 0;
    const solde = total_revenus - total_depenses;

    res.json({
      success: true,
      data: {
        revenus: {
          total: total_revenus,
          adhesions: parseFloat(totals.adhesions_total),
          dons: parseFloat(totals.dons_total),
          credits_manuels: credits_manuels,
          revenus_automatiques: revenus_automatiques,
        },
        depenses: {
          total: total_depenses,
        },
        solde,
      },
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération de la vue complète:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

