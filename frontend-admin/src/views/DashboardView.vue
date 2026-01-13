<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <div class="header-actions">
        <div class="year-filter">
          <label>Année :</label>
          <select v-model="selectedYear" @change="loadDashboardData">
            <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
          </select>
        </div>
        <button @click="loadDashboardData" :disabled="loading" class="btn-refresh">
          {{ loading ? 'Chargement...' : '🔄 Actualiser' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Chargement des données...</p>
    </div>
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="loadDashboardData" class="retry-btn">Réessayer</button>
    </div>
    <div v-else class="dashboard-content">
      <!-- Vue d'ensemble - Statistiques principales -->
      <div class="overview-section">
        <div class="stat-card-large total-revenue">
          <div class="stat-icon-large">💰</div>
          <div class="stat-content-large">
            <div class="stat-label-large">Revenus totaux ({{ selectedYear }})</div>
            <div class="stat-value-large">{{ formatAmount(totalRevenue) }} €</div>
            <div class="stat-subtitle">{{ totalTransactions }} transaction(s)</div>
          </div>
        </div>
        <div class="stat-card-large total-adhesions">
          <div class="stat-icon-large">👥</div>
          <div class="stat-content-large">
            <div class="stat-label-large">Adhésions ({{ selectedYear }})</div>
            <div class="stat-value-large">{{ adhesionsStats.total || 0 }}</div>
            <div class="stat-subtitle">{{ adhesionsStats.actifs || 0 }} actives</div>
          </div>
        </div>
        <div class="stat-card-large total-dons">
          <div class="stat-icon-large">💝</div>
          <div class="stat-content-large">
            <div class="stat-label-large">Dons récents</div>
            <div class="stat-value-large">{{ formatAmount(recentDonsTotal) }} €</div>
            <div class="stat-subtitle">{{ recentDons.length }} don(s) récent(s)</div>
          </div>
        </div>
        <div class="stat-card-large total-benevoles">
          <div class="stat-icon-large">🤝</div>
          <div class="stat-content-large">
            <div class="stat-label-large">Bénévoles actifs</div>
            <div class="stat-value-large">{{ benevolesStats.total_benevoles || 0 }}</div>
            <div class="stat-subtitle">{{ benevolesStats.total_roles || 0 }} rôle(s)</div>
          </div>
        </div>
      </div>

      <!-- Graphiques principaux -->
      <div class="charts-grid">
        <!-- Graphique en cercle des paiements -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>📊 Répartition des paiements</h3>
            <span class="chart-subtitle">{{ selectedYear }}</span>
          </div>
          <div class="chart-container">
            <canvas ref="pieChartCanvas"></canvas>
          </div>
        </div>

        <!-- Graphique d'évolution mensuelle -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>📈 Évolution mensuelle des adhésions</h3>
            <span class="chart-subtitle">{{ selectedYear }}</span>
          </div>
          <div class="chart-container">
            <canvas ref="lineChartCanvas"></canvas>
          </div>
        </div>
      </div>

      <!-- Détails des paiements -->
      <div class="section payments-detail">
        <h2>💳 Détails des paiements ({{ selectedYear }})</h2>
        <div class="payments-grid">
          <div class="payment-card" v-for="(payment, key) in paiementsData" :key="key">
            <div class="payment-icon">{{ getPaymentIcon(key) }}</div>
            <div class="payment-info">
              <div class="payment-label">{{ getPaymentLabel(key) }}</div>
              <div class="payment-amount">{{ formatAmount(payment.montant || 0) }} €</div>
              <div class="payment-count">{{ payment.count || 0 }} transaction(s)</div>
            </div>
            <div class="payment-percentage">
              {{ getPaymentPercentage(payment.montant || 0) }}%
            </div>
          </div>
        </div>
      </div>

      <!-- Statistiques détaillées des adhésions -->
      <div class="section adhesions-detail">
        <h2>📋 Statistiques détaillées des adhésions ({{ selectedYear }})</h2>
        <div class="adhesions-detail-grid">
          <div class="detail-card">
            <div class="detail-icon">✅</div>
            <div class="detail-content">
              <div class="detail-value">{{ adhesionsStats.actifs || 0 }}</div>
              <div class="detail-label">Actives</div>
            </div>
          </div>
          <div class="detail-card">
            <div class="detail-icon">⏸️</div>
            <div class="detail-content">
              <div class="detail-value">{{ adhesionsStats.inactifs || 0 }}</div>
              <div class="detail-label">Inactives</div>
            </div>
          </div>
          <div class="detail-card">
            <div class="detail-icon">⏸️</div>
            <div class="detail-content">
              <div class="detail-value">{{ adhesionsStats.suspendus || 0 }}</div>
              <div class="detail-label">Suspendues</div>
            </div>
          </div>
          <div class="detail-card">
            <div class="detail-icon">📷</div>
            <div class="detail-content">
              <div class="detail-value">{{ adhesionsStats.avec_photo || 0 }}</div>
              <div class="detail-label">Avec photo</div>
            </div>
          </div>
          <div class="detail-card">
            <div class="detail-icon">🎴</div>
            <div class="detail-content">
              <div class="detail-value">{{ adhesionsStats.avec_carte || 0 }}</div>
              <div class="detail-label">Avec carte</div>
            </div>
          </div>
          <div class="detail-card">
            <div class="detail-icon">💰</div>
            <div class="detail-content">
              <div class="detail-value">{{ formatAmount(adhesionsStats.total_montant || 0) }} €</div>
              <div class="detail-label">Montant total</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Grille d'informations -->
      <div class="info-grid">
        <!-- Adhésions nécessitant des cartes -->
        <div class="info-card">
          <div class="info-card-header">
            <h3>🎴 Adhésions nécessitant des cartes</h3>
            <span class="badge" v-if="adhesionsNeedCartes.length > 0">{{ adhesionsNeedCartes.length }}</span>
          </div>
          <div v-if="adhesionsNeedCartes.length === 0" class="empty-state">
            <p>Aucune adhésion nécessitant une carte</p>
          </div>
          <div v-else class="list-container">
            <div 
              v-for="adhesion in adhesionsNeedCartes.slice(0, 5)" 
              :key="adhesion.id" 
              class="list-item"
            >
              <div class="item-info">
                <strong>{{ adhesion.prenom }} {{ adhesion.nom }}</strong>
                <span class="item-meta">{{ formatDate(adhesion.date_adhesion) }}</span>
              </div>
              <button @click="generateCarte(adhesion.id)" class="btn-small">Générer</button>
            </div>
            <div v-if="adhesionsNeedCartes.length > 5" class="more-items">
              + {{ adhesionsNeedCartes.length - 5 }} autre(s)
            </div>
          </div>
        </div>

        <!-- Menu du jour -->
        <div class="info-card">
          <div class="info-card-header">
            <h3>🍽️ Menu du jour</h3>
          </div>
          <div v-if="!currentMenu" class="empty-state">
            <p>Aucun menu disponible aujourd'hui</p>
          </div>
          <div v-else class="menu-container">
            <div class="menu-date">{{ formatDate(currentMenu.date_menu) }}</div>
            <div v-if="currentMenu.plats && currentMenu.plats.length > 0" class="plats-list">
              <div v-for="plat in currentMenu.plats" :key="plat.id" class="plat-item">
                <div class="plat-name">{{ plat.nom }}</div>
                <div class="plat-price">{{ plat.prix }} €</div>
              </div>
            </div>
            <div v-else class="empty-state">
              <p>Aucun plat disponible</p>
            </div>
          </div>
        </div>

        <!-- Bénévoles -->
        <div class="info-card">
          <div class="info-card-header">
            <h3>👥 Bénévoles</h3>
          </div>
          <div class="benevoles-stats">
            <div class="stat-item">
              <div class="stat-number">{{ benevolesStats.total_benevoles || 0 }}</div>
              <div class="stat-label">Bénévoles actifs</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ benevolesStats.total_roles || 0 }}</div>
              <div class="stat-label">Rôles fonctionnels</div>
            </div>
          </div>
          <div v-if="benevolesStats.roles_distribution && benevolesStats.roles_distribution.length > 0" class="roles-list">
            <div 
              v-for="role in benevolesStats.roles_distribution.slice(0, 5)" 
              :key="role.role" 
              class="role-item"
            >
              <span class="role-name">{{ role.role }}</span>
              <span class="role-count">{{ role.count }} bénévole(s)</span>
            </div>
          </div>
        </div>

        <!-- Dons récents -->
        <div class="info-card">
          <div class="info-card-header">
            <h3>💝 Dons récents</h3>
          </div>
          <div v-if="recentDons.length === 0" class="empty-state">
            <p>Aucun don récent</p>
          </div>
          <div v-else class="list-container">
            <div v-for="don in recentDons.slice(0, 5)" :key="don.id" class="list-item">
              <div class="item-info">
                <strong>{{ don.nom || 'Anonyme' }} {{ don.prenom || '' }}</strong>
                <span class="item-meta">{{ formatDate(don.date_don) }}</span>
              </div>
              <div class="item-amount">{{ formatAmount(don.montant) }} €</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue';
import { Chart, registerables } from 'chart.js';
import { comptabiliteApi, adhesionsApi, menuApi, rolesApi, donsApi, cartesApi } from '@/services/api';

Chart.register(...registerables);

const loading = ref(true);
const error = ref('');
const selectedYear = ref(new Date().getFullYear().toString());
const availableYears = ref<string[]>([]);
const paiementsData = ref<any>({});
const adhesionsStats = ref<any>({});
const adhesionsNeedCartes = ref<any[]>([]);
const currentMenu = ref<any>(null);
const benevolesStats = ref<any>({});
const recentDons = ref<any[]>([]);
const pieChartCanvas = ref<HTMLCanvasElement | null>(null);
const lineChartCanvas = ref<HTMLCanvasElement | null>(null);
let pieChart: Chart | null = null;
let lineChart: Chart | null = null;

// Computed properties
const totalRevenue = computed(() => {
  return Object.values(paiementsData.value).reduce((sum: number, p: any) => {
    return sum + (p.montant || 0);
  }, 0);
});

const totalTransactions = computed(() => {
  return Object.values(paiementsData.value).reduce((sum: number, p: any) => {
    return sum + (p.count || 0);
  }, 0);
});

const recentDonsTotal = computed(() => {
  return recentDons.value.reduce((sum, don) => sum + (don.montant || 0), 0);
});

// Générer les années disponibles
function generateYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear; i >= 2023; i--) {
    years.push(i.toString());
  }
  availableYears.value = years;
}

function formatAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0.00';
  }
  return parseFloat(amount.toString()).toFixed(2);
}

function formatDate(date: string) {
  if (!date) return 'Date invalide';
  try {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return 'Date invalide';
  }
}

function getPaymentIcon(key: string): string {
  const icons: Record<string, string> = {
    especes: '💵',
    cb: '💳',
    virement: '🏦',
    cheque: '📝',
    helloasso: '🌐',
  };
  return icons[key] || '💰';
}

function getPaymentLabel(key: string): string {
  const labels: Record<string, string> = {
    especes: 'Espèces',
    cb: 'Carte bancaire',
    virement: 'Virement',
    cheque: 'Chèque',
    helloasso: 'HelloAsso',
  };
  return labels[key] || key;
}

function getPaymentPercentage(amount: number): string {
  const total = totalRevenue.value;
  if (total === 0) return '0.0';
  return ((amount / total) * 100).toFixed(1);
}

async function loadPaiementsData() {
  try {
    const response = await comptabiliteApi.paiementsAnnee(selectedYear.value);
    const data = response.data.data || response.data;
    paiementsData.value = data.paiements || {};
    
    await nextTick();
    setTimeout(() => {
      updatePieChart();
    }, 100);
  } catch (err: any) {
    console.error('Erreur chargement paiements:', err);
    paiementsData.value = {};
  }
}

function updatePieChart() {
  if (!pieChartCanvas.value) return;

  const paiements = paiementsData.value;
  const labels: string[] = [];
  const data: number[] = [];
  const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

  const moyens: Record<string, string> = {
    especes: 'Espèces',
    cb: 'Carte bancaire',
    virement: 'Virement',
    cheque: 'Chèque',
    helloasso: 'HelloAsso',
  };

  Object.keys(paiements).forEach((key) => {
    if (paiements[key] && paiements[key].montant > 0) {
      labels.push(moyens[key] || key);
      data.push(paiements[key].montant);
    }
  });

  const total = data.reduce((a: number, b: number) => a + b, 0);
  if (total === 0) {
    if (pieChart) {
      pieChart.destroy();
      pieChart = null;
    }
    return;
  }

  if (pieChart) {
    pieChart.destroy();
  }

  pieChart = new Chart(pieChartCanvas.value, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 3,
        borderColor: '#fff',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            font: {
              size: 13,
              weight: '500',
            },
            generateLabels: (chart: any) => {
              const chartData = chart.data;
              if (chartData.labels.length && chartData.datasets.length) {
                const dataset = chartData.datasets[0];
                const total = dataset.data.reduce((a: number, b: number) => a + b, 0);
                return chartData.labels.map((label: string, i: number) => {
                  const value = dataset.data[i] as number;
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                  return {
                    text: `${label}: ${formatAmount(value)} € (${percentage}%)`,
                    fillStyle: dataset.backgroundColor[i],
                    strokeStyle: dataset.borderColor,
                    lineWidth: dataset.borderWidth,
                    hidden: false,
                    index: i,
                  };
                });
              }
              return [];
            },
          },
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
              return `${label}: ${formatAmount(value)} € (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

function updateLineChart() {
  if (!lineChartCanvas.value || !adhesionsStats.value.par_mois) return;

  const monthlyData = adhesionsStats.value.par_mois || [];
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const labels: string[] = [];
  const data: number[] = [];

  for (let i = 1; i <= 12; i++) {
    labels.push(months[i - 1]);
    const monthData = monthlyData.find((m: any) => m.mois === i);
    data.push(monthData ? monthData.count : 0);
  }

  if (lineChart) {
    lineChart.destroy();
  }

  lineChart = new Chart(lineChartCanvas.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Nombre d\'adhésions',
        data,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#667eea',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              return `${context.parsed.y} adhésion(s)`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  });
}

async function loadAdhesionsStats() {
  try {
    const response = await adhesionsApi.stats(selectedYear.value);
    const data = response.data.data || response.data || {};
    adhesionsStats.value = data;
    
    await nextTick();
    setTimeout(() => {
      updateLineChart();
    }, 100);
  } catch (err: any) {
    console.error('Erreur chargement stats adhésions:', err);
    adhesionsStats.value = {};
  }
}

async function loadAdhesionsNeedCartes() {
  try {
    const response = await adhesionsApi.needCartes();
    const data = response.data.data || response.data || [];
    adhesionsNeedCartes.value = Array.isArray(data) ? data : [];
  } catch (err: any) {
    console.error('Erreur chargement adhésions nécessitant des cartes:', err);
    adhesionsNeedCartes.value = [];
  }
}

async function loadCurrentMenu() {
  try {
    const response = await menuApi.jour();
    currentMenu.value = response.data.data || response.data;
  } catch (err: any) {
    console.error('Erreur chargement menu:', err);
  }
}

async function loadBenevolesStats() {
  try {
    const response = await rolesApi.benevolesStats();
    benevolesStats.value = response.data.data || response.data || {};
  } catch (err: any) {
    console.error('Erreur chargement bénévoles:', err);
  }
}

async function loadRecentDons() {
  try {
    const response = await donsApi.recent(10);
    recentDons.value = response.data.data || response.data || [];
  } catch (err: any) {
    console.error('Erreur chargement dons:', err);
  }
}

async function generateCarte(adhesionId: number) {
  try {
    await cartesApi.generate(adhesionId);
    alert('Carte générée avec succès !');
    await loadAdhesionsNeedCartes();
  } catch (err: any) {
    alert(err.response?.data?.error || 'Erreur lors de la génération de la carte');
  }
}

async function loadDashboardData() {
  loading.value = true;
  error.value = '';
  try {
    await Promise.all([
      loadPaiementsData(),
      loadAdhesionsStats(),
      loadAdhesionsNeedCartes(),
      loadCurrentMenu(),
      loadBenevolesStats(),
      loadRecentDons(),
    ]);
  } catch (err: any) {
    console.error('Erreur chargement dashboard:', err);
    error.value = err.response?.data?.error || 'Erreur lors du chargement des données';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  generateYears();
  await loadDashboardData();
  await nextTick();
  setTimeout(() => {
    if (Object.keys(paiementsData.value).length > 0) {
      updatePieChart();
    }
    if (adhesionsStats.value.par_mois) {
      updateLineChart();
    }
  }, 200);
});

watch(selectedYear, async () => {
  await loadPaiementsData();
  await loadAdhesionsStats();
  await nextTick();
  setTimeout(() => {
    updatePieChart();
    updateLineChart();
  }, 100);
});
</script>

<style scoped>
.dashboard {
  width: 100%;
  padding: 0;
}

.dashboard-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 30px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.year-filter {
  display: flex;
  align-items: center;
  gap: 10px;
}

.year-filter label {
  font-weight: 500;
  color: #2c3e50;
}

.year-filter select {
  padding: 8px 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
  background: white;
}

.btn-refresh {
  padding: 8px 15px;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.btn-refresh:hover:not(:disabled) {
  background-color: #5568d3;
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 20px;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

/* Vue d'ensemble - Statistiques principales */
.overview-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 10px;
}

.stat-card-large {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 15px;
  padding: 25px;
  color: white;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  transition: transform 0.3s, box-shadow 0.3s;
}

.stat-card-large:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.stat-card-large.total-revenue {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-card-large.total-adhesions {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-card-large.total-dons {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-card-large.total-benevoles {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-icon-large {
  font-size: 50px;
  opacity: 0.9;
}

.stat-content-large {
  flex: 1;
}

.stat-label-large {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
  font-weight: 500;
}

.stat-value-large {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 5px;
  line-height: 1.2;
}

.stat-subtitle {
  font-size: 12px;
  opacity: 0.8;
}

/* Graphiques */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 25px;
}

.chart-card {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 18px;
}

.chart-subtitle {
  color: #7f8c8d;
  font-size: 14px;
}

.chart-container {
  height: 350px;
  position: relative;
  min-height: 350px;
}

.chart-container canvas {
  max-height: 350px;
}

/* Sections */
.section {
  background: white;
  padding: 25px;
  border-radius: 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.section h2 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 20px;
}

/* Détails des paiements */
.payments-detail {
  margin-top: 10px;
}

.payments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.payment-card {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  position: relative;
  overflow: hidden;
}

.payment-icon {
  font-size: 35px;
}

.payment-info {
  flex: 1;
}

.payment-label {
  font-size: 13px;
  color: #7f8c8d;
  margin-bottom: 5px;
}

.payment-amount {
  font-size: 20px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 3px;
}

.payment-count {
  font-size: 11px;
  color: #7f8c8d;
}

.payment-percentage {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(102, 126, 234, 0.2);
  color: #667eea;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
}

/* Statistiques détaillées des adhésions */
.adhesions-detail {
  margin-top: 10px;
}

.adhesions-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.detail-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  border-left: 4px solid #667eea;
}

.detail-icon {
  font-size: 30px;
  margin-bottom: 10px;
}

.detail-value {
  font-size: 28px;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 5px;
}

.detail-label {
  font-size: 12px;
  color: #7f8c8d;
}

/* Grille d'informations */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 25px;
}

.info-card {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.info-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.info-card-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 18px;
}

.badge {
  background: #667eea;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
}

.list-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #667eea;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.item-meta {
  font-size: 12px;
  color: #7f8c8d;
}

.item-amount {
  font-weight: bold;
  color: #27ae60;
}

.btn-small {
  padding: 6px 12px;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.3s;
}

.btn-small:hover {
  background-color: #5568d3;
}

.more-items {
  text-align: center;
  padding: 10px;
  color: #667eea;
  font-size: 12px;
  font-weight: 500;
}

.menu-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.menu-date {
  font-weight: 600;
  color: #667eea;
  margin-bottom: 10px;
}

.plats-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.plat-item {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 5px;
}

.plat-name {
  font-weight: 500;
}

.plat-price {
  color: #27ae60;
  font-weight: bold;
}

.benevoles-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 12px;
  color: #7f8c8d;
}

.roles-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.role-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 5px;
  font-size: 14px;
}

.role-name {
  font-weight: 500;
}

.role-count {
  color: #7f8c8d;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #7f8c8d;
  font-style: italic;
}

.error {
  text-align: center;
  padding: 40px;
  background-color: #f8d7da;
  border-radius: 10px;
  color: #721c24;
}

.retry-btn {
  margin-top: 15px;
  padding: 10px 20px;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .overview-section {
    grid-template-columns: 1fr;
  }
  
  .charts-grid {
    grid-template-columns: 1fr;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
