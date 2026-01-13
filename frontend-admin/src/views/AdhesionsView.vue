<template>
  <div class="adhesions-modern">
    <!-- Header avec actions principales -->
    <div class="page-header">
      <div class="header-content">
        <h1>Adhésions</h1>
        <div class="header-actions">
          <button @click="showSyncModal = true" class="btn-icon" title="Synchroniser HelloAsso">
            <span class="material-symbols-outlined">sync</span>
          </button>
          <button @click="showImportModal = true" class="btn-icon" title="Importer CSV">
            <span class="material-symbols-outlined">upload</span>
          </button>
          <button @click="exportCsv" class="btn-icon" title="Exporter CSV">
            <span class="material-symbols-outlined">download</span>
          </button>
          <button @click="openCreateModal" class="btn-primary">
            <span class="material-symbols-outlined">add</span>
            Nouvelle adhésion
          </button>
        </div>
      </div>
    </div>

    <!-- Barre de recherche et filtres rapides -->
    <div class="search-bar">
      <div class="search-input-wrapper">
        <span class="material-symbols-outlined search-icon">search</span>
        <input
          v-model="filters.search"
          type="text"
          placeholder="Rechercher par nom, prénom, email..."
          @input="debounceSearch"
          class="search-input"
        />
        <button v-if="filters.search" @click="clearSearch" class="clear-search">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <button 
        @click="showFilters = !showFilters" 
        class="btn-filters"
        :class="{ active: showFilters || hasActiveFilters }"
      >
        <span class="material-symbols-outlined">tune</span>
        Filtres
        <span v-if="activeFiltersCount > 0" class="filter-badge">{{ activeFiltersCount }}</span>
      </button>
    </div>

    <!-- Panneau de filtres avancés -->
    <div v-if="showFilters" class="filters-panel">
      <div class="filters-content">
        <div class="filter-group">
          <label>Année</label>
          <select v-model="filters.annee" @change="applyFilters">
            <option value="">Toutes les années</option>
            <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Statut</label>
          <div class="filter-chips">
            <button
              v-for="statut in statuts"
              :key="statut.value"
              @click="toggleStatutFilter(statut.value)"
              :class="['chip', { active: filters.statut === statut.value }]"
            >
              <span class="material-symbols-outlined">{{ statut.icon }}</span>
              {{ statut.label }}
            </button>
          </div>
        </div>
        <div class="filter-group">
          <label>Moyen de paiement</label>
          <div class="filter-chips">
            <button
              v-for="moyen in moyensPaiement"
              :key="moyen.value"
              @click="toggleMoyenPaiementFilter(moyen.value)"
              :class="['chip', { active: filters.moyen_paiement === moyen.value }]"
            >
              <span class="material-symbols-outlined">{{ moyen.icon }}</span>
              {{ moyen.label }}
            </button>
          </div>
        </div>
        <div class="filter-group">
          <label>Source</label>
          <div class="filter-chips">
            <button
              @click="toggleSourceFilter('online')"
              :class="['chip', { active: filters.source === 'online' }]"
            >
              <span class="material-symbols-outlined">language</span>
              En ligne
            </button>
            <button
              @click="toggleSourceFilter('offline')"
              :class="['chip', { active: filters.source === 'offline' }]"
            >
              <span class="material-symbols-outlined">store</span>
              Hors ligne
            </button>
          </div>
        </div>
        <div class="filter-group">
          <label>ID Campagne HelloAsso</label>
          <input
            v-model="filters.helloasso_campaign_id"
            type="text"
            placeholder="Filtrer par ID campagne"
            @input="debounceSearch"
          />
        </div>
        <div class="filter-actions">
          <button @click="resetFilters" class="btn-secondary">Réinitialiser</button>
          <button @click="showFilters = false" class="btn-primary">Appliquer</button>
        </div>
      </div>
    </div>

    <!-- Statistiques rapides -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">{{ totalAdhesions }}</span>
        <span class="stat-label">Total</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ adhesionsByYear.length }}</span>
        <span class="stat-label">Années</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ selectedAdhesions.length }}</span>
        <span class="stat-label">Sélectionné(s)</span>
      </div>
      <div v-if="selectedAdhesions.length > 0" class="bulk-actions">
        <button @click="showBulkStatusModal = true" class="btn-secondary btn-sm">
          <span class="material-symbols-outlined">edit</span>
          Modifier le statut
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Chargement des adhésions...</p>
    </div>

    <!-- Vue groupée par année -->
    <div v-else-if="adhesionsByYear.length > 0" class="adhesions-container">
      <div v-for="group in adhesionsByYear" :key="group.year" class="year-group">
        <div class="year-header">
          <h2 class="year-title">
            <span class="material-symbols-outlined">calendar_today</span>
            {{ group.year }}
          </h2>
          <span class="year-count">{{ group.adhesions.length }} adhésion(s)</span>
        </div>
        <div class="cards-grid">
          <div
            v-for="adhesion in group.adhesions"
            :key="adhesion.id"
            class="adhesion-card"
            :class="{ selected: selectedAdhesions.includes(adhesion.id) }"
          >
            <div class="card-checkbox">
              <input
                type="checkbox"
                :value="adhesion.id"
                v-model="selectedAdhesions"
              />
            </div>
            <div class="card-header">
              <div class="card-photo">
                <img
                  v-if="adhesion.photo_url"
                  :src="getImageUrl(adhesion.photo_url)"
                  :alt="`${adhesion.nom} ${adhesion.prenom}`"
                  @error="handleImageError"
                />
                <div v-else class="photo-placeholder">
                  <span class="material-symbols-outlined">person</span>
                </div>
              </div>
              <div class="card-info">
                <h3 class="card-name">{{ adhesion.prenom }} {{ adhesion.nom }}</h3>
                <p class="card-email">{{ adhesion.email }}</p>
              </div>
            </div>
            <div class="card-body">
              <div class="card-details">
                <div class="detail-item">
                  <span class="material-symbols-outlined">calendar_today</span>
                  <span>{{ formatDate(adhesion.date_adhesion) }}</span>
                </div>
                <div class="detail-item">
                  <span class="material-symbols-outlined">payments</span>
                  <span>{{ adhesion.tarif }} €</span>
                </div>
                <div class="detail-item">
                  <span class="material-symbols-outlined">{{ getPaymentIcon(adhesion.moyen_paiement) }}</span>
                  <span>{{ formatPaymentMethod(adhesion.moyen_paiement) }}</span>
                </div>
              </div>
              <div class="card-badges">
                <span :class="['badge', `badge-${adhesion.statut}`]">
                  <span class="material-symbols-outlined">{{ getStatutIcon(adhesion.statut) }}</span>
                  {{ formatStatut(adhesion.statut) }}
                </span>
                <span v-if="adhesion.source === 'offline'" class="badge badge-offline">
                  <span class="material-symbols-outlined">store</span>
                  Hors ligne
                </span>
                <span v-else-if="adhesion.source === 'online'" class="badge badge-online">
                  <span class="material-symbols-outlined">language</span>
                  En ligne
                </span>
                <span v-if="adhesion.helloasso_id" class="badge badge-helloasso">
                  <span class="material-symbols-outlined">link</span>
                  HelloAsso
                </span>
                <span v-if="adhesion.carte_id" class="badge badge-carte">
                  <span class="material-symbols-outlined">badge</span>
                  Carte
                </span>
              </div>
            </div>
            <div class="card-footer">
              <div class="card-actions">
                <button
                  @click="viewDetails(adhesion.id)"
                  class="btn-action"
                  title="Voir les détails"
                >
                  <span class="material-symbols-outlined">visibility</span>
                </button>
                <button
                  @click="editAdhesion(adhesion)"
                  class="btn-action"
                  title="Modifier"
                >
                  <span class="material-symbols-outlined">edit</span>
                </button>
                <button
                  v-if="!adhesion.carte_id && isAdhesionComplete(adhesion)"
                  @click="generateCarteForAdhesion(adhesion)"
                  class="btn-action btn-generate"
                  :disabled="generatingCarte === adhesion.id"
                  title="Générer la carte"
                >
                  <span v-if="generatingCarte === adhesion.id" class="material-symbols-outlined">hourglass_empty</span>
                  <span v-else class="material-symbols-outlined">badge</span>
                </button>
                <button
                  @click="confirmDelete(adhesion)"
                  class="btn-action btn-danger"
                  title="Supprimer"
                >
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- État vide -->
    <div v-else class="empty-state">
      <span class="material-symbols-outlined empty-icon">inbox</span>
      <h3>Aucune adhésion trouvée</h3>
      <p v-if="hasActiveFilters">Essayez de modifier vos filtres de recherche</p>
      <p v-else>Commencez par créer une nouvelle adhésion</p>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && totalPages > 1" class="pagination">
      <button
        @click="loadAdhesions(currentPage - 1)"
        :disabled="currentPage === 1"
        class="pagination-btn"
      >
        <span class="material-symbols-outlined">chevron_left</span>
        Précédent
      </button>
      <div class="pagination-info">
        Page {{ currentPage }} sur {{ totalPages }}
      </div>
      <button
        @click="loadAdhesions(currentPage + 1)"
        :disabled="currentPage >= totalPages"
        class="pagination-btn"
      >
        Suivant
        <span class="material-symbols-outlined">chevron_right</span>
      </button>
    </div>

    <!-- Modals (garder les modals existants) -->
    <!-- Modal de création/édition -->
    <div v-if="showFormModal" class="modal" @click.self="closeFormModal">
      <div class="modal-content large">
        <h2>{{ editingAdhesion ? 'Modifier l\'adhésion' : 'Nouvelle adhésion' }}</h2>
        <form @submit.prevent="saveAdhesion" class="form">
          <div class="form-grid">
            <div class="form-group">
              <label>Nom *</label>
              <input v-model="formData.nom" type="text" required />
            </div>
            <div class="form-group">
              <label>Prénom *</label>
              <input v-model="formData.prenom" type="text" required />
            </div>
            <div class="form-group">
              <label>Email *</label>
              <input v-model="formData.email" type="email" required />
            </div>
            <div class="form-group">
              <label>Téléphone</label>
              <input v-model="formData.telephone" type="tel" />
            </div>
            <div class="form-group">
              <label>Date d'adhésion *</label>
              <input v-model="formData.date_adhesion" type="date" required />
            </div>
            <div class="form-group">
              <label>Tarif (€) *</label>
              <input v-model.number="formData.tarif" type="number" step="0.01" required />
            </div>
            <div class="form-group">
              <label>Moyen de paiement</label>
              <select v-model="formData.moyen_paiement">
                <option value="helloasso">HelloAsso</option>
                <option value="especes">Espèces</option>
                <option value="cheque">Chèque</option>
                <option value="cb">Carte bancaire</option>
                <option value="virement">Virement</option>
              </select>
            </div>
            <div class="form-group">
              <label>Statut</label>
              <select v-model="formData.statut">
                <option value="actif">Actif</option>
                <option value="expire">Expiré</option>
                <option value="renouvele">Renouvelé</option>
              </select>
            </div>
            <div class="form-group full-width">
              <label>Photo de profil</label>
              <div class="photo-upload-section">
                <div class="photo-preview" v-if="formData.photo_url || photoPreview">
                  <img :src="photoPreview || formData.photo_url" alt="Photo de profil" class="preview-image" />
                  <button type="button" @click="clearPhoto" class="btn-remove-photo">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div class="photo-inputs">
                  <div class="photo-input-group">
                    <label>Importer un fichier</label>
                    <input
                      type="file"
                      @change="handlePhotoFileSelect"
                      accept="image/*"
                      class="file-input"
                    />
                  </div>
                  <div class="photo-input-group">
                    <label>Ou saisir une URL</label>
                    <input
                      type="url"
                      v-model="photoUrlInput"
                      @input="updatePhotoFromUrl"
                      placeholder="https://example.com/photo.jpg"
                      class="url-input"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>ID HelloAsso</label>
              <input v-model="formData.helloasso_id" type="text" placeholder="ID de l'adhésion HelloAsso" />
            </div>
            <div class="form-group">
              <label>ID Campagne HelloAsso</label>
              <input v-model="formData.helloasso_campaign_id" type="text" placeholder="ID de la campagne HelloAsso IGCA Paris" />
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" :disabled="saving" class="btn-primary">
              {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
            <button type="button" @click="closeFormModal" class="btn-cancel">Annuler</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal synchronisation HelloAsso -->
    <div v-if="showSyncModal" class="modal" @click.self="closeSyncModal">
      <div class="modal-content large">
        <h2><span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 5px;">sync</span> Synchroniser avec HelloAsso</h2>
        <p class="modal-description">
          Synchronisez directement les adhésions depuis votre campagne HelloAsso IGCA Paris.
        </p>
        <form @submit.prevent="syncHelloAsso" class="form">
          <div class="form-group full-width">
            <label>ID Campagne HelloAsso *</label>
            <input
              v-model="syncForm.campaignId"
              type="text"
              placeholder="Ex: 12345678-1234-1234-1234-123456789012"
              required
            />
          </div>
          <div class="form-actions">
            <button type="submit" :disabled="syncing" class="btn-primary">
              {{ syncing ? 'Synchronisation...' : 'Synchroniser' }}
            </button>
            <button type="button" @click="closeSyncModal" class="btn-cancel">Annuler</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal import -->
    <div v-if="showImportModal" class="modal" @click.self="showImportModal = false">
      <div class="modal-content">
        <h2>Importer un fichier CSV</h2>
        <input type="file" @change="handleFileSelect" accept=".csv" />
        <div class="modal-actions">
          <button @click="importCsv" :disabled="!selectedFile || importing" class="btn-primary">
            {{ importing ? 'Import...' : 'Importer' }}
          </button>
          <button @click="showImportModal = false" class="btn-cancel">Annuler</button>
        </div>
      </div>
    </div>

    <!-- Modal modification en masse -->
    <div v-if="showBulkStatusModal" class="modal" @click.self="showBulkStatusModal = false">
      <div class="modal-content">
        <h2>Modifier le statut ({{ selectedAdhesions.length }} adhésion(s))</h2>
        <select v-model="bulkStatus" class="form-select">
          <option value="actif">Actif</option>
          <option value="expire">Expiré</option>
          <option value="renouvele">Renouvelé</option>
          <option value="a_generer">À générer</option>
        </select>
        <div class="modal-actions">
          <button @click="applyBulkStatus" class="btn-primary">Appliquer</button>
          <button @click="showBulkStatusModal = false" class="btn-cancel">Annuler</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { adhesionsApi, cartesApi } from '@/services/api';

const router = useRouter();
const adhesions = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const showFormModal = ref(false);
const showImportModal = ref(false);
const showSyncModal = ref(false);
const showBulkStatusModal = ref(false);
const editingAdhesion = ref<any>(null);
const selectedFile = ref<File | null>(null);
const importing = ref(false);
const syncing = ref(false);
const selectedAdhesions = ref<number[]>([]);
const bulkStatus = ref('actif');
const photoUrlInput = ref('');
const photoPreview = ref<string | null>(null);
const selectedPhotoFile = ref<File | null>(null);
const currentPage = ref(1);
const totalPages = ref(1);
const totalAdhesions = ref(0);
const limitPerPage = 50;
const generatingCarte = ref<number | null>(null);
const showFilters = ref(false);

const syncForm = ref({
  campaignId: '',
});

const filters = ref({
  search: '',
  annee: '',
  statut: '',
  moyen_paiement: '',
  helloasso_campaign_id: '',
});

const formData = ref({
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
  date_adhesion: new Date().toISOString().split('T')[0],
  tarif: 0,
  moyen_paiement: 'helloasso',
  statut: 'actif',
  helloasso_id: '',
  helloasso_campaign_id: '',
  photo_url: '',
});

const availableYears = ref<number[]>([]);

const statuts = [
  { value: 'actif', label: 'Actif', icon: 'check_circle' },
  { value: 'expire', label: 'Expiré', icon: 'cancel' },
  { value: 'renouvele', label: 'Renouvelé', icon: 'refresh' },
  { value: 'a_generer', label: 'À générer', icon: 'pending' },
];

const moyensPaiement = [
  { value: 'helloasso', label: 'HelloAsso', icon: 'language' },
  { value: 'especes', label: 'Espèces', icon: 'monetization_on' },
  { value: 'cheque', label: 'Chèque', icon: 'description' },
  { value: 'cb', label: 'Carte bancaire', icon: 'credit_card' },
  { value: 'virement', label: 'Virement', icon: 'account_balance' },
];

// Computed
const adhesionsByYear = computed(() => {
  const grouped: Record<number, any[]> = {};
  
  adhesions.value.forEach(adhesion => {
    if (adhesion.date_adhesion) {
      const year = new Date(adhesion.date_adhesion).getFullYear();
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(adhesion);
    }
  });

  return Object.keys(grouped)
    .map(year => ({
      year: parseInt(year),
      adhesions: grouped[parseInt(year)].sort((a, b) => 
        new Date(b.date_adhesion).getTime() - new Date(a.date_adhesion).getTime()
      )
    }))
    .sort((a, b) => b.year - a.year);
});

const activeFiltersCount = computed(() => {
  let count = 0;
  if (filters.value.annee) count++;
  if (filters.value.statut) count++;
  if (filters.value.moyen_paiement) count++;
  if (filters.value.source) count++;
  if (filters.value.helloasso_campaign_id) count++;
  return count;
});

const hasActiveFilters = computed(() => activeFiltersCount.value > 0);

// Fonctions
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

function formatDate(date: string) {
  if (!date) return 'Date invalide';
  try {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Date invalide';
  }
}

function formatPaymentMethod(moyen: string) {
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

function isAdhesionComplete(adhesion: any): boolean {
  return !!(adhesion.nom && adhesion.prenom && adhesion.email && adhesion.date_adhesion && adhesion.tarif);
}

function toggleStatutFilter(value: string) {
  filters.value.statut = filters.value.statut === value ? '' : value;
  applyFilters();
}

function toggleMoyenPaiementFilter(value: string) {
  filters.value.moyen_paiement = filters.value.moyen_paiement === value ? '' : value;
  applyFilters();
}

function toggleSourceFilter(value: string) {
  filters.value.source = filters.value.source === value ? '' : value;
  applyFilters();
}

function resetFilters() {
  filters.value = {
    search: '',
    annee: '',
    statut: '',
    moyen_paiement: '',
    source: '',
    helloasso_campaign_id: '',
  };
  applyFilters();
}

function applyFilters() {
  loadAdhesions(1);
}

function clearSearch() {
  filters.value.search = '';
  applyFilters();
}

let searchTimeout: NodeJS.Timeout;
function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    applyFilters();
  }, 300);
}

async function loadAvailableYears() {
  try {
    const response = await adhesionsApi.list({ limit: '10000' });
    const allAdhesions = response.data.data || response.data || [];
    const yearsSet = new Set<number>();
    
    allAdhesions.forEach((adhesion: any) => {
      if (adhesion.date_adhesion) {
        const year = new Date(adhesion.date_adhesion).getFullYear();
        yearsSet.add(year);
      }
    });
    
    availableYears.value = Array.from(yearsSet).sort((a, b) => b - a);
  } catch (error) {
    console.error('Erreur lors du chargement des années:', error);
    const currentYear = new Date().getFullYear();
    availableYears.value = [];
    for (let i = currentYear; i >= currentYear - 10; i--) {
      availableYears.value.push(i);
    }
  }
}

async function loadAdhesions(page: number = 1) {
  loading.value = true;
  currentPage.value = page;
  try {
    const params: any = {
      limit: limitPerPage.toString(),
      page: page.toString(),
    };
    if (filters.value.search) params.search = filters.value.search;
    if (filters.value.annee) params.annee = filters.value.annee;
    if (filters.value.statut) params.statut = filters.value.statut;
    if (filters.value.moyen_paiement) params.moyen_paiement = filters.value.moyen_paiement;
    if (filters.value.source) params.source = filters.value.source;
    if (filters.value.helloasso_campaign_id) params.helloasso_campaign_id = filters.value.helloasso_campaign_id;

    console.log('📡 Chargement des adhésions avec params:', params);
    const response = await adhesionsApi.list(params);
    console.log('✅ Réponse reçue:', response);
    console.log('📦 Données:', response.data);
    
    // Gérer différentes structures de réponse
    let adhesionsData = [];
    if (response.data) {
      if (Array.isArray(response.data)) {
        adhesionsData = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        adhesionsData = response.data.data;
      } else if (response.data.data && !Array.isArray(response.data.data)) {
        adhesionsData = [response.data.data];
      }
    }
    
    adhesions.value = adhesionsData;
    console.log('✅ Adhésions chargées:', adhesions.value.length);
    
    const pagination = response.data?.pagination || {};
    totalAdhesions.value = pagination.total || adhesions.value.length;
    totalPages.value = Math.ceil(totalAdhesions.value / limitPerPage);
  } catch (error: any) {
    console.error('❌ Erreur lors du chargement des adhésions:', error);
    console.error('❌ Détails:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: error.config
    });
    alert(error.response?.data?.error || error.userMessage || error.message || 'Erreur lors du chargement des adhésions');
    adhesions.value = [];
  } finally {
    loading.value = false;
  }
}

function openCreateModal() {
  editingAdhesion.value = null;
  formData.value = {
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    date_adhesion: new Date().toISOString().split('T')[0],
    tarif: 0,
    moyen_paiement: 'helloasso',
    statut: 'actif',
    helloasso_id: '',
    helloasso_campaign_id: '',
    photo_url: '',
  };
  photoPreview.value = null;
  photoUrlInput.value = '';
  selectedPhotoFile.value = null;
  showFormModal.value = true;
}

function closeFormModal() {
  showFormModal.value = false;
}

function editAdhesion(adhesion: any) {
  editingAdhesion.value = adhesion;
  formData.value = {
    nom: adhesion.nom || '',
    prenom: adhesion.prenom || '',
    email: adhesion.email || '',
    telephone: adhesion.telephone || '',
    date_adhesion: adhesion.date_adhesion ? new Date(adhesion.date_adhesion).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    tarif: adhesion.tarif || 0,
    moyen_paiement: adhesion.moyen_paiement || 'helloasso',
    statut: adhesion.statut || 'actif',
    helloasso_id: adhesion.helloasso_id || '',
    helloasso_campaign_id: adhesion.helloasso_campaign_id || '',
    photo_url: adhesion.photo_url || '',
  };
  photoPreview.value = null;
  photoUrlInput.value = '';
  selectedPhotoFile.value = null;
  showFormModal.value = true;
}

async function saveAdhesion() {
  saving.value = true;
  try {
    const formDataToSend = new FormData();
    Object.keys(formData.value).forEach(key => {
      if (key !== 'photo_url' || !selectedPhotoFile.value) {
        formDataToSend.append(key, (formData.value as any)[key]);
      }
    });
    
    if (selectedPhotoFile.value) {
      formDataToSend.append('photo', selectedPhotoFile.value);
    }

    if (editingAdhesion.value) {
      await adhesionsApi.update(editingAdhesion.value.id, formDataToSend);
    } else {
      await adhesionsApi.create(formDataToSend);
    }
    
    closeFormModal();
    await loadAdhesions(currentPage.value);
  } catch (error: any) {
    console.error('Erreur lors de la sauvegarde:', error);
    alert(error.response?.data?.error || 'Erreur lors de la sauvegarde');
  } finally {
    saving.value = false;
  }
}

function handlePhotoFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    selectedPhotoFile.value = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      photoPreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function updatePhotoFromUrl() {
  if (photoUrlInput.value) {
    photoPreview.value = photoUrlInput.value;
    formData.value.photo_url = photoUrlInput.value;
  }
}

function clearPhoto() {
  photoPreview.value = null;
  photoUrlInput.value = '';
  selectedPhotoFile.value = null;
  formData.value.photo_url = '';
}

function viewDetails(id: number) {
  router.push(`/app/adhesions/${id}`);
}

function confirmDelete(adhesion: any) {
  if (confirm(`Êtes-vous sûr de vouloir supprimer l'adhésion de ${adhesion.prenom} ${adhesion.nom} ?`)) {
    deleteAdhesion(adhesion.id);
  }
}

async function deleteAdhesion(id: number) {
  try {
    await adhesionsApi.delete(id);
    await loadAdhesions(currentPage.value);
  } catch (error: any) {
    console.error('Erreur lors de la suppression:', error);
    alert(error.response?.data?.error || 'Erreur lors de la suppression');
  }
}

async function generateCarteForAdhesion(adhesion: any) {
  if (!isAdhesionComplete(adhesion)) {
    alert('L\'adhésion doit être complète pour générer une carte');
    return;
  }
  
  generatingCarte.value = adhesion.id;
  try {
    await cartesApi.generate(adhesion.id);
    await loadAdhesions(currentPage.value);
  } catch (error: any) {
    console.error('Erreur lors de la génération:', error);
    alert(error.response?.data?.error || 'Erreur lors de la génération de la carte');
  } finally {
    generatingCarte.value = null;
  }
}

async function applyBulkStatus() {
  try {
    for (const id of selectedAdhesions.value) {
      await adhesionsApi.update(id, { statut: bulkStatus.value } as any);
    }
    selectedAdhesions.value = [];
    showBulkStatusModal.value = false;
    await loadAdhesions(currentPage.value);
  } catch (error: any) {
    console.error('Erreur lors de la modification en masse:', error);
    alert(error.response?.data?.error || 'Erreur lors de la modification en masse');
  }
}

function closeSyncModal() {
  showSyncModal.value = false;
  syncForm.value = { campaignId: '' };
}

async function syncHelloAsso() {
  syncing.value = true;
  try {
    const response = await adhesionsApi.syncHelloAsso(syncForm.value);
    alert(`Synchronisation terminée !\n\nCréées: ${response.data.stats?.created || 0}\nMises à jour: ${response.data.stats?.updated || 0}`);
    closeSyncModal();
    await loadAdhesions(1);
  } catch (error: any) {
    console.error('Erreur lors de la synchronisation:', error);
    alert(error.response?.data?.error || 'Erreur lors de la synchronisation');
  } finally {
    syncing.value = false;
  }
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    selectedFile.value = input.files[0];
  }
}

async function importCsv() {
  if (!selectedFile.value) return;
  
  importing.value = true;
  try {
    const formData = new FormData();
    formData.append('csv', selectedFile.value);
    const response = await adhesionsApi.importCsv(formData);
    
    // Si l'import nécessite une validation
    if (response.data.importId) {
      // Valider automatiquement l'import
      await adhesionsApi.validateImport(response.data.importId, {
        records: response.data.records,
        duplicateActions: {},
        forceUpdate: true
      });
    }
    
    alert('Import réussi !');
    showImportModal.value = false;
    selectedFile.value = null;
    await loadAdhesions(1);
  } catch (error: any) {
    console.error('Erreur lors de l\'import:', error);
    alert(error.response?.data?.error || error.userMessage || 'Erreur lors de l\'import');
  } finally {
    importing.value = false;
  }
}

async function exportCsv() {
  try {
    const params: any = {};
    if (filters.value.annee) params.annee = filters.value.annee;
    if (filters.value.statut) params.statut = filters.value.statut;
    if (filters.value.moyen_paiement) params.moyen_paiement = filters.value.moyen_paiement;
    if (filters.value.source) params.source = filters.value.source;
    
    const response = await adhesionsApi.exportCsv(params);
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adhesions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error('Erreur lors de l\'export:', error);
    alert(error.response?.data?.error || error.userMessage || 'Erreur lors de l\'export');
  }
}

onMounted(async () => {
  await loadAvailableYears();
  await loadAdhesions(1);
});
</script>

<style scoped>
.adhesions-modern {
  width: 100%;
  padding: 0;
}

/* Header */
.page-header {
  background: white;
  padding: 24px 30px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  background: white;
  color: #667eea;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #f5f7fa;
  border-color: #667eea;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #5568d3;
}

/* Search bar */
.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 16px;
  color: #7f8c8d;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 48px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.clear-search {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: #7f8c8d;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.btn-filters:hover,
.btn-filters.active {
  border-color: #667eea;
  color: #667eea;
}

.filter-badge {
  background: #667eea;
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

/* Filters panel */
.filters-panel {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.filters-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.filter-group label {
  display: block;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
  font-size: 14px;
}

.filter-group select,
.filter-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f5f7fa;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
}

.chip:hover {
  background: #e8ecf1;
}

.chip.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.chip .material-symbols-outlined {
  font-size: 18px;
}

.filter-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.btn-secondary {
  padding: 10px 20px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.btn-secondary:hover {
  background: #f5f7fa;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

/* Stats bar */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 16px 24px;
  background: white;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #667eea;
}

.stat-label {
  font-size: 12px;
  color: #7f8c8d;
  text-transform: uppercase;
}

.bulk-actions {
  margin-left: auto;
}

/* Year groups */
.year-group {
  margin-bottom: 40px;
}

.year-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e0e0e0;
}

.year-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #2c3e50;
}

.year-title .material-symbols-outlined {
  color: #667eea;
}

.year-count {
  font-size: 14px;
  color: #7f8c8d;
  font-weight: 500;
}

/* Cards grid */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.adhesion-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
  position: relative;
  border: 2px solid transparent;
}

.adhesion-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.adhesion-card.selected {
  border-color: #667eea;
  background: #f8f9ff;
}

.card-checkbox {
  position: absolute;
  top: 16px;
  right: 16px;
}

.card-header {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.card-photo {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: #f5f7fa;
}

.card-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7f8c8d;
}

.photo-placeholder .material-symbols-outlined {
  font-size: 32px;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-email {
  margin: 0;
  font-size: 13px;
  color: #7f8c8d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-body {
  margin-bottom: 16px;
}

.card-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #555;
}

.detail-item .material-symbols-outlined {
  font-size: 18px;
  color: #667eea;
}

.card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.badge .material-symbols-outlined {
  font-size: 14px;
}

.badge-actif {
  background: #d4edda;
  color: #155724;
}

.badge-expire {
  background: #f8d7da;
  color: #721c24;
}

.badge-renouvele {
  background: #d1ecf1;
  color: #0c5460;
}

.badge-a_generer {
  background: #fff3cd;
  color: #856404;
}

.badge-helloasso {
  background: #fff3cd;
  color: #856404;
}

.badge-carte {
  background: #d4edda;
  color: #155724;
}

.badge-online {
  background: #d1ecf1;
  color: #0c5460;
}

.badge-offline {
  background: #fff3cd;
  color: #856404;
}

.card-footer {
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.btn-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  background: white;
  color: #667eea;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action:hover {
  background: #f5f7fa;
  border-color: #667eea;
}

.btn-action.btn-danger {
  color: #e74c3c;
}

.btn-action.btn-danger:hover {
  background: #fee;
  border-color: #e74c3c;
}

.btn-action.btn-generate {
  color: #27ae60;
}

.btn-action.btn-generate:hover {
  background: #e8f5e9;
  border-color: #27ae60;
}

/* Loading */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 12px;
}

.empty-icon {
  font-size: 64px;
  color: #bdc3c7;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #2c3e50;
}

.empty-state p {
  margin: 0;
  color: #7f8c8d;
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 40px;
  padding: 20px;
  background: white;
  border-radius: 12px;
}

.pagination-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #f5f7fa;
  border-color: #667eea;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 14px;
  color: #7f8c8d;
}

/* Modals */
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
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 30px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.large {
  max-width: 800px;
}

.modal-content h2 {
  margin: 0 0 20px 0;
  color: #2c3e50;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
}

.form-group input,
.form-group select {
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 10px 20px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
}

/* Responsive */
@media (max-width: 768px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
  
  .filters-content {
    grid-template-columns: 1fr;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .stats-bar {
    flex-wrap: wrap;
  }
}
</style>
