<template>
  <div class="verification">
    <h1>Vérification d'adhésion</h1>
    <div class="search-form">
      <div class="search-group">
        <input
          v-model="searchTerm"
          type="text"
          placeholder="Rechercher par nom, email ou numéro de carte..."
          @keyup.enter="search"
        />
        <button @click="search" :disabled="loading">
          {{ loading ? 'Recherche...' : 'Rechercher' }}
        </button>
      </div>
    </div>

    <div v-if="result" class="result">
      <div v-if="result.found" :class="['result-card', result.valid ? 'valid' : 'invalid']">
        <h2><span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 5px;">{{ result.valid ? 'check_circle' : 'cancel' }}</span> {{ result.valid ? 'Adhésion valide' : 'Adhésion expirée' }}</h2>
        <div class="result-info">
          <p><strong>Nom :</strong> {{ result.data.nom }} {{ result.data.prenom }}</p>
          <p><strong>Email :</strong> {{ result.data.email }}</p>
          <p><strong>Date d'adhésion :</strong> {{ formatDate(result.data.date_adhesion) }}</p>
          <p><strong>Statut :</strong> {{ result.data.statut }}</p>
          <p v-if="result.data.carte">
            <strong>Carte :</strong> {{ result.data.carte.numero }} ({{ result.data.carte.statut }})
          </p>
        </div>
      </div>
      <div v-else class="result-card not-found">
        <p>Aucun adhérent trouvé</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { verificationApi } from '@/services/api';

const searchTerm = ref('');
const result = ref<any>(null);
const loading = ref(false);

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR');
}

async function search() {
  if (!searchTerm.value.trim()) return;

  loading.value = true;
  try {
    const response = await verificationApi.check({ nom: searchTerm.value });
    result.value = response.data.data || response.data;
  } catch (error: any) {
    console.error('Erreur lors de la recherche:', error);
    result.value = { found: false };
    if (error.response?.data?.error) {
      alert(error.response.data.error);
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.verification {
  width: 100%;
}

.search-form {
  margin-bottom: 30px;
}

.search-group {
  display: flex;
  gap: 10px;
}

.search-group input {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
}

.search-group button {
  padding: 12px 24px;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

.search-group button:hover:not(:disabled) {
  background-color: #5568d3;
}

.search-group button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.result-card {
  background: white;
  padding: 25px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.result-card.valid {
  border-left: 4px solid #27ae60;
}

.result-card.invalid {
  border-left: 4px solid #e74c3c;
}

.result-card.not-found {
  border-left: 4px solid #f39c12;
}

.result-card h2 {
  margin-bottom: 15px;
  color: #2c3e50;
}

.result-info p {
  margin-bottom: 10px;
  color: #555;
}
</style>
