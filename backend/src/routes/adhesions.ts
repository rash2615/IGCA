import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import PDFDocument from 'pdfkit';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { detectDuplicates, linkRenewal } from '../services/duplicateService';
import { syncHelloAssoAdhesions, getHelloAssoAccessToken } from '../services/helloassoService';

const router = express.Router();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

// Fonction pour télécharger une image depuis une URL et la stocker localement
async function downloadImage(imageUrl: string, helloassoId: string | null): Promise<string | null> {
  if (!imageUrl || !imageUrl.startsWith('http')) {
    return null;
  }

  try {
    // Créer le dossier uploads s'il n'existe pas
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Générer un nom de fichier unique
    const urlParts = imageUrl.split('/');
    const originalFilename = urlParts[urlParts.length - 1] || 'image';
    const extension = originalFilename.split('.').pop() || 'jpg';
    const filename = helloassoId 
      ? `helloasso_${helloassoId}_${Date.now()}.${extension}`
      : `helloasso_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
    const filePath = path.join(uploadsDir, filename);

    // Télécharger l'image
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IGCA-Backend/1.0)',
      },
    });

    // Sauvegarder l'image
    fs.writeFileSync(filePath, response.data);

    // Retourner l'URL relative
    return `/uploads/${filename}`;
  } catch (error: any) {
    logger.warn(`Impossible de télécharger l'image ${imageUrl}:`, error.message);
    // Retourner null si le téléchargement échoue (on garde l'URL originale)
    return null;
  }
}

// AUTHENTIFICATION DÉSACTIVÉE
// router.use(authenticate);

// Liste des adhésions avec filtres
router.get('/', async (req: AuthRequest, res) => {
  try {
    const {
      annee,
      statut,
      tarif,
      moyen_paiement,
      source,
      search,
      page = '1',
      limit = '20', // 20 adhésions par page
    } = req.query;

    // Compter d'abord le total sans pagination pour avoir le vrai total
    let countQuery = `
      SELECT COUNT(*) as total_count
      FROM adhesions a
      WHERE 1=1
    `;
    const countParams: any[] = [];
    let countParamIndex = 1;

    let query = `
      SELECT 
        a.id,
        a.nom,
        a.prenom,
        a.email,
        a.telephone,
        a.date_adhesion,
        a.tarif,
        a.moyen_paiement,
        a.statut,
        a.helloasso_id,
        a.helloasso_campaign_id,
        a.photo_url,
        a.source,
        a.created_at,
        c.id as carte_id,
        c.numero_carte,
        c.statut as carte_statut,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM cartes c2 
            WHERE c2.adhesion_id = a.id 
            AND c2.statut = 'remise'
          ) THEN true 
          ELSE false 
        END as carte_delivree
      FROM adhesions a
      LEFT JOIN cartes c ON a.id = c.adhesion_id AND c.statut != 'remise'
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (annee) {
      const condition = ` AND EXTRACT(YEAR FROM a.date_adhesion) = $${paramIndex}`;
      query += condition;
      countQuery += condition;
      params.push(annee);
      countParams.push(annee);
      paramIndex++;
      countParamIndex++;
    }

    if (statut) {
      const condition = ` AND a.statut = $${paramIndex}`;
      query += condition;
      countQuery += condition;
      params.push(statut);
      countParams.push(statut);
      paramIndex++;
      countParamIndex++;
    }

    if (tarif) {
      const condition = ` AND a.tarif = $${paramIndex}`;
      query += condition;
      countQuery += condition;
      params.push(tarif);
      countParams.push(tarif);
      paramIndex++;
      countParamIndex++;
    }

    if (moyen_paiement) {
      const condition = ` AND a.moyen_paiement = $${paramIndex}`;
      query += condition;
      countQuery += condition;
      params.push(moyen_paiement);
      countParams.push(moyen_paiement);
      paramIndex++;
      countParamIndex++;
    }

    if (source) {
      const condition = ` AND a.source = $${paramIndex}`;
      query += condition;
      countQuery += condition;
      params.push(source);
      countParams.push(source);
      paramIndex++;
      countParamIndex++;
    }

    if (search) {
      const condition = ` AND (
        a.nom ILIKE $${paramIndex} OR
        a.prenom ILIKE $${paramIndex} OR
        a.email ILIKE $${paramIndex}
      )`;
      query += condition;
      countQuery += condition;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
      paramIndex++;
      countParamIndex++;
    }

    if (req.query.helloasso_campaign_id) {
      const condition = ` AND a.helloasso_campaign_id = $${paramIndex}`;
      query += condition;
      countQuery += condition;
      params.push(req.query.helloasso_campaign_id);
      countParams.push(req.query.helloasso_campaign_id);
      paramIndex++;
      countParamIndex++;
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    query += ` ORDER BY a.date_adhesion DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    // Exécuter la requête de comptage et la requête principale en parallèle
    const [countResult, result] = await Promise.all([
      pool.query(countQuery, countParams),
      pool.query(query, params),
    ]);

    const total = parseInt(countResult.rows[0]?.total_count || '0');

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: total,
      },
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des adhésions:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Fiche adhérent détaillée
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const adhesionResult = await pool.query(
      `SELECT 
        a.*,
        c.id as carte_id,
        c.numero_carte,
        c.statut as carte_statut,
        c.date_generation,
        c.date_remise
       FROM adhesions a
       LEFT JOIN cartes c ON a.id = c.adhesion_id AND c.statut != 'remise'
       WHERE a.id = $1
       ORDER BY c.date_generation DESC`,
      [id]
    );

    if (adhesionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Adhérent introuvable' });
    }

    const adhesion = adhesionResult.rows[0];
    const cartes = adhesionResult.rows
      .filter((row: any) => row.carte_id)
      .map((row: any) => ({
        id: row.carte_id,
        numero_carte: row.numero_carte,
        statut: row.carte_statut,
        date_generation: row.date_generation,
        date_remise: row.date_remise,
      }));

    res.json({
      success: true,
      data: {
        ...adhesion,
        cartes,
      },
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération de l\'adhérent:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Import CSV
router.post(
  '/import',
  upload.single('csv'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Fichier CSV requis' });
      }

      const fileContent = fs.readFileSync(req.file.path, 'utf-8');
      
      // Détecter le délimiteur (point-virgule ou virgule)
      const delimiter = fileContent.includes(';') ? ';' : ',';
      
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: false, // Ne pas sauter les lignes vides pour tout traiter
        trim: true,
        delimiter: delimiter,
        bom: true, // Gérer le BOM UTF-8 si présent
      });

      logger.info(`Import CSV: ${records.length} lignes détectées`);
      if (records.length > 0) {
        logger.info('Premier enregistrement:', Object.keys(records[0]));
      }

      // Mapping des champs selon le format HelloAsso export
      // AUCUN FILTRE - Traiter TOUS les enregistrements
      const mappedRecords = records
        .map((record: any) => {
          // Extraire le tarif (peut être dans "Tarif" ou "Montant tarif")
          let tarifValue = record['Montant tarif'] || record.Tarif || record.tarif || '0';
          // Nettoyer le format (remplacer virgule par point, enlever espaces)
          tarifValue = String(tarifValue).replace(',', '.').replace(/\s/g, '');
          const tarif = parseFloat(tarifValue) || 0;

          // Extraire la date (format DD/MM/YYYY ou YYYY-MM-DD)
          // Chercher dans plusieurs colonnes possibles
          let dateAdhesion = record['Date de la commande'] 
            || record['Date d\'adhésion'] 
            || record['Date adhesion']
            || record['Date adhésion']
            || record.date_adhesion 
            || record['Date'] 
            || '';
          
          if (dateAdhesion && dateAdhesion.trim()) {
            // Nettoyer la date (enlever espaces)
            dateAdhesion = dateAdhesion.trim();
            
            // Convertir DD/MM/YYYY en YYYY-MM-DD
            const dateMatch = dateAdhesion.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (dateMatch) {
              dateAdhesion = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
            } else {
              // Essayer format YYYY-MM-DD
              const isoMatch = dateAdhesion.match(/(\d{4})-(\d{2})-(\d{2})/);
              if (isoMatch) {
                dateAdhesion = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
              }
            }
            
            // Si format avec heure, prendre seulement la date
            if (dateAdhesion.includes(' ')) {
              dateAdhesion = dateAdhesion.split(' ')[0];
            }
            
            // Si format avec T (ISO), prendre seulement la date
            if (dateAdhesion.includes('T')) {
              dateAdhesion = dateAdhesion.split('T')[0];
            }
          }
          
          // Si toujours pas de date valide, utiliser la date du jour
          if (!dateAdhesion || dateAdhesion === '') {
            dateAdhesion = new Date().toISOString().split('T')[0];
          }

          // Mapper le moyen de paiement
          let moyenPaiement = record['Moyen de paiement'] || record.moyen_paiement || '';
          if (moyenPaiement) {
            moyenPaiement = moyenPaiement.toLowerCase();
            if (moyenPaiement.includes('carte bancaire') || moyenPaiement.includes('cb')) {
              moyenPaiement = 'cb';
            } else if (moyenPaiement.includes('espèce') || moyenPaiement.includes('especes')) {
              moyenPaiement = 'especes';
            } else if (moyenPaiement.includes('chèque') || moyenPaiement.includes('cheque')) {
              moyenPaiement = 'cheque';
            } else if (moyenPaiement.includes('virement')) {
              moyenPaiement = 'virement';
            } else {
              moyenPaiement = 'helloasso';
            }
          } else {
            moyenPaiement = 'helloasso';
          }

          // Déterminer le statut - Les adhésions importées nécessitent une action (génération de carte)
          // On utilise 'actif' par défaut mais elles nécessiteront une carte
          const statutCommande = record['Statut de la commande'] || record.statut || '';
          let statut = 'actif'; // Statut par défaut pour les adhésions importées
          // Les adhésions importées sont considérées comme nécessitant une action (génération de carte)

          // Déterminer la source (en ligne ou hors ligne) depuis le statut de la commande
          const statutCommandeLower = (statutCommande || '').toLowerCase().trim();
          let source = 'online'; // Par défaut en ligne
          if (statutCommandeLower.includes('hors-ligne') || statutCommandeLower.includes('hors ligne') || statutCommandeLower === 'offline') {
            source = 'offline';
          } else if (statutCommandeLower === 'validé' || statutCommandeLower === 'valide' || statutCommandeLower === 'validated') {
            source = 'online';
          }

          // Récupérer l'URL de la photo
          const photoUrlOriginal = record['Photo de profil'] || record.Photo || record.photo_url || null;
          
          return {
            nom: record['Nom adhérent'] || record['Nom payeur'] || record.Nom || record.nom || 'Sans nom',
            prenom: record['Prénom adhérent'] || record['Prénom payeur'] || record.Prénom || record.prenom || 'Sans prénom',
            email: record.Email || record['Email payeur'] || record.email || '',
            telephone: record.Telephone || record.Téléphone || record.telephone || null,
            date_adhesion: dateAdhesion || new Date().toISOString().split('T')[0],
            tarif: tarif,
            moyen_paiement: moyenPaiement,
            helloasso_id: record['Référence commande'] || record['ID HelloAsso'] || record.helloasso_id || null,
            helloasso_campaign_id: record['helloasso_campaign_id'] || null,
            photo_url: photoUrlOriginal, // On téléchargera l'image lors de la validation
            photo_url_original: photoUrlOriginal, // Garder l'URL originale pour le téléchargement
            statut: statut,
            source: source,
          };
        });

      // Détecter les doublons
      const duplicates = await detectDuplicates(mappedRecords);

      // Enregistrer l'import
      const importResult = await pool.query(
        `INSERT INTO imports (user_id, filename, record_count, status)
         VALUES ($1, $2, $3, 'pending')
         RETURNING id`,
        [1, req.file.originalname, mappedRecords.length] // AUTHENTIFICATION DÉSACTIVÉE - user ID par défaut
      );

      const importId = importResult.rows[0].id;

      res.json({
        success: true,
        importId,
        records: mappedRecords,
        duplicates,
        message: 'Fichier importé avec succès. Veuillez vérifier les doublons avant validation.',
      });
    } catch (error: any) {
      logger.error('Erreur lors de l\'import CSV:', error);
      logger.error('Détails de l\'erreur:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      res.status(500).json({ 
        error: 'Erreur lors de l\'import',
        details: error.message,
      });
    }
  }
);

// Valider l'import (après vérification des doublons)
router.post(
  '/import/:importId/validate',
  async (req: AuthRequest, res) => {
    try {
      const { importId } = req.params;
      const { records, duplicateActions, forceUpdate = false } = req.body;

      // Récupérer l'import
      const importResult = await pool.query(
        'SELECT * FROM imports WHERE id = $1',
        [importId]
      );

      if (importResult.rows.length === 0) {
        return res.status(404).json({ error: 'Import introuvable' });
      }

      // Supprimer toutes les adhésions existantes avant l'import
      logger.info(`Suppression de toutes les adhésions existantes avant l'import ${importId}...`);
      const deleteResult = await pool.query('DELETE FROM adhesions');
      logger.info(`${deleteResult.rowCount} adhésion(s) supprimée(s)`);

      let inserted = 0;
      let updated = 0;
      let skipped = 0;
      let errors: any[] = [];

      logger.info(`Traitement de ${records.length} enregistrements pour l'import ${importId}`);

      // TOUJOURS utiliser forceUpdate pour importer tout
      const shouldForceUpdate = true; // Toujours forcer l'import de tout

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        // Log tous les 100 enregistrements pour suivre la progression
        if ((i + 1) % 100 === 0) {
          logger.info(`Traitement en cours: ${i + 1}/${records.length} (${inserted} insérés, ${errors.length} erreurs)`);
        }
        
        try {
          // TOUJOURS insérer TOUT sans vérifier les doublons
          if (true) { // Toujours insérer
              // S'assurer que tous les champs obligatoires (NOT NULL) ont des valeurs
              const nom = (record.nom && record.nom.trim()) || 'Sans nom';
              const prenom = (record.prenom && record.prenom.trim()) || 'Sans prénom';
              // Laisser l'email vide si non fourni (sera null)
              const email = (record.email && record.email.trim()) || null;
              const dateAdhesion = record.date_adhesion || new Date().toISOString().split('T')[0];
              const tarif = record.tarif || 0;
              const moyenPaiement = record.moyen_paiement || 'helloasso';
              
              // Générer un helloasso_id unique si nécessaire pour éviter les conflits de contrainte
              let finalHelloassoId = record.helloasso_id;
              
              // Si pas de helloasso_id, générer un ID unique basé sur l'index
              if (!finalHelloassoId || finalHelloassoId === '') {
                finalHelloassoId = `import_${importId}_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              } else {
                // Vérifier si ce helloasso_id existe déjà (mais on l'insère quand même avec un suffixe)
                const existingCheck = await pool.query(
                  'SELECT id FROM adhesions WHERE helloasso_id = $1',
                  [finalHelloassoId]
                );
                if (existingCheck.rows.length > 0) {
                  // Si existe déjà, générer un ID unique pour éviter le conflit
                  finalHelloassoId = `${finalHelloassoId}_dup_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                }
              }
              
              // Pour l'import, on garde l'URL originale
              // Le téléchargement d'images sera fait en arrière-plan après l'insertion
              let finalPhotoUrl = record.photo_url || record.photo_url_original || null;
              
              try {
                const insertResult = await pool.query(
                  `INSERT INTO adhesions (
                    nom, prenom, email, telephone, date_adhesion,
                    tarif, moyen_paiement, helloasso_id, helloasso_campaign_id, photo_url, statut, source
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                  RETURNING id`,
                  [
                    nom,
                    prenom,
                    email,
                    record.telephone || null,
                    dateAdhesion,
                    tarif,
                    moyenPaiement,
                    finalHelloassoId,
                    record.helloasso_campaign_id || null,
                    finalPhotoUrl,
                    record.statut || 'actif',
                    record.source || 'online',
                  ]
                );
                
                const adhesionId = insertResult.rows[0].id;
                inserted++;
                
                // Télécharger l'image en arrière-plan (non-bloquant) après l'insertion
                if (record.photo_url_original && record.photo_url_original.startsWith('http')) {
                  // Télécharger en arrière-plan sans attendre
                  downloadImage(record.photo_url_original, finalHelloassoId)
                    .then((downloadedUrl) => {
                      if (downloadedUrl) {
                        // Mettre à jour l'URL de la photo dans la base de données
                        pool.query(
                          'UPDATE adhesions SET photo_url = $1 WHERE id = $2',
                          [downloadedUrl, adhesionId]
                        ).catch((err) => {
                          logger.warn(`Erreur mise à jour photo pour adhesion ${adhesionId}:`, err.message);
                        });
                      }
                    })
                    .catch((err) => {
                      // Ignorer silencieusement les erreurs de téléchargement
                    });
                }
              } catch (insertError: any) {
                // En cas d'erreur, essayer avec un ID complètement unique
                if (insertError.code === '23505') {
                  finalHelloassoId = `import_${importId}_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 15)}`;
                  try {
                    const retryResult = await pool.query(
                      `INSERT INTO adhesions (
                        nom, prenom, email, telephone, date_adhesion,
                        tarif, moyen_paiement, helloasso_id, helloasso_campaign_id, photo_url, statut
                      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                      RETURNING id`,
                      [
                        nom,
                        prenom,
                        email,
                        record.telephone || null,
                        dateAdhesion,
                        tarif,
                        moyenPaiement,
                        finalHelloassoId,
                        record.helloasso_campaign_id || null,
                        finalPhotoUrl,
                        record.statut || 'actif',
                      ]
                    );
                    
                    const retryAdhesionId = retryResult.rows[0].id;
                    inserted++;
                    
                    // Télécharger l'image en arrière-plan après le retry
                    if (record.photo_url_original && record.photo_url_original.startsWith('http')) {
                      downloadImage(record.photo_url_original, finalHelloassoId)
                        .then((downloadedUrl) => {
                          if (downloadedUrl) {
                            pool.query(
                              'UPDATE adhesions SET photo_url = $1 WHERE id = $2',
                              [downloadedUrl, retryAdhesionId]
                            ).catch((err) => {
                              logger.warn(`Erreur mise à jour photo pour adhesion ${retryAdhesionId}:`, err.message);
                            });
                          }
                        })
                        .catch((err) => {
                          // Ignorer silencieusement
                        });
                    }
                  } catch (retryError: any) {
                    logger.error(`Erreur insertion enregistrement ${records.indexOf(record)}:`, retryError);
                    errors.push({ record, error: retryError.message });
                  }
                } else {
                  logger.error(`Erreur insertion enregistrement ${records.indexOf(record)}:`, insertError);
                  errors.push({ record, error: insertError.message });
                }
              }
            }
        } catch (error: any) {
          logger.error(`Erreur traitement enregistrement ${i + 1}/${records.length}:`, { record, error: error.message });
          errors.push({ record, error: error.message, index: i + 1 });
        }
      }

      logger.info(`Import ${importId} terminé: ${inserted} insérés, ${updated} mis à jour, ${skipped} ignorés, ${errors.length} erreurs`);

      // Mettre à jour le statut de l'import
      await pool.query(
        'UPDATE imports SET status = $1, processed_at = NOW() WHERE id = $2',
        ['completed', importId]
      );

      logger.info(`Import ${importId} validé: ${inserted} insérés, ${updated} mis à jour, ${skipped} ignorés`);

      res.json({
        success: true,
        inserted,
        updated,
        skipped,
        errors,
      });
    } catch (error: any) {
      logger.error('Erreur lors de la validation de l\'import:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Fonction pour échapper les valeurs CSV
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  // Si la valeur contient une virgule, des guillemets ou un saut de ligne, l'entourer de guillemets
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    // Échapper les guillemets en les doublant
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Export CSV
router.get('/export/csv', async (req, res) => {
  try {
    const { annee, statut, moyen_paiement, source } = req.query;

    let query = 'SELECT * FROM adhesions WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (annee) {
      query += ` AND EXTRACT(YEAR FROM date_adhesion) = $${paramIndex}`;
      params.push(annee);
      paramIndex++;
    }

    if (statut) {
      query += ` AND statut = $${paramIndex}`;
      params.push(statut);
      paramIndex++;
    }

    if (moyen_paiement) {
      query += ` AND moyen_paiement = $${paramIndex}`;
      params.push(moyen_paiement);
      paramIndex++;
    }

    if (source) {
      query += ` AND source = $${paramIndex}`;
      params.push(source);
      paramIndex++;
    }

    const result = await pool.query(query, params);

    // Convertir en CSV avec échappement correct
    const csvRows = [
      ['Nom', 'Prénom', 'Email', 'Téléphone', 'Date adhésion', 'Tarif', 'Moyen de paiement', 'Statut', 'Source', 'HelloAsso ID', 'Campagne HelloAsso'].map(escapeCsvValue).join(','),
      ...result.rows.map((row) =>
        [
          row.nom,
          row.prenom,
          row.email || '',
          row.telephone || '',
          row.date_adhesion,
          row.tarif,
          row.moyen_paiement || '',
          row.statut || '',
          row.source || 'online',
          row.helloasso_id || '',
          row.helloasso_campaign_id || '',
        ].map(escapeCsvValue).join(',')
      ),
    ];

    const csv = csvRows.join('\n');

    // Ajouter le BOM UTF-8 pour Excel
    const bom = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=adhesions_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(bom + csv);
  } catch (error: any) {
    logger.error('Erreur lors de l\'export CSV:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer une nouvelle adhésion
router.post('/', upload.single('photo'), async (req: AuthRequest, res) => {
  try {
    const {
      nom,
      prenom,
      email,
      telephone,
      date_adhesion,
      tarif,
      moyen_paiement,
      statut,
      helloasso_id,
      helloasso_campaign_id,
      photo_url,
    } = req.body;
    
    // Gérer l'upload de photo si un fichier est fourni
    let finalPhotoUrl = photo_url || null;
    if (req.file) {
      // Ici, vous pouvez sauvegarder le fichier et obtenir l'URL
      // Pour l'instant, on utilise le chemin temporaire (à améliorer avec un stockage cloud)
      finalPhotoUrl = `/uploads/${req.file.filename}`;
      // Note: En production, il faudrait uploader vers un service de stockage (S3, Cloudinary, etc.)
    }

    // Validation des champs requis
    if (!nom || !prenom || !email || !date_adhesion || !tarif) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }

    // Vérifier si l'email existe déjà (si helloasso_id n'est pas fourni)
    if (!helloasso_id) {
      const existingResult = await pool.query(
        'SELECT id FROM adhesions WHERE email = $1 AND date_adhesion = $2',
        [email, date_adhesion]
      );
      if (existingResult.rows.length > 0) {
        return res.status(400).json({ error: 'Une adhésion existe déjà pour cet email et cette date' });
      }
    }

    const result = await pool.query(
      `INSERT INTO adhesions (
        nom, prenom, email, telephone, date_adhesion, tarif, 
        moyen_paiement, statut, helloasso_id, helloasso_campaign_id, photo_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        nom,
        prenom,
        email,
        telephone || null,
        date_adhesion,
        tarif,
        moyen_paiement || 'helloasso',
        statut || 'actif',
        helloasso_id || null,
        helloasso_campaign_id || null,
        finalPhotoUrl,
      ]
    );

    logger.info(`Nouvelle adhésion créée: ${nom} ${prenom} (${email})`);

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    if (error.code === '23505') {
      // Violation de contrainte unique (helloasso_id ou email)
      return res.status(400).json({ error: 'Cette adhésion existe déjà' });
    }
    logger.error('Erreur lors de la création de l\'adhésion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier une adhésion
router.put('/:id', upload.single('photo'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    // Parser le body - multer peut affecter le parsing, donc on doit gérer les deux cas
    let bodyData = req.body;
    
    // Si le body est une chaîne (peut arriver avec multer), essayer de le parser
    if (typeof bodyData === 'string') {
      try {
        bodyData = JSON.parse(bodyData);
      } catch (e) {
        // Si ce n'est pas du JSON, utiliser req.body tel quel
      }
    }
    
    // Extraire les valeurs du body (peut être un objet ou des champs séparés avec multer)
    const nom = bodyData.nom || req.body.nom;
    const prenom = bodyData.prenom || req.body.prenom;
    const email = bodyData.email || req.body.email;
    const telephone = bodyData.telephone || req.body.telephone;
    const date_adhesion = bodyData.date_adhesion || req.body.date_adhesion;
    const tarif = bodyData.tarif !== undefined ? bodyData.tarif : req.body.tarif;
    const moyen_paiement = bodyData.moyen_paiement || req.body.moyen_paiement;
    const statut = bodyData.statut || req.body.statut;
    const helloasso_id = bodyData.helloasso_id || req.body.helloasso_id;
    const helloasso_campaign_id = bodyData.helloasso_campaign_id || req.body.helloasso_campaign_id;
    const photo_url = bodyData.photo_url || req.body.photo_url;
    
    logger.info(`Mise à jour adhésion ${id} - statut reçu: "${statut}" (type: ${typeof statut})`);
    logger.info(`Body complet:`, JSON.stringify(req.body));
    logger.info(`BodyData:`, JSON.stringify(bodyData));
    
    // Gérer l'upload de photo si un fichier est fourni
    let finalPhotoUrl = photo_url;
    if (req.file) {
      // Si un fichier est uploadé, utiliser son chemin
      finalPhotoUrl = `/uploads/${req.file.filename}`;
      logger.info(`Photo uploadée: ${finalPhotoUrl}`);
    } else if (photo_url !== undefined && photo_url !== null && photo_url !== '') {
      // Si une URL est fournie (et pas de fichier), utiliser l'URL
      finalPhotoUrl = photo_url;
    } else {
      // Si ni fichier ni URL, ne pas modifier photo_url (garder la valeur existante)
      finalPhotoUrl = undefined;
    }

    // Vérifier que l'adhésion existe
    const existingResult = await pool.query('SELECT id FROM adhesions WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Adhésion introuvable' });
    }

    // Construire la requête de mise à jour dynamiquement
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (nom !== undefined) {
      updates.push(`nom = $${paramIndex++}`);
      values.push(nom);
    }
    if (prenom !== undefined) {
      updates.push(`prenom = $${paramIndex++}`);
      values.push(prenom);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (telephone !== undefined) {
      updates.push(`telephone = $${paramIndex++}`);
      values.push(telephone);
    }
    if (date_adhesion !== undefined) {
      updates.push(`date_adhesion = $${paramIndex++}`);
      values.push(date_adhesion);
    }
    if (tarif !== undefined) {
      updates.push(`tarif = $${paramIndex++}`);
      values.push(tarif);
    }
    if (moyen_paiement !== undefined) {
      updates.push(`moyen_paiement = $${paramIndex++}`);
      values.push(moyen_paiement);
    }
    if (statut !== undefined && statut !== null && statut !== '') {
      updates.push(`statut = $${paramIndex++}`);
      values.push(statut);
      logger.info(`Mise à jour statut pour adhésion ${id}: ${statut}`);
    }
    if (helloasso_id !== undefined) {
      updates.push(`helloasso_id = $${paramIndex++}`);
      values.push(helloasso_id);
    }
    if (helloasso_campaign_id !== undefined) {
      updates.push(`helloasso_campaign_id = $${paramIndex++}`);
      values.push(helloasso_campaign_id);
    }
    if (finalPhotoUrl !== undefined) {
      updates.push(`photo_url = $${paramIndex++}`);
      values.push(finalPhotoUrl);
    }

    if (updates.length === 0) {
      logger.warn(`Tentative de mise à jour adhésion ${id} sans aucun champ`);
      return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }
    
    logger.info(`Mise à jour adhésion ${id} - ${updates.length} champ(s) à mettre à jour:`, updates);

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE adhesions 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    logger.info(`Adhésion ${id} mise à jour`);

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    const { id } = req.params;
    const { statut } = req.body;
    
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Cette adhésion existe déjà (conflit unique)' });
    }
    if (error.code === '23514') {
      // Erreur de contrainte CHECK - statut invalide
      logger.error(`Statut invalide pour adhésion ${id}:`, statut);
      return res.status(400).json({ 
        error: 'Statut invalide', 
        details: `Le statut "${statut}" n'est pas autorisé. Statuts valides: actif, expire, renouvele, inactif, suspendu, banni, a_generer` 
      });
    }
    logger.error('Erreur lors de la mise à jour de l\'adhésion:', error);
    logger.error('Détails erreur:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      body: req.body,
      params: req.params,
      statut: statut
    });
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// Supprimer une adhésion
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'adhésion existe
    const existingResult = await pool.query('SELECT id, nom, prenom FROM adhesions WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Adhésion introuvable' });
    }

    // Supprimer l'adhésion (les cartes associées seront supprimées en cascade)
    await pool.query('DELETE FROM adhesions WHERE id = $1', [id]);

    logger.info(`Adhésion ${id} supprimée: ${existingResult.rows[0].nom} ${existingResult.rows[0].prenom}`);

    res.json({
      success: true,
      message: 'Adhésion supprimée avec succès',
    });
  } catch (error: any) {
    logger.error('Erreur lors de la suppression de l\'adhésion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Adhésions nécessitant des cartes (pour le dashboard)
router.get('/need-cartes', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        a.id,
        a.nom,
        a.prenom,
        a.email,
        a.date_adhesion,
        a.statut,
        COUNT(c.id) as carte_count
       FROM adhesions a
       LEFT JOIN cartes c ON a.id = c.adhesion_id AND c.statut != 'remise'
       WHERE a.statut = 'actif'
         AND (c.id IS NULL OR c.statut = 'a_generer')
       GROUP BY a.id, a.nom, a.prenom, a.email, a.date_adhesion, a.statut
       ORDER BY a.date_adhesion DESC
       LIMIT 20`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des adhésions nécessitant des cartes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Synchroniser avec HelloAsso (synchronisation directe)
router.post('/sync-helloasso', async (req: AuthRequest, res) => {
  try {
    const {
      campaignId,
      accessToken,
      clientId,
      clientSecret,
      updateExisting = false,
      skipDuplicates = true,
    } = req.body;

    // Vérifier qu'on a soit un token, soit les credentials pour en obtenir un
    let token = accessToken;
    let finalCampaignId = campaignId;

    // Si pas de token mais des credentials, obtenir le token
    if (!token && clientId && clientSecret) {
      token = await getHelloAssoAccessToken(clientId, clientSecret);
    }

    // Si pas de campaignId, utiliser celui de l'env
    if (!finalCampaignId) {
      finalCampaignId = process.env.HELLOASSO_CAMPAIGN_ID;
    }

    if (!token) {
      return res.status(400).json({
        error: 'Token d\'accès HelloAsso requis (accessToken ou clientId/clientSecret)',
      });
    }

    if (!finalCampaignId) {
      return res.status(400).json({
        error: 'ID de campagne HelloAsso requis (campaignId ou HELLOASSO_CAMPAIGN_ID dans .env)',
      });
    }

    logger.info(`Début de la synchronisation HelloAsso pour la campagne ${finalCampaignId}`);

    const stats = await syncHelloAssoAdhesions(finalCampaignId, token, {
      updateExisting,
      skipDuplicates,
    });

    logger.info(`Synchronisation HelloAsso terminée:`, stats);

    res.json({
      success: true,
      message: 'Synchronisation HelloAsso terminée',
      stats,
    });
  } catch (error: any) {
    logger.error('Erreur lors de la synchronisation HelloAsso:', error);
    res.status(500).json({
      error: 'Erreur lors de la synchronisation',
      details: error.message,
    });
  }
});

// Obtenir les informations d'une campagne HelloAsso (test de connexion)
router.post('/helloasso/test-connection', async (req: AuthRequest, res) => {
  try {
    const { campaignId, accessToken, clientId, clientSecret } = req.body;

    let token = accessToken;
    let finalCampaignId = campaignId || process.env.HELLOASSO_CAMPAIGN_ID;

    if (!token && clientId && clientSecret) {
      token = await getHelloAssoAccessToken(clientId, clientSecret);
    }

    if (!token) {
      return res.status(400).json({
        error: 'Token d\'accès HelloAsso requis',
      });
    }

    if (!finalCampaignId) {
      return res.status(400).json({
        error: 'ID de campagne HelloAsso requis',
      });
    }

    // Tester la connexion en récupérant la première page
    const axios = require('axios');
    const response = await axios.get(
      `https://api.helloasso.com/v5/organizations/igca-paris/forms/Membership/${finalCampaignId}/items`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: {
          pageIndex: 1,
          pageSize: 1,
        },
      }
    );

    res.json({
      success: true,
      message: 'Connexion HelloAsso réussie',
      campaignId: finalCampaignId,
      totalItems: response.data.pagination?.totalCount || 0,
    });
  } catch (error: any) {
    logger.error('Erreur test connexion HelloAsso:', error);
    res.status(500).json({
      error: 'Erreur de connexion à HelloAsso',
      details: error.response?.data?.message || error.message,
    });
  }
});

// Statistiques des adhésions (pour le dashboard)
// Fonction helper pour formater le moyen de paiement
function formatMoyenPaiementForFacture(moyen: string): string {
  const moyens: Record<string, string> = {
    helloasso: 'HelloAsso',
    especes: 'Espèces',
    cheque: 'Chèque',
    cb: 'Carte bancaire',
    virement: 'Virement'
  };
  return moyens[moyen] || moyen;
}

// Fonction pour générer un numéro de reçu séquentiel
async function generateReceiptNumber(): Promise<number> {
  try {
    // Chercher le dernier numéro de reçu utilisé (stocké dans une table ou calculé)
    // Pour l'instant, on utilise le max ID des adhésions + 1
    const result = await pool.query(
      'SELECT MAX(id) as max_id FROM adhesions'
    );
    const maxId = result.rows[0]?.max_id || 0;
    return maxId + 1;
  } catch (error: any) {
    logger.warn('Erreur lors de la génération du numéro de reçu:', error.message);
    // Fallback: utiliser timestamp
    return Date.now() % 100000;
  }
}

// Fonction pour charger une image pour PDFKit
async function loadImageForPDF(imageUrl: string | null): Promise<Buffer | null> {
  if (!imageUrl) return null;
  
  try {
    let imagePath: string;
    
    // Si c'est une URL locale (uploads)
    if (imageUrl.includes('/uploads/')) {
      const uploadsDir = path.join(__dirname, '../../uploads');
      const urlParts = imageUrl.split('/uploads/');
      const filename = urlParts[urlParts.length - 1];
      imagePath = path.join(uploadsDir, filename);
      
      if (fs.existsSync(imagePath)) {
        return fs.readFileSync(imagePath);
      }
    }
    
    // Si c'est une URL HTTP/HTTPS
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; IGCA-Backend/1.0)',
        },
      });
      return Buffer.from(response.data);
    }
    
    // Si c'est un chemin absolu
    if (fs.existsSync(imageUrl)) {
      return fs.readFileSync(imageUrl);
    }
    
    return null;
  } catch (error: any) {
    logger.warn('Erreur lors du chargement de l\'image pour PDF:', error.message);
    return null;
  }
}

// Générer un reçu de paiement pour une adhésion (avec toutes les mentions légales)
router.get('/:id/attestation', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const adhesionResult = await pool.query(
      'SELECT * FROM adhesions WHERE id = $1',
      [id]
    );

    if (adhesionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Adhérent introuvable' });
    }

    const adhesion = adhesionResult.rows[0];

    // Générer le numéro de reçu séquentiel
    const receiptNumber = await generateReceiptNumber();
    
    // Numéro d'adhésion = HelloAsso ID (ou ID si pas de HelloAsso)
    const membershipNumber = adhesion.helloasso_id || String(adhesion.id).padStart(6, '0');

    // Générer le PDF
    const doc = new PDFDocument({ 
      size: 'A4',
      margin: 0 
    });
    const buffers: Buffer[] = [];
    
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=recu_paiement_${adhesion.id}_${adhesion.nom}_${adhesion.prenom}.pdf`);
      res.send(pdfBuffer);
    });

    // Variables de design - Charte minimaliste noir et blanc
    const pageWidth = 595; // A4 width in points
    const pageHeight = 842; // A4 height in points
    const margin = 40; // Marges uniformes
    const borderColor = '#000000'; // Noir pour bordures
    const textColor = '#000000'; // Noir pour texte principal
    const mutedColor = '#525252'; // Gris foncé pour texte secondaire
    const lightGray = '#F5F5F5'; // Gris clair pour fonds
    const greenColor = '#16A34A'; // Vert pour statut payé
    const redColor = '#DC2626'; // Rouge pour statut expiré/en attente
    
    let currentY = margin;

    const currentDate = new Date().toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });

    // ========== HEADER MINIMALISTE ==========
    // Logo et nom (gauche)
    doc.fontSize(20)
      .fillColor(textColor)
      .font('Helvetica-Bold')
      .text('IGCA PARIS', margin, currentY);
    
    doc.fontSize(10)
      .fillColor(mutedColor)
      .font('Helvetica')
      .text('Indian Gujarati Cultural Association Paris', margin, currentY + 16);

    // Contact (droite)
    doc.fontSize(9)
      .fillColor(mutedColor)
      .font('Helvetica')
      .text('contact@gujaratisamajparis.com', pageWidth - margin, currentY, { align: 'right' });
    
    doc.fontSize(9)
      .fillColor(mutedColor)
      .font('Helvetica')
      .text('07 69 34 20 75', pageWidth - margin, currentY + 10, { align: 'right' });

    // Ligne de séparation
    currentY += 35;
    doc.moveTo(margin, currentY)
      .lineTo(pageWidth - margin, currentY)
      .strokeColor(borderColor)
      .lineWidth(1)
      .stroke();
    
    currentY += 20;

    // ========== TITRE ET MÉTADONNÉES ==========
    doc.fontSize(28)
      .fillColor(textColor)
      .font('Helvetica-Bold')
      .text('REÇU DE PAIEMENT', margin, currentY);
    
    currentY += 30;

    // Métadonnées (2 colonnes)
    const metaLeftX = margin;
    const metaRightX = pageWidth / 2;
    
    doc.fontSize(9)
      .fillColor(mutedColor)
      .font('Helvetica')
      .text('Référence :', metaLeftX, currentY);
    doc.fontSize(9)
      .fillColor(textColor)
      .font('Helvetica-Bold')
      .text(`IGCA-${new Date().getFullYear()}-${String(receiptNumber).padStart(6, '0')}`, metaLeftX, currentY + 10);
    
    doc.fontSize(9)
      .fillColor(mutedColor)
      .font('Helvetica')
      .text('Date d\'émission :', metaRightX, currentY);
    doc.fontSize(9)
      .fillColor(textColor)
      .font('Helvetica-Bold')
      .text(currentDate, metaRightX, currentY + 10);
    
    // Statut (avec couleur fonctionnelle)
    const statutText = adhesion.statut === 'actif' ? 'Payé' : 
                       adhesion.statut === 'expire' ? 'Expiré' : 
                       adhesion.statut === 'renouvele' ? 'Payé' : 'En attente';
    const statusColor = adhesion.statut === 'actif' || adhesion.statut === 'renouvele' ? greenColor : 
                        adhesion.statut === 'expire' ? redColor : mutedColor;
    
    doc.fontSize(9)
      .fillColor(mutedColor)
      .font('Helvetica')
      .text('Statut :', metaRightX, currentY + 20);
    doc.fontSize(9)
      .fillColor(statusColor)
      .font('Helvetica-Bold')
      .text(statutText, metaRightX, currentY + 30);
    
    currentY += 50;

    // ========== INFORMATIONS EN 2 COLONNES ==========
    const colWidth = (pageWidth - margin * 3) / 2;
    const col1X = margin;
    const col2X = margin + colWidth + margin;
    let colY = currentY;
    
    // Colonne 1: Informations personnelles
    doc.fontSize(11)
      .fillColor(mutedColor)
      .font('Helvetica')
      .text('INFORMATIONS PERSONNELLES', col1X, colY);
    
    colY += 15;
    
    // Nom et prénom
    doc.fontSize(9)
      .fillColor(mutedColor)
      .font('Helvetica')
      .text('Nom et prénom :', col1X, colY);
    doc.fontSize(10)
      .fillColor(textColor)
      .font('Helvetica-Bold')
      .text(`${adhesion.prenom || ''} ${(adhesion.nom || '').toUpperCase()}`, col1X, colY + 10, { width: colWidth });
    
    colY += 25;
    
    // Email
    if (adhesion.email) {
      doc.fontSize(9)
        .fillColor(mutedColor)
        .font('Helvetica')
        .text('Email :', col1X, colY);
      doc.fontSize(9)
        .fillColor(textColor)
        .font('Helvetica')
        .text(adhesion.email, col1X, colY + 10, { width: colWidth });
      colY += 20;
    }
    
    // Téléphone
    if (adhesion.telephone) {
      doc.fontSize(9)
        .fillColor(mutedColor)
        .font('Helvetica')
        .text('Téléphone :', col1X, colY);
      doc.fontSize(9)
        .fillColor(textColor)
        .font('Helvetica')
        .text(adhesion.telephone, col1X, colY + 10, { width: colWidth });
      colY += 20;
    }
    
    // Date d'adhésion
    if (adhesion.date_adhesion) {
      const dateAdhesion = new Date(adhesion.date_adhesion).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      doc.fontSize(9)
        .fillColor(mutedColor)
        .font('Helvetica')
        .text('Date d\'adhésion :', col1X, colY);
      doc.fontSize(9)
        .fillColor(textColor)
        .font('Helvetica')
        .text(dateAdhesion, col1X, colY + 10, { width: colWidth });
    }
    
    // Colonne 2: Détail de paiement
    colY = currentY;
    
    doc.fontSize(11)
      .fillColor(mutedColor)
      .font('Helvetica')
      .text('DÉTAIL DE PAIEMENT', col2X, colY);
    
    colY += 15;
    
    // Montant payé
    const montant = typeof adhesion.tarif === 'string' ? parseFloat(adhesion.tarif) : adhesion.tarif;
    doc.fontSize(9)
      .fillColor(mutedColor)
      .font('Helvetica')
      .text('Montant payé :', col2X, colY);
    doc.fontSize(14)
      .fillColor(textColor)
      .font('Helvetica-Bold')
      .text(`${montant.toFixed(2)} €`, col2X, colY + 10);
    
    colY += 30;
    
    // Moyen de paiement
    doc.fontSize(9)
      .fillColor(mutedColor)
      .font('Helvetica')
      .text('Moyen de paiement :', col2X, colY);
    doc.fontSize(9)
      .fillColor(textColor)
      .font('Helvetica')
      .text(formatMoyenPaiementForFacture(adhesion.moyen_paiement), col2X, colY + 10, { width: colWidth });
    
    colY += 20;
    
    // Numéro d'adhésion
    doc.fontSize(9)
      .fillColor(mutedColor)
      .font('Helvetica')
      .text('Numéro d\'adhésion :', col2X, colY);
    doc.fontSize(9)
      .fillColor(textColor)
      .font('Helvetica-Bold')
      .text(membershipNumber, col2X, colY + 10, { width: colWidth });
    
    currentY = Math.max(colY + 30, currentY + 100);


    // ========== SIGNATURE ==========
    const signBoxWidth = pageWidth - margin * 2;
    const signBoxHeight = 80;
    const signBoxX = margin;
    const signBoxY = currentY;
    
    // Zone signature
    doc.rect(signBoxX, signBoxY, signBoxWidth, signBoxHeight)
      .fillColor('#ffffff')
      .strokeColor(borderColor)
      .lineWidth(1)
      .stroke();
    
    // Charger et afficher la signature
    try {
      const uploadsDir = path.join(__dirname, '../../uploads');
      const signaturePaths = [
        path.join(uploadsDir, 'signature.png'),
        path.join(uploadsDir, 'president_signature.png'),
        path.join(uploadsDir, 'signature.jpg'),
        path.join(uploadsDir, 'president_signature.jpg'),
      ];
      
      let signatureBuffer: Buffer | null = null;
      for (const sigPath of signaturePaths) {
        if (fs.existsSync(sigPath)) {
          signatureBuffer = fs.readFileSync(sigPath);
          break;
        }
      }
      
      if (signatureBuffer) {
        doc.image(signatureBuffer, signBoxX + 10, signBoxY + 10, {
          width: 120,
          height: 40,
          fit: [120, 40]
        });
      }
    } catch (error: any) {
      logger.warn('Erreur lors du chargement de la signature:', error.message);
    }
    
    // Nom président
    doc.fontSize(10)
      .fillColor(textColor)
      .font('Helvetica-Bold')
      .text('Sanjay Parekh', signBoxX + 10, signBoxY + 55);
    
    doc.fontSize(8)
      .fillColor(mutedColor)
      .font('Helvetica')
      .text('Président', signBoxX + 10, signBoxY + 67);
    
    // Texte à droite
    doc.fontSize(8)
      .fillColor(mutedColor)
      .font('Helvetica')
      .text('Fait pour servir et valoir ce que de droit.', 
            signBoxX + signBoxWidth - 10, signBoxY + 10, 
            { width: signBoxWidth - 200, align: 'right' });

    currentY = signBoxY + signBoxHeight + 15;

    // ========== FOOTER - MENTIONS LÉGALES COMPACTES ==========
    // Ligne de séparation
    doc.moveTo(margin, currentY)
      .lineTo(pageWidth - margin, currentY)
      .strokeColor(borderColor)
      .lineWidth(1)
      .stroke();
    
    currentY += 10;

    // Mentions légales compactes (2 colonnes)
    const footerColWidth = (pageWidth - margin * 3) / 2;
    let footerY = currentY;
    
    // Colonne gauche
    doc.fontSize(7)
      .fillColor(mutedColor)
      .font('Helvetica')
      .text('Association loi 1901 | RNA : W931007370 | SIRET : 91199334300019', margin, footerY, { width: footerColWidth, lineGap: 1 });
    
    footerY += 20;
    
    doc.fontSize(7)
      .fillColor(mutedColor)
      .font('Helvetica')
      .text('Siège social : 49 avenue Gambetta, 93170 Bagnolet, France', margin, footerY, { width: footerColWidth, lineGap: 1 });
    
    footerY += 15;
    
    doc.fontSize(7)
      .fillColor(mutedColor)
      .font('Helvetica')
      .text('Contact : contact@gujaratisamajparis.com | 07 69 34 20 75', margin, footerY, { width: footerColWidth, lineGap: 1 });
    
    // Colonne droite
    footerY = currentY;
    
    doc.fontSize(7)
      .fillColor(mutedColor)
      .font('Helvetica')
      .text('Cette cotisation n\'est pas déductible des impôts (art. 200 CGI).', margin + footerColWidth + margin, footerY, { width: footerColWidth, lineGap: 1 });
    
    footerY += 20;
    
    doc.fontSize(7)
      .fillColor(mutedColor)
      .font('Helvetica')
      .text('RGPD : Vos données sont traitées par IGCA Paris. Droit d\'accès, rectification, suppression et opposition.', margin + footerColWidth + margin, footerY, { width: footerColWidth, lineGap: 1 });
    
    footerY += 20;
    
    doc.fontSize(7)
      .fillColor(mutedColor)
      .font('Helvetica')
      .text('Document généré le ' + currentDate + ' - Reçu de paiement officiel', margin + footerColWidth + margin, footerY, { width: footerColWidth, align: 'right' });

    doc.end();
  } catch (error: any) {
    logger.error('Erreur lors de la génération de l\'attestation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const { annee } = req.query;
    const year = annee || new Date().getFullYear().toString();
    
    logger.info(`📊 Récupération stats adhésions pour année: ${year}`);

    // Statistiques générales pour l'année
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE a.statut = 'actif') as actifs,
        COUNT(*) FILTER (WHERE a.statut = 'inactif') as inactifs,
        COUNT(*) FILTER (WHERE a.statut = 'suspendu') as suspendus,
        COUNT(*) FILTER (WHERE a.statut = 'banni') as bannis,
        COALESCE(SUM(a.tarif), 0) as total_montant,
        COUNT(*) FILTER (WHERE a.moyen_paiement = 'helloasso') as helloasso_count,
        COUNT(*) FILTER (WHERE a.moyen_paiement = 'cb') as cb_count,
        COUNT(*) FILTER (WHERE a.moyen_paiement = 'especes') as especes_count,
        COUNT(*) FILTER (WHERE a.moyen_paiement = 'virement') as virement_count,
        COUNT(*) FILTER (WHERE a.moyen_paiement = 'cheque') as cheque_count,
        COUNT(*) FILTER (WHERE a.photo_url IS NOT NULL AND a.photo_url != '' AND a.photo_url != 'null' AND TRIM(a.photo_url) != '') as avec_photo,
        COUNT(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM cartes c WHERE c.adhesion_id = a.id
        )) as avec_carte
       FROM adhesions a
       WHERE a.date_adhesion IS NOT NULL AND EXTRACT(YEAR FROM a.date_adhesion)::text = $1`,
      [year]
    );
    
    logger.info(`📊 Résultat stats: ${JSON.stringify(statsResult.rows[0])}`);

    // Répartition par mois
    const monthlyResult = await pool.query(
      `SELECT 
        EXTRACT(MONTH FROM date_adhesion) as mois,
        COUNT(*) as count,
        COALESCE(SUM(tarif), 0) as montant
       FROM adhesions
       WHERE EXTRACT(YEAR FROM date_adhesion) = $1
       GROUP BY EXTRACT(MONTH FROM date_adhesion)
       ORDER BY mois`,
      [year]
    );

    const stats = statsResult.rows[0] || {};
    
    const result = {
      success: true,
      data: {
        annee: year,
        total: parseInt(stats.total) || 0,
        actifs: parseInt(stats.actifs) || 0,
        inactifs: parseInt(stats.inactifs) || 0,
        suspendus: parseInt(stats.suspendus) || 0,
        total_montant: parseFloat(stats.total_montant) || 0,
        par_moyen_paiement: {
          helloasso: parseInt(stats.helloasso_count) || 0,
          cb: parseInt(stats.cb_count) || 0,
          especes: parseInt(stats.especes_count) || 0,
          virement: parseInt(stats.virement_count) || 0,
          cheque: parseInt(stats.cheque_count) || 0,
        },
        avec_photo: parseInt(stats.avec_photo) || 0,
        avec_carte: parseInt(stats.avec_carte) || 0,
        par_mois: monthlyResult.rows.map((row: any) => ({
          mois: parseInt(row.mois),
          count: parseInt(row.count),
          montant: parseFloat(row.montant),
        })),
      },
    };
    
    logger.info(`📊 Stats finales envoyées: ${JSON.stringify(result.data)}`);
    res.json(result);
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des stats adhésions:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

