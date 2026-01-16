<template>
  <div class="page-container">
    <!-- Header -->
    <div class="page-header">
      <h1>Paramètres</h1>
      <p class="page-subtitle">Gérez les paramètres de l'application</p>
    </div>

    <!-- Contenu des paramètres -->
    <div class="settings-content">
      <!-- Section Général -->
      <div class="settings-section">
        <div class="section-header">
          <span class="material-symbols-outlined section-icon">settings</span>
          <div>
            <h2>Général</h2>
            <p class="section-description">Paramètres généraux de l'application</p>
          </div>
        </div>
        <div class="settings-grid">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">Nom de l'organisation</label>
              <p class="setting-description">Nom affiché dans l'application</p>
            </div>
            <input 
              v-model="settings.organizationName" 
              type="text" 
              class="setting-input"
              placeholder="IGCA Paris"
            />
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">Email de contact</label>
              <p class="setting-description">Email principal pour les communications</p>
            </div>
            <input 
              v-model="settings.contactEmail" 
              type="email" 
              class="setting-input"
              placeholder="contact@igca-paris.fr"
            />
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">Téléphone</label>
              <p class="setting-description">Numéro de téléphone de contact</p>
            </div>
            <input 
              v-model="settings.phone" 
              type="tel" 
              class="setting-input"
              placeholder="+33 1 23 45 67 89"
            />
          </div>
        </div>
      </div>

      <!-- Section Notifications -->
      <div class="settings-section">
        <div class="section-header">
          <span class="material-symbols-outlined section-icon">notifications</span>
          <div>
            <h2>Notifications</h2>
            <p class="section-description">Gérez vos préférences de notifications</p>
          </div>
        </div>
        <div class="settings-grid">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">Notifications par email</label>
              <p class="setting-description">Recevoir des notifications par email</p>
            </div>
            <label class="toggle-switch">
              <input 
                v-model="settings.emailNotifications" 
                type="checkbox"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">Notifications d'adhésions</label>
              <p class="setting-description">Être notifié des nouvelles adhésions</p>
            </div>
            <label class="toggle-switch">
              <input 
                v-model="settings.adhesionNotifications" 
                type="checkbox"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">Notifications de paiements</label>
              <p class="setting-description">Être notifié des nouveaux paiements</p>
            </div>
            <label class="toggle-switch">
              <input 
                v-model="settings.paymentNotifications" 
                type="checkbox"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">Notifications de dons</label>
              <p class="setting-description">Être notifié des nouveaux dons</p>
            </div>
            <label class="toggle-switch">
              <input 
                v-model="settings.donationNotifications" 
                type="checkbox"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Section Sécurité -->
      <div class="settings-section">
        <div class="section-header">
          <span class="material-symbols-outlined section-icon">lock</span>
          <div>
            <h2>Sécurité</h2>
            <p class="section-description">Paramètres de sécurité et confidentialité</p>
          </div>
        </div>
        <div class="settings-grid">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">Session timeout</label>
              <p class="setting-description">Durée avant déconnexion automatique (minutes)</p>
            </div>
            <select v-model="settings.sessionTimeout" class="setting-input">
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 heure</option>
              <option value="120">2 heures</option>
              <option value="0">Jamais</option>
            </select>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">Authentification à deux facteurs</label>
              <p class="setting-description">Activer la double authentification</p>
            </div>
            <label class="toggle-switch">
              <input 
                v-model="settings.twoFactorAuth" 
                type="checkbox"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Section Apparence -->
      <div class="settings-section">
        <div class="section-header">
          <span class="material-symbols-outlined section-icon">palette</span>
          <div>
            <h2>Apparence</h2>
            <p class="section-description">Personnalisez l'apparence de l'application</p>
          </div>
        </div>
        <div class="settings-grid">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">Thème</label>
              <p class="setting-description">Choisissez le thème de l'application</p>
            </div>
            <select v-model="settings.theme" class="setting-input">
              <option value="light">Clair</option>
              <option value="dark">Sombre</option>
              <option value="auto">Automatique</option>
            </select>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">Langue</label>
              <p class="setting-description">Langue de l'interface</p>
            </div>
            <select v-model="settings.language" class="setting-input">
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="settings-actions">
        <button @click="resetSettings" class="btn-secondary">
          <span class="material-symbols-outlined">refresh</span>
          Réinitialiser
        </button>
        <button @click="saveSettings" class="btn-primary" :disabled="saving">
          <span class="material-symbols-outlined">save</span>
          {{ saving ? 'Enregistrement...' : 'Enregistrer les modifications' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const saving = ref(false);
const settings = ref({
  organizationName: 'IGCA Paris',
  contactEmail: 'contact@igca-paris.fr',
  phone: '',
  emailNotifications: true,
  adhesionNotifications: true,
  paymentNotifications: true,
  donationNotifications: false,
  sessionTimeout: '60',
  twoFactorAuth: false,
  theme: 'light',
  language: 'fr',
});

const defaultSettings = { ...settings.value };

function loadSettings() {
  // Charger depuis le localStorage ou l'API
  const saved = localStorage.getItem('app-settings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      settings.value = { ...settings.value, ...parsed };
    } catch (e) {
      console.error('Erreur lors du chargement des paramètres:', e);
    }
  }
}

function saveSettings() {
  saving.value = true;
  // Sauvegarder dans le localStorage ou l'API
  setTimeout(() => {
    localStorage.setItem('app-settings', JSON.stringify(settings.value));
    saving.value = false;
    alert('Paramètres enregistrés avec succès !');
  }, 500);
}

function resetSettings() {
  if (!confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) return;
  settings.value = { ...defaultSettings };
  localStorage.removeItem('app-settings');
  alert('Paramètres réinitialisés !');
}

onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
.page-container {
  padding: var(--spacing-xl);
  width: 100%;
  margin: 0;
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: var(--font-size-base);
  margin: var(--spacing-xs) 0 0 0;
}

.settings-content {
  max-width: 1000px;
  margin-top: var(--spacing-xl);
}

.settings-section {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border);
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--border);
}

.section-icon {
  font-size: var(--font-size-3xl);
  color: var(--primary);
  margin-top: 4px;
}

.section-header h2 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.section-description {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-xl);
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  transition: all var(--transition-base);
}

.setting-item:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.setting-info {
  flex: 1;
}

.setting-label {
  display: block;
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  font-size: var(--font-size-base);
  margin-bottom: 4px;
}

.setting-description {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
}

.setting-input {
  min-width: 200px;
  padding: var(--spacing-md) var(--spacing-lg);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  color: var(--text-primary);
  background: var(--bg-primary);
  font-family: var(--font-body);
  transition: all var(--transition-base);
}

.setting-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-pastel);
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 18px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
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

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 2px;
  bottom: 2px;
  background-color: var(--bg-primary);
  transition: var(--transition-base);
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--color-green);
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(18px);
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--border);
}

.btn-primary,
.btn-secondary {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: all var(--transition-base);
  border: none;
  font-family: var(--font-body);
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: var(--text-inverse);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-orange);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1.5px solid var(--border);
}

.btn-secondary:hover {
  background: var(--border);
}

@media (max-width: 768px) {
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .setting-input {
    width: 100%;
    min-width: auto;
  }
}
</style>

