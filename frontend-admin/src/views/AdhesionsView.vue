<template>
  <div class="page-container">
    <!-- Header avec actions principales -->
    <div class="page-header">
      <h1>Adhésions</h1>
      <div class="header-actions">
        <button 
          @click="refreshAdhesions" 
          class="action-btn-icon" 
          title="Actualiser"
          :disabled="loading"
        >
          <span class="material-symbols-outlined" :class="{ 'spinning': loading }">refresh</span>
        </button>
        <button 
          @click="showSyncModal = true" 
          class="action-btn-icon" 
          title="Synchroniser HelloAsso"
          :disabled="syncing"
        >
          <span class="material-symbols-outlined" :class="{ 'spinning': syncing }">sync</span>
        </button>
        <button 
          @click="showImportModal = true" 
          class="action-btn-icon" 
          title="Importer CSV"
          :disabled="importing"
        >
          <span class="material-symbols-outlined">upload</span>
        </button>
        <button 
          @click="exportCsv" 
          class="action-btn-icon" 
          title="Exporter CSV"
          :disabled="loading"
        >
          <span class="material-symbols-outlined">download</span>
        </button>
        <button 
          @click="openCreateModal" 
          class="action-btn-primary"
          title="Ajouter une nouvelle adhésion"
        >
          <span class="material-symbols-outlined">add</span>
          <span class="btn-text">Ajouter une adhésion</span>
        </button>
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


    <!-- Summary Bar -->
    <div class="summary-bar">
      <div class="summary-text">
        {{ filteredAdhesions.length }} adhésion{{ filteredAdhesions.length > 1 ? 's' : '' }}
        <span v-if="totalAdhesions > adhesions.length && !showAll" class="total-info">
          ({{ adhesions.length }} affichée{{ adhesions.length > 1 ? 's' : '' }} sur {{ totalAdhesions }})
        </span>
        - {{ formatAmount(totalAmount) }} €
      </div>
      <div class="summary-actions">
        <label class="toggle-all">
          <input 
            type="checkbox" 
            v-model="showAll"
            @change="handleShowAllChange"
          />
          <span>Afficher toutes les adhésions</span>
        </label>
        <div v-if="selectedAdhesions.length > 0" class="bulk-actions">
          <button @click="showBulkStatusModal = true" class="btn-action btn-action-secondary">
            <span class="material-symbols-outlined">edit</span>
            Actions
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Chargement des adhésions...</p>
    </div>

    <!-- Vue Tableau - Toutes les adhésions -->
    <div v-else-if="filteredAdhesions.length > 0" class="table-container">
      <table class="table-modern">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                @change="toggleSelectAll"
                :checked="selectedAdhesions.length === filteredAdhesions.length && filteredAdhesions.length > 0"
              />
            </th>
            <th>
              <div class="sortable-header" @click="toggleSort('photo_url')">
                État
                <span class="sort-icon">
                  <span class="material-symbols-outlined" :class="{ 'active': sortBy === 'photo_url' }">
                    {{ sortBy === 'photo_url' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'swap_vert' }}
                  </span>
                </span>
              </div>
            </th>
            <th>Photo</th>
            <th>
              <div class="sortable-header" @click="toggleSort('helloasso_id')">
                Référence
                <span class="sort-icon">
                  <span class="material-symbols-outlined" :class="{ 'active': sortBy === 'helloasso_id' }">
                    {{ sortBy === 'helloasso_id' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'swap_vert' }}
                  </span>
                </span>
              </div>
            </th>
            <th>
              <div class="sortable-header" @click="toggleSort('nom')">
                Nom
                <span class="sort-icon">
                  <span class="material-symbols-outlined" :class="{ 'active': sortBy === 'nom' }">
                    {{ sortBy === 'nom' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'swap_vert' }}
                  </span>
                </span>
              </div>
            </th>
            <th>
              <div class="sortable-header" @click="toggleSort('prenom')">
                Prénom
                <span class="sort-icon">
                  <span class="material-symbols-outlined" :class="{ 'active': sortBy === 'prenom' }">
                    {{ sortBy === 'prenom' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'swap_vert' }}
                  </span>
                </span>
              </div>
            </th>
            <th>
              <div class="sortable-header" @click="toggleSort('email')">
                Email
                <span class="sort-icon">
                  <span class="material-symbols-outlined" :class="{ 'active': sortBy === 'email' }">
                    {{ sortBy === 'email' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'swap_vert' }}
                  </span>
                </span>
              </div>
            </th>
            <th>
              <div class="sortable-header" @click="toggleSort('date_adhesion')">
                Date d'adhésion
                <span class="sort-icon">
                  <span class="material-symbols-outlined" :class="{ 'active': sortBy === 'date_adhesion' }">
                    {{ sortBy === 'date_adhesion' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'swap_vert' }}
                  </span>
                </span>
              </div>
            </th>
            <th>
              <div class="sortable-header" @click="toggleSort('tarif')">
                Montant
                <span class="sort-icon">
                  <span class="material-symbols-outlined" :class="{ 'active': sortBy === 'tarif' }">
                    {{ sortBy === 'tarif' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'swap_vert' }}
                  </span>
                </span>
              </div>
            </th>
            <th>
              <div class="sortable-header" @click="toggleSort('moyen_paiement')">
                Type de paiement
                <span class="sort-icon">
                  <span class="material-symbols-outlined" :class="{ 'active': sortBy === 'moyen_paiement' }">
                    {{ sortBy === 'moyen_paiement' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'swap_vert' }}
                  </span>
                </span>
              </div>
            </th>
            <th>
              <div class="sortable-header" @click="toggleSort('source')">
                Statut
                <span class="sort-icon">
                  <span class="material-symbols-outlined" :class="{ 'active': sortBy === 'source' }">
                    {{ sortBy === 'source' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'swap_vert' }}
                  </span>
                </span>
              </div>
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="adhesion in filteredAdhesions"
            :key="adhesion.id"
            :class="{ selected: selectedAdhesions.includes(adhesion.id) }"
          >
            <td>
              <input
                type="checkbox"
                :value="adhesion.id"
                v-model="selectedAdhesions"
              />
            </td>
            <td>
              <div class="etat-cell">
                <!-- Icône du statut -->
                <div class="statut-indicator" :class="`statut-${adhesion.statut || 'actif'}`" :title="formatStatut(adhesion.statut || 'actif')">
                  <span class="material-symbols-outlined">
                    {{ getStatutIcon(adhesion.statut || 'actif') }}
                  </span>
                </div>
              </div>
            </td>
            <td>
              <div class="photo-thumbnail">
                <img 
                  v-if="hasValidPhoto(adhesion.photo_url)" 
                  :src="getImageUrl(adhesion.photo_url)" 
                  :alt="`${adhesion.prenom} ${adhesion.nom}`"
                  @error="handleImageError"
                  @load="() => console.log('✅ Photo chargée pour:', adhesion.nom, adhesion.prenom, adhesion.photo_url)"
                  loading="lazy"
                />
                <div v-else class="photo-placeholder">
                  <span class="material-symbols-outlined">person</span>
                </div>
              </div>
            </td>
            <td>{{ adhesion.helloasso_id || adhesion.id }}</td>
            <td>{{ adhesion.nom || '-' }}</td>
            <td>{{ adhesion.prenom || '-' }}</td>
            <td>{{ adhesion.email || '-' }}</td>
            <td>{{ formatDate(adhesion.date_adhesion) }}</td>
            <td>{{ formatAmount(parseFloat(adhesion.tarif) || 0) }} €</td>
            <td>
              <span class="payment-type-badge" :class="`payment-${adhesion.moyen_paiement || 'default'}`">
                {{ formatPaymentType(adhesion.moyen_paiement) }}
              </span>
            </td>
            <td>
              <span class="source-badge" :class="`source-${adhesion.source || 'online'}`">
                {{ formatSource(adhesion.source) }}
              </span>
            </td>
            <td>
              <div class="actions-dropdown" @click.stop>
                <!-- Icône du statut actuel -->
                <div class="action-statut-indicator" :class="`statut-${adhesion.statut || 'actif'}`" :title="formatStatut(adhesion.statut || 'actif')">
                  <span class="material-symbols-outlined">
                    {{ getStatutIcon(adhesion.statut || 'actif') }}
                  </span>
                </div>
                <button 
                  class="actions-btn"
                  @click.stop="toggleActionsMenu(adhesion.id)"
                  type="button"
                >
                  <span class="material-symbols-outlined">more_vert</span>
                </button>
                <div 
                  v-if="openActionsMenu === adhesion.id"
                  class="actions-menu show"
                  @click.stop
                >
                  <a @click.stop="handleAction(adhesion, 'incomplet')" href="javascript:void(0)">
                    <span class="material-symbols-outlined">remove_circle</span> Incomplet
                  </a>
                  <a @click.stop="handleAction(adhesion, 'a_generer')" href="javascript:void(0)">
                    <span class="material-symbols-outlined">workspace_premium</span> À générer
                  </a>
                  <a @click.stop="handleAction(adhesion, 'delivree')" href="javascript:void(0)">
                    <span class="material-symbols-outlined">task_alt</span> Délivrée
                  </a>
                  <a @click.stop="handleAction(adhesion, 'suspendu')" href="javascript:void(0)">
                    <span class="material-symbols-outlined">hourglass_empty</span> En suspens
                  </a>
                  <a @click.stop="handleAction(adhesion, 'inactif')" href="javascript:void(0)">
                    <span class="material-symbols-outlined">do_not_disturb</span> Inactive
                  </a>
                  <a @click.stop="handleAction(adhesion, 'modifier')" href="javascript:void(0)">
                    <span class="material-symbols-outlined">edit</span> Modifier
                  </a>
                  <a @click.stop="handleAction(adhesion, 'voir')" href="javascript:void(0)">
                    <span class="material-symbols-outlined">visibility</span> Voir
                  </a>
                  <a @click.stop="handleAction(adhesion, 'supprimer')" class="danger" href="javascript:void(0)">
                    <span class="material-symbols-outlined">delete</span> Supprimer
                  </a>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- État vide -->
    <!-- Message vide -->
    <div v-else class="empty-state">
      <span class="material-symbols-outlined empty-icon">inbox</span>
      <h3>Aucune adhésion trouvée</h3>
      <div style="margin-top: 16px; padding: 16px; background: #f9fafb; border-radius: 8px; font-size: 13px; color: #6b7280; text-align: left; max-width: 500px;">
        <p><strong>Informations de débogage:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>Adhésions chargées depuis l'API: <strong>{{ adhesions.length }}</strong></li>
          <li>Adhésions après filtrage: <strong>{{ filteredAdhesions.length }}</strong></li>
          <li>Total adhésions (API): <strong>{{ totalAdhesions }}</strong></li>
          <li>Filtres actifs: <strong>{{ hasActiveFilters || filters.search ? 'Oui' : 'Non' }}</strong></li>
        </ul>
      </div>
      <div style="margin-top: 16px;">
        <p v-if="hasActiveFilters || filters.search" style="color: #dc2626; font-weight: 500;">
          ⚠️ Les filtres masquent toutes les adhésions. Réinitialisez les filtres.
        </p>
        <p v-else-if="adhesions.length > 0 && filteredAdhesions.length === 0" style="color: #dc2626; font-weight: 500;">
          ⚠️ Problème de filtrage : {{ adhesions.length }} adhésion(s) chargée(s) mais aucune ne passe les filtres.
        </p>
        <p v-else-if="totalAdhesions === 0" style="color: #6b7280;">
          Aucune adhésion dans la base de données. Importez un fichier CSV ou ajoutez une adhésion manuellement.
        </p>
        <p v-else style="color: #6b7280;">
          Vérifiez la console du navigateur (F12) pour plus de détails.
        </p>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && totalPages > 1 && !showAll" class="pagination">
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
                <div class="photo-preview" v-if="photoPreview || (formData.photo_url && !selectedPhotoFile)">
                  <img 
                    :src="photoPreview || getImageUrl(formData.photo_url)" 
                    alt="Photo de profil" 
                    class="preview-image"
                    @error="handlePreviewImageError"
                  />
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
    <div v-if="showImportModal" class="modal" @click.self="closeImportModal">
      <div class="modal-content">
        <h2>
          <span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 8px;">upload</span>
          Importer un fichier CSV
        </h2>
        <p class="modal-description">
          Sélectionnez un fichier CSV contenant les données d'adhésions à importer.
        </p>
        <div class="form-group full-width">
          <label>Fichier CSV *</label>
          <input 
            type="file" 
            @change="handleFileSelect" 
            accept=".csv" 
            :disabled="importing"
            class="file-input-large"
          />
          <p v-if="selectedFile" class="file-info">
            <span class="material-symbols-outlined">description</span>
            {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
          </p>
        </div>
        <div class="modal-actions">
          <button 
            @click="importCsv" 
            :disabled="!selectedFile || importing" 
            class="btn-primary"
          >
            <span v-if="importing" class="material-symbols-outlined spinning">hourglass_empty</span>
            <span v-else class="material-symbols-outlined">upload</span>
            {{ importing ? 'Import en cours...' : 'Importer' }}
          </button>
          <button 
            @click="closeImportModal" 
            :disabled="importing"
            class="btn-cancel"
          >
            Annuler
          </button>
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
import { ref, onMounted, computed } from 'vue';
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
// viewMode supprimé - on affiche tout dans un seul tableau
const totalAdhesions = ref(0);
const limitPerPage = ref(100); // Limite par page (modifiable)
const showAll = ref(false); // Option pour afficher toutes les adhésions
const generatingCarte = ref<number | null>(null);
const showFilters = ref(false);
const openActionsMenu = ref<number | null>(null); // ID de l'adhésion dont le menu est ouvert

// Tri des colonnes
const sortBy = ref<string | null>(null);
const sortOrder = ref<'asc' | 'desc'>('asc');

const syncForm = ref({
  campaignId: '',
});

const filters = ref({
  search: '',
  annee: '',
  statut: '',
  moyen_paiement: '',
  helloasso_campaign_id: '',
  source: '',
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
  { value: 'inactif', label: 'Inactif', icon: 'pause_circle' },
  { value: 'suspendu', label: 'Suspendu', icon: 'block' },
  { value: 'banni', label: 'Banni', icon: 'block' },
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

// Fonction pour appliquer tous les filtres
function applyAllFilters(adhesion: any): boolean {
  // Filtre de recherche
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase();
    const searchFields = [
      adhesion.nom || '',
      adhesion.prenom || '',
      adhesion.email || '',
      adhesion.helloasso_id || '',
      adhesion.telephone || ''
    ].map(f => f.toLowerCase());
    
    if (!searchFields.some(field => field.includes(search))) {
      return false;
    }
  }
  
  // Filtre par année
  if (filters.value.annee) {
    if (adhesion.date_adhesion) {
      const year = new Date(adhesion.date_adhesion).getFullYear();
      if (year.toString() !== filters.value.annee) {
        return false;
      }
    } else {
      return false;
    }
  }
  
  // Filtre par statut
  if (filters.value.statut) {
    if (adhesion.statut !== filters.value.statut) {
      return false;
    }
  }
  
  // Filtre par moyen de paiement
  if (filters.value.moyen_paiement) {
    if (adhesion.moyen_paiement !== filters.value.moyen_paiement) {
      return false;
    }
  }
  
  // Filtre par source
  if (filters.value.source) {
    if (adhesion.source !== filters.value.source) {
      return false;
    }
  }
  
  // Filtre par campagne Hello Asso
  if (filters.value.helloasso_campaign_id) {
    if (adhesion.helloasso_campaign_id !== filters.value.helloasso_campaign_id) {
      return false;
    }
  }
  
  return true;
}

// Computed
// Computed - Toutes les adhésions filtrées et triées
const filteredAdhesions = computed(() => {
  console.log('🔍 Calcul filteredAdhesions - adhesions.value:', adhesions.value?.length, 'filtres:', filters.value);
  
  if (!adhesions.value || !Array.isArray(adhesions.value)) {
    console.log('⚠️ adhesions.value n\'est pas un tableau valide');
    return [];
  }
  
  let filtered = adhesions.value.filter(adhesion => {
    const passes = applyAllFilters(adhesion);
    if (!passes) {
      console.log('❌ Adhésion filtrée:', adhesion.id, adhesion.nom, adhesion.prenom);
    }
    return passes;
  });
  
  // Appliquer le tri si une colonne est sélectionnée
  if (sortBy.value) {
    filtered = [...filtered].sort((a, b) => {
      let aValue: any = a[sortBy.value!];
      let bValue: any = b[sortBy.value!];
      
      // Gérer les valeurs nulles/undefined
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';
      
      // Gérer les dates
      if (sortBy.value === 'date_adhesion') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }
      
      // Gérer les nombres
      if (sortBy.value === 'tarif') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }
      
      // Gérer les chaînes de caractères
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
      }
      if (typeof bValue === 'string') {
        bValue = bValue.toLowerCase();
      }
      
      // Comparaison
      if (aValue < bValue) return sortOrder.value === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder.value === 'asc' ? 1 : -1;
      return 0;
    });
  }
  
  console.log('✅ filteredAdhesions:', filtered.length, 'sur', adhesions.value.length, 'tri:', sortBy.value, sortOrder.value);
  return filtered;
});

// adhesionsByYear supprimé - plus utilisé


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

const totalAmount = computed(() => {
  return adhesions.value.reduce((sum, a) => sum + (parseFloat(a.tarif) || 0), 0);
});

// Fonctions
function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
function hasValidPhoto(photoUrl: string | null | undefined): boolean {
  if (!photoUrl) return false;
  if (photoUrl === 'null') return false;
  if (typeof photoUrl !== 'string') return false;
  if (photoUrl.trim() === '') return false;
  return true;
}

function getImageUrl(photoUrl: string | null | undefined): string {
  if (!hasValidPhoto(photoUrl)) {
    console.warn('⚠️ Photo URL invalide:', photoUrl);
    return '';
  }
  
  const url = photoUrl!.trim();
  
  // URLs locales (uploads)
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const finalUrl = url.startsWith('/uploads/') ? `${apiUrl}${url}` : `${apiUrl}/${url}`;
    console.log('📸 URL locale:', finalUrl);
    return finalUrl;
  }
  
  // Data URLs et Blob URLs
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    console.log('📸 Data/Blob URL détectée');
    return url;
  }
  
  // URLs externes (Hello Asso, etc.) - utiliser le proxy pour éviter CORS
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const encodedUrl = encodeURIComponent(url);
    const finalUrl = `${apiUrl}/api/images/proxy?url=${encodedUrl}`;
    console.log('📸 URL externe (proxy):', url.substring(0, 50) + '...');
    return finalUrl;
  }
  
  console.warn('⚠️ Format URL non reconnu:', url);
  return url;
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  console.warn('❌ Erreur chargement image miniature:', img.src);
  // Cacher l'image et afficher le placeholder
  const thumbnail = img.closest('.photo-thumbnail');
  if (thumbnail) {
    img.style.display = 'none';
    // S'assurer que le placeholder est visible
    const placeholder = thumbnail.querySelector('.photo-placeholder') as HTMLElement;
    if (placeholder) {
      placeholder.style.display = 'flex';
    }
  }
}

function handlePreviewImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  console.warn('⚠️ Erreur chargement image preview:', img.src);
  img.style.display = 'none';
}

function formatDate(date: string) {
  if (!date) return 'Date invalide';
  try {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return 'Date invalide';
  }
}

function formatPaymentType(moyen: string | null | undefined): string {
  if (!moyen) return '-';
  const types: Record<string, string> = {
    especes: 'Espèces',
    cb: 'Carte',
    cheque: 'Chèque',
    virement: 'Virement',
    helloasso: 'Hello Asso',
  };
  return types[moyen] || moyen;
}

function formatSource(source: string | null | undefined): string {
  if (!source) return 'Hello Asso';
  if (source === 'online') return 'En-ligne';
  if (source === 'offline') return 'Hors ligne';
  return 'Hello Asso';
}

async function handleAction(adhesion: any, action: string) {
  console.log('🔵 Action déclenchée:', action, 'pour adhésion:', adhesion.id);
  
  // Fermer le menu d'actions
  openActionsMenu.value = null;
  
  try {
    switch (action) {
      case 'incomplet':
        // Marquer comme incomplet
        console.log('📝 Mise à jour statut: inactif');
        try {
          const response = await adhesionsApi.update(adhesion.id, { statut: 'inactif' });
          // Mettre à jour localement l'adhésion dans le tableau
          const index = adhesions.value.findIndex((a: any) => a.id === adhesion.id);
          if (index !== -1 && response.data?.data) {
            adhesions.value[index] = { ...adhesions.value[index], ...response.data.data };
          }
          alert('Adhésion marquée comme incomplète');
        } catch (error: any) {
          console.error('❌ Erreur mise à jour statut incomplet:', error);
          alert(error.response?.data?.error || error.message || 'Erreur lors de la mise à jour');
        }
        break;
      case 'a_generer':
        // Générer une carte
        console.log('🎴 Génération carte pour adhésion:', adhesion.id);
        try {
          await cartesApi.generate(adhesion.id);
          alert('Carte générée avec succès !');
          await loadAdhesions(currentPage.value);
        } catch (error: any) {
          console.error('❌ Erreur génération carte:', error);
          const errorMsg = error.response?.data?.error || error.message || 'Erreur lors de la génération de la carte';
          console.error('Détails erreur:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            method: error.config?.method
          });
          alert(errorMsg);
        }
        break;
      case 'delivree':
        // Marquer comme délivrée
        console.log('✅ Marquage carte comme délivrée');
        try {
          const cartesResponse = await cartesApi.list({ adhesion_id: adhesion.id });
          console.log('📋 Cartes trouvées:', cartesResponse.data);
          const cartes = cartesResponse.data.data || cartesResponse.data || [];
          if (cartes.length > 0) {
            console.log('📤 Marquage carte ID:', cartes[0].id);
            await cartesApi.markAsDelivered(cartes[0].id);
            alert('Carte marquée comme délivrée');
            await loadAdhesions(currentPage.value);
          } else {
            alert('Aucune carte trouvée pour cette adhésion');
          }
        } catch (error: any) {
          console.error('❌ Erreur marquage délivrée:', error);
          const errorMsg = error.response?.data?.error || error.message || 'Erreur lors de la mise à jour';
          console.error('Détails erreur:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            method: error.config?.method
          });
          alert(errorMsg);
        }
        break;
      case 'suspendu':
        console.log('⏸️ Mise à jour statut: suspendu');
        try {
          const response = await adhesionsApi.update(adhesion.id, { statut: 'suspendu' });
          // Mettre à jour localement l'adhésion dans le tableau
          const index = adhesions.value.findIndex((a: any) => a.id === adhesion.id);
          if (index !== -1 && response.data?.data) {
            adhesions.value[index] = { ...adhesions.value[index], ...response.data.data };
          }
          alert('Adhésion suspendue');
        } catch (error: any) {
          console.error('❌ Erreur mise à jour statut suspendu:', error);
          const errorMsg = error.response?.data?.error || error.message || 'Erreur lors de la mise à jour du statut';
          console.error('Détails erreur:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            method: error.config?.method,
            data: error.response?.data
          });
          alert(errorMsg);
        }
        break;
      case 'inactif':
        console.log('⏸️ Mise à jour statut: inactif');
        try {
          const response = await adhesionsApi.update(adhesion.id, { statut: 'inactif' });
          // Mettre à jour localement l'adhésion dans le tableau
          const index = adhesions.value.findIndex((a: any) => a.id === adhesion.id);
          if (index !== -1 && response.data?.data) {
            adhesions.value[index] = { ...adhesions.value[index], ...response.data.data };
          }
          alert('Adhésion marquée comme inactive');
        } catch (error: any) {
          console.error('❌ Erreur mise à jour statut inactif:', error);
          const errorMsg = error.response?.data?.error || error.message || 'Erreur lors de la mise à jour du statut';
          console.error('Détails erreur:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            method: error.config?.method,
            data: error.response?.data
          });
          alert(errorMsg);
        }
        break;
      case 'modifier':
        console.log('✏️ Ouverture formulaire modification');
        editingAdhesion.value = adhesion;
        formData.value = {
          nom: adhesion.nom || '',
          prenom: adhesion.prenom || '',
          email: adhesion.email || '',
          telephone: adhesion.telephone || '',
          date_adhesion: adhesion.date_adhesion ? new Date(adhesion.date_adhesion).toISOString().split('T')[0] : '',
          tarif: adhesion.tarif || 0,
          moyen_paiement: adhesion.moyen_paiement || 'helloasso',
          statut: adhesion.statut || 'actif',
          helloasso_id: adhesion.helloasso_id || '',
          helloasso_campaign_id: adhesion.helloasso_campaign_id || '',
          photo_url: adhesion.photo_url || '',
        };
        // Réinitialiser les champs photo
        selectedPhotoFile.value = null;
        photoUrlInput.value = adhesion.photo_url || '';
        // Afficher la photo existante si disponible
        if (adhesion.photo_url) {
          photoPreview.value = getImageUrl(adhesion.photo_url);
        } else {
          photoPreview.value = null;
        }
        showFormModal.value = true;
        break;
      case 'voir':
        // Naviguer vers la page de détail
        console.log('👁️ Navigation vers détail adhésion:', adhesion.id);
        const detailPath = `/app/adhesions/${adhesion.id}`;
        console.log('📍 Chemin:', detailPath);
        router.push(detailPath).catch((err) => {
          console.error('❌ Erreur navigation:', err);
          alert('Erreur lors de la navigation vers la page de détail');
        });
        break;
      case 'supprimer':
        if (confirm(`Êtes-vous sûr de vouloir supprimer l'adhésion de ${adhesion.prenom} ${adhesion.nom} ?`)) {
          console.log('🗑️ Suppression adhésion:', adhesion.id);
          try {
            await adhesionsApi.delete(adhesion.id);
            alert('Adhésion supprimée avec succès');
            await loadAdhesions(currentPage.value);
          } catch (error: any) {
            console.error('❌ Erreur suppression:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Erreur lors de la suppression';
            console.error('Détails erreur:', {
              status: error.response?.status,
              statusText: error.response?.statusText,
              url: error.config?.url,
              method: error.config?.method
            });
            alert(errorMsg);
          }
        }
        break;
      default:
        console.warn('⚠️ Action non reconnue:', action);
        alert(`Action "${action}" non reconnue`);
    }
  } catch (error: any) {
    console.error('❌ Erreur dans handleAction:', error);
    const errorMsg = error.response?.data?.error || error.message || 'Une erreur est survenue';
    console.error('Détails erreur:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method,
      action
    });
    alert(errorMsg);
  }
}

function getStatusIconClass(statut: string | null | undefined): string {
  if (!statut) return 'status-default';
  const classes: Record<string, string> = {
    actif: 'status-success',
    expire: 'status-warning',
    renouvele: 'status-info',
    a_generer: 'status-warning',
  };
  return classes[statut] || 'status-default';
}

function getStatusIcon(statut: string | null | undefined): string {
  if (!statut) return 'help';
  const icons: Record<string, string> = {
    actif: 'check_circle',
    inactif: 'pause_circle',
    suspendu: 'block',
    banni: 'block',
    expire: 'cancel',
    renouvele: 'refresh',
    a_generer: 'pending',
  };
  return icons[statut] || 'help';
}

function toggleSelectAll(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.checked) {
    selectedAdhesions.value = filteredAdhesions.value.map(a => a.id);
  } else {
    selectedAdhesions.value = [];
  }
}

function toggleActionsMenu(adhesionId: number) {
  console.log('🔘 Toggle menu pour adhésion:', adhesionId, 'Menu actuel:', openActionsMenu.value);
  if (openActionsMenu.value === adhesionId) {
    openActionsMenu.value = null;
    console.log('❌ Menu fermé');
  } else {
    openActionsMenu.value = adhesionId;
    console.log('✅ Menu ouvert pour:', adhesionId);
  }
}

function toggleSort(column: string) {
  if (sortBy.value === column) {
    // Si on clique sur la même colonne, inverser l'ordre
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    // Sinon, trier par cette colonne en ordre croissant
    sortBy.value = column;
    sortOrder.value = 'asc';
  }
  console.log('🔄 Tri:', column, sortOrder.value);
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
    inactif: 'Inactif',
    suspendu: 'Suspendu',
    banni: 'Banni',
    expire: 'Expiré',
    renouvele: 'Renouvelé',
    a_generer: 'À générer',
  };
  return statuts[statut] || statut;
}

function getStatutIcon(statut: string): string {
  const icons: Record<string, string> = {
    actif: 'check_circle',
    inactif: 'pause_circle',
    suspendu: 'block',
    banni: 'block',
    expire: 'cancel',
    renouvele: 'refresh',
    a_generer: 'pending',
  };
  return icons[statut] || 'help';
}

function isAdhesionComplete(adhesion: any): boolean {
  // Vérifier que tous les champs requis sont présents et non vides
  const hasPhoto = !!(adhesion.photo_url && adhesion.photo_url.trim() !== '' && adhesion.photo_url !== 'null');
  const hasHelloAssoRef = !!(adhesion.helloasso_id && adhesion.helloasso_id.toString().trim() !== '');
  const hasNom = !!(adhesion.nom && adhesion.nom.trim() !== '');
  const hasPrenom = !!(adhesion.prenom && adhesion.prenom.trim() !== '');
  const hasDateAdhesion = !!(adhesion.date_adhesion);
  const hasMontant = !!(adhesion.tarif && parseFloat(adhesion.tarif) > 0);
  const hasTypePaiement = !!(adhesion.moyen_paiement && adhesion.moyen_paiement.trim() !== '');
  const hasStatut = !!(adhesion.statut && adhesion.statut.trim() !== '');
  
  return hasPhoto && hasHelloAssoRef && hasNom && hasPrenom && hasDateAdhesion && hasMontant && hasTypePaiement && hasStatut;
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
  if (loading.value || isLoading) {
    console.log('⏳ Application des filtres ignorée, chargement en cours');
    return;
  }
  loadAdhesions(1);
}

function clearSearch() {
  filters.value.search = '';
  applyFilters();
}

let searchTimeout: NodeJS.Timeout;
const isSearching = ref(false);

function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    if (!isSearching.value && !loading.value && !isLoading) {
      isSearching.value = true;
      applyFilters();
      isSearching.value = false;
    }
  }, 800); // Augmenté à 800ms pour réduire les requêtes
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

let isLoading = false; // Flag pour éviter les appels multiples

async function loadAdhesions(page: number = 1) {
  // Protection contre les appels multiples
  if (loading.value || isLoading) {
    console.log('⏳ Chargement déjà en cours, ignoré', {
      loading: loading.value,
      isLoading,
      page,
      stack: new Error().stack
    });
    return;
  }
  
  isLoading = true;
  loading.value = true;
  currentPage.value = page;
  
  try {
    const params: any = {
      limit: showAll.value ? '1000' : limitPerPage.value.toString(), // Limité à 1000 max pour éviter les erreurs 429
      page: showAll.value ? '1' : page.toString(), // Toujours page 1 si on charge tout
    };
    if (filters.value.search) params.search = filters.value.search;
    if (filters.value.annee) params.annee = filters.value.annee;
    if (filters.value.statut) params.statut = filters.value.statut;
    if (filters.value.moyen_paiement) params.moyen_paiement = filters.value.moyen_paiement;
    if (filters.value.source) params.source = filters.value.source;
    if (filters.value.helloasso_campaign_id) params.helloasso_campaign_id = filters.value.helloasso_campaign_id;

    console.log('📡 Chargement des adhésions avec params:', params, 'page:', page);
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
    console.log('📋 Première adhésion (exemple):', adhesions.value[0]);
    
    const pagination = response.data?.pagination || {};
    totalAdhesions.value = pagination.total || adhesions.value.length;
    console.log('📊 Total adhésions:', totalAdhesions.value);
    
    // Si on affiche tout, pas de pagination
    if (showAll.value) {
      totalPages.value = 1;
    } else {
      totalPages.value = Math.ceil(totalAdhesions.value / limitPerPage.value);
    }
    
    console.log(`✅ ${adhesions.value.length} adhésion(s) chargée(s) sur ${totalAdhesions.value} total`);
  } catch (error: any) {
    console.error('❌ Erreur lors du chargement des adhésions:', error);
    
    // Gérer spécifiquement les erreurs 429
    if (error.response?.status === 429) {
      alert('Trop de requêtes. Veuillez patienter quelques instants avant de réessayer.');
    }
    
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
    isLoading = false;
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
  
  // Réinitialiser l'input file
  setTimeout(() => {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, 100);
  
  showFormModal.value = true;
}

function closeFormModal() {
  showFormModal.value = false;
  editingAdhesion.value = null;
  // Réinitialiser les champs photo
  photoPreview.value = null;
  photoUrlInput.value = '';
  selectedPhotoFile.value = null;
  formData.value.photo_url = '';
  
  // Réinitialiser l'input file
  setTimeout(() => {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, 100);
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
    
    // Ajouter tous les champs sauf photo_url si on a un fichier
    Object.keys(formData.value).forEach(key => {
      const value = (formData.value as any)[key];
      // Ne pas envoyer photo_url si on a un fichier à uploader
      if (key === 'photo_url' && selectedPhotoFile.value) {
        return; // Skip photo_url si on upload un fichier
      }
      // Envoyer photo_url seulement si c'est une URL (pas de fichier)
      if (key === 'photo_url' && !selectedPhotoFile.value && value) {
        formDataToSend.append(key, value);
        return;
      }
      // Envoyer tous les autres champs
      if (key !== 'photo_url') {
        if (value !== null && value !== undefined) {
          formDataToSend.append(key, value.toString());
        }
      }
    });
    
    // Ajouter le fichier photo si présent
    if (selectedPhotoFile.value) {
      formDataToSend.append('photo', selectedPhotoFile.value);
    } else if (photoUrlInput.value && !selectedPhotoFile.value) {
      // Si on a une URL mais pas de fichier, envoyer l'URL
      formDataToSend.append('photo_url', photoUrlInput.value);
    }

    console.log('💾 Sauvegarde adhésion:', {
      editing: !!editingAdhesion.value,
      hasFile: !!selectedPhotoFile.value,
      hasUrl: !!photoUrlInput.value
    });

    if (editingAdhesion.value) {
      await adhesionsApi.update(editingAdhesion.value.id, formDataToSend);
      alert('Adhésion modifiée avec succès !');
    } else {
      await adhesionsApi.create(formDataToSend);
      alert('Adhésion créée avec succès !');
    }
    
    closeFormModal();
    // Recharger les données pour voir les changements
    await loadAdhesions(currentPage.value);
  } catch (error: any) {
    console.error('❌ Erreur lors de la sauvegarde:', error);
    const errorMsg = error.response?.data?.error || error.message || 'Erreur lors de la sauvegarde';
    alert(errorMsg);
  } finally {
    saving.value = false;
  }
}

async function editAdhesionStatus(adhesion: any, newStatus: string) {
  if (!confirm(`Confirmer le changement de statut pour ${adhesion.prenom} ${adhesion.nom} à "${formatStatut(newStatus)}" ?`)) {
    return;
  }
  try {
    await adhesionsApi.update(adhesion.id, { statut: newStatus });
    alert('Statut mis à jour avec succès !');
    await loadAdhesions(currentPage.value); // Recharger la page actuelle
  } catch (error: any) {
    alert(error.response?.data?.error || 'Erreur lors de la mise à jour du statut');
  }
}

function handlePhotoFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    
    // Vérifier la taille du fichier (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Le fichier est trop volumineux. Taille maximale : 10MB');
      input.value = '';
      return;
    }
    
    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image');
      input.value = '';
      return;
    }
    
    selectedPhotoFile.value = file;
    // Réinitialiser l'URL si on sélectionne un fichier
    photoUrlInput.value = '';
    formData.value.photo_url = '';
    
    // Afficher la prévisualisation
    const reader = new FileReader();
    reader.onload = (e) => {
      photoPreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
    
    console.log('📷 Fichier sélectionné:', file.name, file.size, 'bytes');
  }
}

function updatePhotoFromUrl() {
  if (photoUrlInput.value && photoUrlInput.value.trim() !== '') {
    // Réinitialiser le fichier si on utilise une URL
    selectedPhotoFile.value = null;
    formData.value.photo_url = photoUrlInput.value.trim();
    photoPreview.value = photoUrlInput.value.trim();
    console.log('🔗 URL photo mise à jour:', photoUrlInput.value);
  } else {
    // Si l'URL est vide, réinitialiser
    if (!selectedPhotoFile.value) {
      photoPreview.value = null;
      formData.value.photo_url = '';
    }
  }
}

function clearPhoto() {
  photoPreview.value = null;
  photoUrlInput.value = '';
  selectedPhotoFile.value = null;
  formData.value.photo_url = '';
  
  // Réinitialiser aussi l'input file
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  if (fileInput) {
    fileInput.value = '';
  }
  
  console.log('🗑️ Photo supprimée');
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
  if (syncing.value) {
    if (!confirm('La synchronisation est en cours. Voulez-vous vraiment fermer ?')) {
      return;
    }
  }
  showSyncModal.value = false;
  syncForm.value = { campaignId: '' };
}

async function syncHelloAsso() {
  if (!syncForm.value.campaignId || syncForm.value.campaignId.trim() === '') {
    alert('Veuillez saisir l\'ID de la campagne HelloAsso');
    return;
  }
  
  syncing.value = true;
  try {
    console.log('🔄 Synchronisation HelloAsso avec campagne:', syncForm.value.campaignId);
    const response = await adhesionsApi.syncHelloAsso(syncForm.value);
    const stats = response.data?.stats || response.data || {};
    const created = stats.created || 0;
    const updated = stats.updated || 0;
    
    alert(`Synchronisation terminée !\n\n✅ Créées: ${created}\n🔄 Mises à jour: ${updated}`);
    closeSyncModal();
    await loadAdhesions(1);
  } catch (error: any) {
    console.error('❌ Erreur lors de la synchronisation:', error);
    const errorMsg = error.response?.data?.error || error.message || 'Erreur lors de la synchronisation';
    alert(errorMsg);
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
  if (!selectedFile.value) {
    alert('Veuillez sélectionner un fichier CSV');
    return;
  }
  
  importing.value = true;
  try {
    console.log('📤 Import CSV:', selectedFile.value.name, selectedFile.value.size, 'bytes');
    const formData = new FormData();
    formData.append('csv', selectedFile.value);
    
    const response = await adhesionsApi.importCsv(formData);
    console.log('✅ Réponse import:', response.data);
    
    // Si l'import nécessite une validation
    if (response.data?.importId) {
      console.log('📋 Validation de l\'import:', response.data.importId);
      await adhesionsApi.validateImport(response.data.importId, {
        records: response.data.records || [],
        duplicateActions: {},
        forceUpdate: true
      });
    }
    
    const importedCount = response.data?.imported || response.data?.records?.length || 0;
    alert(`Import terminé avec succès !\n\n✅ ${importedCount} adhésion(s) importée(s)`);
    
    closeImportModal();
    await loadAdhesions(1);
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'import:', error);
    const errorMsg = error.response?.data?.error || error.userMessage || error.message || 'Erreur lors de l\'import';
    alert(errorMsg);
  } finally {
    importing.value = false;
  }
}

async function exportCsv() {
  try {
    console.log('📥 Export CSV avec filtres:', filters.value);
    const params: any = {};
    if (filters.value.annee) params.annee = filters.value.annee;
    if (filters.value.statut) params.statut = filters.value.statut;
    if (filters.value.moyen_paiement) params.moyen_paiement = filters.value.moyen_paiement;
    if (filters.value.source) params.source = filters.value.source;
    if (filters.value.search) params.search = filters.value.search;
    if (filters.value.helloasso_campaign_id) params.helloasso_campaign_id = filters.value.helloasso_campaign_id;

    const response = await adhesionsApi.exportCsv(params);
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Nom du fichier avec date et filtres
    const dateStr = new Date().toISOString().split('T')[0];
    const filterStr = Object.keys(params).length > 0 ? '_filtres' : '';
    a.download = `adhesions_${dateStr}${filterStr}.csv`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    console.log('✅ Export CSV réussi');
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'export:', error);
    const errorMsg = error.response?.data?.error || error.message || 'Erreur lors de l\'export';
    alert(errorMsg);
  }
}

function refreshAdhesions() {
  if (loading.value || isLoading) {
    console.log('⏳ Actualisation ignorée, chargement en cours');
    return;
  }
  console.log('🔄 Actualisation des adhésions');
  loadAdhesions(currentPage.value);
}

function handleShowAllChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const newValue = target.checked;
  
  if (loading.value || isLoading) {
    // Annuler le changement si un chargement est en cours
    target.checked = !newValue;
    showAll.value = !newValue;
    console.log('⏳ Changement de mode ignoré, chargement en cours');
    return;
  }
  
  showAll.value = newValue;
  console.log('🔄 Changement mode affichage:', newValue ? 'Tout' : 'Paginé');
  
  // Utiliser nextTick pour s'assurer que le changement est bien appliqué
  setTimeout(() => {
    if (!loading.value && !isLoading) {
      loadAdhesions(1);
    }
  }, 100);
}

function closeImportModal() {
  if (importing.value) {
    if (!confirm('L\'import est en cours. Voulez-vous vraiment fermer ?')) {
      return;
    }
  }
  showImportModal.value = false;
  selectedFile.value = null;
  
  // Réinitialiser l'input file
  setTimeout(() => {
    const fileInput = document.querySelector('input[type="file"][accept=".csv"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, 100);
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

onMounted(async () => {
  await loadAvailableYears();
  await loadAdhesions(1);
  
  // Fermer le menu d'actions quand on clique ailleurs
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const isInActionsDropdown = target.closest('.actions-dropdown');
    const isInActionsMenu = target.closest('.actions-menu');
    
    if (!isInActionsDropdown && !isInActionsMenu) {
      console.log('🔄 Fermeture du menu (clic extérieur)');
      openActionsMenu.value = null;
    }
  });
});
</script>

<style scoped>
.page-container {
  width: 100%;
  padding: var(--spacing-xl);
  margin: 0;
  overflow-x: hidden;
}

.adhesions-modern {
  width: 100%;
  max-width: 100%;
  padding: 0;
  overflow-x: hidden;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 24px 32px;
  border-radius: 16px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f0f0;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
  letter-spacing: -0.3px;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.action-btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1.5px solid #e5e7eb;
  background: white;
  color: var(--primary);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.action-btn-icon::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(102, 126, 234, 0.1);
  transform: translate(-50%, -50%);
  transition: width 0.3s, height 0.3s;
}

.action-btn-icon:hover::before {
  width: 100%;
  height: 100%;
}

.action-btn-icon:hover {
  border-color: var(--primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.action-btn-icon:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.1);
}

.action-btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.action-btn-icon:disabled:hover {
  border-color: #e5e7eb;
  box-shadow: none;
}

.action-btn-icon .material-symbols-outlined {
  font-size: 22px;
  position: relative;
  z-index: 1;
}

/* Boutons styles maintenant dans buttons.css global */

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
  border-color: var(--primary);
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
  border-color: var(--primary);
  color: var(--primary);
}

.filter-badge {
  background: var(--primary);
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
  gap: var(--spacing-lg);
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
  background: var(--primary);
  color: white;
  border-color: var(--primary);
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
  color: var(--primary);
}

.stat-label {
  font-size: 12px;
  color: #7f8c8d;
  text-transform: uppercase;
}

.summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: white;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.summary-text {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.total-info {
  color: #6b7280;
  font-size: 13px;
  margin-left: 8px;
}

.summary-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.toggle-all {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
  user-select: none;
}

.toggle-all input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary);
}

.toggle-all:hover {
  color: var(--primary);
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
  color: var(--primary);
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
  gap: var(--spacing-lg);
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
  border-color: var(--primary);
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
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.carte-delivree-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #059669;
  background: #d1fae5;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  margin-left: 4px;
}

.carte-delivree-badge .material-symbols-outlined {
  font-size: 16px;
  font-weight: 600;
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
  color: var(--primary);
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
  color: var(--primary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action:hover {
  background: #f5f7fa;
  border-color: var(--primary);
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
  gap: var(--spacing-lg);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.spinning {
  animation: spin 1s linear infinite;
}

.file-input-large {
  width: 100%;
  padding: 12px;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  background: #f9fafb;
  cursor: pointer;
  transition: all 0.2s;
}

.file-input-large:hover {
  border-color: var(--primary);
  background: #f3f4f6;
}

.file-input-large:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.file-info {
  margin-top: 8px;
  padding: 8px 12px;
  background: #eff6ff;
  border-radius: 6px;
  color: #1e40af;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.file-info .material-symbols-outlined {
  font-size: 20px;
}

.modal-description {
  color: #6b7280;
  margin-bottom: 20px;
  font-size: 14px;
  line-height: 1.5;
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
  border-color: var(--primary);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 14px;
  color: #7f8c8d;
}

/* Table View */
.table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  overflow: hidden;
  width: 100%;
  max-width: 100%;
}

.table-modern {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  table-layout: fixed;
}

.table-modern thead {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: white;
}

.table-modern thead th {
  padding: 12px 8px;
  text-align: left;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  color: white;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  text-overflow: ellipsis;
}

.sortable-header {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
}

.sortable-header:hover {
  opacity: 0.9;
  transform: translateX(2px);
}

.sort-icon {
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  opacity: 0.7;
  transition: all 0.2s;
}

.sortable-header:hover .sort-icon {
  opacity: 1;
}

.sort-icon .material-symbols-outlined {
  font-size: 18px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  transition: all 0.2s;
}

.sort-icon .material-symbols-outlined.active {
  color: white;
  opacity: 1;
  font-weight: 700;
}

.sortable-header:hover .sort-icon .material-symbols-outlined {
  color: white;
  opacity: 1;
}

.table-modern thead th:first-child {
  padding-left: 12px;
  width: 50px;
  min-width: 50px;
}

.table-modern thead th:nth-child(2) {
  width: 70px;
  min-width: 70px;
}

.table-modern thead th:nth-child(3) {
  width: 80px;
  min-width: 80px;
}

.table-modern thead th:nth-child(4) {
  width: 130px;
  min-width: 130px;
}

.table-modern thead th:nth-child(5) {
  width: 130px;
  min-width: 130px;
}

.table-modern thead th:nth-child(6) {
  width: 150px;
  min-width: 150px;
}

.table-modern thead th:nth-child(7) {
  width: 120px;
  min-width: 120px;
}

.table-modern thead th:nth-child(8) {
  width: 100px;
  min-width: 100px;
}

.table-modern thead th:nth-child(9) {
  width: 130px;
  min-width: 130px;
}

.table-modern thead th:nth-child(10) {
  width: 120px;
  min-width: 120px;
}

.table-modern thead th:nth-child(11) {
  width: 120px;
  min-width: 120px;
}

.table-modern thead th:last-child {
  padding-right: 12px;
  width: 120px;
  min-width: 120px;
}

.table-modern tbody tr {
  border-bottom: 1px solid #f3f4f6;
  transition: all 0.2s;
}

.table-modern tbody tr:hover {
  background: #f9fafb;
}

.table-modern tbody tr.selected {
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
}

.table-modern tbody td {
  padding: 12px 8px;
  vertical-align: middle;
  color: #374151;
  font-size: 13px;
  border-bottom: 1px solid #f3f4f6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Alignement des cellules avec les colonnes */
.table-modern tbody td:first-child {
  padding-left: 12px;
  width: 50px;
  min-width: 50px;
}

.table-modern tbody td:nth-child(2) {
  width: 70px;
  min-width: 70px;
}

.table-modern tbody td:nth-child(3) {
  width: 80px;
  min-width: 80px;
}

.table-modern tbody td:nth-child(4) {
  width: 130px;
  min-width: 130px;
}

.table-modern tbody td:nth-child(5) {
  width: 130px;
  min-width: 130px;
}

.table-modern tbody td:nth-child(6) {
  width: 150px;
  min-width: 150px;
}

.table-modern tbody td:nth-child(7) {
  width: 120px;
  min-width: 120px;
}

.table-modern tbody td:nth-child(8) {
  width: 100px;
  min-width: 100px;
}

.table-modern tbody td:nth-child(9) {
  width: 130px;
  min-width: 130px;
}

.table-modern tbody td:nth-child(10) {
  width: 120px;
  min-width: 120px;
}

.table-modern tbody td:nth-child(11) {
  width: 120px;
  min-width: 120px;
}

.table-modern tbody td:last-child {
  padding-right: 12px;
  overflow: visible;
  position: relative;
  width: 120px;
  min-width: 120px;
}

.table-modern tbody tr:last-child {
  border-bottom: none;
}

.status-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.status-icon.status-success {
  color: #10b981;
}

.status-icon.status-warning {
  color: #f59e0b;
}

.status-icon.status-info {
  color: #3b82f6;
}

.status-icon.status-default {
  color: #94a3b8;
}

/* Status Dropdown */
.status-dropdown {
  position: relative;
  display: inline-block;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.status-badge:hover {
  opacity: 0.8;
}

.status-badge .material-symbols-outlined {
  font-size: 16px;
}

.status-badge.status-actif {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.status-inactif {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.status-suspendu {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.status-banni {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.status-expire {
  background: #f3f4f6;
  color: #374151;
}

.status-badge.status-renouvele {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.status-a_generer {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.status-default {
  background: #f3f4f6;
  color: #6b7280;
}

.dropdown-content {
  display: none;
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 4px;
  background: white;
  min-width: 180px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  z-index: 1000;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.status-dropdown:hover .dropdown-content {
  display: block;
}

.dropdown-content a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  color: #374151;
  text-decoration: none;
  font-size: 14px;
  transition: background 0.2s;
  cursor: pointer;
}

.dropdown-content a:hover {
  background: #f3f4f6;
}

.dropdown-content a .material-symbols-outlined {
  font-size: 18px;
  color: #6b7280;
}

/* Photo Thumbnail */
.etat-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.statut-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.statut-indicator .material-symbols-outlined {
  font-size: 18px;
}

.statut-indicator.statut-actif {
  color: #10b981;
  background: #d1fae5;
}

.statut-indicator.statut-inactif {
  color: #6b7280;
  background: #e5e7eb;
}

.statut-indicator.statut-suspendu {
  color: #f59e0b;
  background: #fef3c7;
}

.statut-indicator.statut-banni {
  color: #ef4444;
  background: #fee2e2;
}

.statut-indicator.statut-expire {
  color: #f97316;
  background: #fed7aa;
}

.statut-indicator.statut-renouvele {
  color: #3b82f6;
  background: #dbeafe;
}

.statut-indicator.statut-a_generer {
  color: #8b5cf6;
  background: #ede9fe;
}

.photo-thumbnail {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.photo-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: #f3f4f6;
}

.photo-thumbnail img[src=""],
.photo-thumbnail img:not([src]),
.photo-thumbnail img[src="undefined"] {
  display: none;
}

.photo-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);
  color: #9ca3af;
}

.photo-placeholder .material-symbols-outlined {
  font-size: 24px;
}

/* Payment Type Badge */
.payment-type-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.payment-type-badge.payment-especes {
  background: #fef3c7;
  color: #92400e;
}

.payment-type-badge.payment-cb {
  background: #dbeafe;
  color: #1e40af;
}

.payment-type-badge.payment-cheque {
  background: #e0e7ff;
  color: #4338ca;
}

.payment-type-badge.payment-virement {
  background: #d1fae5;
  color: #065f46;
}

.payment-type-badge.payment-helloasso {
  background: #fce7f3;
  color: #9f1239;
}

.payment-type-badge.payment-default {
  background: #f3f4f6;
  color: #6b7280;
}

/* Source Badge */
.source-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.source-badge.source-online {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1e40af;
  box-shadow: 0 1px 2px rgba(30, 64, 175, 0.1);
}

.source-badge.source-offline {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  box-shadow: 0 1px 2px rgba(146, 64, 14, 0.1);
}

.source-badge:not(.source-online):not(.source-offline) {
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  color: #4338ca;
  box-shadow: 0 1px 2px rgba(67, 56, 202, 0.1);
}

/* Actions Dropdown */
.actions-dropdown {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
}

.action-statut-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.action-statut-indicator .material-symbols-outlined {
  font-size: 20px;
}

.action-statut-indicator.statut-actif {
  color: #10b981;
  background: #d1fae5;
}

.action-statut-indicator.statut-inactif {
  color: #6b7280;
  background: #e5e7eb;
}

.action-statut-indicator.statut-suspendu {
  color: #f59e0b;
  background: #fef3c7;
}

.action-statut-indicator.statut-banni {
  color: #ef4444;
  background: #fee2e2;
}

.action-statut-indicator.statut-expire {
  color: #f97316;
  background: #fed7aa;
}

.action-statut-indicator.statut-renouvele {
  color: #3b82f6;
  background: #dbeafe;
}

.action-statut-indicator.statut-a_generer {
  color: #8b5cf6;
  background: #ede9fe;
}

.actions-btn {
  background: white;
  border: 1.5px solid #e5e7eb;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.2s;
  width: 40px;
  height: 40px;
  min-width: 40px;
  min-height: 40px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.actions-btn:hover {
  background: #f9fafb;
  border-color: var(--primary);
  color: var(--primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.15);
}

.actions-btn .material-symbols-outlined {
  font-size: 22px;
  font-weight: 500;
}

.actions-menu {
  display: block;
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  background: white;
  min-width: 220px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  z-index: 9999;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  padding: 6px;
  animation: slideDown 0.2s ease-out;
}

.actions-menu.show {
  display: block;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.actions-menu a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  color: #374151;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
  border-radius: 8px;
  margin: 2px 0;
}

.actions-menu a:hover {
  background: #f3f4f6;
  transform: translateX(2px);
}

.actions-menu a.danger {
  color: #dc2626;
}

.actions-menu a.danger:hover {
  background: #fee2e2;
  color: #b91c1c;
}

.actions-menu a .material-symbols-outlined {
  font-size: 20px;
  color: #6b7280;
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.actions-menu a.danger .material-symbols-outlined {
  color: #dc2626;
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
  gap: var(--spacing-lg);
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
