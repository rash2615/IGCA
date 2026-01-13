<template>
  <div class="adhesions">
    <div class="header">
      <h1>Adhésions</h1>
      <button @click="openCreateModal" class="btn-primary">
        ➕ Nouvelle adhésion
      </button>
    </div>

    <div class="actions">
      <button @click="showSyncModal = true" class="btn-sync">🔄 Synchroniser HelloAsso</button>
      <button @click="showImportModal = true" class="btn-secondary">📥 Importer CSV</button>
      <button @click="exportCsv" class="btn-secondary">📤 Exporter CSV</button>
    </div>

    <!-- Onglets pour organiser les adhésions -->
    <div class="tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
      >
        {{ tab.label }}
        <span v-if="tab.count !== undefined" class="tab-count">({{ tab.count }})</span>
      </button>
    </div>

    <div class="filters">
      <input
        v-model="filters.search"
        type="text"
        placeholder="Rechercher (nom, prénom, email)..."
        @input="() => loadAdhesions(1)"
      />
      <select v-model="filters.annee" @change="handleYearChange">
        <option value="">Toutes les années</option>
        <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
      </select>
      <select v-model="filters.statut" @change="loadAdhesions">
        <option value="">Tous les statuts</option>
        <option value="actif">Actif</option>
        <option value="expire">Expiré</option>
        <option value="renouvele">Renouvelé</option>
        <option value="a_generer">À générer</option>
      </select>
      <select v-model="filters.moyen_paiement" @change="loadAdhesions">
        <option value="">Tous les moyens de paiement</option>
        <option value="helloasso">HelloAsso</option>
        <option value="especes">Espèces</option>
        <option value="cheque">Chèque</option>
        <option value="cb">Carte Bancaire</option>
        <option value="virement">Virement</option>
      </select>
      <button @click="showBulkStatusModal = true" class="btn-secondary" :disabled="selectedAdhesions.length === 0">
        ✏️ Modifier le statut ({{ selectedAdhesions.length }})
      </button>
      <input
        v-model="filters.helloasso_campaign_id"
        type="text"
        placeholder="ID Campagne HelloAsso"
        @input="() => loadAdhesions(1)"
      />
    </div>

    <div v-if="loading" class="loading">Chargement...</div>
    <div v-else-if="adhesions.length === 0" class="empty-state">
      <p>Aucune adhésion trouvée</p>
    </div>
    <div v-else class="table-wrapper">
      <table class="data-table">
        <thead>
        <tr>
          <th>
            <input type="checkbox" @change="toggleSelectAll" :checked="allSelected" />
          </th>
          <th>Nom</th>
          <th>Prénom</th>
          <th>Email</th>
          <th>Date</th>
          <th>Tarif</th>
          <th>Moyen de paiement</th>
          <th>Statut</th>
          <th>Prévisualisation</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="adhesion in adhesions" :key="adhesion.id">
          <td>
            <input 
              type="checkbox" 
              :value="adhesion.id" 
              v-model="selectedAdhesions"
            />
          </td>
          <td>
            <div class="adhesion-cell">
              <img 
                v-if="adhesion.photo_url" 
                :src="getImageUrl(adhesion.photo_url)" 
                :alt="`${adhesion.nom} ${adhesion.prenom}`"
                class="adhesion-thumbnail"
                @error="handleImageError"
              />
              <div v-else class="no-photo-placeholder">📷</div>
              <span>{{ adhesion.nom }}</span>
            </div>
          </td>
          <td>{{ adhesion.prenom }}</td>
          <td>{{ adhesion.email }}</td>
          <td>{{ formatDate(adhesion.date_adhesion) }}</td>
          <td>{{ adhesion.tarif }} €</td>
          <td>
            <span :class="['payment-badge', `payment-${adhesion.moyen_paiement || 'helloasso'}`]">
              {{ formatPaymentMethod(adhesion.moyen_paiement) }}
            </span>
          </td>
          <td>
            <div class="status-cell">
              <select 
                v-model="adhesion.statut" 
                @change="updateStatus(adhesion.id, adhesion.statut)"
                class="status-select"
              >
                <option value="actif">Actif</option>
                <option value="expire">Expiré</option>
                <option value="renouvele">Renouvelé</option>
                <option value="a_generer">À générer</option>
              </select>
            </div>
          </td>
          <td class="preview-cell">
            <div v-if="isAdhesionComplete(adhesion)" class="carte-preview-container">
              <div v-if="adhesion.carte_id" class="carte-preview">
                <div class="carte-preview-content">
                  <img 
                    v-if="adhesion.photo_url" 
                    :src="getImageUrl(adhesion.photo_url)" 
                    :alt="`${adhesion.nom} ${adhesion.prenom}`"
                    class="carte-photo"
                  />
                  <div class="carte-info">
                    <div class="carte-nom">{{ adhesion.prenom }} {{ adhesion.nom }}</div>
                    <div class="carte-numero" v-if="adhesion.numero_carte">{{ adhesion.numero_carte }}</div>
                    <div class="carte-statut-badge" :class="`statut-${adhesion.carte_statut}`">
                      {{ formatCarteStatut(adhesion.carte_statut) }}
                    </div>
                  </div>
                </div>
                <button 
                  @click="viewCartePreview(adhesion.carte_id)" 
                  class="btn-preview-carte"
                  title="Voir la prévisualisation complète"
                >
                  👁️
                </button>
              </div>
              <div v-else class="carte-generate">
                <button 
                  @click="generateCarteForAdhesion(adhesion)" 
                  class="btn-generate-carte"
                  :disabled="generatingCarte === adhesion.id"
                  title="Générer la carte"
                >
                  {{ generatingCarte === adhesion.id ? '⏳' : '🎴 Générer' }}
                </button>
              </div>
            </div>
            <div v-else class="incomplete-badge">
              ⚠️ Incomplet
            </div>
          </td>
          <td class="actions-cell">
            <div class="action-buttons">
              <button 
                @click="viewDetails(adhesion.id)" 
                class="btn-action btn-view" 
                title="Voir les détails"
              >
                <span class="icon">👁️</span>
              </button>
              <button 
                @click="editAdhesion(adhesion)" 
                class="btn-action btn-edit" 
                title="Modifier"
              >
                <span class="icon">✏️</span>
              </button>
              <button 
                @click="confirmDelete(adhesion)" 
                class="btn-action btn-delete" 
                title="Supprimer"
              >
                <span class="icon">🗑️</span>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && adhesions.length > 0" class="pagination">
      <button 
        @click="loadAdhesions(currentPage - 1)" 
        :disabled="currentPage === 1"
        class="pagination-btn"
      >
        ← Précédent
      </button>
      <span class="pagination-info">
        Page {{ currentPage }} sur {{ totalPages }} ({{ totalAdhesions }} adhésion(s) au total)
      </span>
      <button 
        @click="loadAdhesions(currentPage + 1)" 
        :disabled="currentPage >= totalPages"
        class="pagination-btn"
      >
        Suivant →
      </button>
    </div>

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
                  <button type="button" @click="clearPhoto" class="btn-remove-photo">✕</button>
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
        <h2>🔄 Synchroniser avec HelloAsso</h2>
        <p class="modal-description">
          Synchronisez directement les adhésions depuis votre campagne HelloAsso IGCA Paris.
          Plus besoin d'importer/exporter manuellement !
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
            <small>Vous trouvez cet ID dans l'URL de votre campagne HelloAsso</small>
          </div>

          <div class="form-group full-width">
            <label>Client ID HelloAsso (optionnel)</label>
            <input 
              v-model="syncForm.clientId" 
              type="text" 
              placeholder="Si vide, utilise la config serveur"
            />
            <small>Créé dans les paramètres API de votre compte HelloAsso</small>
          </div>

          <div class="form-group full-width">
            <label>Client Secret HelloAsso (optionnel)</label>
            <input 
              v-model="syncForm.clientSecret" 
              type="password" 
              placeholder="Si vide, utilise la config serveur"
            />
          </div>

          <div class="form-group full-width">
            <label>Token d'accès (optionnel - alternative aux credentials)</label>
            <input 
              v-model="syncForm.accessToken" 
              type="text" 
              placeholder="Token OAuth2 HelloAsso"
            />
          </div>

          <div class="form-options">
            <label class="checkbox-label">
              <input type="checkbox" v-model="syncForm.updateExisting" />
              Mettre à jour les adhésions existantes
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="syncForm.skipDuplicates" />
              Ignorer les doublons
            </label>
          </div>

          <div class="form-actions">
            <button 
              type="button" 
              @click="testConnection" 
              :disabled="testingConnection || syncing"
              class="btn-secondary"
            >
              {{ testingConnection ? 'Test...' : 'Tester la connexion' }}
            </button>
            <button 
              type="submit" 
              :disabled="!connectionTested || syncing"
              class="btn-primary"
            >
              {{ syncing ? 'Synchronisation...' : 'Synchroniser' }}
            </button>
            <button type="button" @click="closeSyncModal" class="btn-cancel">Annuler</button>
          </div>
        </form>

        <div v-if="syncResult" class="sync-result">
          <h3>Résultat de la synchronisation</h3>
          <div class="result-stats">
            <div class="stat-item success">
              <span class="stat-label">Créées</span>
              <span class="stat-value">{{ syncResult.stats?.created || 0 }}</span>
            </div>
            <div class="stat-item info">
              <span class="stat-label">Mises à jour</span>
              <span class="stat-value">{{ syncResult.stats?.updated || 0 }}</span>
            </div>
            <div class="stat-item warning">
              <span class="stat-label">Ignorées</span>
              <span class="stat-value">{{ syncResult.stats?.skipped || 0 }}</span>
            </div>
            <div class="stat-item error" v-if="syncResult.stats?.errors > 0">
              <span class="stat-label">Erreurs</span>
              <span class="stat-value">{{ syncResult.stats?.errors || 0 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal import -->
    <div v-if="showImportModal" class="modal" @click.self="showImportModal = false">
      <div class="modal-content">
        <h2>Importer un fichier CSV</h2>
        <input type="file" @change="handleFileSelect" accept=".csv" />
        <div v-if="importData" class="import-preview">
          <p><strong>{{ importData.records?.length || 0 }} enregistrements trouvés</strong></p>
          <div v-if="importData.duplicates && importData.duplicates.length > 0" class="duplicates-warning">
            <strong>⚠️ {{ importData.duplicates.length }} doublon(s) détecté(s)</strong>
            <p class="duplicates-info">
              Tous les enregistrements seront importés, même s'ils sont détectés comme doublons.
            </p>
          </div>
          <div v-if="importData && !importValidated" class="import-options">
            <label class="import-option">
              <input 
                type="checkbox" 
                v-model="forceImport" 
              />
              <span>Forcer l'import (importer tous les enregistrements sans vérification de doublons)</span>
            </label>
          </div>
        </div>
        <div class="modal-actions">
          <button
            v-if="importData && !importValidated"
            @click="validateImport"
            :disabled="validating"
            class="btn-primary"
          >
            {{ validating ? 'Validation...' : 'Valider l\'import' }}
          </button>
          <button 
            v-if="importData && !importValidated && forceImport"
            @click="forceImportAll"
            :disabled="importing"
            class="btn-primary"
          >
            {{ importing ? 'Import en cours...' : 'Forcer l\'import de tous' }}
          </button>
          <button @click="importCsv" :disabled="!selectedFile || importing" class="btn-primary">
            {{ importing ? 'Import...' : 'Importer' }}
          </button>
          <button @click="showImportModal = false" class="btn-cancel">Annuler</button>
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
const editingAdhesion = ref<any>(null);
const selectedFile = ref<File | null>(null);
const importing = ref(false);
const validating = ref(false);
const importData = ref<any>(null);
const importValidated = ref(false);
const syncing = ref(false);
const testingConnection = ref(false);
const connectionTested = ref(false);
const syncResult = ref<any>(null);
const selectedAdhesions = ref<number[]>([]);
const showBulkStatusModal = ref(false);
const bulkStatus = ref('actif');
const photoUrlInput = ref('');
const photoPreview = ref<string | null>(null);
const selectedPhotoFile = ref<File | null>(null);
const forceImport = ref(false);
const currentPage = ref(1);
const totalPages = ref(1);
const totalAdhesions = ref(0);
const limitPerPage = 20;
const generatingCarte = ref<number | null>(null);
const cartePreviews = ref<Record<number, any>>({});

const syncForm = ref({
  campaignId: '',
  clientId: '',
  clientSecret: '',
  accessToken: '',
  updateExisting: false,
  skipDuplicates: true,
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

const activeTab = ref('all');
const availableYears = ref<number[]>([]);

const tabs = computed(() => {
  const currentYear = new Date().getFullYear();
  return [
    { id: 'all', label: 'Toutes', count: totalAdhesions.value },
    { id: 'actif', label: 'Actives', count: undefined },
    { id: 'a_generer', label: 'À vérifier', count: undefined },
    { id: 'expire', label: 'Expirées', count: undefined },
    { id: 'current_year', label: `Année ${currentYear}`, count: undefined },
  ];
});

async function loadAvailableYears() {
  try {
    // Charger toutes les adhésions pour extraire les années disponibles
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
    // Fallback : années récentes
    const currentYear = new Date().getFullYear();
    availableYears.value = [];
    for (let i = currentYear; i >= currentYear - 10; i--) {
      availableYears.value.push(i);
    }
  }
}

function handleYearChange() {
  loadAdhesions(1);
}

function handleTabChange() {
  // Appliquer le filtre selon l'onglet actif
  if (activeTab.value === 'all') {
    filters.value.statut = '';
    filters.value.annee = '';
  } else if (activeTab.value === 'actif') {
    filters.value.statut = 'actif';
    filters.value.annee = '';
  } else if (activeTab.value === 'a_generer') {
    filters.value.statut = 'a_generer';
    filters.value.annee = '';
  } else if (activeTab.value === 'expire') {
    filters.value.statut = 'expire';
    filters.value.annee = '';
  } else if (activeTab.value === 'current_year') {
    filters.value.annee = new Date().getFullYear().toString();
    filters.value.statut = '';
  }
  loadAdhesions(1);
}

function isAdhesionComplete(adhesion: any): boolean {
  // Vérifier que tous les champs requis sont remplis (email non requis)
  return !!(
    adhesion.nom &&
    adhesion.nom.trim() !== '' &&
    adhesion.nom !== 'Sans nom' &&
    adhesion.prenom &&
    adhesion.prenom.trim() !== '' &&
    adhesion.prenom !== 'Sans prénom' &&
    adhesion.photo_url &&
    adhesion.tarif &&
    adhesion.tarif > 0 &&
    adhesion.moyen_paiement &&
    adhesion.date_adhesion &&
    adhesion.statut
  );
}

function formatCarteStatut(statut: string) {
  const statusMap: Record<string, string> = {
    a_generer: 'À générer',
    generee: 'Générée',
    a_remettre: 'À remettre',
    remise: 'Remise',
  };
  return statusMap[statut] || statut;
}

async function generateCarteForAdhesion(adhesion: any) {
  if (!isAdhesionComplete(adhesion)) {
    alert('Cette adhésion n\'est pas complète. Veuillez remplir tous les champs requis.');
    return;
  }

  generatingCarte.value = adhesion.id;
  try {
    await cartesApi.generate(adhesion.id);
    await loadAdhesions(currentPage.value);
    alert('Carte générée avec succès !');
  } catch (error: any) {
    console.error('Erreur lors de la génération de la carte:', error);
    alert(error.response?.data?.error || 'Erreur lors de la génération de la carte');
  } finally {
    generatingCarte.value = null;
  }
}

async function viewCartePreview(carteId: number) {
  try {
    const response = await cartesApi.preview(carteId);
    const carte = response.data.data || response.data;
    alert(`Carte #${carte.numero_carte}\nStatut: ${formatCarteStatut(carte.statut)}\nAdhérent: ${carte.prenom} ${carte.nom}`);
  } catch (error: any) {
    console.error('Erreur lors de la prévisualisation:', error);
    alert('Erreur lors de la prévisualisation de la carte');
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR');
}

function formatStatus(statut: string) {
  const statusMap: Record<string, string> = {
    actif: 'Actif',
    expire: 'Expiré',
    renouvele: 'Renouvelé',
  };
  return statusMap[statut] || statut;
}

function formatPaymentMethod(moyenPaiement: string) {
  const paymentMap: Record<string, string> = {
    helloasso: 'HelloAsso',
    especes: 'Espèces',
    cheque: 'Chèque',
    cb: 'Carte Bancaire',
    virement: 'Virement',
  };
  return paymentMap[moyenPaiement] || moyenPaiement || 'Non défini';
}

const allSelected = computed(() => {
  return adhesions.value.length > 0 && selectedAdhesions.value.length === adhesions.value.length;
});

function toggleSelectAll() {
  if (allSelected.value) {
    selectedAdhesions.value = [];
  } else {
    selectedAdhesions.value = adhesions.value.map(a => a.id);
  }
}

async function updateStatus(adhesionId: number, newStatus: string) {
  try {
    const adhesion = adhesions.value.find(a => a.id === adhesionId);
    if (!adhesion) return;

    await adhesionsApi.update(adhesionId, {
      ...adhesion,
      statut: newStatus,
    });
    
    // Mettre à jour localement
    adhesion.statut = newStatus;
    
    // Recharger pour vérifier si on peut générer une carte
    await loadAdhesions(currentPage.value);
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    alert(error.response?.data?.error || 'Erreur lors de la mise à jour du statut');
    // Recharger pour restaurer l'état précédent
    await loadAdhesions(currentPage.value);
  }
}

async function updateBulkStatus() {
  if (selectedAdhesions.value.length === 0) {
    alert('Veuillez sélectionner au moins une adhésion');
    return;
  }

  if (!confirm(`Modifier le statut de ${selectedAdhesions.value.length} adhésion(s) en "${formatStatus(bulkStatus.value)}" ?`)) {
    return;
  }

  try {
    const updates = selectedAdhesions.value.map(id => {
      const adhesion = adhesions.value.find(a => a.id === id);
      if (!adhesion) return null;
      return adhesionsApi.update(id, {
        ...adhesion,
        statut: bulkStatus.value,
      });
    });

    await Promise.all(updates.filter(Boolean));
    selectedAdhesions.value = [];
    showBulkStatusModal.value = false;
    await loadAdhesions(1);
    alert(`Statut mis à jour pour ${updates.length} adhésion(s) !`);
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour en masse:', error);
    alert(error.response?.data?.error || 'Erreur lors de la mise à jour en masse');
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
  photoUrlInput.value = '';
  photoPreview.value = null;
  selectedPhotoFile.value = null;
  showFormModal.value = true;
}

function editAdhesion(adhesion: any) {
  editingAdhesion.value = adhesion;
  formData.value = {
    nom: adhesion.nom || '',
    prenom: adhesion.prenom || '',
    email: adhesion.email || '',
    telephone: adhesion.telephone || '',
    date_adhesion: adhesion.date_adhesion ? (adhesion.date_adhesion.includes('T') ? adhesion.date_adhesion.split('T')[0] : adhesion.date_adhesion) : new Date().toISOString().split('T')[0],
    tarif: adhesion.tarif || 0,
    moyen_paiement: adhesion.moyen_paiement || 'helloasso',
    statut: adhesion.statut || 'actif',
    helloasso_id: adhesion.helloasso_id || '',
    helloasso_campaign_id: adhesion.helloasso_campaign_id || '',
    photo_url: adhesion.photo_url || '',
  };
  photoUrlInput.value = adhesion.photo_url || '';
  photoPreview.value = adhesion.photo_url || null;
  selectedPhotoFile.value = null;
  showFormModal.value = true;
}

function closeFormModal() {
  showFormModal.value = false;
  editingAdhesion.value = null;
  photoUrlInput.value = '';
  photoPreview.value = null;
  selectedPhotoFile.value = null;
}

function handlePhotoFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    selectedPhotoFile.value = file;
    
    // Créer une preview locale
    const reader = new FileReader();
    reader.onload = (e) => {
      photoPreview.value = e.target?.result as string;
      formData.value.photo_url = e.target?.result as string; // Utiliser la preview temporairement
    };
    reader.readAsDataURL(file);
  }
}

function updatePhotoFromUrl() {
  if (photoUrlInput.value) {
    photoPreview.value = photoUrlInput.value;
    formData.value.photo_url = photoUrlInput.value;
  } else {
    photoPreview.value = null;
    formData.value.photo_url = '';
  }
}

function clearPhoto() {
  photoUrlInput.value = '';
  photoPreview.value = null;
  selectedPhotoFile.value = null;
  formData.value.photo_url = '';
  
  // Réinitialiser l'input file
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  if (fileInput) {
    fileInput.value = '';
  }
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

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  console.error('❌ Erreur de chargement de l\'image:', img.src);
  img.style.display = 'none';
}

function onImageCropped(dataUrl: string) {
  // Cette fonction n'est plus utilisée mais conservée pour compatibilité
  if (!dataUrl) {
    return;
  }
  
  try {
    photoPreview.value = dataUrl;
    formData.value.photo_url = dataUrl;
    
    // Convertir dataUrl en File pour l'upload
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'photo-cropped.jpg', { type: 'image/jpeg' });
        selectedPhotoFile.value = file;
        console.log('✅ Fichier créé pour upload:', file.name, file.size, 'bytes');
      })
      .catch(error => {
        console.error('❌ Erreur lors de la conversion en fichier:', error);
      });
  } catch (error) {
    console.error('❌ Erreur dans onImageCropped:', error);
  }
}

async function saveAdhesion() {
  saving.value = true;
  try {
    // Si on a un fichier photo, l'envoyer avec le formulaire
    // Sinon, utiliser l'URL si elle a été saisie
    const photoFile = selectedPhotoFile.value;
    const photoUrl = photoUrlInput.value.trim();
    
    // Préparer les données à envoyer
    const dataToSend = { ...formData.value };
    
    // Si on a un fichier, ne pas envoyer photo_url (le backend le gérera)
    // Si on a une URL mais pas de fichier, utiliser l'URL
    if (photoFile) {
      // Ne pas inclure photo_url si on upload un fichier
      delete dataToSend.photo_url;
    } else if (photoUrl) {
      dataToSend.photo_url = photoUrl;
    } else {
      // Si on n'a ni fichier ni URL, ne pas envoyer photo_url
      delete dataToSend.photo_url;
    }
    
    let response;
    if (editingAdhesion.value) {
      // Mise à jour
      response = await adhesionsApi.update(editingAdhesion.value.id, dataToSend, photoFile || undefined);
    } else {
      // Création
      response = await adhesionsApi.create(dataToSend, photoFile || undefined);
    }
    
    console.log('✅ Réponse sauvegarde:', response?.data);
    console.log('📷 photo_url retournée:', response?.data?.data?.photo_url);
    
    closeFormModal();
    // Recharger les adhésions pour avoir les données à jour (y compris la nouvelle photo_url)
    await loadAdhesions(currentPage.value);
    alert(editingAdhesion.value ? 'Adhésion modifiée avec succès !' : 'Adhésion créée avec succès !');
  } catch (error: any) {
    console.error('Erreur lors de la sauvegarde:', error);
    alert(error.response?.data?.error || 'Erreur lors de la sauvegarde');
  } finally {
    saving.value = false;
  }
}

function confirmDelete(adhesion: any) {
  if (confirm(`Êtes-vous sûr de vouloir supprimer l'adhésion de ${adhesion.nom} ${adhesion.prenom} ?`)) {
    deleteAdhesion(adhesion.id);
  }
}

async function deleteAdhesion(id: number) {
  try {
    await adhesionsApi.delete(id);
    await loadAdhesions(1);
    alert('Adhésion supprimée avec succès !');
  } catch (error: any) {
    console.error('Erreur lors de la suppression:', error);
    alert(error.response?.data?.error || 'Erreur lors de la suppression');
  }
}

function viewDetails(id: number) {
  router.push(`/app/adhesions/${id}`);
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
    if (filters.value.helloasso_campaign_id) params.helloasso_campaign_id = filters.value.helloasso_campaign_id;

    const response = await adhesionsApi.list(params);
    adhesions.value = response.data.data || response.data || [];
    
    // Mettre à jour la pagination
    const pagination = response.data.pagination || {};
    totalAdhesions.value = pagination.total || adhesions.value.length;
    totalPages.value = Math.ceil(totalAdhesions.value / limitPerPage);
    
    console.log(`✅ Page ${page}: ${adhesions.value.length} adhésion(s) sur ${totalAdhesions.value} total`);
    if (adhesions.value.length > 0) {
      console.log('📷 Exemple photo_url:', adhesions.value[0]?.photo_url);
      console.log('📷 URL construite:', adhesions.value[0]?.photo_url ? getImageUrl(adhesions.value[0].photo_url) : 'aucune');
    }
    
    // Générer automatiquement les cartes pour les adhésions complètes sans carte
    await autoGenerateCartesForCompleteAdhesions();
  } catch (error: any) {
    console.error('Erreur lors du chargement des adhésions:', error);
    if (error.response?.data?.error) {
      alert(error.response.data.error);
    }
  } finally {
    loading.value = false;
  }
}

async function autoGenerateCartesForCompleteAdhesions() {
  // Trouver les adhésions complètes sans carte
  const completeAdhesionsWithoutCarte = adhesions.value.filter(
    (adhesion: any) => isAdhesionComplete(adhesion) && !adhesion.carte_id
  );

  if (completeAdhesionsWithoutCarte.length === 0) {
    return;
  }

  console.log(`🔄 Génération automatique de ${completeAdhesionsWithoutCarte.length} carte(s)...`);

  let generatedCount = 0;
  
  // Générer les cartes une par une pour éviter de surcharger le serveur
  for (const adhesion of completeAdhesionsWithoutCarte) {
    if (generatingCarte.value === adhesion.id) {
      continue; // Déjà en cours de génération
    }

    try {
      generatingCarte.value = adhesion.id;
      const response = await cartesApi.generate(adhesion.id);
      console.log(`✅ Carte générée pour ${adhesion.prenom} ${adhesion.nom}:`, response.data);
      generatedCount++;
      
      // Mettre à jour localement l'adhesion pour afficher la carte
      const adhesionIndex = adhesions.value.findIndex((a: any) => a.id === adhesion.id);
      if (adhesionIndex !== -1) {
        // Recharger cette adhésion spécifique depuis le serveur pour obtenir les infos de carte
        try {
          const updatedResponse = await adhesionsApi.get(adhesion.id);
          const updatedAdhesion = updatedResponse.data.data || updatedResponse.data;
          // Récupérer aussi les infos de carte depuis la liste des adhésions
          const adhesionsResponse = await adhesionsApi.list({ 
            limit: '10000',
            page: '1'
          });
          const allAdhesions = adhesionsResponse.data.data || adhesionsResponse.data || [];
          const updatedAdhesionWithCarte = allAdhesions.find((a: any) => a.id === adhesion.id);
          if (updatedAdhesionWithCarte) {
            adhesions.value[adhesionIndex] = { ...adhesions.value[adhesionIndex], ...updatedAdhesionWithCarte };
          } else {
            adhesions.value[adhesionIndex] = { ...adhesions.value[adhesionIndex], ...updatedAdhesion };
          }
        } catch (updateError) {
          console.warn('Erreur lors de la mise à jour de l\'affichage:', updateError);
          // Recharger toute la page si la mise à jour individuelle échoue
          await loadAdhesions(currentPage.value);
        }
      }
    } catch (error: any) {
      console.error(`❌ Erreur génération carte pour ${adhesion.prenom} ${adhesion.nom}:`, error);
      const errorMessage = error.response?.data?.error || error.message || 'Erreur inconnue';
      console.error('Détails de l\'erreur:', errorMessage);
      // Ne pas bloquer les autres générations en cas d'erreur
    } finally {
      generatingCarte.value = null;
    }
  }

  if (generatedCount > 0) {
    console.log(`✅ ${generatedCount} carte(s) générée(s) automatiquement`);
  }
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
    const response = await adhesionsApi.import(selectedFile.value);
    importData.value = response.data;
    importValidated.value = false;
  } catch (error: any) {
    alert(error.response?.data?.error || 'Erreur lors de l\'import');
  } finally {
    importing.value = false;
  }
}

async function validateImport() {
  if (!importData.value?.importId) return;

  validating.value = true;
  try {
    await adhesionsApi.validateImport(importData.value.importId, {
      records: importData.value.records,
      duplicateActions: [],
    });
    importValidated.value = true;
    showImportModal.value = false;
    selectedFile.value = null;
    importData.value = null;
    forceImport.value = false;
    await loadAdhesions(1);
    alert('Import validé avec succès !');
  } catch (error: any) {
    alert(error.response?.data?.error || 'Erreur lors de la validation');
  } finally {
    validating.value = false;
  }
}

async function forceImportAll() {
  if (!importData.value?.importId || !importData.value?.records) return;

  importing.value = true;
  try {
    // Importer tous les enregistrements en ignorant les doublons
    const response = await adhesionsApi.validateImport(importData.value.importId, {
      records: importData.value.records,
      duplicateActions: [],
      forceUpdate: true,
    });
    
    const stats = response.data;
    importValidated.value = true;
    showImportModal.value = false;
    selectedFile.value = null;
    importData.value = null;
    forceImport.value = false;
    await loadAdhesions(1);
    
    alert(`✅ Import terminé !\n\n` +
      `✅ ${stats.inserted || 0} nouveau(x) enregistrement(s) importé(s)\n` +
      `⏭️ ${stats.skipped || 0} doublon(s) ignoré(s)\n` +
      `📝 ${stats.updated || 0} enregistrement(s) mis à jour`);
  } catch (error: any) {
    console.error('Erreur import forcé:', error);
    alert(error.response?.data?.error || 'Erreur lors de l\'import forcé');
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
    if (filters.value.helloasso_campaign_id) params.helloasso_campaign_id = filters.value.helloasso_campaign_id;

    const response = await adhesionsApi.export(params);
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adhesions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  } catch (error) {
    alert('Erreur lors de l\'export');
  }
}

async function testConnection() {
  if (!syncForm.value.campaignId) {
    alert('Veuillez saisir l\'ID de la campagne HelloAsso');
    return;
  }

  testingConnection.value = true;
  try {
    const response = await adhesionsApi.testHelloAssoConnection({
      campaignId: syncForm.value.campaignId,
      clientId: syncForm.value.clientId || undefined,
      clientSecret: syncForm.value.clientSecret || undefined,
      accessToken: syncForm.value.accessToken || undefined,
    });
    
    connectionTested.value = true;
    alert(`✅ Connexion réussie !\n\nCampagne: ${response.data.campaignId}\nTotal adhésions: ${response.data.totalItems}`);
  } catch (error: any) {
    console.error('Erreur test connexion:', error);
    alert(error.response?.data?.error || error.response?.data?.details || 'Erreur de connexion à HelloAsso');
    connectionTested.value = false;
  } finally {
    testingConnection.value = false;
  }
}

async function syncHelloAsso() {
  if (!syncForm.value.campaignId) {
    alert('Veuillez saisir l\'ID de la campagne HelloAsso');
    return;
  }

  syncing.value = true;
  syncResult.value = null;
  try {
    const response = await adhesionsApi.syncHelloAsso({
      campaignId: syncForm.value.campaignId,
      clientId: syncForm.value.clientId || undefined,
      clientSecret: syncForm.value.clientSecret || undefined,
      accessToken: syncForm.value.accessToken || undefined,
      updateExisting: syncForm.value.updateExisting,
      skipDuplicates: syncForm.value.skipDuplicates,
    });
    
    syncResult.value = response.data;
    await loadAdhesions(1);
    
    alert(`✅ Synchronisation terminée !\n\nCréées: ${response.data.stats.created}\nMises à jour: ${response.data.stats.updated}\nIgnorées: ${response.data.stats.skipped}`);
  } catch (error: any) {
    console.error('Erreur synchronisation:', error);
    alert(error.response?.data?.error || error.response?.data?.details || 'Erreur lors de la synchronisation');
  } finally {
    syncing.value = false;
  }
}

function closeSyncModal() {
  showSyncModal.value = false;
  syncForm.value = {
    campaignId: '',
    clientId: '',
    clientSecret: '',
    accessToken: '',
    updateExisting: false,
    skipDuplicates: true,
  };
  connectionTested.value = false;
  syncResult.value = null;
}

watch(activeTab, handleTabChange);

onMounted(() => {
  loadAvailableYears();
  loadAdhesions(1);
});
</script>

<style scoped>
.adhesions {
  width: 100%;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h1 {
  margin: 0;
}

.actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.btn-primary {
  padding: 12px 24px;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
}

.btn-primary:hover {
  background-color: #5568d3;
}

.btn-secondary {
  padding: 12px 24px;
  background-color: #95a5a6;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

.btn-secondary:hover {
  background-color: #7f8c8d;
}

.btn-sync {
  padding: 12px 24px;
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
}

.btn-sync:hover {
  background-color: #229954;
}

.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filters input,
.filters select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  min-width: 150px;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  overflow-y: visible;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.data-table {
  width: 100%;
  min-width: 1200px;
  border-collapse: collapse;
  background: white;
}

.data-table thead {
  background-color: #2c3e50;
  color: white;
  position: sticky;
  top: 0;
  z-index: 10;
}

.data-table th {
  padding: 12px 10px;
  text-align: left;
  font-weight: 600;
  font-size: 0.9em;
  white-space: nowrap;
}

.data-table th:first-child {
  min-width: 50px;
  width: 50px;
}

.data-table th:nth-child(2) {
  min-width: 150px;
}

.data-table th:nth-child(3) {
  min-width: 120px;
}

.data-table th:nth-child(4) {
  min-width: 180px;
}

.data-table th:nth-child(5) {
  min-width: 110px;
}

.data-table th:nth-child(6) {
  min-width: 100px;
}

.data-table th:nth-child(7) {
  min-width: 160px;
}

.data-table th:nth-child(8) {
  min-width: 120px;
}

.data-table th:nth-child(9) {
  min-width: 150px;
}

.data-table td {
  padding: 10px;
  text-align: left;
  font-size: 0.9em;
  white-space: nowrap;
  vertical-align: middle;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.data-table tbody tr {
  border-bottom: 1px solid #eee;
}

.data-table tbody tr:hover {
  background-color: #f9f9f9;
}

.actions-cell {
  min-width: 120px;
  max-width: 150px;
}

.action-buttons {
  display: flex;
  gap: 5px;
  align-items: center;
  justify-content: flex-start;
  white-space: nowrap;
}

.btn-action {
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  min-width: 32px;
  height: 32px;
  color: white;
  transition: all 0.2s;
}

.btn-action .icon {
  font-size: 14px;
}

.btn-action .text {
  display: none;
}

.btn-action:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.btn-action:active {
  transform: translateY(0);
}

.btn-view {
  background-color: #3498db;
}

.btn-view:hover {
  background-color: #2980b9;
}

.btn-edit {
  background-color: #f39c12;
}

.btn-edit:hover {
  background-color: #e67e22;
}

.btn-delete {
  background-color: #e74c3c;
}

.btn-delete:hover {
  background-color: #c0392b;
}

.badge {
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
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

.helloasso-badge {
  margin-right: 5px;
}

.status-cell {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.status-select {
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.85em;
  background-color: white;
  cursor: pointer;
  min-width: 100px;
  max-width: 120px;
  white-space: nowrap;
}

.status-select:hover {
  border-color: #667eea;
}

.status-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.payment-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.85em;
  font-weight: 500;
  white-space: nowrap;
}

.payment-helloasso {
  background-color: #e3f2fd;
  color: #1976d2;
  border: 1px solid #90caf9;
}

.payment-especes {
  background-color: #fff3e0;
  color: #e65100;
  border: 1px solid #ffb74d;
}

.payment-cheque {
  background-color: #f3e5f5;
  color: #7b1fa2;
  border: 1px solid #ba68c8;
}

.payment-cb {
  background-color: #e8f5e9;
  color: #388e3c;
  border: 1px solid #81c784;
}

.payment-virement {
  background-color: #e0f2f1;
  color: #00796b;
  border: 1px solid #4db6ac;
}

.payment-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.85em;
  font-weight: 500;
  white-space: nowrap;
}

.payment-helloasso {
  background-color: #e3f2fd;
  color: #1976d2;
  border: 1px solid #90caf9;
}

.payment-especes {
  background-color: #fff3e0;
  color: #e65100;
  border: 1px solid #ffb74d;
}

.payment-cheque {
  background-color: #f3e5f5;
  color: #7b1fa2;
  border: 1px solid #ba68c8;
}

.payment-cb {
  background-color: #e8f5e9;
  color: #388e3c;
  border: 1px solid #81c784;
}

.payment-virement {
  background-color: #e0f2f1;
  color: #00796b;
  border: 1px solid #4db6ac;
}

.campaign-id {
  font-size: 11px;
  color: #666;
  margin-left: 5px;
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
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.large {
  max-width: 900px;
}

.form {
  margin-top: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  margin-bottom: 5px;
  font-weight: 500;
  color: #2c3e50;
}

.form-group input,
.form-group select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 30px;
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

.import-preview {
  margin: 20px 0;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 5px;
}

.duplicates-warning {
  margin-top: 10px;
  padding: 10px;
  background-color: #fff3cd;
  border-left: 4px solid #ffc107;
  border-radius: 5px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}

.adhesions-count {
  margin: 15px 0;
  padding: 10px;
  background-color: #e8f5e9;
  border-left: 4px solid #4caf50;
  border-radius: 4px;
  color: #2e7d32;
  font-size: 0.95em;
}

.adhesion-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.adhesion-thumbnail {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #ddd;
  flex-shrink: 0;
}

.no-photo-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  border: 1px solid #ddd;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin: 30px 0;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.pagination-btn {
  padding: 10px 20px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background-color: white;
  color: #2c3e50;
  cursor: pointer;
  font-size: 0.95em;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background-color: #3498db;
  color: white;
  border-color: #3498db;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 0.95em;
  color: #555;
  font-weight: 500;
}

.duplicates-info {
  margin-top: 8px;
  font-size: 0.9em;
  color: #856404;
}

.import-options {
  margin-top: 15px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 5px;
}

.import-option {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 0.95em;
}

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 10px;
}

.tab-button {
  padding: 12px 24px;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  color: #666;
  transition: all 0.3s ease;
  position: relative;
  bottom: -2px;
}

.tab-button:hover {
  color: #333;
  background: #f5f5f5;
  border-radius: 5px 5px 0 0;
}

.tab-button.active {
  color: #007bff;
  border-bottom-color: #007bff;
  font-weight: 600;
}

.tab-count {
  margin-left: 8px;
  padding: 2px 8px;
  background: #e0e0e0;
  border-radius: 12px;
  font-size: 14px;
  font-weight: normal;
}

.tab-button.active .tab-count {
  background: #007bff;
  color: white;
}

.preview-cell {
  min-width: 200px;
  max-width: 250px;
}

.carte-preview-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.carte-preview {
  border: 2px solid #007bff;
  border-radius: 8px;
  padding: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  position: relative;
  min-height: 80px;
}

.carte-preview-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.carte-photo {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid white;
}

.carte-info {
  flex: 1;
  min-width: 0;
}

.carte-nom {
  font-weight: 600;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.carte-numero {
  font-size: 10px;
  opacity: 0.9;
  margin-bottom: 4px;
}

.carte-statut-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
}

.carte-statut-badge.statut-generee {
  background: #28a745;
  color: white;
}

.carte-statut-badge.statut-a_generer {
  background: #ffc107;
  color: #000;
}

.carte-statut-badge.statut-a_remettre {
  background: #17a2b8;
  color: white;
}

.btn-preview-carte {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
  color: white;
}

.btn-preview-carte:hover {
  background: rgba(255, 255, 255, 0.3);
}

.carte-generate {
  display: flex;
  justify-content: center;
}

.btn-generate-carte {
  padding: 8px 16px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background 0.3s;
}

.btn-generate-carte:hover:not(:disabled) {
  background: #218838;
}

.btn-generate-carte:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.incomplete-badge {
  padding: 6px 12px;
  background: #ffc107;
  color: #000;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  text-align: center;
}

.preview-cell {
  min-width: 200px;
  max-width: 250px;
}

.carte-preview-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.carte-preview {
  border: 2px solid #007bff;
  border-radius: 8px;
  padding: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  position: relative;
  min-height: 80px;
}

.carte-preview-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.carte-photo {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid white;
}

.carte-info {
  flex: 1;
  min-width: 0;
}

.carte-nom {
  font-weight: 600;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.carte-numero {
  font-size: 10px;
  opacity: 0.9;
  margin-bottom: 4px;
}

.carte-statut-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
}

.carte-statut-badge.statut-generee {
  background: #28a745;
  color: white;
}

.carte-statut-badge.statut-a_generer {
  background: #ffc107;
  color: #000;
}

.carte-statut-badge.statut-a_remettre {
  background: #17a2b8;
  color: white;
}

.btn-preview-carte {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
  color: white;
}

.btn-preview-carte:hover {
  background: rgba(255, 255, 255, 0.3);
}

.carte-generate {
  display: flex;
  justify-content: center;
}

.btn-generate-carte {
  padding: 8px 16px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background 0.3s;
}

.btn-generate-carte:hover:not(:disabled) {
  background: #218838;
}

.btn-generate-carte:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.incomplete-badge {
  padding: 6px 12px;
  background: #ffc107;
  color: #000;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  text-align: center;
}

.import-option input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.photo-preview {
  position: relative;
  width: 150px;
  height: 150px;
  margin-bottom: 15px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #ddd;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}


.btn-remove-photo {
  position: absolute;
  top: 5px;
  right: 5px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
</style>
