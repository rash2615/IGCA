<template>
  <div class="menu-restaurant">
    <!-- Mode édition / visualisation -->
    <div class="view-toggle">
      <button 
        @click="editMode = false" 
        :class="['toggle-btn', { active: !editMode }]"
      >
        <span class="material-symbols-outlined">visibility</span>
        Voir le menu
      </button>
      <button 
        @click="editMode = true" 
        :class="['toggle-btn', { active: editMode }]"
      >
        <span class="material-symbols-outlined">edit</span>
        Modifier le menu
      </button>
    </div>

    <!-- Sélecteur de date -->
    <div class="date-selector-bar">
      <button @click="previousDay" class="btn-nav">
        <span class="material-symbols-outlined">chevron_left</span>
      </button>
      <div class="date-display">
        <input v-model="selectedDate" type="date" @change="loadMenuForDate" class="date-input" />
        <span class="date-formatted">{{ formatDateLong(selectedDate) }}</span>
      </div>
      <button @click="nextDay" class="btn-nav">
        <span class="material-symbols-outlined">chevron_right</span>
      </button>
      <button @click="goToToday" class="btn-today">
        <span class="material-symbols-outlined">today</span>
        Aujourd'hui
      </button>
    </div>

    <!-- MODE VISUALISATION - Carte de menu -->
    <div v-if="!editMode" class="menu-card-container">
      <div v-if="loading" class="loading-state">
        <span class="material-symbols-outlined spin">sync</span>
        <p>Chargement du menu...</p>
      </div>
      
      <div v-else-if="currentMenu && currentMenu.plats && currentMenu.plats.length > 0" class="menu-card-modern">
        <!-- En-tête moderne -->
        <div class="menu-header-modern">
          <div class="header-left">
            <h1 class="header-title-main">DELICIOUS MEALS</h1>
          </div>
          <div class="header-divider"></div>
          <div class="header-right">
            <h2 class="header-title-sub">EXCLUSIVE MENU</h2>
            <p class="header-date">{{ formatDateShort(currentMenu.date_menu) }}</p>
          </div>
        </div>

        <!-- Grille de plats moderne -->
        <div class="menu-grid-modern">
          <div 
            v-for="(plat, index) in currentMenu.plats" 
            :key="plat.id" 
            class="menu-item-modern"
            :class="{ unavailable: !plat.disponible }"
          >
            <div class="item-image-wrapper">
              <div class="item-image-modern">
                <img 
                  v-if="plat.image_url || plat.imagePreview"
                  :src="plat.imagePreview || getImageUrl(plat.image_url)" 
                  :alt="plat.nom" 
                  @error="handleImageError"
                />
                <div v-else class="image-placeholder-modern">
                  <span class="material-symbols-outlined">restaurant</span>
                </div>
              </div>
              <!-- Badge épuisé sur l'image -->
              <div v-if="!plat.disponible" class="badge-overlay unavailable-badge">
                <span class="material-symbols-outlined">block</span>
                ÉPUISÉ
              </div>
              <!-- Badge disponible sur l'image -->
              <div v-else class="badge-overlay available-badge">
                <span class="material-symbols-outlined">check_circle</span>
                DISPONIBLE
              </div>
            </div>
            
            <div class="item-info-modern">
              <div class="item-header-modern">
                <h3 class="item-name-modern">{{ plat.nom.toUpperCase() }}</h3>
              </div>
              <p v-if="plat.description" class="item-description-modern">{{ plat.description }}</p>
              <div class="item-footer-modern">
                <span class="item-price-modern">{{ formatPrice(plat.prix) }} €</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Pied de page -->
        <div class="menu-footer-modern">
          <p>Bon appétit !</p>
          <p class="footer-note-modern">Menu préparé avec amour par l'équipe IGCA Paris</p>
        </div>
      </div>

      <div v-else class="empty-menu-card">
        <div class="empty-content">
          <span class="material-symbols-outlined">restaurant_menu</span>
          <h2>Aucun menu disponible</h2>
          <p>Créez un menu pour cette date en mode édition</p>
        </div>
      </div>
    </div>

    <!-- MODE ÉDITION - Interface simplifiée -->
    <div v-else class="edit-mode-container">
      <div class="edit-header">
        <h2>Modifier le menu</h2>
        <p class="edit-subtitle">Glissez-déposez pour réorganiser, cliquez pour modifier</p>
      </div>

      <!-- Actions rapides -->
      <div class="quick-actions">
        <button @click="showAddPlatModal = true" class="btn-add-plat">
          <span class="material-symbols-outlined">add_circle</span>
          Ajouter un plat
        </button>
        <button @click="showAddExistingModal = true" class="btn-add-existing">
          <span class="material-symbols-outlined">library_add</span>
          Ajouter depuis la liste
        </button>
        <button @click="saveMenu" :disabled="saving" class="btn-save-menu">
          <span class="material-symbols-outlined">save</span>
          {{ saving ? 'Enregistrement...' : 'Enregistrer le menu' }}
        </button>
      </div>

      <!-- Liste des plats du menu (éditable) -->
      <div class="menu-plats-edit">
        <div 
          v-for="(plat, index) in menuPlats" 
          :key="plat.id || `temp-${index}`"
          class="plat-edit-card"
          :class="{ unavailable: !plat.disponible }"
        >
          <div class="plat-edit-image">
            <img
              v-if="plat.image_url || plat.imagePreview"
              :src="plat.imagePreview || getImageUrl(plat.image_url)"
              :alt="plat.nom"
              @error="handleImageError"
            />
            <div v-else class="image-placeholder-edit">
              <span class="material-symbols-outlined">image</span>
            </div>
            <button @click="editPlatImage(plat, index)" class="btn-change-image" title="Changer l'image">
              <span class="material-symbols-outlined">photo_camera</span>
            </button>
          </div>

          <div class="plat-edit-content">
            <div class="edit-row">
              <input
                v-model="plat.nom"
                type="text"
                placeholder="Nom du plat"
                class="input-large"
                @blur="autoSave"
              />
              <input
                v-model.number="plat.prix"
                type="number"
                step="0.01"
                min="0"
                placeholder="Prix"
                class="input-price"
                @blur="autoSave"
              />
              <span class="currency">€</span>
            </div>

            <textarea
              v-model="plat.description"
              placeholder="Description (optionnel)"
              rows="2"
              class="input-description"
              @blur="autoSave"
            ></textarea>

            <div class="edit-row-small">
              <label class="switch-container large">
                <input
                  v-model="plat.disponible"
                  type="checkbox"
                  @change="autoSave"
                />
                <span class="switch-label">
                  <span class="material-symbols-outlined">{{ plat.disponible ? 'check_circle' : 'cancel' }}</span>
                  <strong>{{ plat.disponible ? 'Disponible' : 'Épuisé' }}</strong>
                </span>
              </label>

              <button @click="removePlatFromMenu(index)" class="btn-remove-plat" title="Retirer du menu">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>

          <div class="drag-handle">
            <span class="material-symbols-outlined">drag_indicator</span>
          </div>
        </div>

        <div v-if="menuPlats.length === 0" class="empty-plats">
          <span class="material-symbols-outlined">add_circle_outline</span>
          <p>Ajoutez des plats au menu</p>
        </div>
      </div>
    </div>

    <!-- Modal ajouter nouveau plat -->
    <Teleport to="body">
      <div v-if="showAddPlatModal" class="modal-overlay" @click.self="closeAddPlatModal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Nouveau plat</h2>
            <button @click="closeAddPlatModal" class="btn-icon-small">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="simple-form">
              <div class="form-section">
                <label>Photo du plat</label>
                <div class="image-options">
                  <div class="image-tabs">
                    <button 
                      type="button"
                      @click="imageInputMode = 'url'"
                      :class="['tab-btn', { active: imageInputMode === 'url' }]"
                    >
                      <span class="material-symbols-outlined">link</span>
                      URL
                    </button>
                    <button 
                      type="button"
                      @click="imageInputMode = 'upload'"
                      :class="['tab-btn', { active: imageInputMode === 'upload' }]"
                    >
                      <span class="material-symbols-outlined">upload</span>
                      Upload
                    </button>
                  </div>
                  
                  <!-- Mode URL -->
                  <div v-if="imageInputMode === 'url'" class="image-url-input">
                    <input
                      v-model="newPlatForm.imageUrl"
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      @input="updateImageFromUrl"
                      class="url-input-field"
                    />
                    <div v-if="newPlatForm.imageUrl && imageUrlPreview" class="image-preview-simple">
                      <img :src="imageUrlPreview" alt="Aperçu" />
                      <button @click="clearImageUrl" class="btn-remove-image">
                        <span class="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  </div>
                  
                  <!-- Mode Upload -->
                  <div v-else class="image-upload-simple">
                    <div v-if="newPlatForm.imagePreview" class="image-preview-simple">
                      <img :src="newPlatForm.imagePreview" alt="Aperçu" />
                      <button @click="clearNewPlatImage" class="btn-remove-image">
                        <span class="material-symbols-outlined">close</span>
                      </button>
                    </div>
                    <label v-else class="upload-area">
                      <input type="file" @change="handleNewPlatImage" accept="image/*" hidden />
                      <span class="material-symbols-outlined">add_photo_alternate</span>
                      <span>Cliquez pour ajouter une photo</span>
                    </label>
                  </div>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Nom du plat *</label>
                  <input v-model="newPlatForm.nom" type="text" placeholder="Ex: Thali végétarien" required />
                </div>
                <div class="form-group">
                  <label>Prix (€) *</label>
                  <input v-model.number="newPlatForm.prix" type="number" step="0.01" min="0" required />
                </div>
              </div>

              <div class="form-group">
                <label>Description</label>
                <textarea v-model="newPlatForm.description" rows="3" placeholder="Décrivez le plat..."></textarea>
              </div>

              <div class="form-group">
                <label>Statut</label>
                <label class="switch-container large">
                  <input v-model="newPlatForm.disponible" type="checkbox" />
                  <span class="switch-label">
                    <span class="material-symbols-outlined">{{ newPlatForm.disponible ? 'check_circle' : 'cancel' }}</span>
                    <strong>{{ newPlatForm.disponible ? 'Disponible' : 'Épuisé' }}</strong>
                  </span>
                </label>
              </div>

              <div class="modal-actions">
                <button @click="closeAddPlatModal" class="btn-secondary">Annuler</button>
                <button @click="addNewPlatToMenu" :disabled="!newPlatForm.nom || !newPlatForm.prix" class="btn-primary">
                  <span class="material-symbols-outlined">add</span>
                  Ajouter au menu
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal ajouter plat existant -->
    <Teleport to="body">
      <div v-if="showAddExistingModal" class="modal-overlay" @click.self="showAddExistingModal = false">
        <div class="modal-content large">
          <div class="modal-header">
            <h2>Ajouter des plats existants</h2>
            <button @click="showAddExistingModal = false" class="btn-icon-small">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="plats-grid-select">
              <div
                v-for="plat in availablePlats"
                :key="plat.id"
                class="plat-select-card"
                :class="{ selected: isPlatSelected(plat.id) }"
                @click="togglePlatSelection(plat.id)"
              >
                <div class="plat-select-image">
                  <img
                    v-if="plat.image_url"
                    :src="getImageUrl(plat.image_url)"
                    :alt="plat.nom"
                    @error="handleImageError"
                    style="width: 100%; height: 100%; object-fit: cover;"
                  />
                  <div v-else class="image-placeholder-select">
                    <span class="material-symbols-outlined">restaurant</span>
                  </div>
                  <div v-if="isPlatSelected(plat.id)" class="selected-overlay">
                    <span class="material-symbols-outlined">check_circle</span>
                  </div>
                </div>
                <div class="plat-select-info">
                  <h4>{{ plat.nom }}</h4>
                  <p class="price-select">{{ formatPrice(plat.prix) }} €</p>
                </div>
              </div>
            </div>
            <div class="modal-actions">
              <button @click="showAddExistingModal = false" class="btn-secondary">Annuler</button>
              <button @click="addSelectedPlatsToMenu" class="btn-primary" :disabled="selectedPlats.length === 0">
                <span class="material-symbols-outlined">add</span>
                Ajouter {{ selectedPlats.length }} plat{{ selectedPlats.length > 1 ? 's' : '' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal changer image -->
    <Teleport to="body">
      <div v-if="showImageModal" class="modal-overlay" @click.self="closeImageModal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Changer l'image</h2>
            <button @click="closeImageModal" class="btn-icon-small">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="image-upload-simple">
              <div v-if="imageForm.preview" class="image-preview-simple">
                <img :src="imageForm.preview" alt="Aperçu" />
                <button @click="clearImageForm" class="btn-remove-image">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
              <label v-else class="upload-area">
                <input type="file" @change="handleImageFormSelect" accept="image/*" hidden />
                <span class="material-symbols-outlined">add_photo_alternate</span>
                <span>Cliquez pour changer la photo</span>
              </label>
            </div>
            <div class="modal-actions">
              <button @click="closeImageModal" class="btn-secondary">Annuler</button>
              <button 
                @click="saveImageChange" 
                class="btn-primary" 
                :disabled="(imageFormMode === 'upload' && !imageForm.file && !imageForm.preview) || (imageFormMode === 'url' && !imageForm.url)"
              >
                <span class="material-symbols-outlined">save</span>
                Enregistrer
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

const loading = ref(false);
const editMode = ref(false);
const currentMenu = ref<any>(null);
const menuPlats = ref<any[]>([]);
const availablePlats = ref<any[]>([]);
const selectedPlats = ref<number[]>([]);
const saving = ref(false);

const selectedDate = ref(new Date().toISOString().split('T')[0]);

const showAddPlatModal = ref(false);
const showAddExistingModal = ref(false);
const showImageModal = ref(false);

const editingPlatIndex = ref<number | null>(null);
const imageFormMode = ref<'url' | 'upload'>('url');
const imageForm = ref({
  file: null as File | null,
  preview: '',
  url: '',
  urlPreview: '',
  platIndex: -1,
});

const imageInputMode = ref<'url' | 'upload'>('url');

const newPlatForm = ref({
  nom: '',
  description: '',
  prix: 0,
  disponible: true,
  imageFile: null as File | null,
  imagePreview: '',
  imageUrl: '',
});

const imageUrlPreview = ref('');

function getImageUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('data:')) return url; // Data URL (preview)
  // S'assurer que l'URL commence par /
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const fullUrl = `${apiUrl}${cleanUrl}`;
  console.log('Image URL construite:', { original: url, clean: cleanUrl, full: fullUrl });
  return fullUrl;
}

function handleImageError(event: Event) {
  const target = event.target as HTMLImageElement;
  target.style.display = 'none';
}

function formatDateLong(date: string) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);
}

function formatDateShort(date: string) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

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

async function loadMenuForDate() {
  loading.value = true;
  try {
    const response = await menuApi.getByDate(selectedDate.value);
    currentMenu.value = response.data.data || null;
    if (currentMenu.value && currentMenu.value.plats) {
      menuPlats.value = [...currentMenu.value.plats];
    } else {
      menuPlats.value = [];
    }
  } catch (error: any) {
    console.error('Erreur lors du chargement du menu:', error);
    currentMenu.value = null;
    menuPlats.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadAvailablePlats() {
  try {
    const response = await menuApi.plats.list();
    availablePlats.value = response.data.data || [];
  } catch (error: any) {
    console.error('Erreur lors du chargement des plats:', error);
  }
}

function isPlatSelected(platId: number) {
  return selectedPlats.value.includes(platId);
}

function togglePlatSelection(platId: number) {
  const index = selectedPlats.value.indexOf(platId);
  if (index > -1) {
    selectedPlats.value.splice(index, 1);
  } else {
    selectedPlats.value.push(platId);
  }
}

function addSelectedPlatsToMenu() {
  const platsToAdd = availablePlats.value
    .filter(p => selectedPlats.value.includes(p.id))
    .map(p => ({ ...p }));
  
  menuPlats.value.push(...platsToAdd);
  selectedPlats.value = [];
  showAddExistingModal.value = false;
}

function handleNewPlatImage(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    newPlatForm.value.imageFile = target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      newPlatForm.value.imagePreview = e.target?.result as string;
    };
    reader.readAsDataURL(target.files[0]);
  }
}

function clearNewPlatImage() {
  newPlatForm.value.imageFile = null;
  newPlatForm.value.imagePreview = '';
}

function updateImageFromUrl() {
  if (newPlatForm.value.imageUrl && isValidUrl(newPlatForm.value.imageUrl)) {
    imageUrlPreview.value = newPlatForm.value.imageUrl;
  } else {
    imageUrlPreview.value = '';
  }
}

function clearImageUrl() {
  newPlatForm.value.imageUrl = '';
  imageUrlPreview.value = '';
}

function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function addNewPlatToMenu() {
  if (!newPlatForm.value.nom || !newPlatForm.value.prix) {
    alert('Le nom et le prix sont requis');
    return;
  }

  // Déterminer la source de l'image (URL ou upload)
  let imageUrl = '';
  let platId = null;

  // Si une URL d'image est fournie
  if (imageInputMode.value === 'url' && newPlatForm.value.imageUrl && isValidUrl(newPlatForm.value.imageUrl)) {
    imageUrl = newPlatForm.value.imageUrl;
    // Créer le plat avec l'URL directement
    try {
      const formData = new FormData();
      formData.append('nom', newPlatForm.value.nom);
      formData.append('description', newPlatForm.value.description || '');
      formData.append('prix', newPlatForm.value.prix.toString());
      formData.append('quantite', '0');
      formData.append('disponible', newPlatForm.value.disponible.toString());
      formData.append('image_url', imageUrl);

      const response = await menuApi.plats.create(formData);
      if (response.data && response.data.data) {
        imageUrl = response.data.data.image_url || imageUrl;
        platId = response.data.data.id || null;
        console.log('Plat créé avec URL image:', { imageUrl, platId });
      }
    } catch (error: any) {
      console.error('Erreur lors de la création du plat avec URL:', error);
      // Continuer quand même, on utilisera l'URL directement
    }
  }
  // Si un fichier est uploadé
  else if (imageInputMode.value === 'upload' && newPlatForm.value.imageFile) {
    try {
      const formData = new FormData();
      formData.append('nom', newPlatForm.value.nom);
      formData.append('description', newPlatForm.value.description || '');
      formData.append('prix', newPlatForm.value.prix.toString());
      formData.append('quantite', '0');
      formData.append('disponible', newPlatForm.value.disponible.toString());
      formData.append('image', newPlatForm.value.imageFile);

      const response = await menuApi.plats.create(formData);
      if (response.data && response.data.data) {
        imageUrl = response.data.data.image_url || '';
        platId = response.data.data.id || null;
        console.log('Plat créé avec image uploadée:', { imageUrl, platId });
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'upload de l\'image:', error);
      alert('Erreur lors de l\'upload de l\'image. Le plat sera ajouté sans image.');
    }
  }

  // Ajouter au menu
  const newPlat = {
    id: platId,
    nom: newPlatForm.value.nom,
    description: newPlatForm.value.description,
    prix: newPlatForm.value.prix,
    quantite: 0,
    disponible: newPlatForm.value.disponible,
    image_url: imageUrl || newPlatForm.value.imagePreview,
    imageFile: newPlatForm.value.imageFile,
    imagePreview: imageUrl ? '' : newPlatForm.value.imagePreview,
  };
  
  menuPlats.value.push(newPlat);
  console.log('Plat ajouté au menu:', newPlat);

  // Réinitialiser le formulaire
  newPlatForm.value = {
    nom: '',
    description: '',
    prix: 0,
    disponible: true,
    imageFile: null,
    imagePreview: '',
    imageUrl: '',
  };
  imageUrlPreview.value = '';
  imageInputMode.value = 'url';

  showAddPlatModal.value = false;
}

function removePlatFromMenu(index: number) {
  if (confirm('Retirer ce plat du menu ?')) {
    menuPlats.value.splice(index, 1);
  }
}

function editPlatImage(plat: any, index: number) {
  editingPlatIndex.value = index;
  const currentImageUrl = plat.image_url || plat.imagePreview || '';
  imageForm.value = {
    file: null,
    preview: currentImageUrl && !currentImageUrl.startsWith('http') ? getImageUrl(currentImageUrl) : '',
    url: currentImageUrl && currentImageUrl.startsWith('http') ? currentImageUrl : '',
    urlPreview: currentImageUrl && currentImageUrl.startsWith('http') ? currentImageUrl : '',
    platIndex: index,
  };
  imageFormMode.value = currentImageUrl && currentImageUrl.startsWith('http') ? 'url' : 'upload';
  showImageModal.value = true;
}

function handleImageFormSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    imageForm.value.file = target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      imageForm.value.preview = e.target?.result as string;
    };
    reader.readAsDataURL(target.files[0]);
  }
}

function clearImageForm() {
  imageForm.value.file = null;
  imageForm.value.preview = '';
}

function updateImageFormFromUrl() {
  if (imageForm.value.url && isValidUrl(imageForm.value.url)) {
    imageForm.value.urlPreview = imageForm.value.url;
  } else {
    imageForm.value.urlPreview = '';
  }
}

function clearImageFormUrl() {
  imageForm.value.url = '';
  imageForm.value.urlPreview = '';
}

async function saveImageChange() {
  if (editingPlatIndex.value === null) return;
  if (imageFormMode.value === 'upload' && !imageForm.value.file && !imageForm.value.preview) return;
  if (imageFormMode.value === 'url' && !imageForm.value.url) return;

  const plat = menuPlats.value[editingPlatIndex.value];
  
  try {
    const formData = new FormData();
    formData.append('nom', plat.nom);
    formData.append('description', plat.description || '');
    formData.append('prix', plat.prix.toString());
    formData.append('quantite', '0');
    formData.append('disponible', plat.disponible.toString());

    // Si mode URL
    if (imageFormMode.value === 'url' && imageForm.value.url && isValidUrl(imageForm.value.url)) {
      formData.append('image_url', imageForm.value.url);
    }
    // Si mode upload
    else if (imageFormMode.value === 'upload' && imageForm.value.file) {
      formData.append('image', imageForm.value.file);
    }

    if (plat.id) {
      const response = await menuApi.plats.update(plat.id, formData);
      if (response.data && response.data.data) {
        plat.image_url = response.data.data.image_url || imageForm.value.url || '';
        plat.imagePreview = '';
        plat.imageFile = null;
        console.log('Image mise à jour:', plat.image_url);
      }
    } else {
      // Plat temporaire
      if (imageFormMode.value === 'url') {
        plat.image_url = imageForm.value.url;
      } else {
        plat.imagePreview = imageForm.value.preview;
        plat.imageFile = imageForm.value.file;
      }
      console.log('Image temporaire sauvegardée');
    }

    closeImageModal();
  } catch (error: any) {
    console.error('Erreur lors de l\'enregistrement de l\'image:', error);
    alert(error.response?.data?.error || 'Erreur lors de l\'enregistrement de l\'image');
  }
}

function closeImageModal() {
  showImageModal.value = false;
  editingPlatIndex.value = null;
  imageForm.value = {
    file: null,
    preview: '',
    url: '',
    urlPreview: '',
    platIndex: -1,
  };
  imageFormMode.value = 'url';
}

function closeAddPlatModal() {
  showAddPlatModal.value = false;
  newPlatForm.value = {
    nom: '',
    description: '',
    prix: 0,
    quantite: 10,
    disponible: true,
    imageFile: null,
    imagePreview: '',
  };
}

function autoSave() {
  // Auto-save pourrait être implémenté ici si nécessaire
}

async function saveMenu() {
  if (menuPlats.value.length === 0) {
    alert('Ajoutez au moins un plat au menu');
    return;
  }

  saving.value = true;
  try {
    // Sauvegarder les nouveaux plats d'abord (ceux sans ID ou avec imageFile)
    for (let i = 0; i < menuPlats.value.length; i++) {
      const plat = menuPlats.value[i];
      
      // Si le plat n'a pas d'ID ou a une imageFile à uploader
      if (!plat.id || plat.imageFile) {
        const formData = new FormData();
        formData.append('nom', plat.nom);
        formData.append('description', plat.description || '');
        formData.append('prix', plat.prix.toString());
        formData.append('quantite', '0'); // Quantité non utilisée, toujours 0
        formData.append('disponible', plat.disponible.toString());
        
        if (plat.imageFile) {
          formData.append('image', plat.imageFile);
        } else if (plat.image_url && !plat.image_url.startsWith('data:')) {
          // Si on a déjà une URL serveur, la garder
          formData.append('image_url', plat.image_url);
        }

        if (plat.id) {
          // Mettre à jour le plat existant
          const response = await menuApi.plats.update(plat.id, formData);
          if (response.data && response.data.data) {
            menuPlats.value[i] = { ...response.data.data };
          }
        } else {
          // Créer un nouveau plat
          const response = await menuApi.plats.create(formData);
          if (response.data && response.data.data) {
            menuPlats.value[i] = { ...response.data.data };
          }
        }
      } else if (plat.id) {
        // Mettre à jour le plat existant sans changer l'image
        const formData = new FormData();
        formData.append('nom', plat.nom);
        formData.append('description', plat.description || '');
        formData.append('prix', plat.prix.toString());
        formData.append('quantite', '0'); // Quantité non utilisée, toujours 0
        formData.append('disponible', plat.disponible.toString());
        if (plat.image_url && !plat.image_url.startsWith('data:')) {
          formData.append('image_url', plat.image_url);
        }

        const response = await menuApi.plats.update(plat.id, formData);
        if (response.data && response.data.data) {
          menuPlats.value[i] = { ...response.data.data };
        }
      }
    }

    // Enregistrer le menu avec les plats mis à jour
    const plats = menuPlats.value.map(p => ({
      id: p.id,
      nom: p.nom,
      description: p.description,
      prix: p.prix,
      disponible: p.disponible,
      quantite: 0, // Quantité non utilisée, toujours 0
      image_url: p.image_url && !p.image_url.startsWith('data:') ? p.image_url : null,
    }));

    await menuApi.create({
      date_menu: selectedDate.value,
      plats,
    });

    alert('Menu enregistré avec succès !');
    await loadMenuForDate();
    editMode.value = false;
  } catch (error: any) {
    console.error('Erreur lors de l\'enregistrement:', error);
    alert(error.response?.data?.error || 'Erreur lors de l\'enregistrement');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadMenuForDate();
  loadAvailablePlats();
});
</script>

<style scoped>
.menu-restaurant {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  background: #f8fafc;
  min-height: 100vh;
}

.view-toggle {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  background: white;
  padding: 8px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.toggle-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  background: transparent;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.date-selector-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  background: white;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.btn-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  color: #64748b;
}

.date-display {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-input {
  padding: 8px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
}

.date-formatted {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  text-transform: capitalize;
}

.btn-today {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

/* CARTE DE MENU - Mode visualisation moderne */
.menu-card-container {
  display: flex;
  justify-content: center;
  padding: 40px 20px;
  background: #f5f5f5;
}

.menu-card-modern {
  background: white;
  border-radius: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 1200px;
  width: 100%;
  overflow: hidden;
  position: relative;
}

.menu-header-modern {
  background: white;
  padding: 30px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e5e5;
}

.header-left {
  flex: 1;
}

.header-title-main {
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  color: #dc2626;
  letter-spacing: 2px;
}

.header-divider {
  width: 1px;
  height: 50px;
  background: #e5e5e5;
  margin: 0 30px;
}

.header-right {
  flex: 1;
  text-align: right;
}

.header-title-sub {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  letter-spacing: 1px;
}

.header-date {
  margin: 0;
  font-size: 14px;
  color: #64748b;
  text-transform: capitalize;
}

.menu-grid-modern {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0;
  padding: 0;
  background: white;
}

.menu-item-modern {
  padding: 30px;
  border-bottom: 1px dashed #e5e5e5;
  border-right: 1px dashed #e5e5e5;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: background 0.2s;
}

.menu-item-modern:nth-child(even) {
  border-right: none;
}

.menu-item-modern:nth-last-child(-n+2) {
  border-bottom: none;
}

.menu-item-modern:hover {
  background: #fafafa;
}

.menu-item-modern.unavailable {
  opacity: 0.7;
}

.item-image-wrapper {
  position: relative;
  width: 100%;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f5f5;
}

.item-image-modern {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.item-image-modern img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder-modern {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  color: #94a3b8;
}

.image-placeholder-modern .material-symbols-outlined {
  font-size: 64px;
}

.badge-overlay {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  backdrop-filter: blur(10px);
}

.available-badge {
  background: rgba(16, 185, 129, 0.9);
  color: white;
}

.unavailable-badge {
  background: rgba(220, 38, 38, 0.9);
  color: white;
}

.badge-overlay .material-symbols-outlined {
  font-size: 16px;
}

.item-info-modern {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-header-modern {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.item-name-modern {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: 0.5px;
  line-height: 1.3;
  flex: 1;
}

.item-description-modern {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
  font-style: italic;
}

.item-footer-modern {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.item-price-modern {
  font-size: 20px;
  font-weight: 700;
  color: #dc2626;
}

.menu-footer-modern {
  background: #fafafa;
  padding: 30px 40px;
  text-align: center;
  border-top: 1px solid #e5e5e5;
}

.menu-footer-modern p {
  margin: 8px 0;
  color: #64748b;
}

.footer-note-modern {
  font-size: 12px;
  font-style: italic;
  color: #94a3b8;
}

.empty-menu-card {
  background: white;
  border-radius: 20px;
  padding: 80px 40px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

.empty-content .material-symbols-outlined {
  font-size: 80px;
  color: #cbd5e1;
  margin-bottom: 20px;
}

.empty-content h2 {
  color: #64748b;
  margin: 0 0 8px 0;
}

/* MODE ÉDITION */
.edit-mode-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.edit-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f1f5f9;
}

.edit-header h2 {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}

.edit-subtitle {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

.quick-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.btn-add-plat,
.btn-add-existing,
.btn-save-menu {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-plat {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.btn-add-existing {
  background: #f1f5f9;
  color: #475569;
}

.btn-save-menu {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  margin-left: auto;
}

.menu-plats-edit {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plat-edit-card {
  display: flex;
  gap: 20px;
  padding: 20px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  transition: all 0.2s;
}

.plat-edit-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
}

.plat-edit-image {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: #e2e8f0;
}

.plat-edit-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder-edit {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}

.btn-change-image {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.plat-edit-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.input-large {
  flex: 1;
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
}

.input-price {
  width: 100px;
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  text-align: right;
}

.currency {
  font-size: 18px;
  font-weight: 600;
  color: #667eea;
}

.input-description {
  width: 100%;
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}

.edit-row-small {
  display: flex;
  align-items: center;
  gap: 16px;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.input-small {
  width: 80px;
  padding: 8px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  text-align: center;
}

.switch-container {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.switch-container.large {
  padding: 12px 20px;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  transition: all 0.2s;
}

.switch-container.large:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.switch-container.large input[type="checkbox"]:checked ~ .switch-label {
  color: #059669;
}

.switch-container.large input[type="checkbox"]:not(:checked) ~ .switch-label {
  color: #dc2626;
}

.switch-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.switch-label strong {
  font-size: 16px;
}

.btn-remove-plat {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #fee2e2;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #dc2626;
  margin-left: auto;
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  color: #94a3b8;
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

.empty-plats {
  text-align: center;
  padding: 60px 20px;
  color: #94a3b8;
}

.empty-plats .material-symbols-outlined {
  font-size: 64px;
  margin-bottom: 16px;
}

/* Modals */
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
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.large {
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

.btn-icon-small {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #64748b;
}

.modal-body {
  padding: 24px;
}

.simple-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-section label {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.image-upload-simple {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.image-preview-simple {
  position: relative;
  width: 100%;
  max-width: 300px;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #e2e8f0;
}

.image-preview-simple img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.btn-remove-image {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #94a3b8;
}

.upload-area:hover {
  border-color: #667eea;
  background: #f8fafc;
}

.upload-area .material-symbols-outlined {
  font-size: 48px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.form-group input,
.form-group textarea {
  padding: 10px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
}

.switch-simple {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.switch-simple input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider-simple {
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

.slider-simple:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider-simple {
  background-color: #667eea;
}

input:checked + .slider-simple:before {
  transform: translateX(26px);
}

.plats-grid-select {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
}

.plat-select-card {
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.plat-select-card:hover {
  border-color: #667eea;
  transform: translateY(-2px);
}

.plat-select-card.selected {
  border-color: #667eea;
  background: #f0f4ff;
}

.plat-select-image {
  position: relative;
  width: 100%;
  height: 100px;
  overflow: hidden;
  background: #f8fafc;
}

.plat-select-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder-select {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}

.selected-overlay {
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

.plat-select-info {
  padding: 12px;
}

.plat-select-info h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.price-select {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #667eea;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #f1f5f9;
  color: #475569;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #64748b;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
