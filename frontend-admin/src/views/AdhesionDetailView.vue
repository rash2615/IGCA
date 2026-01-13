<template>
  <div class="adhesion-detail">
    <div class="detail-header">
      <button @click="goBack" class="btn-back">← Retour</button>
      <div class="header-actions">
        <button @click="editAdhesion" class="btn-primary">✏️ Modifier</button>
        <button @click="confirmDelete" class="btn-danger">🗑️ Supprimer</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Chargement...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="adhesion" class="detail-content">
      <div class="detail-card">
        <h1>{{ adhesion.nom }} {{ adhesion.prenom }}</h1>
        <div class="badge-container">
          <span :class="['badge', `badge-${adhesion.statut}`]">{{ adhesion.statut }}</span>
          <span v-if="adhesion.helloasso_id" class="badge badge-helloasso">✅ HelloAsso</span>
        </div>
      </div>

      <div class="info-grid">
        <!-- Informations personnelles -->
        <div class="info-section">
          <h2>👤 Informations personnelles</h2>
          <div class="info-item">
            <label>Nom</label>
            <p>{{ adhesion.nom }}</p>
          </div>
          <div class="info-item">
            <label>Prénom</label>
            <p>{{ adhesion.prenom }}</p>
          </div>
          <div class="info-item">
            <label>Email</label>
            <p><a :href="`mailto:${adhesion.email}`">{{ adhesion.email }}</a></p>
          </div>
          <div class="info-item" v-if="adhesion.telephone">
            <label>Téléphone</label>
            <p><a :href="`tel:${adhesion.telephone}`">{{ adhesion.telephone }}</a></p>
          </div>
          <div class="info-item" v-if="adhesion.photo_url">
            <label>Photo</label>
            <img :src="getImageUrl(adhesion.photo_url)" alt="Photo" class="photo-preview" />
          </div>
        </div>

        <!-- Informations d'adhésion -->
        <div class="info-section">
          <h2>📋 Informations d'adhésion</h2>
          <div class="info-item">
            <label>Date d'adhésion</label>
            <p>{{ formatDate(adhesion.date_adhesion) }}</p>
          </div>
          <div class="info-item">
            <label>Tarif</label>
            <p class="price">{{ adhesion.tarif }} €</p>
          </div>
          <div class="info-item">
            <label>Moyen de paiement</label>
            <p>{{ formatMoyenPaiement(adhesion.moyen_paiement) }}</p>
          </div>
          <div class="info-item">
            <label>Statut</label>
            <p><span :class="['badge', `badge-${adhesion.statut}`]">{{ adhesion.statut }}</span></p>
          </div>
        </div>

        <!-- HelloAsso -->
        <div class="info-section" v-if="adhesion.helloasso_id || adhesion.helloasso_campaign_id">
          <h2>🔗 HelloAsso</h2>
          <div class="info-item" v-if="adhesion.helloasso_id">
            <label>ID Adhésion HelloAsso</label>
            <p><code>{{ adhesion.helloasso_id }}</code></p>
          </div>
          <div class="info-item" v-if="adhesion.helloasso_campaign_id">
            <label>ID Campagne HelloAsso</label>
            <p><code>{{ adhesion.helloasso_campaign_id }}</code></p>
          </div>
        </div>

        <!-- Cartes associées -->
        <div class="info-section" v-if="adhesion.cartes && adhesion.cartes.length > 0">
          <h2>🎴 Cartes membres</h2>
          <div class="cartes-list">
            <div v-for="carte in adhesion.cartes" :key="carte.id" class="carte-item">
              <div class="carte-info">
                <p><strong>Numéro:</strong> {{ carte.numero_carte || 'N/A' }}</p>
                <p><strong>Statut:</strong> <span :class="['badge', `badge-${carte.statut}`]">{{ carte.statut }}</span></p>
                <p v-if="carte.date_generation"><strong>Générée le:</strong> {{ formatDateTime(carte.date_generation) }}</p>
                <p v-if="carte.date_remise"><strong>Remise le:</strong> {{ formatDateTime(carte.date_remise) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Métadonnées -->
        <div class="info-section">
          <h2>📅 Métadonnées</h2>
          <div class="info-item">
            <label>Créée le</label>
            <p>{{ formatDateTime(adhesion.created_at) }}</p>
          </div>
          <div class="info-item" v-if="adhesion.updated_at">
            <label>Modifiée le</label>
            <p>{{ formatDateTime(adhesion.updated_at) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de confirmation de suppression -->
    <div v-if="showDeleteModal" class="modal" @click.self="showDeleteModal = false">
      <div class="modal-content">
        <h2>Confirmer la suppression</h2>
        <p>Êtes-vous sûr de vouloir supprimer l'adhésion de <strong>{{ adhesion?.nom }} {{ adhesion?.prenom }}</strong> ?</p>
        <p class="warning">Cette action est irréversible et supprimera également toutes les cartes associées.</p>
        <div class="modal-actions">
          <button @click="deleteAdhesion" :disabled="deleting" class="btn-danger">
            {{ deleting ? 'Suppression...' : 'Supprimer' }}
          </button>
          <button @click="showDeleteModal = false" class="btn-cancel">Annuler</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { adhesionsApi } from '@/services/api';

const router = useRouter();
const route = useRoute();
const adhesion = ref<any>(null);
const loading = ref(true);
const error = ref('');
const showDeleteModal = ref(false);
const deleting = ref(false);

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Fonction pour construire l'URL complète de l'image
function getImageUrl(photoUrl: string | null | undefined): string {
  if (!photoUrl) return '';
  
  // Si c'est déjà une URL complète (http/https), retourner tel quel
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }
  
  // Si c'est une URL locale (uploads), construire l'URL complète
  if (photoUrl.startsWith('/uploads/') || photoUrl.startsWith('uploads/')) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return photoUrl.startsWith('/uploads/') ? `${apiUrl}${photoUrl}` : `${apiUrl}/${photoUrl}`;
  }
  
  // Si c'est un data URL ou blob, retourner tel quel
  if (photoUrl.startsWith('data:') || photoUrl.startsWith('blob:')) {
    return photoUrl;
  }
  
  return photoUrl;
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
.adhesion-detail {
  width: 100%;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.btn-back {
  padding: 10px 20px;
  background-color: #95a5a6;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
}

.btn-back:hover {
  background-color: #7f8c8d;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-primary {
  padding: 12px 24px;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

.btn-primary:hover {
  background-color: #5568d3;
}

.btn-danger {
  padding: 12px 24px;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

.btn-danger:hover {
  background-color: #c0392b;
}

.detail-card {
  background: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.detail-card h1 {
  margin: 0 0 15px 0;
  color: #2c3e50;
}

.badge-container {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.badge {
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  display: inline-block;
}

.badge-actif {
  background-color: #d4edda;
  color: #155724;
}

.badge-expire {
  background-color: #f8d7da;
  color: #721c24;
}

.badge-renouvele {
  background-color: #d1ecf1;
  color: #0c5460;
}

.badge-helloasso {
  background-color: #fff3cd;
  color: #856404;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.info-section {
  background: white;
  padding: 25px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.info-section h2 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 18px;
  border-bottom: 2px solid #ecf0f1;
  padding-bottom: 10px;
}

.info-item {
  margin-bottom: 15px;
}

.info-item label {
  display: block;
  font-weight: 600;
  color: #7f8c8d;
  font-size: 12px;
  text-transform: uppercase;
  margin-bottom: 5px;
}

.info-item p {
  margin: 0;
  color: #2c3e50;
  font-size: 14px;
}

.info-item a {
  color: #667eea;
  text-decoration: none;
}

.info-item a:hover {
  text-decoration: underline;
}

.info-item code {
  background-color: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #e74c3c;
}

.price {
  font-size: 20px;
  font-weight: bold;
  color: #27ae60;
}

.photo-preview {
  max-width: 200px;
  max-height: 200px;
  border-radius: 10px;
  margin-top: 10px;
}

.cartes-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.carte-item {
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 5px;
  border-left: 4px solid #667eea;
}

.carte-info p {
  margin: 5px 0;
  font-size: 14px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}

.error {
  text-align: center;
  padding: 40px;
  color: #e74c3c;
  background-color: #f8d7da;
  border-radius: 10px;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 10px;
  max-width: 500px;
  width: 90%;
}

.modal-content h2 {
  margin: 0 0 15px 0;
  color: #2c3e50;
}

.modal-content .warning {
  color: #e74c3c;
  font-weight: 500;
  margin: 15px 0;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  justify-content: flex-end;
}

.btn-cancel {
  background-color: #95a5a6;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 5px;
  cursor: pointer;
}
</style>

