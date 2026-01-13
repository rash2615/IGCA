<template>
  <div class="cartes">
    <h1>Gestion des cartes</h1>
    <div class="actions">
      <button @click="showGenerateModal = true" class="btn-primary">Générer une carte</button>
    </div>

    <div class="filters">
      <select v-model="filters.statut" @change="loadCartes">
        <option value="">Tous les statuts</option>
        <option value="a_generer">À générer</option>
        <option value="generee">Générée</option>
        <option value="a_remettre">À remettre</option>
        <option value="remise">Remise</option>
      </select>
    </div>

    <div v-if="loading" class="loading">Chargement...</div>
    <table v-else class="data-table">
      <thead>
        <tr>
          <th>Numéro carte</th>
          <th>Nom</th>
          <th>Prénom</th>
          <th>Email</th>
          <th>Statut</th>
          <th>Date génération</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="carte in cartes" :key="carte.id">
          <td>{{ carte.numero_carte }}</td>
          <td>{{ carte.nom }}</td>
          <td>{{ carte.prenom }}</td>
          <td>{{ carte.email }}</td>
          <td>
            <span :class="['badge', `badge-${carte.statut}`]">{{ carte.statut }}</span>
          </td>
          <td>{{ formatDate(carte.date_generation) }}</td>
          <td>
            <button @click="previewCarte(carte.id)" class="btn-small">Prévisualiser</button>
            <button @click="downloadCarte(carte.id)" class="btn-small">Télécharger</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Modal génération -->
    <div v-if="showGenerateModal" class="modal" @click.self="showGenerateModal = false">
      <div class="modal-content">
        <h2>Générer une carte</h2>
        <div class="form-group">
          <label>ID Adhérent</label>
          <input v-model.number="newCarteAdhesionId" type="number" placeholder="ID de l'adhérent" />
        </div>
        <div class="modal-actions">
          <button @click="generateCarte" :disabled="!newCarteAdhesionId || generating">
            {{ generating ? 'Génération...' : 'Générer' }}
          </button>
          <button @click="showGenerateModal = false" class="btn-cancel">Annuler</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { cartesApi } from '@/services/api';

const cartes = ref<any[]>([]);
const loading = ref(false);
const showGenerateModal = ref(false);
const newCarteAdhesionId = ref<number | null>(null);
const generating = ref(false);
const filters = ref({ statut: '' });

function formatDate(date: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR');
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

async function generateCarte() {
  if (!newCarteAdhesionId.value) return;
  
  generating.value = true;
  try {
    await cartesApi.generate(newCarteAdhesionId.value);
    showGenerateModal.value = false;
    newCarteAdhesionId.value = null;
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
  } catch (error) {
    alert('Erreur lors du téléchargement');
  }
}

onMounted(() => {
  loadCartes();
});
</script>

<style scoped>
.cartes {
  width: 100%;
}

.actions {
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
}

.btn-primary:hover {
  background-color: #5568d3;
}

.filters {
  margin-bottom: 20px;
}

.filters select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.data-table {
  width: 100%;
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.data-table thead {
  background-color: #2c3e50;
  color: white;
}

.data-table th,
.data-table td {
  padding: 15px;
  text-align: left;
}

.data-table tbody tr {
  border-bottom: 1px solid #eee;
}

.data-table tbody tr:hover {
  background-color: #f9f9f9;
}

.badge {
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.badge-a_generer {
  background-color: #fff3cd;
  color: #856404;
}

.badge-generee {
  background-color: #d1ecf1;
  color: #0c5460;
}

.badge-remise {
  background-color: #d4edda;
  color: #155724;
}

.btn-small {
  padding: 6px 12px;
  margin-right: 5px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 12px;
}

.btn-small:hover {
  background-color: #2980b9;
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
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn-cancel {
  background-color: #95a5a6;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}
</style>
