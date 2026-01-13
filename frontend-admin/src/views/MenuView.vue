<template>
  <div class="menu">
    <h1>Menu du jour</h1>
    
    <div v-if="authStore.user?.role === 'admin' || authStore.user?.role === 'super_admin'" class="admin-section">
      <button @click="showEditModal = true" class="btn-primary">Créer/Modifier le menu</button>
    </div>

    <div v-if="menuDuJour" class="menu-display">
      <h2>Menu du {{ formatDate(menuDuJour.date_menu) }}</h2>
      <div v-if="menuDuJour.plats && menuDuJour.plats.length > 0" class="plats-list">
        <div v-for="plat in menuDuJour.plats" :key="plat.id" class="plat-card" :class="{ unavailable: !plat.disponible }">
          <div class="plat-header">
            <h3>{{ plat.nom }}</h3>
            <span class="prix">{{ plat.prix }} €</span>
          </div>
          <p v-if="plat.description" class="description">{{ plat.description }}</p>
          <span v-if="!plat.disponible" class="epuise">Épuisé</span>
        </div>
      </div>
      <p v-else class="no-menu">Aucun plat disponible pour aujourd'hui</p>
    </div>
    <div v-else class="loading">Chargement du menu...</div>

    <!-- Modal édition (admin) -->
    <div v-if="showEditModal" class="modal" @click.self="showEditModal = false">
      <div class="modal-content large">
        <h2>Gérer le menu du jour</h2>
        <div class="form-group">
          <label>Date du menu</label>
          <input v-model="menuForm.date_menu" type="date" required />
        </div>
        <div class="plats-edit">
          <h3>Plats</h3>
          <div v-for="(plat, index) in menuForm.plats" :key="index" class="plat-edit">
            <input v-model="plat.nom" placeholder="Nom du plat" />
            <input v-model="plat.description" placeholder="Description (optionnel)" />
            <input v-model.number="plat.prix" type="number" step="0.01" placeholder="Prix" />
            <label>
              <input v-model="plat.disponible" type="checkbox" />
              Disponible
            </label>
            <button @click="removePlat(index)" class="btn-remove">Supprimer</button>
          </div>
          <button @click="addPlat" class="btn-add">+ Ajouter un plat</button>
        </div>
        <div class="modal-actions">
          <button @click="saveMenu" :disabled="saving" class="btn-primary">
            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
          <button @click="showEditModal = false" class="btn-cancel">Annuler</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { menuApi } from '@/services/api';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const menuDuJour = ref<any>(null);
const showEditModal = ref(false);
const saving = ref(false);
const menuForm = ref({
  date_menu: new Date().toISOString().split('T')[0],
  plats: [{ nom: '', description: '', prix: 0, disponible: true }],
});

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

async function loadMenu() {
  try {
    const response = await menuApi.jour();
    menuDuJour.value = response.data.data || response.data;
  } catch (error: any) {
    console.error('Erreur lors du chargement du menu:', error);
    if (error.response?.data?.error) {
      // Ne pas alerter si c'est juste qu'il n'y a pas de menu
      if (error.response.status !== 404) {
        alert(error.response.data.error);
      }
    }
  }
}

function addPlat() {
  menuForm.value.plats.push({ nom: '', description: '', prix: 0, disponible: true });
}

function removePlat(index: number) {
  menuForm.value.plats.splice(index, 1);
}

async function saveMenu() {
  saving.value = true;
  try {
    await menuApi.create(menuForm.value);
    showEditModal.value = false;
    await loadMenu();
    alert('Menu enregistré avec succès !');
  } catch (error: any) {
    alert(error.response?.data?.error || 'Erreur lors de l\'enregistrement');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadMenu();
});
</script>

<style scoped>
.menu {
  width: 100%;
}

.admin-section {
  margin-bottom: 30px;
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

.menu-display {
  background: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.menu-display h2 {
  margin-bottom: 20px;
  color: #2c3e50;
}

.plats-list {
  display: grid;
  gap: 15px;
}

.plat-card {
  padding: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: #f9f9f9;
}

.plat-card.unavailable {
  opacity: 0.6;
}

.plat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.plat-header h3 {
  margin: 0;
  color: #2c3e50;
}

.prix {
  font-size: 20px;
  font-weight: bold;
  color: #27ae60;
}

.description {
  color: #555;
  margin-bottom: 10px;
}

.epuise {
  color: #e74c3c;
  font-style: italic;
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
  max-width: 800px;
}

.plats-edit {
  margin-top: 20px;
}

.plat-edit {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr auto auto;
  gap: 10px;
  margin-bottom: 15px;
  align-items: center;
}

.plat-edit input[type="text"],
.plat-edit input[type="number"] {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.btn-add {
  padding: 10px;
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.btn-remove {
  padding: 8px 12px;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn-cancel {
  background-color: #95a5a6;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 5px;
  cursor: pointer;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}
</style>
