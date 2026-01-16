<template>
  <div class="adhesion-detail-glass">
    <!-- Background avec gradient -->
    <div class="background-gradient"></div>
    
    <div class="detail-container">
      <!-- Header avec navigation -->
      <div class="page-header-glass">
        <button @click="goBack" class="btn-back-glass">
          <span class="material-symbols-outlined">arrow_back</span>
          Retour
        </button>
        <div class="header-title">
          <h1>Détails de l'adhésion</h1>
          <p class="breadcrumb">Adhésions >> Détails</p>
        </div>
        <div class="header-actions-glass">
          <button @click="generateAttestation" class="btn-action-glass" title="Générer attestation de paiement">
            <span class="material-symbols-outlined">description</span>
          </button>
          <button @click="editAdhesion" class="btn-action-glass btn-primary-glass" title="Modifier">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button @click="confirmDelete" class="btn-action-glass btn-danger-glass" title="Supprimer">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading-container-glass">
        <div class="spinner-glass"></div>
        <p>Chargement...</p>
      </div>
      <div v-else-if="error" class="error-glass">{{ error }}</div>
      <div v-else-if="adhesion" class="content-wrapper-glass">
        <!-- Carte principale - Carte d'identité -->
        <div class="glass-card identity-card-glass">
          <div class="card-header-glass">
            <div class="logo-section">
              <div class="logo-circle-glass">
                <span class="material-symbols-outlined">groups</span>
              </div>
              <div class="logo-text-glass">
                <h2>IGCA PARIS</h2>
                <p>Indian Gujarati Cultural Association</p>
              </div>
            </div>
            <div class="badges-header">
              <span :class="['badge-glass', `badge-${adhesion.statut}`]">
                <span class="material-symbols-outlined">{{ getStatutIcon(adhesion.statut) }}</span>
                {{ formatStatut(adhesion.statut) }}
              </span>
              <span v-if="adhesion.source === 'offline'" class="badge-glass badge-offline">
                <span class="material-symbols-outlined">store</span>
                Hors ligne
              </span>
              <span v-else-if="adhesion.source === 'online'" class="badge-glass badge-online">
                <span class="material-symbols-outlined">language</span>
                En ligne
              </span>
            </div>
          </div>
          
          <div class="card-body-glass">
            <div class="photo-section-glass">
              <div class="photo-frame-glass">
                <img
                  v-if="adhesion.photo_url"
                  :src="getImageUrl(adhesion.photo_url)"
                  :alt="`${adhesion.nom} ${adhesion.prenom}`"
                  @error="handleImageError"
                />
                <div v-else class="photo-placeholder-glass">
                  <span class="material-symbols-outlined">person</span>
                </div>
              </div>
              <div class="photo-badge-glass" v-if="adhesion.photo_url">
                <span class="material-symbols-outlined">check_circle</span>
                Photo disponible
              </div>
            </div>
            
            <div class="info-section-glass">
              <div class="name-section">
                <h1 class="name-glass">{{ adhesion.prenom }} {{ adhesion.nom }}</h1>
                <div class="id-badge-glass">
                  <span class="material-symbols-outlined">fingerprint</span>
                  <span>ID: #{{ adhesion.id }}</span>
                </div>
              </div>
              
              <div class="details-grid-glass">
                <div class="detail-item-glass">
                  <div class="detail-icon-glass">
                    <span class="material-symbols-outlined">email</span>
                  </div>
                  <div class="detail-content-glass">
                    <span class="detail-label">Email</span>
                    <a :href="`mailto:${adhesion.email}`" class="detail-value">{{ adhesion.email || 'Non renseigné' }}</a>
                  </div>
                </div>
                
                <div class="detail-item-glass" v-if="adhesion.telephone">
                  <div class="detail-icon-glass">
                    <span class="material-symbols-outlined">phone</span>
                  </div>
                  <div class="detail-content-glass">
                    <span class="detail-label">Téléphone</span>
                    <a :href="`tel:${adhesion.telephone}`" class="detail-value">{{ adhesion.telephone }}</a>
                  </div>
                </div>
                
                <div class="detail-item-glass">
                  <div class="detail-icon-glass">
                    <span class="material-symbols-outlined">calendar_today</span>
                  </div>
                  <div class="detail-content-glass">
                    <span class="detail-label">Date d'adhésion</span>
                    <span class="detail-value">{{ formatDate(adhesion.date_adhesion) }}</span>
                  </div>
                </div>
                
                <div class="detail-item-glass">
                  <div class="detail-icon-glass">
                    <span class="material-symbols-outlined">payments</span>
                  </div>
                  <div class="detail-content-glass">
                    <span class="detail-label">Tarif</span>
                    <span class="detail-value price-glass">{{ adhesion.tarif }} €</span>
                  </div>
                </div>
                
                <div class="detail-item-glass">
                  <div class="detail-icon-glass">
                    <span class="material-symbols-outlined">{{ getPaymentIcon(adhesion.moyen_paiement) }}</span>
                  </div>
                  <div class="detail-content-glass">
                    <span class="detail-label">Moyen de paiement</span>
                    <span class="detail-value">{{ formatMoyenPaiement(adhesion.moyen_paiement) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="card-footer-glass">
            <div class="footer-item-glass" v-if="adhesion.helloasso_id">
              <span class="material-symbols-outlined">link</span>
              <span>HelloAsso ID: {{ adhesion.helloasso_id }}</span>
            </div>
            <div class="footer-item-glass">
              <span class="material-symbols-outlined">schedule</span>
              <span>Créée le {{ formatDateTime(adhesion.created_at) }}</span>
            </div>
          </div>
        </div>

        <!-- Section Documents -->
        <div class="section-title-glass">
          <h2>
            <span class="material-symbols-outlined">folder</span>
            Documents
          </h2>
        </div>

        <div class="documents-grid-glass">
          <!-- Carte membre -->
          <div v-if="adhesion.cartes && adhesion.cartes.length > 0" class="glass-card document-card-glass">
            <div class="document-icon-wrapper">
              <span class="material-symbols-outlined document-icon-gradient">badge</span>
            </div>
            <h3>Carte membre</h3>
            <div class="document-info-glass">
              <div class="info-line-glass">
                <span class="info-label">Numéro</span>
                <span class="info-value">{{ adhesion.cartes[0].numero_carte }}</span>
              </div>
              <div class="info-line-glass">
                <span class="info-label">Statut</span>
                <span :class="['badge-glass', `badge-${adhesion.cartes[0].statut}`]">
                  {{ formatCarteStatut(adhesion.cartes[0].statut) }}
                </span>
              </div>
              <div class="info-line-glass" v-if="adhesion.cartes[0].date_generation">
                <span class="info-label">Générée le</span>
                <span class="info-value">{{ formatDateTime(adhesion.cartes[0].date_generation) }}</span>
              </div>
            </div>
            <div class="document-actions-glass">
              <button @click="downloadCarte('pdf')" class="btn-download-glass">
                <span class="material-symbols-outlined">picture_as_pdf</span>
                PDF
              </button>
              <button @click="downloadCarte('png')" class="btn-download-glass">
                <span class="material-symbols-outlined">image</span>
                Image
              </button>
            </div>
          </div>
          
          <!-- Attestation de paiement -->
          <div class="glass-card document-card-glass">
            <div class="document-icon-wrapper">
              <span class="material-symbols-outlined document-icon-gradient">description</span>
            </div>
            <h3>Attestation de paiement</h3>
            <div class="document-info-glass">
              <div class="info-line-glass">
                <span class="info-label">Date</span>
                <span class="info-value">{{ formatDate(adhesion.date_adhesion) }}</span>
              </div>
              <div class="info-line-glass">
                <span class="info-label">Montant</span>
                <span class="info-value price-glass">{{ adhesion.tarif }} €</span>
              </div>
              <div class="info-line-glass">
                <span class="info-label">Paiement</span>
                <span class="info-value">{{ formatMoyenPaiement(adhesion.moyen_paiement) }}</span>
              </div>
              <div class="info-line-glass">
                <span class="info-label">Statut</span>
                <span :class="['badge-glass', `badge-${adhesion.statut}`]">
                  {{ formatStatut(adhesion.statut) }}
                </span>
              </div>
            </div>
            <div class="document-actions-glass">
              <button @click="generateAttestation" class="btn-download-glass btn-primary-gradient">
                <span class="material-symbols-outlined">download</span>
                Télécharger
              </button>
            </div>
          </div>
        </div>

        <!-- Informations complémentaires -->
        <div class="section-title-glass">
          <h2>
            <span class="material-symbols-outlined">info</span>
            Informations complémentaires
          </h2>
        </div>

        <div class="info-grid-glass">
          <div class="glass-card info-card-glass">
            <div class="info-card-header">
              <span class="material-symbols-outlined info-icon-gradient">link</span>
              <h3>HelloAsso</h3>
            </div>
            <div class="info-content-glass" v-if="adhesion.helloasso_id || adhesion.helloasso_campaign_id">
              <div class="info-item-glass" v-if="adhesion.helloasso_id">
                <span class="info-label">ID Adhésion</span>
                <code class="info-code">{{ adhesion.helloasso_id }}</code>
              </div>
              <div class="info-item-glass" v-if="adhesion.helloasso_campaign_id">
                <span class="info-label">ID Campagne</span>
                <code class="info-code">{{ adhesion.helloasso_campaign_id }}</code>
              </div>
            </div>
            <div v-else class="info-content-glass">
              <p class="no-data-glass">Aucune information HelloAsso</p>
            </div>
          </div>
          
          <div class="glass-card info-card-glass">
            <div class="info-card-header">
              <span class="material-symbols-outlined info-icon-gradient">history</span>
              <h3>Historique</h3>
            </div>
            <div class="info-content-glass">
              <div class="info-item-glass">
                <span class="info-label">Créée le</span>
                <span class="info-value">{{ formatDateTime(adhesion.created_at) }}</span>
              </div>
              <div class="info-item-glass" v-if="adhesion.updated_at">
                <span class="info-label">Modifiée le</span>
                <span class="info-value">{{ formatDateTime(adhesion.updated_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de confirmation de suppression -->
    <div v-if="showDeleteModal" class="modal-glass" @click.self="showDeleteModal = false">
      <div class="modal-content-glass">
        <h2>Confirmer la suppression</h2>
        <p>Êtes-vous sûr de vouloir supprimer l'adhésion de <strong>{{ adhesion?.nom }} {{ adhesion?.prenom }}</strong> ?</p>
        <p class="warning-glass">Cette action est irréversible et supprimera également toutes les cartes associées.</p>
        <div class="modal-actions-glass">
          <button @click="deleteAdhesion" :disabled="deleting" class="btn-danger-glass">
            {{ deleting ? 'Suppression...' : 'Supprimer' }}
          </button>
          <button @click="showDeleteModal = false" class="btn-cancel-glass">Annuler</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { adhesionsApi, cartesApi } from '@/services/api';

const router = useRouter();
const route = useRoute();
const adhesion = ref<any>(null);
const loading = ref(true);
const error = ref('');
const showDeleteModal = ref(false);
const deleting = ref(false);

function formatDate(date: string) {
  if (!date) return 'Date invalide';
  try {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return 'Date invalide';
  }
}

function formatDateTime(date: string) {
  if (!date) return 'Date invalide';
  try {
    return new Date(date).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Date invalide';
  }
}

function getImageUrl(photoUrl: string | null | undefined): string {
  if (!photoUrl) return '';
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }
  if (photoUrl.startsWith('/uploads/') || photoUrl.startsWith('uploads/')) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return photoUrl.startsWith('/uploads/') ? `${apiUrl}${photoUrl}` : `${apiUrl}/${photoUrl}`;
  }
  if (photoUrl.startsWith('data:') || photoUrl.startsWith('blob:')) {
    return photoUrl;
  }
  return photoUrl;
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
}

function formatMoyenPaiement(moyen: string) {
  const moyens: Record<string, string> = {
    helloasso: 'HelloAsso',
    especes: 'Espèces',
    cheque: 'Chèque',
    cb: 'Carte bancaire',
    virement: 'Virement'
  };
  return moyens[moyen] || moyen;
}

function getPaymentIcon(moyen: string): string {
  const icons: Record<string, string> = {
    helloasso: 'language',
    especes: 'monetization_on',
    cheque: 'description',
    cb: 'credit_card',
    virement: 'account_balance',
  };
  return icons[moyen] || 'payments';
}

function formatStatut(statut: string) {
  const statuts: Record<string, string> = {
    actif: 'Actif',
    expire: 'Expiré',
    renouvele: 'Renouvelé',
    a_generer: 'À générer',
  };
  return statuts[statut] || statut;
}

function getStatutIcon(statut: string): string {
  const icons: Record<string, string> = {
    actif: 'check_circle',
    expire: 'cancel',
    renouvele: 'refresh',
    a_generer: 'pending',
  };
  return icons[statut] || 'help';
}

function formatCarteStatut(statut: string) {
  const statuts: Record<string, string> = {
    a_generer: 'À générer',
    generee: 'Générée',
    a_remettre: 'À remettre',
    remise: 'Remise',
  };
  return statuts[statut] || statut;
}

function goBack() {
  router.push('/app/adhesions');
}

function editAdhesion() {
  router.push(`/app/adhesions/${route.params.id}/edit`);
}

function confirmDelete() {
  showDeleteModal.value = true;
}

async function deleteAdhesion() {
  if (!adhesion.value) return;
  
  deleting.value = true;
  try {
    await adhesionsApi.delete(adhesion.value.id);
    router.push('/app/adhesions');
  } catch (error: any) {
    console.error('Erreur lors de la suppression:', error);
    alert(error.response?.data?.error || 'Erreur lors de la suppression');
  } finally {
    deleting.value = false;
    showDeleteModal.value = false;
  }
}

async function generateAttestation() {
  if (!adhesion.value) return;
  
  try {
    const response = await adhesionsApi.generateAttestation(adhesion.value.id);
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attestation_paiement_${adhesion.value.id}_${adhesion.value.nom}_${adhesion.value.prenom}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error('Erreur lors de la génération de l\'attestation:', error);
    alert(error.response?.data?.error || 'Erreur lors de la génération de l\'attestation de paiement');
  }
}

async function downloadCarte(format: 'pdf' | 'png') {
  if (!adhesion.value || !adhesion.value.cartes || adhesion.value.cartes.length === 0) return;
  
  try {
    const carteId = adhesion.value.cartes[0].id;
    const response = await cartesApi.download(carteId, format);
    const blob = new Blob([response.data], { 
      type: format === 'pdf' ? 'application/pdf' : 'image/png' 
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carte_${adhesion.value.cartes[0].numero_carte}.${format}`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error('Erreur lors du téléchargement de la carte:', error);
    alert(error.response?.data?.error || 'Erreur lors du téléchargement de la carte');
  }
}

async function loadAdhesion() {
  loading.value = true;
  error.value = '';
  try {
    const id = parseInt(route.params.id as string);
    const response = await adhesionsApi.get(id);
    adhesion.value = response.data.data || response.data;
  } catch (err: any) {
    console.error('Erreur lors du chargement:', err);
    error.value = err.response?.data?.error || 'Erreur lors du chargement de l\'adhésion';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadAdhesion();
});
</script>

<style scoped>
.adhesion-detail-glass {
  min-height: 100vh;
  position: relative;
  padding: 30px;
}

/* Background gradient */
.background-gradient {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 50%, #f093fb 100%);
  z-index: 0;
  opacity: 0.1;
}

.detail-container {
  position: relative;
  z-index: 1;
  width: 100%;
  margin: 0;
}

/* Glassmorphism effect */
.glass-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  padding: 30px;
  transition: all 0.3s ease;
}

.glass-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

/* Header */
.page-header-glass {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  padding: 24px 30px;
  margin-bottom: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.btn-back-glass {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  color: #2c3e50;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-back-glass:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateX(-3px);
}

.header-title h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.breadcrumb {
  margin: 5px 0 0 0;
  font-size: 13px;
  color: #7f8c8d;
}

.header-actions-glass {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-action-glass {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  color: var(--primary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action-glass:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.btn-action-glass.btn-primary-glass {
  background: var(--primary);
  color: var(--text-inverse);
  border: none;
}

.btn-action-glass.btn-primary-glass:hover {
  background: var(--primary-dark);
  box-shadow: var(--shadow-orange);
}

.btn-action-glass.btn-danger-glass {
  color: #e74c3c;
}

.btn-action-glass.btn-danger-glass:hover {
  background: rgba(231, 76, 60, 0.1);
}

/* Loading */
.loading-container-glass {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
  gap: 20px;
}

.spinner-glass {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-glass {
  text-align: center;
  padding: 40px;
  background: rgba(248, 215, 218, 0.9);
  backdrop-filter: blur(20px);
  color: #e74c3c;
  border-radius: 20px;
  border: 1px solid rgba(231, 76, 60, 0.3);
}

/* Carte d'identité */
.identity-card-glass {
  margin-bottom: 30px;
  padding: 40px;
}

.card-header-glass {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 25px;
  border-bottom: 2px solid rgba(102, 126, 234, 0.1);
  flex-wrap: wrap;
  gap: 20px;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.logo-circle-glass {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.logo-circle-glass .material-symbols-outlined {
  font-size: 36px;
  color: white;
}

.logo-text-glass h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-text-glass p {
  margin: 5px 0 0 0;
  font-size: 13px;
  color: #7f8c8d;
}

.badges-header {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.badge-glass {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.badge-glass .material-symbols-outlined {
  font-size: 16px;
}

.badge-glass.badge-actif {
  background: rgba(39, 174, 96, 0.15);
  color: #27ae60;
  border-color: rgba(39, 174, 96, 0.3);
}

.badge-glass.badge-expire {
  background: rgba(231, 76, 60, 0.15);
  color: #e74c3c;
  border-color: rgba(231, 76, 60, 0.3);
}

.badge-glass.badge-renouvele {
  background: rgba(52, 152, 219, 0.15);
  color: #3498db;
  border-color: rgba(52, 152, 219, 0.3);
}

.badge-glass.badge-online {
  background: rgba(52, 152, 219, 0.15);
  color: #3498db;
  border-color: rgba(52, 152, 219, 0.3);
}

.badge-glass.badge-offline {
  background: rgba(241, 196, 15, 0.15);
  color: #f1c40f;
  border-color: rgba(241, 196, 15, 0.3);
}

.card-body-glass {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 40px;
  align-items: start;
}

.photo-section-glass {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.photo-frame-glass {
  width: 180px;
  height: 240px;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.5);
  border: 3px solid rgba(102, 126, 234, 0.2);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-frame-glass img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder-glass {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bdc3c7;
}

.photo-placeholder-glass .material-symbols-outlined {
  font-size: 64px;
}

.photo-badge-glass {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(39, 174, 96, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  font-size: 12px;
  color: #27ae60;
  border: 1px solid rgba(39, 174, 96, 0.3);
}

.info-section-glass {
  flex: 1;
}

.name-section {
  margin-bottom: 30px;
}

.name-glass {
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 15px 0;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}

.id-badge-glass {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  background: rgba(102, 126, 234, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(102, 126, 234, 0.2);
  font-size: 14px;
  font-weight: 600;
  color: var(--primary);
}

.details-grid-glass {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-item-glass {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.2s;
}

.detail-item-glass:hover {
  background: rgba(255, 255, 255, 0.7);
  transform: translateX(5px);
}

.detail-icon-glass {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.detail-icon-glass .material-symbols-outlined {
  font-size: 22px;
  color: white;
}

.detail-content-glass {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 11px;
  text-transform: uppercase;
  color: #7f8c8d;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.detail-value.price-glass {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.detail-value a {
  color: var(--primary);
  text-decoration: none;
  transition: all 0.2s;
}

.detail-value a:hover {
  color: var(--primary-dark);
  text-decoration: underline;
}

.card-footer-glass {
  margin-top: 30px;
  padding-top: 25px;
  border-top: 2px solid rgba(102, 126, 234, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.footer-item-glass {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #7f8c8d;
}

.footer-item-glass .material-symbols-outlined {
  font-size: 18px;
}

/* Section Documents */
.section-title-glass {
  margin: 40px 0 20px 0;
}

.section-title-glass h2 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.section-title-glass .material-symbols-outlined {
  color: var(--primary);
}

.documents-grid-glass {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 25px;
  margin-bottom: 40px;
}

.document-card-glass {
  text-align: center;
  padding: 30px;
}

.document-icon-wrapper {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.document-icon-gradient {
  font-size: 40px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.document-card-glass h3 {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
}

.document-info-glass {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 25px;
  text-align: left;
}

.info-line-glass {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.info-line-glass:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 13px;
  color: #7f8c8d;
  font-weight: 500;
}

.info-value {
  font-size: 14px;
  color: #2c3e50;
  font-weight: 600;
}

.info-value.price-glass {
  color: #27ae60;
  font-size: 16px;
}

.document-actions-glass {
  display: flex;
  gap: 10px;
}

.btn-download-glass {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--primary);
  transition: all 0.2s;
}

.btn-download-glass:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.btn-download-glass.btn-primary-gradient {
  background: var(--primary);
  color: var(--text-inverse);
  border: none;
}

.btn-download-glass.btn-primary-gradient:hover {
  background: var(--primary-dark);
  box-shadow: var(--shadow-orange);
}

.btn-download-glass .material-symbols-outlined {
  font-size: 18px;
}

/* Informations complémentaires */
.info-grid-glass {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 25px;
}

.info-card-glass {
  padding: 25px;
}

.info-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid rgba(102, 126, 234, 0.1);
}

.info-icon-gradient {
  font-size: 28px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.info-card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.info-content-glass {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.info-item-glass {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.info-item-glass:last-child {
  border-bottom: none;
}

.info-item-glass .info-label {
  font-size: 13px;
  color: #7f8c8d;
  font-weight: 500;
}

.info-item-glass .info-value {
  font-size: 14px;
  color: #2c3e50;
  font-weight: 600;
}

.info-code {
  background: rgba(102, 126, 234, 0.1);
  padding: 6px 12px;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--primary);
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.no-data-glass {
  color: #7f8c8d;
  font-style: italic;
  margin: 0;
  text-align: center;
  padding: 20px;
}

/* Modal */
.modal-glass {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content-glass {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 35px;
  max-width: 500px;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-content-glass h2 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 24px;
}

.modal-content-glass .warning-glass {
  color: #e74c3c;
  font-weight: 500;
  margin: 15px 0;
}

.modal-actions-glass {
  display: flex;
  gap: 12px;
  margin-top: 25px;
  justify-content: flex-end;
}

.btn-cancel-glass {
  background: rgba(149, 165, 166, 0.2);
  backdrop-filter: blur(10px);
  color: #2c3e50;
  border: 1px solid rgba(149, 165, 166, 0.3);
  padding: 12px 24px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-cancel-glass:hover {
  background: rgba(149, 165, 166, 0.3);
}

.btn-danger-glass {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-danger-glass:hover {
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
}

/* Responsive */
@media (max-width: 768px) {
  .adhesion-detail-glass {
    padding: 15px;
  }
  
  .card-body-glass {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  
  .photo-frame-glass {
    width: 150px;
    height: 200px;
  }
  
  .name-glass {
    font-size: 28px;
  }
  
  .documents-grid-glass {
    grid-template-columns: 1fr;
  }
  
  .info-grid-glass {
    grid-template-columns: 1fr;
  }
  
  .page-header-glass {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-actions-glass {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
