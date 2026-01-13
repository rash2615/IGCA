import express from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

const router = express.Router();
// AUTHENTIFICATION DÉSACTIVÉE
// router.use(authenticate);

// Liste des cartes à remettre
router.get('/', async (req, res) => {
  try {
    const { statut } = req.query;

    let query = `
      SELECT 
        c.id,
        c.numero_carte,
        c.statut,
        c.date_generation,
        c.date_remise,
        c.remis_par,
        a.id as adhesion_id,
        a.nom,
        a.prenom,
        a.email
      FROM cartes c
      JOIN adhesions a ON c.adhesion_id = a.id
      WHERE c.statut IN ('generee', 'a_remettre')
    `;
    const params: any[] = [];

    if (statut) {
      query += ` AND c.statut = $1`;
      params.push(statut);
    }

    query += ' ORDER BY c.date_generation ASC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des cartes à remettre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Marquer une carte comme remise
router.post(
  '/:carteId/remise',
  async (req: AuthRequest, res) => {
    try {
      const { carteId } = req.params;
      const { date_remise } = req.body;

      // Vérifier que la carte existe
      const carteResult = await pool.query(
        'SELECT id, statut FROM cartes WHERE id = $1',
        [carteId]
      );

      if (carteResult.rows.length === 0) {
        return res.status(404).json({ error: 'Carte introuvable' });
      }

      // Mettre à jour le statut
      const result = await pool.query(
        `UPDATE cartes 
         SET statut = 'remise',
             date_remise = $1,
             remis_par = $2
         WHERE id = $3
         RETURNING *`,
        [date_remise || new Date(), 1, carteId] // AUTHENTIFICATION DÉSACTIVÉE - user ID par défaut
      );

      logger.info(`Carte ${carteId} marquée comme remise`);

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error: any) {
      logger.error('Erreur lors de la remise de la carte:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Historique des remises par adhérent
router.get(
  '/adherent/:adhesionId',
  async (req, res) => {
    try {
      const { adhesionId } = req.params;

      const result = await pool.query(
        `SELECT 
          c.*,
          u.nom as remis_par_nom,
          u.prenom as remis_par_prenom
         FROM cartes c
         LEFT JOIN users u ON c.remis_par = u.id
         WHERE c.adhesion_id = $1
         ORDER BY c.date_remise DESC`,
        [adhesionId]
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error: any) {
      logger.error('Erreur lors de la récupération de l\'historique:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Export pour suivi événementiel
router.get(
  '/export/event',
  async (req, res) => {
    try {
      const { date_debut, date_fin } = req.query;

      let query = `
        SELECT 
          c.numero_carte,
          c.date_remise,
          a.nom,
          a.prenom,
          a.email,
          u.nom as remis_par_nom,
          u.prenom as remis_par_prenom
        FROM cartes c
        JOIN adhesions a ON c.adhesion_id = a.id
        LEFT JOIN users u ON c.remis_par = u.id
        WHERE c.statut = 'remise'
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (date_debut) {
        query += ` AND c.date_remise >= $${paramIndex}`;
        params.push(date_debut);
        paramIndex++;
      }

      if (date_fin) {
        query += ` AND c.date_remise <= $${paramIndex}`;
        params.push(date_fin);
        paramIndex++;
      }

      query += ' ORDER BY c.date_remise DESC';

      const result = await pool.query(query, params);

      // Convertir en CSV
      const csv = [
        'Numéro carte,Date remise,Nom,Prénom,Email,Remis par',
        ...result.rows.map((row) =>
          [
            row.numero_carte,
            row.date_remise,
            row.nom,
            row.prenom,
            row.email,
            `${row.remis_par_nom} ${row.remis_par_prenom}`,
          ].join(',')
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=transmissions.csv');
      res.send(csv);
    } catch (error: any) {
      logger.error('Erreur lors de l\'export:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

export default router;

