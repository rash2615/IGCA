<template>
  <div class="dons">
    <h1>Gestion des dons</h1>
    <div class="actions">
      <button @click="showImportModal = true" class="btn-primary">Importer CSV</button>
    </div>

    <div class="filters">
      <input
        v-model="filters.search"
        type="text"
        placeholder="Rechercher..."
        @input="loadDons"
      />
      <input
        v-model="filters.date_debut"
        type="date"
        @change="loadDons"
      />
      <input
        v-model="filters.date_fin"
        type="date"
        @change="loadDons"
      />
    </div>

    <div v-if="loading" class="loading">Chargement...</div>
    <table v-else class="data-table">
      <thead>
        <tr>
          <th>Nom</th>
          <th>Prénom</th>
          <th>Email</th>
          <th>Date</th>
          <th>Montant</th>
          <th>Moyen de paiement</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="don in dons" :key="don.id">
          <td>{{ don.nom || '-' }}</td>
          <td>{{ don.prenom || '-' }}</td>
          <td>{{ don.email || '-' }}</td>
          <td>{{ formatDate(don.date_don) }}</td>
          <td>{{ don.montant }} €</td>
          <td>{{ don.moyen_paiement }}</td>
        </tr>
      </tbody>
    </table>

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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { donsApi } from '@/services/api';

const dons = ref<any[]>([]);
const loading = ref(false);
const showImportModal = ref(false);
const selectedFile = ref<File | null>(null);
const importing = ref(false);
const filters = ref({
  search: '',
  date_debut: '',
  date_fin: '',
});

function formatDate(date: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR');
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0];
  }
}

async function loadDons() {
  loading.value = true;
  try {
    const response = await donsApi.list(filters.value);
    dons.value = response.data.data || response.data || [];
  } catch (error: any) {
    console.error('Erreur lors du chargement:', error);
    if (error.response?.data?.error) {
      alert(error.response.data.error);
    }
  } finally {
    loading.value = false;
  }
}

async function importCsv() {
  if (!selectedFile.value) return;

  importing.value = true;
  try {
    const response = await donsApi.import(selectedFile.value);
    if (response.data.importId) {
      // Valider l'import
      await donsApi.validateImport(response.data.importId, { records: response.data.records });
      showImportModal.value = false;
      selectedFile.value = null;
      await loadDons();
      alert('Import réussi !');
    }
  } catch (error: any) {
    alert(error.response?.data?.error || 'Erreur lors de l\'import');
  } finally {
    importing.value = false;
  }
}

onMounted(() => {
  loadDons();
});
</script>

<style scoped>
.dons {
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

.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.filters input {
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
