import axios from 'axios';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

interface HelloAssoAdhesion {
  id: string;
  date: string;
  amount: number;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  paymentMeans?: string;
  customFields?: Array<{ name: string; value: string }>;
}

/**
 * Récupère les adhésions depuis l'API HelloAsso
 */
export async function fetchHelloAssoAdhesions(
  campaignId: string,
  accessToken: string
): Promise<HelloAssoAdhesion[]> {
  try {
    const response = await axios.get(
      `https://api.helloasso.com/v5/organizations/igca-paris/forms/Membership/${campaignId}/items`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        params: {
          pageIndex: 1,
          pageSize: 100, // HelloAsso limite à 100 par page
        },
      }
    );

    return response.data.data || [];
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des adhésions HelloAsso:', error);
    throw new Error(`Erreur HelloAsso API: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Synchronise les adhésions HelloAsso avec la base de données
 */
export async function syncHelloAssoAdhesions(
  campaignId: string,
  accessToken: string,
  options: {
    updateExisting?: boolean;
    skipDuplicates?: boolean;
  } = {}
): Promise<{
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}> {
  const stats = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    // Récupérer toutes les pages d'adhésions
    let allAdhesions: HelloAssoAdhesion[] = [];
    let pageIndex = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await axios.get(
          `https://api.helloasso.com/v5/organizations/igca-paris/forms/Membership/${campaignId}/items`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            params: {
              pageIndex,
              pageSize: 100,
            },
          }
        );

        const data = response.data.data || [];
        allAdhesions = [...allAdhesions, ...data];

        // Vérifier s'il y a plus de pages
        const totalCount = response.data.pagination?.totalCount || 0;
        hasMore = allAdhesions.length < totalCount && data.length === 100;
        pageIndex++;

        // Limite de sécurité
        if (pageIndex > 100) {
          logger.warn('Limite de pages atteinte (100 pages max)');
          break;
        }
      } catch (error: any) {
        logger.error(`Erreur lors de la récupération de la page ${pageIndex}:`, error);
        // Continuer avec les données déjà récupérées
        break;
      }
    }

    logger.info(`Récupération de ${allAdhesions.length} adhésions depuis HelloAsso`);

    // Traiter chaque adhésion
    for (const adhesion of allAdhesions) {
      try {
        const helloassoId = adhesion.id;
        const nom = adhesion.user.lastName || '';
        const prenom = adhesion.user.firstName || '';
        const email = adhesion.user.email || '';
        const telephone = adhesion.user.phone || null;
        const dateAdhesion = new Date(adhesion.date).toISOString().split('T')[0];
        const tarif = adhesion.amount / 100; // HelloAsso retourne en centimes
        const moyenPaiement = mapHelloAssoPaymentMeans(adhesion.paymentMeans);

        // Vérifier si l'adhésion existe déjà
        const existingResult = await pool.query(
          'SELECT id FROM adhesions WHERE helloasso_id = $1',
          [helloassoId]
        );

        if (existingResult.rows.length > 0) {
          // Adhésion existante
          if (options.updateExisting) {
            await pool.query(
              `UPDATE adhesions 
               SET nom = $1, prenom = $2, email = $3, telephone = $4, 
                   date_adhesion = $5, tarif = $6, moyen_paiement = $7,
                   helloasso_campaign_id = $8, updated_at = CURRENT_TIMESTAMP
               WHERE helloasso_id = $9`,
              [
                nom,
                prenom,
                email,
                telephone,
                dateAdhesion,
                tarif,
                moyenPaiement,
                campaignId,
                helloassoId,
              ]
            );
            stats.updated++;
          } else {
            stats.skipped++;
          }
        } else {
          // Nouvelle adhésion
          await pool.query(
            `INSERT INTO adhesions (
              nom, prenom, email, telephone, date_adhesion, tarif,
              moyen_paiement, statut, helloasso_id, helloasso_campaign_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (helloasso_id) DO NOTHING`,
            [
              nom,
              prenom,
              email,
              telephone,
              dateAdhesion,
              tarif,
              moyenPaiement,
              'actif',
              helloassoId,
              campaignId,
            ]
          );
          stats.created++;
        }
      } catch (error: any) {
        logger.error(`Erreur lors du traitement de l'adhésion ${adhesion.id}:`, error);
        stats.errors++;
      }
    }

    return stats;
  } catch (error: any) {
    logger.error('Erreur lors de la synchronisation HelloAsso:', error);
    throw error;
  }
}

/**
 * Mappe les moyens de paiement HelloAsso vers notre format
 */
function mapHelloAssoPaymentMeans(helloassoPayment?: string): string {
  if (!helloassoPayment) return 'helloasso';

  const mapping: Record<string, string> = {
    Card: 'cb',
    Check: 'cheque',
    Transfer: 'virement',
    Cash: 'especes',
    HelloAsso: 'helloasso',
  };

  return mapping[helloassoPayment] || 'helloasso';
}

/**
 * Obtient un token d'accès HelloAsso (OAuth2)
 */
export async function getHelloAssoAccessToken(
  clientId: string,
  clientSecret: string
): Promise<string> {
  try {
    const response = await axios.post(
      'https://api.helloasso.com/oauth2/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data.access_token;
  } catch (error: any) {
    logger.error('Erreur lors de l\'obtention du token HelloAsso:', error);
    throw new Error(`Erreur authentification HelloAsso: ${error.response?.data?.error || error.message}`);
  }
}

