<template>
  <div class="page-container">
    <!-- Header -->
    <div class="page-header">
      <h1>Mon profil</h1>
      <p class="page-subtitle">Gérez vos informations personnelles</p>
    </div>

    <div class="profile-content">
      <!-- Section Informations personnelles -->
      <div class="profile-section">
        <div class="section-header">
          <span class="material-symbols-outlined section-icon">person</span>
          <div>
            <h2>Informations personnelles</h2>
            <p class="section-description">Vos informations de profil</p>
          </div>
        </div>

        <div class="profile-avatar-section">
          <div class="avatar-container">
            <div class="avatar-large">
              {{ userInitials }}
            </div>
            <button class="avatar-edit-btn" @click="triggerFileInput">
              <span class="material-symbols-outlined">camera_alt</span>
            </button>
            <input 
              ref="fileInput"
              type="file" 
              accept="image/*" 
              @change="handleAvatarChange"
              style="display: none"
            />
          </div>
          <div class="avatar-info">
            <p class="avatar-name">{{ profile.nom }} {{ profile.prenom }}</p>
            <p class="avatar-role">{{ formatRole(profile.role) }}</p>
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>Nom *</label>
            <input 
              v-model="profile.nom" 
              type="text" 
              placeholder="Votre nom"
              required
            />
          </div>
          <div class="form-group">
            <label>Prénom *</label>
            <input 
              v-model="profile.prenom" 
              type="text" 
              placeholder="Votre prénom"
              required
            />
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input 
              v-model="profile.email" 
              type="email" 
              placeholder="votre.email@example.com"
              required
            />
          </div>
          <div class="form-group">
            <label>Téléphone</label>
            <input 
              v-model="profile.phone" 
              type="tel" 
              placeholder="+33 1 23 45 67 89"
            />
          </div>
          <div class="form-group full-width">
            <label>Adresse</label>
            <input 
              v-model="profile.address" 
              type="text" 
              placeholder="Votre adresse"
            />
          </div>
        </div>
      </div>

      <!-- Section Sécurité -->
      <div class="profile-section">
        <div class="section-header">
          <span class="material-symbols-outlined section-icon">lock</span>
          <div>
            <h2>Sécurité</h2>
            <p class="section-description">Gérez votre mot de passe et la sécurité de votre compte</p>
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>Mot de passe actuel</label>
            <input 
              v-model="passwordForm.currentPassword" 
              type="password" 
              placeholder="Entrez votre mot de passe actuel"
            />
          </div>
          <div class="form-group">
            <label>Nouveau mot de passe</label>
            <input 
              v-model="passwordForm.newPassword" 
              type="password" 
              placeholder="Minimum 8 caractères"
              minlength="8"
            />
          </div>
          <div class="form-group">
            <label>Confirmer le nouveau mot de passe</label>
            <input 
              v-model="passwordForm.confirmPassword" 
              type="password" 
              placeholder="Confirmez le nouveau mot de passe"
              minlength="8"
            />
          </div>
        </div>
      </div>

      <!-- Section Notifications -->
      <div class="profile-section">
        <div class="section-header">
          <span class="material-symbols-outlined section-icon">notifications</span>
          <div>
            <h2>Notifications</h2>
            <p class="section-description">Gérez vos préférences de notifications</p>
          </div>
        </div>

        <div class="notifications-list">
          <div class="notification-item">
            <div class="notification-info">
              <span class="material-symbols-outlined notification-icon">email</span>
              <div>
                <label class="notification-label">Notifications par email</label>
                <p class="notification-description">Recevoir des notifications importantes par email</p>
              </div>
            </div>
            <label class="toggle-switch">
              <input 
                v-model="notifications.email" 
                type="checkbox"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="notification-item">
            <div class="notification-info">
              <span class="material-symbols-outlined notification-icon">notifications_active</span>
              <div>
                <label class="notification-label">Notifications push</label>
                <p class="notification-description">Recevoir des notifications dans le navigateur</p>
              </div>
            </div>
            <label class="toggle-switch">
              <input 
                v-model="notifications.push" 
                type="checkbox"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Section Statistiques -->
      <div class="profile-section">
        <div class="section-header">
          <span class="material-symbols-outlined section-icon">analytics</span>
          <div>
            <h2>Statistiques</h2>
            <p class="section-description">Votre activité sur la plateforme</p>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <span class="material-symbols-outlined stat-icon">event</span>
            <div class="stat-content">
              <div class="stat-value">{{ stats.actionsCount || 0 }}</div>
              <div class="stat-label">Actions effectuées</div>
            </div>
          </div>
          <div class="stat-card">
            <span class="material-symbols-outlined stat-icon">schedule</span>
            <div class="stat-content">
              <div class="stat-value">{{ formatDate(profile.created_at) }}</div>
              <div class="stat-label">Membre depuis</div>
            </div>
          </div>
          <div class="stat-card">
            <span class="material-symbols-outlined stat-icon">login</span>
            <div class="stat-content">
              <div class="stat-value">{{ stats.lastLogin || 'Jamais' }}</div>
              <div class="stat-label">Dernière connexion</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="profile-actions">
        <button @click="cancelChanges" class="btn-secondary">
          <span class="material-symbols-outlined">close</span>
          Annuler
        </button>
        <button @click="saveProfile" class="btn-primary" :disabled="saving">
          <span class="material-symbols-outlined">save</span>
          {{ saving ? 'Enregistrement...' : 'Enregistrer les modifications' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const fileInput = ref<HTMLInputElement | null>(null);
const saving = ref(false);

const profile = ref({
  nom: '',
  prenom: '',
  email: '',
  phone: '',
  address: '',
  role: '',
  created_at: '',
  avatar: '',
});

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const notifications = ref({
  email: true,
  push: false,
});

const stats = ref({
  actionsCount: 0,
  lastLogin: '',
});

const userInitials = computed(() => {
  const nom = profile.value.nom || '';
  const prenom = profile.value.prenom || '';
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase() || 'A';
});

function formatRole(role?: string) {
  const roles: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Administrateur',
    benevole: 'Bénévole',
    membre: 'Membre',
  };
  return roles[role || ''] || role || 'Utilisateur';
}

function formatDate(date: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function triggerFileInput() {
  fileInput.value?.click();
}

function handleAvatarChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    // Ici vous pouvez uploader l'image
    const reader = new FileReader();
    reader.onload = (e) => {
      profile.value.avatar = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
}

function loadProfile() {
  // Charger depuis le store ou l'API
  if (authStore.user) {
    profile.value = {
      nom: authStore.user.nom || '',
      prenom: authStore.user.prenom || '',
      email: authStore.user.email || '',
      phone: (authStore.user as any).phone || '',
      address: (authStore.user as any).address || '',
      role: authStore.user.role || '',
      created_at: (authStore.user as any).created_at || new Date().toISOString(),
      avatar: (authStore.user as any).avatar || '',
    };
  }

  // Charger les préférences de notifications
  const savedNotifications = localStorage.getItem('user-notifications');
  if (savedNotifications) {
    try {
      notifications.value = { ...notifications.value, ...JSON.parse(savedNotifications) };
    } catch (e) {
      console.error('Erreur lors du chargement des notifications:', e);
    }
  }
}

function saveProfile() {
  saving.value = true;
  // Sauvegarder le profil
  setTimeout(() => {
    localStorage.setItem('user-notifications', JSON.stringify(notifications.value));
    saving.value = false;
    alert('Profil mis à jour avec succès !');
  }, 500);
}

function cancelChanges() {
  loadProfile();
}

onMounted(() => {
  loadProfile();
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

.profile-content {
  max-width: 1000px;
  margin-top: var(--spacing-xl);
}

.profile-section {
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

.profile-avatar-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-xl);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

.avatar-container {
  position: relative;
}

.avatar-large {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: var(--text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  border: 4px solid var(--bg-primary);
  box-shadow: var(--shadow-md);
}

.avatar-edit-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--primary);
  color: var(--text-inverse);
  border: 3px solid var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
}

.avatar-edit-btn:hover {
  background: var(--primary-dark);
  transform: scale(1.1);
}

.avatar-info {
  flex: 1;
}

.avatar-name {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.avatar-role {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  margin: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-lg);
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  margin-bottom: var(--spacing-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
}

.form-group input {
  padding: var(--spacing-md) var(--spacing-lg);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  color: var(--text-primary);
  background: var(--bg-primary);
  font-family: var(--font-body);
  transition: all var(--transition-base);
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-pastel);
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.notification-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  transition: all var(--transition-base);
}

.notification-item:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.notification-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex: 1;
}

.notification-icon {
  font-size: var(--font-size-xl);
  color: var(--primary);
}

.notification-label {
  display: block;
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  font-size: var(--font-size-base);
  margin-bottom: 4px;
}

.notification-description {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-lg);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  transition: all var(--transition-base);
}

.stat-card:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.stat-icon {
  font-size: var(--font-size-2xl);
  color: var(--primary);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.profile-actions {
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
  .form-grid {
    grid-template-columns: 1fr;
  }

  .profile-avatar-section {
    flex-direction: column;
    text-align: center;
  }
}
</style>

