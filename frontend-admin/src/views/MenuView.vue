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
        <button v-if="canEdit" @click="openPlatModal()" class="btn-create">
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

      <div v-else-if="menuPlats.length > 0" class="menu-content">
        <div class="menu-header-info">
          <div>
            <h2>Menu du {{ formatDateShort(selectedDate) }}</h2>
            <p class="menu-stats">
              {{ menuPlats.length }} plat{{ menuPlats.length > 1 ? 's' : '' }} 
              • {{ menuPlats.filter(p => p.disponible).length }} disponible{{ menuPlats.filter(p => p.disponible).length > 1 ? 's' : '' }}
            </p>
          </div>
          <button v-if="canEdit" @click="saveMenu" :disabled="savingMenu" class="btn-save">
            <span class="material-symbols-outlined">save</span>
            {{ savingMenu ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>

        <div class="menu-grid">
          <div
            v-for="plat in menuPlats"
            :key="plat.id"
            class="menu-item-card"
            :class="{ unavailable: !plat.disponible }"
          >
            <div class="item-image">
              <img
                v-if="plat.image_url"
                :src="getImageUrl(plat.image_url)"
                :alt="plat.nom"
                @error="handleImageError"
              />
              <div v-else class="image-placeholder">
                <span class="material-symbols-outlined">restaurant</span>
              </div>
              <div :class="['status-badge', plat.disponible ? 'available' : 'unavailable']">
                <span class="material-symbols-outlined">
                  {{ plat.disponible ? 'check_circle' : 'block' }}
                </span>
              </div>
            </div>
            <div class="item-content">
              <h3>{{ plat.nom }}</h3>
              <p v-if="plat.description" class="item-desc">{{ plat.description }}</p>
              <div class="item-footer">
                <span class="price">{{ formatPrice(plat.prix) }} €</span>
                <button v-if="canEdit" @click="removeFromMenu(plat)" class="btn-remove" title="Retirer">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
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
          <button v-if="canEdit" @click="openPlatModal()" class="btn-primary">
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
              <button @click="deletePlat(plat)" class="action-btn danger" title="Supprimer">
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
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

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

// Permissions
const canEdit = computed(() => {
  const userRole = authStore.user?.role || '';
  return ['admin', 'super_admin', 'benevole'].includes(userRole);
});

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
    } else {
      await menuApi.plats.create(formData);
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
    .filter(p => selectedPlatsForMenu.value.includes(p.id))
    .map(p => ({ ...p }));

  if (!currentMenu.value) {
    currentMenu.value = { date_menu: selectedDate.value, plats: [] };
  }
  if (!currentMenu.value.plats) {
    currentMenu.value.plats = [];
  }

  const existingIds = new Set([
    ...currentMenu.value.plats.map(p => p.id),
    ...menuPlats.value.map(p => p.id),
  ]);

  const newPlats = platsToAdd.filter(p => !existingIds.has(p.id));

  if (newPlats.length === 0) {
    alert('Tous les plats sélectionnés sont déjà dans le menu');
    return;
  }

  currentMenu.value.plats.push(...newPlats);
  menuPlats.value.push(...newPlats);

  closeAddToMenuModal();
}

function removeFromMenu(plat: any) {
  const index = menuPlats.value.findIndex(p => p.id === plat.id);
  if (index > -1) {
    menuPlats.value.splice(index, 1);
    if (currentMenu.value?.plats) {
      const menuIndex = currentMenu.value.plats.findIndex(p => p.id === plat.id);
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
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
.view-header {
  margin-bottom: 24px;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.header-title h1 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
}

.header-title .material-symbols-outlined {
  font-size: 36px;
  color: #667eea;
}

.subtitle {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

.btn-create {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-create:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

/* Tabs */
.tabs-wrapper {
  margin-bottom: 24px;
}

.tabs {
  display: flex;
  gap: 8px;
  border-bottom: 2px solid #e2e8f0;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #64748b;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: -2px;
  position: relative;
}

.tab:hover {
  color: #475569;
}

.tab.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

.tab .badge {
  background: #667eea;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

/* Date selector */
.date-selector-card {
  background: white;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
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
  background: #f1f5f9;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: #64748b;
}

.btn-icon:hover {
  background: #e2e8f0;
}

.date-display {
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-input {
  padding: 8px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
}

.date-text {
  font-size: 15px;
  font-weight: 500;
  color: #1e293b;
  text-transform: capitalize;
  min-width: 200px;
}

.btn-today {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f1f5f9;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-today:hover {
  background: #e2e8f0;
}

.btn-add-menu {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-menu:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* Menu content */
.menu-content {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.menu-header-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.menu-header-info h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}

.menu-stats {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

.btn-save {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.menu-item-card {
  background: #f8fafc;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.menu-item-card:hover {
  border-color: #e2e8f0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.menu-item-card.unavailable {
  opacity: 0.7;
}

.item-image {
  position: relative;
  width: 100%;
  height: 180px;
  overflow: hidden;
  background: #e2e8f0;
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
  color: #94a3b8;
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
  background: rgba(16, 185, 129, 0.9);
  color: white;
}

.status-badge.unavailable {
  background: rgba(220, 38, 38, 0.9);
  color: white;
}

.item-content {
  padding: 16px;
}

.item-content h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.item-desc {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #64748b;
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
  font-size: 20px;
  font-weight: 700;
  color: #667eea;
}

.btn-remove {
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  color: #dc2626;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-remove:hover {
  background: #fee2e2;
}

/* Filters */
.filters-card {
  background: white;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.search-box .material-symbols-outlined {
  position: absolute;
  left: 16px;
  color: #94a3b8;
  pointer-events: none;
}

.search-box input {
  width: 100%;
  padding: 12px 16px 12px 48px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 15px;
  transition: all 0.2s;
}

.search-box input:focus {
  outline: none;
  border-color: #667eea;
}

.btn-clear {
  position: absolute;
  right: 12px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f1f5f9;
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.chip:hover {
  background: #e2e8f0;
}

.chip.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

/* Plats grid */
.plats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.plat-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
  position: relative;
}

.plat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.plat-card.unavailable {
  opacity: 0.7;
}

.card-image {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: #f1f5f9;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  backdrop-filter: blur(10px);
}

.card-badge.available {
  background: rgba(16, 185, 129, 0.9);
  color: white;
}

.card-badge.unavailable {
  background: rgba(220, 38, 38, 0.9);
  color: white;
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
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(10px);
  color: #64748b;
}

.action-btn:hover {
  background: white;
  transform: scale(1.1);
}

.action-btn.danger {
  color: #dc2626;
}

.action-btn.danger:hover {
  background: #fee2e2;
}

.card-body {
  padding: 16px;
}

.card-body h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.card-desc {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #64748b;
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
  font-size: 20px;
  font-weight: 700;
  color: #667eea;
}

.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
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
  background-color: #cbd5e1;
  transition: 0.3s;
  border-radius: 24px;
}

.switch .slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.switch input:checked + .slider {
  background-color: #10b981;
}

.switch input:checked + .slider:before {
  transform: translateX(24px);
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
  color: #667eea;
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
  border-color: #667eea;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
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
  width: 48px;
  height: 24px;
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
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-remove-img:hover {
  background: rgba(0, 0, 0, 0.8);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

.btn-cancel {
  padding: 10px 20px;
  background: #f1f5f9;
  border: none;
  border-radius: 8px;
  color: #64748b;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #e2e8f0;
}

.btn-submit {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-secondary {
  padding: 10px 20px;
  background: #f1f5f9;
  border: none;
  border-radius: 8px;
  color: #64748b;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

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
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid #e2e8f0;
  transition: all 0.2s;
  background: white;
}

.plat-select-card:hover {
  border-color: #667eea;
  transform: translateY(-2px);
}

.plat-select-card.selected {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.select-image {
  position: relative;
  width: 100%;
  height: 120px;
  overflow: hidden;
  background: #f1f5f9;
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
  color: #94a3b8;
}

.selected-check {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(102, 126, 234, 0.8);
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
  color: #667eea;
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
