<template>
  <div class="comptabilite">
    <div class="header">
      <h1>Comptabilité</h1>
      <div class="header-actions">
        <button @click="loadData" :disabled="loading" class="btn-refresh">
          <span v-if="!loading" class="material-symbols-outlined" style="vertical-align: middle; margin-right: 5px;">refresh</span>
          {{ loading ? 'Chargement...' : 'Actualiser' }}
        </button>
        <button @click="exportCsv" class="btn-export"><span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 5px;">download</span> Exporter CSV</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Chargement des données...</div>
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="loadData" class="retry-btn">Réessayer</button>
    </div>
    <div v-else-if="overview" class="overview">
      <!-- Adhésions -->
      <div class="section">
        <h2><span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 5px;">description</span> Adhésions</h2>
        <div class="stats">
          <div class="stat">
            <span class="label">Total adhésions :</span>
            <span class="value">{{ overview.adhesions?.total || 0 }}</span>
          </div>
          <div class="stat">
            <span class="label">Montant total :</span>
            <span class="value amount">{{ formatAmount(overview.adhesions?.total_montant) }} €</span>
          </div>
        </div>
        <div class="payment-methods" v-if="overview.adhesions?.par_moyen_paiement">
          <h3>Par moyen de paiement</h3>
          <div class="methods-grid">
            <div 
              v-for="(value, key) in overview.adhesions.par_moyen_paiement" 
              :key="key" 
              class="method"
              v-if="value.count > 0 || value.montant > 0"
            >
              <strong>{{ formatMoyenPaiement(key) }}:</strong> 
              {{ value.count }} adhésion(s) - {{ formatAmount(value.montant) }} €
            </div>
            <div v-if="Object.keys(overview.adhesions.par_moyen_paiement).length === 0" class="no-data">
              Aucune donnée disponible
            </div>
          </div>
        </div>
      </div>

      <!-- Dons -->
      <div class="section">
        <h2><span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 5px;">favorite</span> Dons</h2>
        <div class="stats">
          <div class="stat">
            <span class="label">Total dons :</span>
            <span class="value">{{ overview.dons?.total || 0 }}</span>
          </div>
          <div class="stat">
            <span class="label">Montant total :</span>
            <span class="value amount">{{ formatAmount(overview.dons?.total_montant) }} €</span>
          </div>
        </div>
        <div class="payment-methods" v-if="overview.dons?.par_moyen_paiement">
          <h3>Par moyen de paiement</h3>
          <div class="methods-grid">
            <div 
              v-for="(value, key) in overview.dons.par_moyen_paiement" 
              :key="key" 
              class="method"
              v-if="value.count > 0 || value.montant > 0"
            >
              <strong>{{ formatMoyenPaiement(key) }}:</strong> 
              {{ value.count }} don(s) - {{ formatAmount(value.montant) }} €
            </div>
            <div v-if="Object.keys(overview.dons.par_moyen_paiement).length === 0" class="no-data">
              Aucune donnée disponible
            </div>
          </div>
        </div>
      </div>

      <!-- Total général -->
      <div class="section total">
        <h2><span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 5px;">account_balance_wallet</span> Total général</h2>
        <div class="total-amount">
          {{ formatAmount(
            (overview.adhesions?.total_montant || 0) + 
            (overview.dons?.total_montant || 0)
          ) }} €
        </div>
        <div class="total-breakdown">
          <p>Adhésions : {{ formatAmount(overview.adhesions?.total_montant || 0) }} €</p>
          <p>Dons : {{ formatAmount(overview.dons?.total_montant || 0) }} €</p>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <p>Aucune donnée disponible</p>
      <button @click="loadData" class="retry-btn">Charger les données</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { comptabiliteApi } from '@/services/api';

const overview = ref<any>(null);
const loading = ref(false);
const error = ref('');

function formatAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0.00';
  }
  return parseFloat(amount.toString()).toFixed(2);
}

function formatMoyenPaiement(moyen: string): string {
  const moyens: Record<string, string> = {
    helloasso: 'HelloAsso',
    especes: 'Espèces',
    cheque: 'Chèque',
    cb: 'Carte bancaire',
    virement: 'Virement'
  };
  return moyens[moyen] || moyen;
}

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    console.log('📊 Chargement des données de comptabilité...');
    const response = await comptabiliteApi.overview();
    console.log('📥 Réponse reçue:', response.data);
    
    // Gérer différentes structures de réponse
    if (response.data.success && response.data.data) {
      overview.value = response.data.data;
    } else if (response.data.data) {
      overview.value = response.data.data;
    } else if (response.data.adhesions || response.data.dons) {
      overview.value = response.data;
    } else {
      overview.value = response.data;
    }
    
    console.log('✅ Données chargées:', overview.value);
  } catch (err: any) {
    console.error('❌ Erreur lors du chargement:', err);
    error.value = err.response?.data?.error || err.message || 'Erreur lors du chargement des données';
    overview.value = null;
  } finally {
    loading.value = false;
  }
}

async function exportCsv() {
  try {
    const response = await comptabiliteApi.export({ type: 'all' });
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comptabilite-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    console.error('Erreur lors de l\'export:', err);
    alert(err.response?.data?.error || 'Erreur lors de l\'export');
  }
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.comptabilite {
  width: 100%;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header h1 {
  margin: 0;
  color: #2c3e50;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-refresh,
.btn-export {
  padding: 10px 20px;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
}

.btn-refresh:hover,
.btn-export:hover {
  background-color: #5568d3;
}

.btn-refresh:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.overview {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.section {
  background: white;
  padding: 25px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.section h2 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 20px;
}

.stats {
  display: flex;
  gap: 30px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.label {
  color: #7f8c8d;
  font-size: 14px;
  font-weight: 500;
}

.value {
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
}

.value.amount {
  color: #27ae60;
  font-size: 28px;
}

.payment-methods {
  margin-top: 20px;
}

.payment-methods h3 {
  margin: 0 0 15px 0;
  color: #555;
  font-size: 16px;
  font-weight: 600;
}

.methods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.method {
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 5px;
  font-size: 14px;
  border-left: 3px solid #667eea;
}

.method strong {
  color: #2c3e50;
}

.no-data {
  padding: 15px;
  text-align: center;
  color: #7f8c8d;
  font-style: italic;
}

.section.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.section.total h2 {
  color: white;
}

.total-amount {
  font-size: 48px;
  font-weight: bold;
  text-align: center;
  margin: 20px 0;
}

.total-breakdown {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-top: 20px;
  font-size: 16px;
  opacity: 0.9;
}

.total-breakdown p {
  margin: 0;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
  font-size: 16px;
}

.error {
  text-align: center;
  padding: 40px;
  background-color: #f8d7da;
  border-radius: 10px;
  color: #721c24;
}

.error p {
  margin: 0 0 15px 0;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}

.retry-btn {
  margin-top: 15px;
  padding: 10px 20px;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
}

.retry-btn:hover {
  background-color: #5568d3;
}
</style>
