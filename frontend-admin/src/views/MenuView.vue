<template>
  <div class="menu-view">
    <!-- Header -->
    <div class="view-header">
      <div class="header-main">
        <div class="header-title">
          <h1>
            <span class="material-symbols-outlined">restaurant_menu</span>
            Menu du jour
          </h1>
          <p class="subtitle">Gérez vos plats et menus quotidiens</p>
        </div>
        <button v-if="canCreate" @click="openPlatModal()" class="btn-create">
          <span class="material-symbols-outlined">add</span>
          Nouveau plat
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-wrapper">
      <div class="tabs">
        <button
          @click="activeTab = 'menu'"
          :class="['tab', { active: activeTab === 'menu' }]"
        >
          <span class="material-symbols-outlined">calendar_today</span>
          Menu du jour
        </button>
        <button
          @click="activeTab = 'plats'"
          :class="['tab', { active: activeTab === 'plats' }]"
        >
          <span class="material-symbols-outlined">restaurant</span>
          Tous les plats
          <span v-if="allPlats.length > 0" class="badge">{{ allPlats.length }}</span>
        </button>
      </div>
    </div>

    <!-- Menu du jour -->
    <div v-if="activeTab === 'menu'" class="menu-tab">
      <!-- Date selector -->
      <div class="date-selector-card">
        <div class="date-controls">
          <button @click="previousDay" class="btn-icon">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <div class="date-display">
            <input
              v-model="selectedDate"
              type="date"
              @change="loadMenuForDate"
              class="date-input"
            />
            <span class="date-text">{{ formatDateLong(selectedDate) }}</span>
          </div>
          <button @click="nextDay" class="btn-icon">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
          <button @click="goToToday" class="btn-today">
            <span class="material-symbols-outlined">today</span>
            Aujourd'hui
          </button>
        </div>
        <button v-if="canEdit" @click="openAddToMenuModal" class="btn-add-menu">
          <span class="material-symbols-outlined">add_circle</span>
          Ajouter des plats
        </button>
      </div>

      <!-- Menu content -->
      <div v-if="loadingMenu" class="loading-card">
        <span class="material-symbols-outlined spin">sync</span>
        <p>Chargement du menu...</p>
      </div>

      <div v-else-if="menuPlats.length > 0" class="menu-book-container">
        <div class="menu-book">
          <!-- Page de gauche -->
          <div class="book-page left-page">
            <div class="page-header">
              <div class="restaurant-logo">
                <img src="/Miniature-site-1.svg" alt="IGCA Paris" class="logo-small" />
              </div>
              <h2 class="restaurant-name">IGCA Paris</h2>
              <p class="menu-date">{{ formatDateShort(selectedDate) }}</p>
              <div class="decorative-line"></div>
            </div>
            <div class="page-content">
              <div
                v-for="plat in leftPagePlats"
                :key="plat.id"
                class="menu-item"
                :class="{ unavailable: !plat.disponible }"
              >
                <div class="menu-item-header">
                  <h3 class="dish-name">{{ plat.nom }}</h3>
                  <span class="dish-price">{{ formatPrice(plat.prix) }} €</span>
                </div>
                <p v-if="plat.description" class="dish-description">{{ plat.description }}</p>
                <div v-if="!plat.disponible" class="dish-unavailable">
                  <span class="material-symbols-outlined">block</span>
                  Épuisé
                </div>
                <div v-if="canEdit" class="dish-actions">
                  <button @click="removeFromMenu(plat)" class="btn-remove-small" title="Retirer">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Reliure du livre -->
          <div class="book-spine"></div>

          <!-- Page de droite -->
          <div class="book-page right-page">
            <div class="page-header">
              <div class="decorative-line"></div>
              <p class="menu-subtitle">Menu du jour</p>
            </div>
            <div class="page-content">
              <div
                v-for="plat in rightPagePlats"
                :key="plat.id"
                class="menu-item"
                :class="{ unavailable: !plat.disponible }"
              >
                <div class="menu-item-header">
                  <h3 class="dish-name">{{ plat.nom }}</h3>
                  <span class="dish-price">{{ formatPrice(plat.prix) }} €</span>
                </div>
                <p v-if="plat.description" class="dish-description">{{ plat.description }}</p>
                <div v-if="!plat.disponible" class="dish-unavailable">
                  <span class="material-symbols-outlined">block</span>
                  Épuisé
                </div>
                <div v-if="canEdit" class="dish-actions">
                  <button @click="removeFromMenu(plat)" class="btn-remove-small" title="Retirer">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>
            </div>
            <div class="page-footer">
              <div class="menu-stats-footer">
                <p>{{ menuPlats.length }} plat{{ menuPlats.length > 1 ? 's' : '' }} disponible{{ menuPlats.filter(p => p.disponible).length > 1 ? 's' : '' }}</p>
              </div>
              <button v-if="canEdit" @click="saveMenu" :disabled="savingMenu" class="btn-save-book">
                <span class="material-symbols-outlined">save</span>
                {{ savingMenu ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">
          <span class="material-symbols-outlined">restaurant_menu</span>
        </div>
        <h3>Aucun menu pour cette date</h3>
        <p>Ajoutez des plats pour créer le menu du jour</p>
        <button v-if="canEdit" @click="openAddToMenuModal" class="btn-primary">
          <span class="material-symbols-outlined">add</span>
          Ajouter des plats
        </button>
      </div>
    </div>

    <!-- Tous les plats -->
    <div v-else class="plats-tab">
      <!-- Search and filters -->
      <div v-if="canEdit" class="filters-card">
        <div class="search-box">
          <span class="material-symbols-outlined">search</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher un plat..."
            @input="debouncedSearch"
          />
          <button v-if="searchQuery" @click="clearSearch" class="btn-clear">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="filter-chips">
          <button
            @click="filterDisponible = null"
            :class="['chip', { active: filterDisponible === null }]"
          >
            Tous
          </button>
          <button
            @click="filterDisponible = true"
            :class="['chip', { active: filterDisponible === true }]"
          >
            <span class="material-symbols-outlined">check_circle</span>
            Disponibles
          </button>
          <button
            @click="filterDisponible = false"
            :class="['chip', { active: filterDisponible === false }]"
          >
            <span class="material-symbols-outlined">block</span>
            Épuisés
          </button>
        </div>
      </div>

      <!-- Plats grid -->
      <div v-if="loading" class="loading-card">
        <span class="material-symbols-outlined spin">sync</span>
        <p>Chargement des plats...</p>
      </div>

      <div v-else-if="filteredPlats.length === 0" class="empty-state">
        <div class="empty-icon">
          <span class="material-symbols-outlined">restaurant</span>
        </div>
        <h3>Aucun plat trouvé</h3>
        <p v-if="searchQuery || filterDisponible !== null">
          Essayez de modifier vos filtres
        </p>
        <p v-else>
          Commencez par créer votre premier plat
        </p>
        <div class="empty-actions">
          <button v-if="searchQuery || filterDisponible !== null" @click="resetFilters" class="btn-secondary">
            Réinitialiser
          </button>
          <button v-if="canCreate" @click="openPlatModal()" class="btn-primary">
            <span class="material-symbols-outlined">add</span>
            Créer un plat
          </button>
        </div>
      </div>

      <div v-else class="plats-grid">
        <div
          v-for="plat in filteredPlats"
          :key="plat.id"
          class="plat-card"
          :class="{ unavailable: !plat.disponible }"
        >
          <div class="card-image">
            <img
              v-if="plat.image_url"
              :src="getImageUrl(plat.image_url)"
              :alt="plat.nom"
              @error="handleImageError"
            />
            <div v-else class="image-placeholder">
              <span class="material-symbols-outlined">restaurant</span>
            </div>
            <div :class="['card-badge', plat.disponible ? 'available' : 'unavailable']">
              {{ plat.disponible ? 'Disponible' : 'Épuisé' }}
            </div>
            <div v-if="canEdit" class="card-actions">
              <button @click="openPlatModal(plat)" class="action-btn" title="Modifier">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button v-if="canDelete" @click="deletePlat(plat)" class="action-btn danger" title="Supprimer">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
          <div class="card-body">
            <h3>{{ plat.nom }}</h3>
            <p v-if="plat.description" class="card-desc">{{ plat.description }}</p>
            <div class="card-footer">
              <span class="card-price">{{ formatPrice(plat.prix) }} €</span>
              <label v-if="canEdit" class="switch">
                <input
                  type="checkbox"
                  :checked="plat.disponible"
                  @change="toggleDisponible(plat)"
                />
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Formulaire plat -->
    <Teleport to="body">
      <div v-if="showPlatModal" class="modal" @click.self="closePlatModal">
        <div class="modal-dialog">
          <div class="modal-header">
            <h2>{{ editingPlat ? 'Modifier le plat' : 'Nouveau plat' }}</h2>
            <button @click="closePlatModal" class="btn-close">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <form @submit.prevent="savePlat" class="modal-body">
            <div class="form-group">
              <label>Nom du plat *</label>
              <input
                v-model="platForm.nom"
                type="text"
                placeholder="Ex: Thali végétarien"
                required
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label>Description</label>
              <textarea
                v-model="platForm.description"
                rows="3"
                placeholder="Décrivez le plat..."
                class="form-textarea"
              ></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Prix (€) *</label>
                <input
                  v-model.number="platForm.prix"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>Disponibilité</label>
                <label class="switch-large">
                  <input v-model="platForm.disponible" type="checkbox" />
                  <span class="switch-label">
                    <span class="material-symbols-outlined">
                      {{ platForm.disponible ? 'check_circle' : 'cancel' }}
                    </span>
                    <strong>{{ platForm.disponible ? 'Disponible' : 'Épuisé' }}</strong>
                  </span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>URL de l'image</label>
              <input
                v-model="platForm.image_url"
                type="url"
                placeholder="https://example.com/image.jpg"
                @input="updateImagePreview"
                class="form-input"
              />
              <div v-if="imagePreviewUrl" class="image-preview">
                <img :src="imagePreviewUrl" alt="Aperçu" />
                <button @click="clearImagePreview" type="button" class="btn-remove-img">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" @click="closePlatModal" class="btn-cancel">
                Annuler
              </button>
              <button type="submit" :disabled="!platForm.nom || !platForm.prix" class="btn-submit">
                <span class="material-symbols-outlined">save</span>
                {{ editingPlat ? 'Enregistrer' : 'Créer' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal: Ajouter au menu -->
    <Teleport to="body">
      <div v-if="showAddToMenuModal" class="modal" @click.self="closeAddToMenuModal">
        <div class="modal-dialog large">
          <div class="modal-header">
            <h2>Ajouter des plats au menu</h2>
            <button @click="closeAddToMenuModal" class="btn-close">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div v-if="availablePlats.length === 0" class="empty-plats">
              <span class="material-symbols-outlined">restaurant</span>
              <p>Aucun plat disponible. Créez d'abord des plats.</p>
            </div>
            <div v-else class="plats-selection-grid">
              <div
                v-for="plat in availablePlats"
                :key="plat.id"
                @click="togglePlatForMenu(plat.id)"
                :class="['plat-select-card', { selected: selectedPlatsForMenu.includes(plat.id) }]"
              >
                <div class="select-image">
                  <img
                    v-if="plat.image_url"
                    :src="getImageUrl(plat.image_url)"
                    :alt="plat.nom"
                    @error="handleImageError"
                  />
                  <div v-else class="image-placeholder-small">
                    <span class="material-symbols-outlined">restaurant</span>
                  </div>
                  <div v-if="selectedPlatsForMenu.includes(plat.id)" class="selected-check">
                    <span class="material-symbols-outlined">check_circle</span>
                  </div>
                </div>
                <div class="select-info">
                  <h4>{{ plat.nom }}</h4>
                  <p class="select-price">{{ formatPrice(plat.prix) }} €</p>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button @click="closeAddToMenuModal" class="btn-cancel">Annuler</button>
              <button
                @click="addSelectedPlatsToMenu"
                :disabled="selectedPlatsForMenu.length === 0"
                class="btn-submit"
              >
                <span class="material-symbols-outlined">add</span>
                Ajouter {{ selectedPlatsForMenu.length }} plat{{ selectedPlatsForMenu.length > 1 ? 's' : '' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Teleport } from 'vue';
import { menuApi } from '@/services/api';
import { usePermissions } from '@/composables/usePermissions';

// Permissions centralisées
const { permissions } = usePermissions();

// State
const loading = ref(false);
const loadingMenu = ref(false);
const activeTab = ref<'menu' | 'plats'>('menu');
const allPlats = ref<any[]>([]);
const currentMenu = ref<any>(null);
const menuPlats = ref<any[]>([]);
const availablePlats = ref<any[]>([]);
const selectedDate = ref(new Date().toISOString().split('T')[0]);
const savingMenu = ref(false);

// Filters
const searchQuery = ref('');
const filterDisponible = ref<boolean | null>(null);

// Modals
const showPlatModal = ref(false);
const showAddToMenuModal = ref(false);
const editingPlat = ref<any>(null);
const selectedPlatsForMenu = ref<number[]>([]);

// Form
const platForm = ref({
  nom: '',
  description: '',
  prix: 0,
  disponible: true,
  image_url: '',
});

const imagePreviewUrl = ref('');

// Permissions - utiliser le composable centralisé
const canEdit = permissions.canEdit;
const canCreate = permissions.canCreate;
const canDelete = permissions.canDelete;

// Filtered plats
const filteredPlats = computed(() => {
  let filtered = [...allPlats.value];

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      p =>
        p.nom.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
    );
  }

  if (filterDisponible.value !== null) {
    filtered = filtered.filter(p => p.disponible === filterDisponible.value);
  }

  // Sort: available first
  filtered.sort((a, b) => {
    if (a.disponible === b.disponible) return 0;
    return a.disponible ? -1 : 1;
  });

  return filtered;
});

// Split plats for book pages
const leftPagePlats = computed(() => {
  const available = menuPlats.value.filter(p => p.disponible);
  const unavailable = menuPlats.value.filter(p => !p.disponible);
  const all = [...available, ...unavailable];
  const mid = Math.ceil(all.length / 2);
  return all.slice(0, mid);
});

const rightPagePlats = computed(() => {
  const available = menuPlats.value.filter(p => p.disponible);
  const unavailable = menuPlats.value.filter(p => !p.disponible);
  const all = [...available, ...unavailable];
  const mid = Math.ceil(all.length / 2);
  return all.slice(mid);
});

// Utils
function formatPrice(price: number) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

function formatDateLong(date: string) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateShort(date: string) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getImageUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads/')) {
    return `http://localhost:3001${url}`;
  }
  return url;
}

function handleImageError(event: Event) {
  const target = event.target as HTMLImageElement;
  target.style.display = 'none';
}

// Search
let searchTimeout: NodeJS.Timeout;
function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {}, 300);
}

function clearSearch() {
  searchQuery.value = '';
}

function resetFilters() {
  searchQuery.value = '';
  filterDisponible.value = null;
}

// Load data
async function loadPlats() {
  loading.value = true;
  try {
    const response = await menuApi.plats.list();
    let plats = [];
    if (response.data?.data && Array.isArray(response.data.data)) {
      plats = response.data.data;
    } else if (Array.isArray(response.data)) {
      plats = response.data;
    }
    allPlats.value = plats;
  } catch (error: any) {
    console.error('Erreur chargement plats:', error);
    alert('Erreur lors du chargement des plats');
  } finally {
    loading.value = false;
  }
}

async function loadMenuForDate() {
  loadingMenu.value = true;
  try {
    const response = await menuApi.getByDate(selectedDate.value);
    currentMenu.value = response.data.data || null;
    if (currentMenu.value?.plats) {
      menuPlats.value = [...currentMenu.value.plats];
    } else {
      currentMenu.value = { date_menu: selectedDate.value, plats: [] };
      menuPlats.value = [];
    }
  } catch (error: any) {
    console.error('Erreur chargement menu:', error);
    currentMenu.value = { date_menu: selectedDate.value, plats: [] };
    menuPlats.value = [];
  } finally {
    loadingMenu.value = false;
  }
}

async function loadAvailablePlats() {
  try {
    const response = await menuApi.plats.list();
    availablePlats.value = response.data?.data || response.data || [];
  } catch (error: any) {
    console.error('Erreur chargement plats disponibles:', error);
  }
}

// Date navigation
function previousDay() {
  const date = new Date(selectedDate.value);
  date.setDate(date.getDate() - 1);
  selectedDate.value = date.toISOString().split('T')[0];
  loadMenuForDate();
}

function nextDay() {
  const date = new Date(selectedDate.value);
  date.setDate(date.getDate() + 1);
  selectedDate.value = date.toISOString().split('T')[0];
  loadMenuForDate();
}

function goToToday() {
  selectedDate.value = new Date().toISOString().split('T')[0];
  loadMenuForDate();
}

// Plat modal
function openPlatModal(plat?: any) {
  editingPlat.value = plat || null;
  if (plat) {
    platForm.value = {
      nom: plat.nom,
      description: plat.description || '',
      prix: parseFloat(plat.prix),
      disponible: plat.disponible,
      image_url: plat.image_url || '',
    };
    imagePreviewUrl.value = plat.image_url ? getImageUrl(plat.image_url) : '';
  } else {
    platForm.value = {
      nom: '',
      description: '',
      prix: 0,
      disponible: true,
      image_url: '',
    };
    imagePreviewUrl.value = '';
  }
  showPlatModal.value = true;
}

function closePlatModal() {
  showPlatModal.value = false;
  editingPlat.value = null;
  platForm.value = {
    nom: '',
    description: '',
    prix: 0,
    disponible: true,
    image_url: '',
  };
  imagePreviewUrl.value = '';
}

function updateImagePreview() {
  if (platForm.value.image_url && isValidUrl(platForm.value.image_url)) {
    imagePreviewUrl.value = platForm.value.image_url;
  } else {
    imagePreviewUrl.value = '';
  }
}

function clearImagePreview() {
  platForm.value.image_url = '';
  imagePreviewUrl.value = '';
}

function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function savePlat() {
  try {
    const formData = new FormData();
    formData.append('nom', platForm.value.nom);
    formData.append('description', platForm.value.description || '');
    formData.append('prix', platForm.value.prix.toString());
    formData.append('quantite', '0');
    formData.append('disponible', platForm.value.disponible.toString());
    if (platForm.value.image_url) {
      formData.append('image_url', platForm.value.image_url);
    }

    if (editingPlat.value) {
      await menuApi.plats.update(editingPlat.value.id, formData);
      
      // Notifier les autres vues
      eventBus.emit(EVENTS.PLAT_UPDATED, { id: editingPlat.value.id });
    } else {
      const response = await menuApi.plats.create(formData);
      const newPlat = response.data?.data || response.data;
      
      // Notifier les autres vues
      if (newPlat?.id) {
        eventBus.emit(EVENTS.PLAT_CREATED, { id: newPlat.id });
      }
    }

    await loadPlats();
    await loadAvailablePlats();
    closePlatModal();
  } catch (error: any) {
    console.error('Erreur sauvegarde:', error);
    alert(error.response?.data?.error || 'Erreur lors de la sauvegarde');
  }
}

async function deletePlat(plat: any) {
  if (!confirm(`Supprimer "${plat.nom}" ?`)) return;
  try {
    await menuApi.plats.delete(plat.id);
    
    // Notifier les autres vues
    eventBus.emit(EVENTS.PLAT_DELETED, { id: plat.id });
    
    await loadPlats();
    await loadAvailablePlats();
  } catch (error: any) {
    console.error('Erreur suppression:', error);
    alert(error.response?.data?.error || 'Erreur lors de la suppression');
  }
}

async function toggleDisponible(plat: any) {
  try {
    const formData = new FormData();
    formData.append('nom', plat.nom);
    formData.append('description', plat.description || '');
    formData.append('prix', plat.prix.toString());
    formData.append('quantite', '0');
    formData.append('disponible', (!plat.disponible).toString());
    if (plat.image_url) {
      formData.append('image_url', plat.image_url);
    }
    await menuApi.plats.update(plat.id, formData);
    await loadPlats();
  } catch (error: any) {
    console.error('Erreur toggle:', error);
  }
}

// Menu management
function openAddToMenuModal() {
  selectedPlatsForMenu.value = [];
  showAddToMenuModal.value = true;
}

function closeAddToMenuModal() {
  showAddToMenuModal.value = false;
  selectedPlatsForMenu.value = [];
}

function togglePlatForMenu(platId: number) {
  const index = selectedPlatsForMenu.value.indexOf(platId);
  if (index > -1) {
    selectedPlatsForMenu.value.splice(index, 1);
  } else {
    selectedPlatsForMenu.value.push(platId);
  }
}

function addSelectedPlatsToMenu() {
  const platsToAdd = availablePlats.value
    .filter((p: any) => selectedPlatsForMenu.value.includes(p.id))
    .map((p: any) => ({ ...p }));

  if (!currentMenu.value) {
    currentMenu.value = { date_menu: selectedDate.value, plats: [] };
  }
  if (!currentMenu.value.plats) {
    currentMenu.value.plats = [];
  }

  const existingIds = new Set([
    ...currentMenu.value.plats.map((p: any) => p.id),
    ...menuPlats.value.map((p: any) => p.id),
  ]);

  const newPlats = platsToAdd.filter((p: any) => !existingIds.has(p.id));

  if (newPlats.length === 0) {
    alert('Tous les plats sélectionnés sont déjà dans le menu');
    return;
  }

  currentMenu.value.plats.push(...newPlats);
  menuPlats.value.push(...newPlats);

  closeAddToMenuModal();
}

function removeFromMenu(plat: any) {
  const index = menuPlats.value.findIndex((p: any) => p.id === plat.id);
  if (index > -1) {
    menuPlats.value.splice(index, 1);
    if (currentMenu.value?.plats) {
      const menuIndex = currentMenu.value.plats.findIndex((p: any) => p.id === plat.id);
      if (menuIndex > -1) {
        currentMenu.value.plats.splice(menuIndex, 1);
      }
    }
  }
}

async function saveMenu() {
  savingMenu.value = true;
  try {
    const platsData = menuPlats.value.map(plat => ({
      id: plat.id,
      nom: plat.nom,
      description: plat.description || '',
      prix: parseFloat(plat.prix),
      disponible: plat.disponible,
      image_url: plat.image_url || '',
    }));

    await menuApi.create({
      date_menu: selectedDate.value,
      plats: platsData,
    });

    alert('Menu enregistré avec succès !');
    await loadMenuForDate();
  } catch (error: any) {
    console.error('Erreur sauvegarde menu:', error);
    alert(error.response?.data?.error || 'Erreur lors de l\'enregistrement');
  } finally {
    savingMenu.value = false;
  }
}

onMounted(async () => {
  await loadPlats();
  await loadMenuForDate();
  await loadAvailablePlats();
});
</script>

<style scoped>
.menu-view {
  padding: 24px;
  width: 100%;
  margin: 0;
}

/* Header */
/* Header - styles maintenant dans view-base.css */

.header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: var(--spacing-lg);
}

.header-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex: 1;
}

.header-title h1 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.header-title .subtitle {
  display: none; /* Masqué pour affichage en une ligne */
}

.btn-create {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-xl);
  background: var(--color-black);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-base);
  font-family: var(--font-display);
}

.btn-create:hover {
  background: var(--color-black-light);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* Tabs */
.tabs-wrapper {
  margin-bottom: 24px;
}

.tabs {
  display: flex;
  gap: var(--spacing-sm);
  border-bottom: 1px solid var(--border);
}

.tab {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-xl);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-base);
  margin-bottom: -2px;
  position: relative;
  font-family: var(--font-body);
}

.tab:hover {
  color: var(--text-primary);
}

.tab.active {
  color: var(--color-black);
  border-bottom-color: var(--color-black);
  font-weight: var(--font-weight-semibold);
}

.tab .badge {
  background: var(--color-black);
  color: var(--text-inverse);
  padding: 2px 8px;
  border-radius: 0;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

/* Date selector */
.date-selector-card {
  background: var(--bg-primary);
  padding: var(--spacing-lg);
  border-radius: 0;
  border: 1px solid var(--border);
  box-shadow: none;
  margin-bottom: var(--spacing-xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
}

.date-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-icon {
  width: 40px;
  height: 40px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-base);
  color: var(--text-secondary);
}

.btn-icon:hover {
  background: var(--bg-secondary);
  border-color: var(--color-black);
  color: var(--color-black);
}

.date-display {
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-input {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-family: var(--font-body);
  color: var(--text-primary);
  background: var(--bg-primary);
}

.date-input:focus {
  outline: none;
  border-color: var(--color-black);
  box-shadow: 0 0 0 3px var(--color-black-pastel);
}

.date-text {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  text-transform: capitalize;
  min-width: 200px;
}

.btn-today {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-today:hover {
  background: var(--bg-secondary);
  border-color: var(--color-black);
}

.btn-add-menu {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-black);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-base);
  font-family: var(--font-display);
}

.btn-add-menu:hover {
  background: var(--color-black-light);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* Menu Book - Minimaliste */
.menu-book-container {
  display: flex;
  justify-content: center;
  padding: var(--spacing-4xl) var(--spacing-xl);
  background: var(--bg-page);
  min-height: 600px;
}

.menu-book {
  display: flex;
  max-width: 1200px;
  width: 100%;
  gap: 0;
  border: 1px solid var(--border);
  background: var(--bg-primary);
}

.book-page {
  flex: 1;
  background: var(--bg-primary);
  padding: var(--spacing-4xl) var(--spacing-3xl);
  box-shadow: none;
  position: relative;
  min-height: 700px;
  display: flex;
  flex-direction: column;
}

.left-page {
  border-radius: 0;
  border-right: 1px solid var(--border);
}

.right-page {
  border-radius: 0;
  border-left: 1px solid var(--border);
}

.book-spine {
  width: 20px;
  background: var(--color-black);
  box-shadow: none;
  position: relative;
  z-index: 1;
}

.book-spine::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 60%;
  background: var(--bg-secondary);
  border-radius: 0;
}

.page-header {
  text-align: center;
  margin-bottom: var(--spacing-4xl);
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--border);
}

.restaurant-logo {
  margin-bottom: var(--spacing-lg);
}

.logo-small {
  width: 60px;
  height: 60px;
  object-fit: contain;
}

.restaurant-name {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-sm) 0;
  letter-spacing: 0.05em;
  font-family: var(--font-display);
}

.menu-date {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0 0 var(--spacing-lg) 0;
  font-style: normal;
}

.menu-subtitle {
  font-size: var(--font-size-lg);
  color: var(--text-secondary);
  margin: 0;
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.decorative-line {
  height: 1px;
  background: var(--border);
  margin: var(--spacing-lg) 0;
}

.page-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.menu-item {
  padding: var(--spacing-lg) 0;
  border-bottom: 1px solid var(--border);
  position: relative;
  transition: all var(--transition-base);
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item.unavailable {
  opacity: 0.5;
}

.menu-item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-sm);
  gap: var(--spacing-lg);
}

.dish-name {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0;
  flex: 1;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: var(--font-display);
}

.dish-price {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-red);
  white-space: nowrap;
}

.dish-description {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.6;
  margin: var(--spacing-sm) 0 0 0;
  font-style: normal;
}

.dish-unavailable {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-red-pastel);
  color: var(--color-red);
  border-radius: 0;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  border: 1px solid var(--color-red);
}

.dish-unavailable .material-symbols-outlined {
  font-size: 16px;
}

.dish-actions {
  position: absolute;
  top: 20px;
  right: 0;
  opacity: 0;
  transition: opacity 0.2s;
}

.menu-item:hover .dish-actions {
  opacity: 1;
}

.btn-remove-small {
  width: 28px;
  height: 28px;
  background: var(--color-red-pastel);
  border: 1px solid var(--color-red);
  border-radius: var(--radius-sm);
  color: var(--color-red);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
}

.btn-remove-small:hover {
  background: var(--color-red);
  color: var(--text-inverse);
}

.page-footer {
  margin-top: var(--spacing-4xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-lg);
}

.menu-stats-footer {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-style: normal;
}

.btn-save-book {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-green);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-base);
  font-family: var(--font-display);
}

.btn-save-book:hover:not(:disabled) {
  background: var(--color-green-light);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-save-book:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Menu content (old - keep for compatibility) */
.menu-content {
  background: var(--bg-primary);
  border-radius: 0;
  padding: var(--spacing-xl);
  border: 1px solid var(--border);
  box-shadow: none;
}

.menu-header-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-xl);
  gap: var(--spacing-lg);
  flex-wrap: wrap;
}

.menu-header-info h2 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  font-family: var(--font-display);
}

.menu-stats {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.btn-save {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-green);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-base);
  font-family: var(--font-display);
}

.btn-save:hover:not(:disabled) {
  background: var(--color-green-light);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.menu-item-card {
  background: var(--bg-primary);
  border-radius: 0;
  overflow: hidden;
  transition: all var(--transition-base);
  border: 1px solid var(--border);
}

.menu-item-card:hover {
  border-color: var(--color-black);
  background: var(--bg-secondary);
}

.menu-item-card.unavailable {
  opacity: 0.5;
}

.item-image {
  position: relative;
  width: 100%;
  height: 180px;
  overflow: hidden;
  background: var(--bg-secondary);
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.image-placeholder .material-symbols-outlined {
  font-size: 64px;
}

.status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.status-badge.available {
  background: var(--color-green);
  color: var(--text-inverse);
}

.status-badge.unavailable {
  background: var(--color-red);
  color: var(--text-inverse);
}

.item-content {
  padding: var(--spacing-lg);
}

.item-content h3 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  font-family: var(--font-display);
}

.item-desc {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-red);
}

.btn-remove {
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid var(--color-red);
  color: var(--color-red);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: all var(--transition-base);
}

.btn-remove:hover {
  background: var(--color-red-pastel);
  border-color: var(--color-red);
}

/* Filters */
.filters-card {
  background: var(--bg-primary);
  padding: var(--spacing-lg);
  border-radius: 0;
  border: 1px solid var(--border);
  box-shadow: none;
  margin-bottom: var(--spacing-xl);
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.search-box .material-symbols-outlined {
  position: absolute;
  left: var(--spacing-lg);
  color: var(--text-muted);
  pointer-events: none;
}

.search-box input {
  width: 100%;
  padding: var(--spacing-md) var(--spacing-lg) var(--spacing-md) calc(var(--spacing-xl) + var(--spacing-md));
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  transition: all var(--transition-base);
  font-family: var(--font-body);
  color: var(--text-primary);
  background: var(--bg-primary);
}

.search-box input:focus {
  outline: none;
  border-color: var(--color-black);
  box-shadow: 0 0 0 3px var(--color-black-pastel);
}

.btn-clear {
  position: absolute;
  right: var(--spacing-md);
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: var(--spacing-xs);
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-chips {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.chip {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
}

.chip:hover {
  background: var(--bg-secondary);
  border-color: var(--color-black);
}

.chip.active {
  background: var(--color-black);
  color: var(--text-inverse);
  border-color: var(--color-black);
}

/* Plats grid */
.plats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.plat-card {
  background: var(--bg-primary);
  border-radius: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: none;
  transition: all var(--transition-base);
  position: relative;
}

.plat-card:hover {
  border-color: var(--color-black);
  background: var(--bg-secondary);
}

.plat-card.unavailable {
  opacity: 0.5;
}

.card-image {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: var(--bg-secondary);
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-badge {
  position: absolute;
  top: var(--spacing-md);
  left: var(--spacing-md);
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: 0;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.card-badge.available {
  background: var(--color-green);
  color: var(--text-inverse);
  border-radius: 0;
}

.card-badge.unavailable {
  background: var(--color-red);
  color: var(--text-inverse);
  border-radius: 0;
}

.card-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.plat-card:hover .card-actions {
  opacity: 1;
}

.action-btn {
  width: 36px;
  height: 36px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-base);
  color: var(--text-secondary);
}

.action-btn:hover {
  background: var(--bg-secondary);
  border-color: var(--color-black);
  color: var(--color-black);
}

.action-btn.danger {
  color: var(--color-red);
  border-color: var(--color-red);
}

.action-btn.danger:hover {
  background: var(--color-red-pastel);
  border-color: var(--color-red);
}

.card-body {
  padding: var(--spacing-lg);
}

.card-body h3 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  font-family: var(--font-display);
}

.card-desc {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-price {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-red);
}

.switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 18px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch .slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border);
  transition: var(--transition-base);
  border-radius: 18px;
}

.switch .slider:before {
  position: absolute;
  content: '';
  height: 14px;
  width: 14px;
  left: 2px;
  bottom: 2px;
  background-color: var(--bg-primary);
  transition: var(--transition-base);
  border-radius: 50%;
}

.switch input:checked + .slider {
  background-color: var(--color-green);
}

.switch input:checked + .slider:before {
  transform: translateX(18px);
}

/* Empty states */
.empty-state {
  background: white;
  border-radius: 16px;
  padding: 80px 24px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.empty-icon {
  margin-bottom: 20px;
}

.empty-icon .material-symbols-outlined {
  font-size: 80px;
  color: #cbd5e1;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}

.empty-state p {
  margin: 0 0 24px 0;
  color: #64748b;
}

.empty-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.loading-card {
  background: white;
  border-radius: 16px;
  padding: 80px 24px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.loading-card .material-symbols-outlined {
  font-size: 48px;
  color: var(--primary);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
  backdrop-filter: blur(4px);
}

.modal-dialog {
  background: white;
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-dialog.large {
  max-width: 900px;
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

.btn-close {
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #f1f5f9;
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
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 15px;
  font-family: inherit;
  transition: all 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
}

.switch-large {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.switch-large input[type='checkbox'] {
  width: 36px;
  height: 18px;
  cursor: pointer;
}

.switch-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1e293b;
}

.image-preview {
  position: relative;
  margin-top: 12px;
  border-radius: 8px;
  overflow: hidden;
  max-width: 300px;
}

.image-preview img {
  width: 100%;
  height: auto;
  display: block;
}

.btn-remove-img {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  width: 32px;
  height: 32px;
  background: var(--color-black);
  border: none;
  border-radius: var(--radius-full);
  color: var(--text-inverse);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
}

.btn-remove-img:hover {
  background: var(--color-black-light);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--border);
}

.btn-cancel {
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-cancel:hover {
  background: var(--bg-secondary);
  border-color: var(--color-black);
}

.btn-submit {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-black);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-base);
  font-family: var(--font-display);
}

.btn-submit:hover:not(:disabled) {
  background: var(--color-black-light);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Boutons styles maintenant dans buttons.css global */

/* Selection grid */
.plats-selection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
  margin-bottom: 24px;
}

.plat-select-card {
  cursor: pointer;
  border-radius: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  transition: all var(--transition-base);
  background: var(--bg-primary);
}

.plat-select-card:hover {
  border-color: var(--color-black);
  background: var(--bg-secondary);
}

.plat-select-card.selected {
  border-color: var(--color-black);
  border-width: 2px;
  background: var(--bg-secondary);
}

.select-image {
  position: relative;
  width: 100%;
  height: 120px;
  overflow: hidden;
  background: var(--bg-secondary);
}

.select-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder-small {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.selected-check {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.select-info {
  padding: 12px;
  text-align: center;
}

.select-info h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.select-price {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--primary);
}

.empty-plats {
  text-align: center;
  padding: 40px;
  color: #64748b;
}

.empty-plats .material-symbols-outlined {
  font-size: 64px;
  margin-bottom: 16px;
}

/* Responsive */
@media (max-width: 1024px) {
  .menu-book {
    flex-direction: column;
    max-width: 600px;
  }

  .book-page {
    border-radius: 8px;
    margin-bottom: 20px;
    min-height: auto;
  }

  .left-page {
    border-right: none;
    border-bottom: 2px solid #e5e7eb;
  }

  .right-page {
    border-left: none;
    border-top: 2px solid #e5e7eb;
  }

  .book-spine {
    width: 100%;
    height: 20px;
    background: linear-gradient(90deg, #8b5cf6 0%, #6366f1 50%, #8b5cf6 100%);
  }

  .book-spine::before {
    width: 60%;
    height: 4px;
  }
}

@media (max-width: 768px) {
  .menu-view {
    padding: 16px;
  }

  .header-main {
    flex-direction: column;
    align-items: stretch;
  }

  .date-selector-card {
    flex-direction: column;
    align-items: stretch;
  }

  .menu-book-container {
    padding: 20px 10px;
  }

  .book-page {
    padding: 24px 20px;
  }

  .restaurant-name {
    font-size: 22px;
  }

  .dish-name {
    font-size: 18px;
  }

  .dish-price {
    font-size: 18px;
  }

  .menu-grid,
  .plats-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .modal-dialog {
    margin: 16px;
  }
}
</style>
