<template>
  <div class="cartes-view">
    <!-- En-tête avec titre et actions -->
    <div class="header-section">
      <div class="title-group">
        <h1>
          <span class="material-symbols-outlined">badge</span>
          Cartes membres & Vérification
        </h1>
        <p class="subtitle">Gérez les cartes membres et vérifiez leur statut</p>
      </div>
      <div class="actions">
        <button @click="openGenerateModal" class="btn-primary">
          <span class="material-symbols-outlined">add</span>
          Générer une carte
        </button>
      </div>
    </div>

    <!-- Section recherche/vérification -->
    <div class="search-section">
      <div class="search-card">
        <h2>
          <span class="material-symbols-outlined">search</span>
          Rechercher / Vérifier une carte
        </h2>
        <div class="search-form">
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Rechercher par nom, email, numéro de carte..."
            @keyup.enter="searchCarte"
            class="search-input"
          />
          <button @click="searchCarte" :disabled="loading" class="btn-search">
            <span class="material-symbols-outlined">search</span>
            {{ loading ? 'Recherche...' : 'Rechercher' }}
          </button>
        </div>
        
        <!-- Résultat de recherche -->
        <div v-if="searchResult" class="search-result">
          <div v-if="searchResult.found" :class="['result-card', searchResult.valid ? 'valid' : 'invalid']">
            <div class="result-header">
              <span class="material-symbols-outlined">{{ searchResult.valid ? 'check_circle' : 'cancel' }}</span>
              <h3>{{ searchResult.valid ? 'Adhésion valide' : 'Adhésion expirée' }}</h3>
            </div>
            <div class="result-info">
              <div class="info-row">
                <span class="label">Nom :</span>
                <span class="value">{{ searchResult.data.nom }} {{ searchResult.data.prenom }}</span>
              </div>
              <div class="info-row" v-if="searchResult.data.email">
                <span class="label">Email :</span>
                <span class="value">{{ searchResult.data.email }}</span>
              </div>
              <div class="info-row">
                <span class="label">Date d'adhésion :</span>
                <span class="value">{{ formatDate(searchResult.data.date_adhesion) }}</span>
              </div>
              <div class="info-row">
                <span class="label">Statut :</span>
                <span :class="['badge', `badge-${searchResult.data.statut}`]">
                  {{ formatStatut(searchResult.data.statut) }}
                </span>
              </div>
              <div class="info-row" v-if="searchResult.data.carte">
                <span class="label">Carte :</span>
                <span class="value">{{ searchResult.data.carte.numero }} 
                  <span :class="['badge', `badge-${getCarteStatutLabel(searchResult.data.carte.statut)}`]">
                    {{ getCarteStatutLabel(searchResult.data.carte.statut) }}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div v-else class="result-card not-found">
            <span class="material-symbols-outlined">error</span>
            <p>Aucun adhérent trouvé</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Section liste des cartes -->
    <div class="cartes-section">
      <div class="section-header">
        <h2>
          <span class="material-symbols-outlined">list</span>
          Liste des cartes
        </h2>
        <div class="filters">
          <select v-model="filters.statut" @change="loadCartes" class="filter-select">
            <option value="">Tous les statuts</option>
            <option value="a_generer">En cours de création</option>
            <option value="generee">Générée</option>
            <option value="a_remettre">Non récupérée</option>
            <option value="remise">Délivrée</option>
          </select>
        </div>
      </div>

      <!-- Statistiques rapides -->
      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-icon" style="background: #fef3c7;">
            <span class="material-symbols-outlined" style="color: #d97706;">hourglass_empty</span>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.enCours }}</div>
            <div class="stat-label">En cours de création</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #dbeafe;">
            <span class="material-symbols-outlined" style="color: var(--primary-dark);">inventory_2</span>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.nonRecuperee }}</div>
            <div class="stat-label">Non récupérée</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #d1fae5;">
            <span class="material-symbols-outlined" style="color: #059669;">check_circle</span>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.delivree }}</div>
            <div class="stat-label">Délivrée</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #e0e7ff;">
            <span class="material-symbols-outlined" style="color: #6366f1;">badge</span>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">Total</div>
          </div>
        </div>
      </div>

      <!-- Tableau des cartes -->
      <div v-if="loading" class="loading">
        <span class="material-symbols-outlined">hourglass_empty</span>
        Chargement...
      </div>
      <div v-else class="cartes-table-container">
        <table class="cartes-table">
          <thead>
            <tr>
              <th>Numéro carte</th>
              <th>Membre</th>
              <th>Email</th>
              <th>Statut</th>
              <th>Date génération</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="carte in cartes" :key="carte.id">
              <td>
                <strong>{{ carte.numero_carte }}</strong>
              </td>
              <td>
                <div class="member-info">
                  <div class="member-name">{{ carte.prenom }} {{ carte.nom }}</div>
                </div>
              </td>
              <td>{{ carte.email || '-' }}</td>
              <td>
                <span :class="['badge', `badge-${getCarteStatutLabel(carte.statut)}`]">
                  {{ getCarteStatutLabel(carte.statut) }}
                </span>
              </td>
              <td>{{ formatDate(carte.date_generation) }}</td>
              <td>
                <div class="action-buttons">
                  <button @click="previewCarte(carte.id)" class="btn-icon" title="Prévisualiser">
                    <span class="material-symbols-outlined">visibility</span>
                  </button>
                  <button @click="downloadCarte(carte.id)" class="btn-icon" title="Télécharger">
                    <span class="material-symbols-outlined">download</span>
                  </button>
                  <button 
                    v-if="carte.statut === 'generee' || carte.statut === 'a_remettre'" 
                    @click="markAsDelivered(carte.id)" 
                    class="btn-icon success" 
                    title="Marquer comme délivrée">
                    <span class="material-symbols-outlined">check</span>
                  </button>
                  <button 
                    @click="deleteCarte(carte.id, carte.numero_carte)" 
                    class="btn-icon danger" 
                    title="Supprimer">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="cartes.length === 0" class="empty-state">
          <span class="material-symbols-outlined">inbox</span>
          <p>Aucune carte trouvée</p>
        </div>
      </div>
    </div>

    <!-- Modal génération -->
    <div v-if="showGenerateModal" class="modal" @click.self="showGenerateModal = false">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2>Générer une carte</h2>
          <button @click="showGenerateModal = false" class="btn-close">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <!-- Recherche d'adhérent -->
          <div class="form-group">
            <label>Rechercher un adhérent</label>
            <div class="search-adherent">
              <input 
                v-model="adherentSearch" 
                type="text" 
                placeholder="Rechercher par nom, prénom, email..." 
                class="form-input"
                @input="searchAdherents"
              />
              <span class="material-symbols-outlined search-icon">search</span>
            </div>
          </div>

          <!-- Liste des adhérents -->
          <div v-if="loadingAdherents" class="loading-adherents">
            <span class="material-symbols-outlined">hourglass_empty</span>
            Chargement des adhérents...
          </div>
          <div v-else-if="filteredAdherents.length > 0" class="adherents-list">
            <div class="adherents-header">
              <span>{{ filteredAdherents.length }} adhérent(s) trouvé(s)</span>
            </div>
            <div class="adherents-scroll">
              <div 
                v-for="adherent in filteredAdherents" 
                :key="adherent.id"
                :class="['adherent-item', { selected: newCarteAdhesionId === adherent.id }]"
                @click="selectAdherent(adherent.id)"
              >
                <div class="adherent-photo">
                  <img 
                    v-if="getImageUrl(adherent.photo_url)" 
                    :src="getImageUrl(adherent.photo_url)" 
                    :alt="`${adherent.prenom} ${adherent.nom}`"
                    @error="handleImageError"
                  />
                  <span v-else class="material-symbols-outlined">person</span>
                </div>
                <div class="adherent-info">
                  <div class="adherent-name">
                    <span class="name-text">{{ adherent.prenom }} {{ adherent.nom }}</span>
                    <span 
                      v-if="adherent.carte_delivree" 
                      class="delivered-badge" 
                      title="Carte délivrée">
                      <span class="material-symbols-outlined">check_circle</span>
                    </span>
                  </div>
                  <div class="adherent-details">
                    <span v-if="adherent.email">{{ adherent.email }}</span>
                    <span v-if="adherent.telephone"> • {{ adherent.telephone }}</span>
                  </div>
                  <div class="adherent-meta">
                    <span class="adherent-id">ID: {{ adherent.id }}</span>
                    <span v-if="adherent.helloasso_id" class="helloasso-id">HelloAsso: {{ adherent.helloasso_id }}</span>
                  </div>
                </div>
                <div class="adherent-actions">
                  <span v-if="newCarteAdhesionId === adherent.id" class="material-symbols-outlined selected-icon">check_circle</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="adherentSearch && !loadingAdherents" class="no-results">
            <span class="material-symbols-outlined">search_off</span>
            <p>Aucun adhérent trouvé</p>
          </div>
          <div v-else class="no-results">
            <span class="material-symbols-outlined">info</span>
            <p>Commencez à rechercher un adhérent</p>
          </div>

          <!-- Adhérent sélectionné -->
          <div v-if="newCarteAdhesionId && selectedAdherent" class="selected-adherent-card">
            <div class="selected-header">
              <span class="material-symbols-outlined">check_circle</span>
              <strong>Adhérent sélectionné</strong>
            </div>
            <div class="selected-info">
              <div class="selected-name">{{ selectedAdherent.prenom }} {{ selectedAdherent.nom }}</div>
              <div class="selected-details">
                <span>ID: {{ selectedAdherent.id }}</span>
                <span v-if="selectedAdherent.email"> • {{ selectedAdherent.email }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="generateCarte" :disabled="!newCarteAdhesionId || generating" class="btn-primary">
            <span class="material-symbols-outlined">add</span>
            {{ generating ? 'Génération...' : 'Générer la carte' }}
          </button>
          <button @click="showGenerateModal = false" class="btn-secondary">Annuler</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { cartesApi, verificationApi, adhesionsApi } from '@/services/api';

const cartes = ref<any[]>([]);
const loading = ref(false);
const showGenerateModal = ref(false);
const newCarteAdhesionId = ref<number | null>(null);
const generating = ref(false);
const filters = ref({ statut: '' });
const searchTerm = ref('');
const searchResult = ref<any>(null);
const adherentSearch = ref('');
const adherents = ref<any[]>([]);
const loadingAdherents = ref(false);
const selectedAdherent = ref<any>(null);

// Statistiques calculées
const stats = computed(() => {
  const enCours = cartes.value.filter(c => c.statut === 'a_generer' || c.statut === 'generee').length;
  const nonRecuperee = cartes.value.filter(c => c.statut === 'a_remettre').length;
  const delivree = cartes.value.filter(c => c.statut === 'remise').length;
  return {
    enCours,
    nonRecuperee,
    delivree,
    total: cartes.value.length
  };
});

function formatDate(date: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR');
}

function formatStatut(statut: string) {
  const statuts: Record<string, string> = {
    actif: 'Actif',
    expire: 'Expiré',
    renouvele: 'Renouvelé',
    a_generer: 'À générer'
  };
  return statuts[statut] || statut;
}

function getCarteStatutLabel(statut: string): string {
  const labels: Record<string, string> = {
    'a_generer': 'en_cours',
    'generee': 'en_cours',
    'a_remettre': 'non_recuperee',
    'remise': 'delivree'
  };
  return labels[statut] || statut;
}

// Filtrage des adhérents
const filteredAdherents = computed(() => {
  if (!adherentSearch.value.trim()) {
    return adherents.value.slice(0, 20); // Limiter à 20 par défaut
  }
  
  const search = adherentSearch.value.toLowerCase();
  return adherents.value.filter(adherent => {
    const nom = (adherent.nom || '').toLowerCase();
    const prenom = (adherent.prenom || '').toLowerCase();
    const email = (adherent.email || '').toLowerCase();
    const telephone = (adherent.telephone || '').toLowerCase();
    const id = String(adherent.id || '');
    const helloassoId = String(adherent.helloasso_id || '');
    
    return nom.includes(search) || 
           prenom.includes(search) || 
           email.includes(search) || 
           telephone.includes(search) ||
           id.includes(search) ||
           helloassoId.includes(search);
  }).slice(0, 50); // Limiter à 50 résultats
});

// Fonctions pour les adhérents
function getImageUrl(photoUrl: string | null | undefined): string {
  if (!photoUrl) return '';
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }
  if (photoUrl.startsWith('/uploads/') || photoUrl.startsWith('uploads/')) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return photoUrl.startsWith('/uploads/') ? `${apiUrl}${photoUrl}` : `${apiUrl}/${photoUrl}`;
  }
  return photoUrl;
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
}

async function searchAdherents() {
  if (adherentSearch.value.trim().length < 2) {
    adherents.value = [];
    return;
  }
  
  loadingAdherents.value = true;
  try {
    const response = await adhesionsApi.list({
      search: adherentSearch.value,
      limit: '100'
    });
    
    let adhesionsData = [];
    if (response.data) {
      if (Array.isArray(response.data)) {
        adhesionsData = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        adhesionsData = response.data.data;
      }
    }
    
    adherents.value = adhesionsData;
  } catch (error: any) {
    console.error('Erreur lors de la recherche d\'adhérents:', error);
    adherents.value = [];
  } finally {
    loadingAdherents.value = false;
  }
}

function selectAdherent(id: number) {
  newCarteAdhesionId.value = id;
  selectedAdherent.value = adherents.value.find(a => a.id === id);
}

// Réinitialiser lors de l'ouverture du modal
function openGenerateModal() {
  showGenerateModal.value = true;
  adherentSearch.value = '';
  adherents.value = [];
  newCarteAdhesionId.value = null;
  selectedAdherent.value = null;
}

async function loadCartes() {
  loading.value = true;
  try {
    const response = await cartesApi.list(filters.value);
    cartes.value = response.data.data || response.data || [];
  } catch (error: any) {
    console.error('Erreur lors du chargement:', error);
    if (error.response?.data?.error) {
      alert(error.response.data.error);
    }
  } finally {
    loading.value = false;
  }
}

async function searchCarte() {
  if (!searchTerm.value.trim()) return;
  
  loading.value = true;
  try {
    const response = await verificationApi.check({ nom: searchTerm.value });
    searchResult.value = response.data.data || response.data;
  } catch (error: any) {
    console.error('Erreur lors de la recherche:', error);
    searchResult.value = { found: false };
    if (error.response?.data?.error) {
      alert(error.response.data.error);
    }
  } finally {
    loading.value = false;
  }
}

async function generateCarte() {
  if (!newCarteAdhesionId.value) return;
  
  // Vérifier si l'adhérent a déjà une carte
  const adherent = adherents.value.find(a => a.id === newCarteAdhesionId.value);
  const hasExistingCarte = adherent && (adherent.carte_id || adherent.carte_delivree);
  
  if (hasExistingCarte) {
    const confirmMessage = adherent.carte_delivree 
      ? `Cet adhérent a déjà une carte délivrée. Voulez-vous supprimer l'ancienne carte et en générer une nouvelle ?`
      : `Cet adhérent a déjà une carte. Voulez-vous supprimer l'ancienne carte et en générer une nouvelle ?`;
    
    if (!confirm(confirmMessage)) return;
  }
  
  generating.value = true;
  try {
    await cartesApi.generate(newCarteAdhesionId.value);
    showGenerateModal.value = false;
    newCarteAdhesionId.value = null;
    selectedAdherent.value = null;
    adherentSearch.value = '';
    adherents.value = [];
    await loadCartes();
    alert('Carte générée avec succès !');
  } catch (error: any) {
    alert(error.response?.data?.error || 'Erreur lors de la génération');
  } finally {
    generating.value = false;
  }
}

async function previewCarte(id: number) {
  try {
    const response = await cartesApi.preview(id);
    alert(`Carte: ${response.data.data.numero_carte}\nStatut: ${response.data.data.statut}`);
  } catch (error) {
    alert('Erreur lors de la prévisualisation');
  }
}

async function downloadCarte(id: number) {
  try {
    const response = await cartesApi.download(id, 'pdf');
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carte-${id}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    alert('Erreur lors du téléchargement');
  }
}

async function markAsDelivered(id: number) {
  if (!confirm('Marquer cette carte comme délivrée ?')) return;
  
  try {
    await cartesApi.markAsDelivered(id);
    await loadCartes();
    alert('Carte marquée comme délivrée avec succès !');
  } catch (error: any) {
    alert(error.response?.data?.error || 'Erreur lors de la mise à jour');
  }
}

async function deleteCarte(id: number, numeroCarte: string) {
  if (!confirm(`Êtes-vous sûr de vouloir supprimer la carte ${numeroCarte} ?\n\nCette action est irréversible.`)) return;
  
  try {
    await cartesApi.delete(id);
    await loadCartes();
    alert('Carte supprimée avec succès !');
  } catch (error: any) {
    alert(error.response?.data?.error || 'Erreur lors de la suppression');
  }
}

onMounted(() => {
  loadCartes();
});
</script>

<style scoped>
.cartes-view {
  width: 100%;
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

/* Header */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.title-group h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-group .material-symbols-outlined {
  font-size: 32px;
  color: var(--primary);
}

.subtitle {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

/* Boutons styles maintenant dans buttons.css global */

/* Search Section */
.search-section {
  margin-bottom: 32px;
}

.search-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.search-card h2 {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-form {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.search-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
}

.btn-search {
  padding: 12px 24px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-search:hover:not(:disabled) {
  background: #059669;
}

.btn-search:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.search-result {
  margin-top: 20px;
}

.result-card {
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid;
}

.result-card.valid {
  background: #f0fdf4;
  border-color: #10b981;
}

.result-card.invalid {
  background: #fef2f2;
  border-color: #ef4444;
}

.result-card.not-found {
  background: #fffbeb;
  border-color: #f59e0b;
  text-align: center;
  padding: 40px;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.result-header h3 {
  margin: 0;
  font-size: 18px;
}

.result-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  gap: 12px;
}

.info-row .label {
  font-weight: 600;
  color: #64748b;
  min-width: 140px;
}

.info-row .value {
  color: #1e293b;
}

/* Cartes Section */
.cartes-section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h2 {
  margin: 0;
  font-size: 20px;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-select {
  padding: 10px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

/* Stats Cards */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon .material-symbols-outlined {
  font-size: 24px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

/* Table */
.cartes-table-container {
  overflow-x: auto;
}

.cartes-table {
  width: 100%;
  border-collapse: collapse;
}

.cartes-table thead {
  background: #f8fafc;
}

.cartes-table th {
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #64748b;
  font-size: 14px;
  border-bottom: 2px solid #e2e8f0;
}

.cartes-table td {
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
  color: #1e293b;
}

.cartes-table tbody tr:hover {
  background: #f8fafc;
}

.member-info {
  display: flex;
  flex-direction: column;
}

.member-name {
  font-weight: 500;
  color: #1e293b;
}

/* Badges */
.badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
}

.badge-en_cours {
  background: #fef3c7;
  color: #d97706;
}

.badge-non_recuperee {
  background: #dbeafe;
  color: var(--primary-dark);
}

.badge-delivree {
  background: #d1fae5;
  color: #059669;
}

.badge-actif {
  background: #d1fae5;
  color: #059669;
}

.badge-expire {
  background: #fee2e2;
  color: #dc2626;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  color: #64748b;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.btn-icon.success {
  background: #d1fae5;
  color: #059669;
}

.btn-icon.success:hover {
  background: #a7f3d0;
}

.btn-icon.danger {
  background: #fee2e2;
  color: #dc2626;
}

.btn-icon.danger:hover {
  background: #fecaca;
}

/* Loading & Empty */
.loading {
  text-align: center;
  padding: 60px;
  color: #64748b;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-state {
  text-align: center;
  padding: 60px;
  color: #94a3b8;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-state .material-symbols-outlined {
  font-size: 48px;
}

/* Modal */
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
  padding: 0;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-large {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  color: #1e293b;
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #1e293b;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
}

.modal-actions {
  display: flex;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #e2e8f0;
  justify-content: flex-end;
}

.btn-secondary {
  padding: 12px 24px;
  background: #f1f5f9;
  color: #64748b;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

/* Recherche adhérent */
.search-adherent {
  position: relative;
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}

.loading-adherents,
.no-results {
  text-align: center;
  padding: 40px;
  color: #94a3b8;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.loading-adherents .material-symbols-outlined,
.no-results .material-symbols-outlined {
  font-size: 48px;
}

/* Liste des adhérents */
.adherents-list {
  margin-top: 16px;
}

.adherents-header {
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.adherents-scroll {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.adherent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s;
}

.adherent-item:last-child {
  border-bottom: none;
}

.adherent-item:hover {
  background: #f8fafc;
}

.adherent-item.selected {
  background: #eff6ff;
  border-left: 3px solid var(--primary);
}

.adherent-photo {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.adherent-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.adherent-photo .material-symbols-outlined {
  font-size: 24px;
  color: #94a3b8;
}

.adherent-info {
  flex: 1;
  min-width: 0;
}

.adherent-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.adherent-details {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 4px;
}

.adherent-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #94a3b8;
}

.adherent-actions {
  flex-shrink: 0;
}

.selected-icon {
  color: var(--primary);
  font-size: 24px;
}

/* Adhérent sélectionné */
.selected-adherent-card {
  margin-top: 20px;
  padding: 16px;
  background: #eff6ff;
  border: 2px solid var(--primary);
  border-radius: 8px;
}

.selected-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: var(--primary);
  font-weight: 600;
}

.selected-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.selected-name {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.selected-details {
  font-size: 13px;
  color: #64748b;
}

/* Badge carte délivrée */
.delivered-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #059669;
  background: #d1fae5;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.delivered-badge .material-symbols-outlined {
  font-size: 16px;
  font-weight: 600;
}
</style>
