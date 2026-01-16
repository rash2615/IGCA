<template>
  <div class="dons-modern">
    <!-- Header avec actions principales -->
    <div class="page-header">
      <div class="header-content">
        <h1>Dons</h1>
        <div class="header-actions">
          <button @click="showImportModal = true" class="btn-icon" title="Importer CSV">
            <span class="material-symbols-outlined">upload</span>
          </button>
          <button @click="exportCsv" class="btn-icon" title="Exporter CSV">
            <span class="material-symbols-outlined">download</span>
          </button>
          <button v-if="permissions.canCreate" @click="openCreateModal" class="btn-primary">
            <span class="material-symbols-outlined">add</span>
            Nouveau don
          </button>
        </div>
      </div>
    </div>

    <!-- Statistiques -->
    <div class="stats-section">
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--bg-secondary); border-color: var(--color-black);">
          <span class="material-symbols-outlined" style="color: var(--color-black);">favorite</span>
        </div>
        <div class="stat-content">
          <div class="stat-label">Total dons</div>
          <div class="stat-value">{{ stats.total || 0 }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--color-red-pastel); border-color: var(--color-red);">
          <span class="material-symbols-outlined" style="color: var(--color-red);">euro</span>
        </div>
        <div class="stat-content">
          <div class="stat-label">Montant total</div>
          <div class="stat-value">{{ formatAmount(stats.total_montant || 0) }} €</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--color-green-pastel); border-color: var(--color-green);">
          <span class="material-symbols-outlined" style="color: var(--color-green);">trending_up</span>
        </div>
        <div class="stat-content">
          <div class="stat-label">Moyenne</div>
          <div class="stat-value">{{ formatAmount(stats.montant_moyen || 0) }} €</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--color-yellow-pastel); border-color: var(--color-yellow);">
          <span class="material-symbols-outlined">calendar_month</span>
        </div>
        <div class="stat-content">
          <div class="stat-label">Mois avec dons</div>
          <div class="stat-value">{{ stats.mois_avec_dons || 0 }}</div>
        </div>
      </div>
    </div>

    <!-- Barre de recherche et filtres -->
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
          <label>Date de début</label>
          <input v-model="filters.date_debut" type="date" @change="applyFilters" />
        </div>
        <div class="filter-group">
          <label>Date de fin</label>
          <input v-model="filters.date_fin" type="date" @change="applyFilters" />
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
        <div class="filter-actions">
          <button @click="resetFilters" class="btn-secondary">
            <span class="material-symbols-outlined">refresh</span>
            Réinitialiser
          </button>
        </div>
      </div>
    </div>

    <!-- Liste des dons -->
    <div class="dons-list">
      <div v-if="loading" class="loading-state">
        <span class="material-symbols-outlined spin">sync</span>
        <p>Chargement des dons...</p>
      </div>
      <div v-else-if="dons.length === 0" class="empty-state">
        <span class="material-symbols-outlined">inbox</span>
        <p>Aucun don trouvé</p>
        <button @click="openCreateModal" class="btn-primary">
          <span class="material-symbols-outlined">add</span>
          Créer un don
        </button>
      </div>
      <div v-else class="dons-grid">
        <div v-for="don in dons" :key="don.id" class="don-card">
          <div class="card-header">
            <div class="don-amount">
              <span class="amount-value">{{ formatAmount(don.montant) }} €</span>
              <span class="amount-label">Don</span>
            </div>
            <div class="card-actions">
              <button @click="viewDon(don.id)" class="btn-icon-small" title="Voir les détails">
                <span class="material-symbols-outlined">visibility</span>
              </button>
              <button v-if="permissions.canEdit" @click="editDon(don)" class="btn-icon-small" title="Modifier">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button v-if="permissions.canDelete" @click="deleteDon(don.id, don.montant)" class="btn-icon-small danger" title="Supprimer">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
          <div class="card-body">
            <h3 class="don-name">
              {{ don.prenom || '' }} {{ don.nom || '' }}
              <span v-if="!don.nom && !don.prenom" class="anonymous">Anonyme</span>
            </h3>
            <div class="don-info">
              <div class="info-item" v-if="don.email">
                <span class="material-symbols-outlined">email</span>
                <span>{{ don.email }}</span>
              </div>
              <div class="info-item">
                <span class="material-symbols-outlined">calendar_today</span>
                <span>{{ formatDate(don.date_don) }}</span>
              </div>
              <div class="info-item" v-if="don.moyen_paiement">
                <span class="material-symbols-outlined">payment</span>
                <span>{{ formatMoyenPaiement(don.moyen_paiement) }}</span>
              </div>
              <div class="info-item" v-if="don.helloasso_id">
                <span class="material-symbols-outlined">link</span>
                <span>HelloAsso: {{ don.helloasso_id }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && dons.length > 0" class="pagination">
      <button 
        @click="changePage(currentPage - 1)" 
        :disabled="currentPage === 1"
        class="btn-pagination"
      >
        <span class="material-symbols-outlined">chevron_left</span>
      </button>
      <span class="page-info">
        Page {{ currentPage }} sur {{ totalPages }} ({{ pagination.total }} dons)
      </span>
      <button 
        @click="changePage(currentPage + 1)" 
        :disabled="currentPage === totalPages"
        class="btn-pagination"
      >
        <span class="material-symbols-outlined">chevron_right</span>
      </button>
    </div>

    <!-- Modal création/édition -->
    <Teleport to="body">
      <div v-if="showDonModal" class="modal-overlay" @click.self="closeDonModal">
        <div class="modal-content large">
          <div class="modal-header">
            <h2>{{ editingDon ? 'Modifier le don' : 'Nouveau don' }}</h2>
            <button @click="closeDonModal" class="btn-icon-small">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="saveDon">
              <div class="form-grid">
                <div class="form-group">
                  <label>Nom *</label>
                  <input v-model="donForm.nom" type="text" placeholder="Nom du donateur" />
                </div>
                <div class="form-group">
                  <label>Prénom</label>
                  <input v-model="donForm.prenom" type="text" placeholder="Prénom du donateur" />
                </div>
                <div class="form-group">
                  <label>Email</label>
                  <input v-model="donForm.email" type="email" placeholder="email@example.com" />
                </div>
                <div class="form-group">
                  <label>Date du don *</label>
                  <input v-model="donForm.date_don" type="date" required />
                </div>
                <div class="form-group">
                  <label>Montant (€) *</label>
                  <input v-model.number="donForm.montant" type="number" step="0.01" min="0" required />
                </div>
                <div class="form-group">
                  <label>Moyen de paiement</label>
                  <select v-model="donForm.moyen_paiement">
                    <option value="">Sélectionner...</option>
                    <option value="especes">Espèces</option>
                    <option value="cheque">Chèque</option>
                    <option value="cb">Carte bancaire</option>
                    <option value="virement">Virement</option>
                    <option value="helloasso">HelloAsso</option>
                  </select>
                </div>
                <div class="form-group full-width">
                  <label>ID HelloAsso</label>
                  <input v-model="donForm.helloasso_id" type="text" placeholder="ID HelloAsso (optionnel)" />
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" @click="closeDonModal" class="btn-secondary">Annuler</button>
                <button type="submit" :disabled="saving" class="btn-primary">
                  <span v-if="saving" class="material-symbols-outlined spin">sync</span>
                  {{ saving ? 'Enregistrement...' : (editingDon ? 'Modifier' : 'Créer') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal import -->
    <Teleport to="body">
      <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Importer un fichier CSV</h2>
            <button @click="showImportModal = false" class="btn-icon-small">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <input type="file" @change="handleFileSelect" accept=".csv" />
            <div class="modal-actions">
              <button @click="importCsv" :disabled="!selectedFile || importing" class="btn-primary">
                <span v-if="importing" class="material-symbols-outlined spin">sync</span>
                {{ importing ? 'Import...' : 'Importer' }}
              </button>
              <button @click="showImportModal = false" class="btn-secondary">Annuler</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Teleport } from 'vue';
import { donsApi } from '@/services/api';
import { usePermissions } from '@/composables/usePermissions';
import { eventBus, EVENTS } from '@/utils/eventBus';

const { permissions } = usePermissions();

const router = useRouter();

const dons = ref<any[]>([]);
const loading = ref(false);
const stats = ref<any>({});
const showFilters = ref(false);
const showDonModal = ref(false);
const showImportModal = ref(false);
const editingDon = ref<any>(null);
const saving = ref(false);
const importing = ref(false);
const selectedFile = ref<File | null>(null);

const currentPage = ref(1);
const pageSize = ref(20);
const pagination = ref<any>({ total: 0 });

const filters = ref({
  search: '',
  annee: '',
  date_debut: '',
  date_fin: '',
  moyen_paiement: '',
});

const donForm = ref({
  nom: '',
  prenom: '',
  email: '',
  date_don: new Date().toISOString().split('T')[0],
  montant: 0,
  moyen_paiement: '',
  helloasso_id: '',
});

const moyensPaiement = [
  { value: 'especes', label: 'Espèces', icon: 'money' },
  { value: 'cheque', label: 'Chèque', icon: 'description' },
  { value: 'cb', label: 'Carte bancaire', icon: 'credit_card' },
  { value: 'virement', label: 'Virement', icon: 'account_balance' },
  { value: 'helloasso', label: 'HelloAsso', icon: 'link' },
];

const availableYears = computed(() => {
  const years: string[] = [];
  const currentYear = new Date().getFullYear();
  for (let i = currentYear; i >= currentYear - 5; i--) {
    years.push(i.toString());
  }
  return years;
});

const activeFiltersCount = computed(() => {
  let count = 0;
  if (filters.value.annee) count++;
  if (filters.value.date_debut) count++;
  if (filters.value.date_fin) count++;
  if (filters.value.moyen_paiement) count++;
  return count;
});

const hasActiveFilters = computed(() => activeFiltersCount.value > 0);

const totalPages = computed(() => Math.ceil(pagination.value.total / pageSize.value));

let searchTimeout: NodeJS.Timeout | null = null;

function debounceSearch() {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    loadDons();
  }, 500);
}

function clearSearch() {
  filters.value.search = '';
  currentPage.value = 1;
  loadDons();
}

function toggleMoyenPaiementFilter(value: string) {
  if (filters.value.moyen_paiement === value) {
    filters.value.moyen_paiement = '';
  } else {
    filters.value.moyen_paiement = value;
  }
  applyFilters();
}

function applyFilters() {
  currentPage.value = 1;
  loadDons();
}

function resetFilters() {
  filters.value = {
    search: '',
    annee: '',
    date_debut: '',
    date_fin: '',
    moyen_paiement: '',
  };
  currentPage.value = 1;
  loadDons();
}

function changePage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    loadDons();
  }
}

async function loadDons() {
  loading.value = true;
  try {
    const params: any = {
      page: currentPage.value,
      limit: pageSize.value,
    };

    if (filters.value.search) params.search = filters.value.search;
    if (filters.value.date_debut) params.date_debut = filters.value.date_debut;
    if (filters.value.date_fin) params.date_fin = filters.value.date_fin;
    if (filters.value.moyen_paiement) params.moyen_paiement = filters.value.moyen_paiement;

    const response = await donsApi.list(params);
    dons.value = response.data.data || [];
    pagination.value = response.data.pagination || { total: 0 };
  } catch (error: any) {
    console.error('Erreur lors du chargement des dons:', error);
    alert(error.response?.data?.error || 'Erreur lors du chargement');
  } finally {
    loading.value = false;
  }
}

async function loadStats() {
  try {
    const params: any = {};
    if (filters.value.annee) params.annee = filters.value.annee;
    const response = await donsApi.stats(params);
    stats.value = response.data.data?.stats || {};
  } catch (error: any) {
    console.error('Erreur lors du chargement des statistiques:', error);
  }
}

function formatDate(date: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR');
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function formatMoyenPaiement(moyen: string) {
  const moyenObj = moyensPaiement.find(m => m.value === moyen);
  return moyenObj ? moyenObj.label : moyen;
}

function openCreateModal() {
  editingDon.value = null;
  donForm.value = {
    nom: '',
    prenom: '',
    email: '',
    date_don: new Date().toISOString().split('T')[0],
    montant: 0,
    moyen_paiement: '',
    helloasso_id: '',
  };
  showDonModal.value = true;
}

function editDon(don: any) {
  editingDon.value = don;
  donForm.value = {
    nom: don.nom || '',
    prenom: don.prenom || '',
    email: don.email || '',
    date_don: don.date_don ? don.date_don.split('T')[0] : new Date().toISOString().split('T')[0],
    montant: don.montant || 0,
    moyen_paiement: don.moyen_paiement || '',
    helloasso_id: don.helloasso_id || '',
  };
  showDonModal.value = true;
}

function closeDonModal() {
  showDonModal.value = false;
  editingDon.value = null;
}

async function saveDon() {
  if (!donForm.value.date_don || !donForm.value.montant) {
    alert('La date et le montant sont requis');
    return;
  }

  saving.value = true;
  try {
    if (editingDon.value) {
      await donsApi.update(editingDon.value.id, donForm.value);
      alert('Don modifié avec succès !');
      
      // Notifier les autres vues
      eventBus.emit(EVENTS.DON_UPDATED, { id: editingDon.value.id });
    } else {
      const response = await donsApi.create(donForm.value);
      const newDon = response.data?.data || response.data;
      alert('Don créé avec succès !');
      
      // Notifier les autres vues
      if (newDon?.id) {
        eventBus.emit(EVENTS.DON_CREATED, { id: newDon.id });
      }
    }
    closeDonModal();
    await loadDons();
    await loadStats();
  } catch (error: any) {
    alert(error.response?.data?.error || 'Erreur lors de l\'enregistrement');
  } finally {
    saving.value = false;
  }
}

function deleteDon(id: number, montant: number) {
  if (!confirm(`Êtes-vous sûr de vouloir supprimer ce don de ${formatAmount(montant)} € ?`)) {
    return;
  }

  donsApi.delete(id)
    .then(() => {
      // Notifier les autres vues
      eventBus.emit(EVENTS.DON_DELETED, { id });
      
      alert('Don supprimé avec succès !');
      loadDons();
      loadStats();
    })
    .catch((error: any) => {
      alert(error.response?.data?.error || 'Erreur lors de la suppression');
    });
}

function viewDon(id: number) {
  router.push(`/app/dons/${id}`);
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0];
  }
}

async function importCsv() {
  if (!selectedFile.value) return;

  importing.value = true;
  try {
    const response = await donsApi.import(selectedFile.value);
    if (response.data.importId) {
      await donsApi.validateImport(response.data.importId, { records: response.data.records });
      showImportModal.value = false;
      selectedFile.value = null;
      await loadDons();
      await loadStats();
      alert('Import réussi !');
    }
  } catch (error: any) {
    alert(error.response?.data?.error || 'Erreur lors de l\'import');
  } finally {
    importing.value = false;
  }
}

async function exportCsv() {
  try {
    const params: any = {};
    if (filters.value.search) params.search = filters.value.search;
    if (filters.value.date_debut) params.date_debut = filters.value.date_debut;
    if (filters.value.date_fin) params.date_fin = filters.value.date_fin;
    if (filters.value.moyen_paiement) params.moyen_paiement = filters.value.moyen_paiement;

    const response = await donsApi.exportCsv(params);
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dons_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    alert(error.response?.data?.error || 'Erreur lors de l\'export');
  }
}

onMounted(() => {
  loadDons();
  loadStats();
});
</script>

<style scoped>
.dons-modern {
  padding: 24px;
  width: 100%;
  margin: 0;
}

.page-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

/* Header - styles maintenant dans view-base.css */

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* Boutons styles maintenant dans buttons.css global */

.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-icon .material-symbols-outlined {
  font-size: 28px;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}

.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #94a3b8;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 12px 40px 12px 44px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.clear-search {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
}

.clear-search:hover {
  background: #f1f5f9;
  color: #64748b;
}

.btn-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-filters:hover,
.btn-filters.active {
  border-color: var(--primary);
  color: var(--primary);
  background: #f8fafc;
}

.filter-badge {
  background: var(--color-black);
  color: var(--text-inverse);
  border-radius: 0;
  padding: 2px 8px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.filters-panel {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.filters-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group label {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.filter-group input,
.filter-group select {
  padding: 10px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.filter-group input:focus,
.filter-group select:focus {
  outline: none;
  border-color: var(--primary);
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
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.chip:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.chip.active {
  background: var(--color-black);
  border-color: var(--color-black);
  color: var(--text-inverse);
}

.chip .material-symbols-outlined {
  font-size: 18px;
}

.filter-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
}

.dons-list {
  margin-bottom: 24px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  color: #64748b;
}

.loading-state .material-symbols-outlined,
.empty-state .material-symbols-outlined {
  font-size: 64px;
  margin-bottom: 16px;
  color: #cbd5e1;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.dons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.don-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.2s;
}

.don-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.don-amount {
  display: flex;
  flex-direction: column;
}

.amount-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary);
  line-height: 1;
}

.amount-label {
  font-size: 12px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
}

.card-actions {
  display: flex;
  gap: 4px;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.don-name {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.anonymous {
  color: #94a3b8;
  font-style: italic;
}

.don-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #64748b;
}

.info-item .material-symbols-outlined {
  font-size: 18px;
  color: #94a3b8;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 12px;
}

.btn-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}

.btn-pagination:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.btn-pagination:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.large {
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
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}

.modal-body {
  padding: 24px;
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
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.form-group input,
.form-group select {
  padding: 10px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}
</style>
