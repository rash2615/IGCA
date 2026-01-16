<template>
  <div class="login-container">
    <div class="login-wrapper">
      <!-- Logo et titre -->
      <div class="login-header">
        <div class="logo-container">
          <img 
            src="/Miniature-site-1.svg" 
            alt="IGCA Paris Logo" 
            class="logo"
            @error="handleLogoError"
          />
        </div>
        <h1>IGCA Paris</h1>
        <p class="subtitle">Plateforme de gestion</p>
      </div>

      <!-- Formulaire de connexion -->
      <div class="login-box">
        <h2>Connexion</h2>
        
        <div v-if="error" class="error-alert">
          <span class="material-symbols-outlined">error</span>
          <span>{{ error }}</span>
        </div>

        <form @submit.prevent="handleSubmit" class="login-form">
          <div class="form-group">
            <label>
              <span class="material-symbols-outlined">email</span>
              Email
            </label>
            <input
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder="admin@igca.paris"
              :disabled="loading"
            />
          </div>

          <div class="form-group">
            <label>
              <span class="material-symbols-outlined">lock</span>
              Mot de passe
            </label>
            <div class="password-input-wrapper">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                placeholder="••••••••"
                :disabled="loading"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="password-toggle"
                :disabled="loading"
              >
                <span class="material-symbols-outlined">
                  {{ showPassword ? 'visibility_off' : 'visibility' }}
                </span>
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            :disabled="loading || !email || !password"
            class="login-btn"
          >
            <span v-if="loading" class="material-symbols-outlined spinning">refresh</span>
            <span v-else class="material-symbols-outlined">login</span>
            <span>{{ loading ? 'Connexion...' : 'Se connecter' }}</span>
          </button>
        </form>

        <div class="login-footer">
          <a href="#" class="forgot-password" @click.prevent="handleForgotPassword">
            <span class="material-symbols-outlined">help</span>
            Mot de passe oublié ?
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div class="login-page-footer">
        <p>&copy; {{ new Date().getFullYear() }} IGCA Paris. Tous droits réservés.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const showPassword = ref(false);
const logoError = ref(false);

function handleLogoError() {
  logoError.value = true;
}

async function handleSubmit() {
  error.value = '';
  loading.value = true;

  try {
    console.log('🔐 Tentative de connexion pour:', email.value);
    
    const success = await authStore.login(email.value, password.value);
    
    if (success) {
      // Attendre un peu pour que le store soit complètement mis à jour
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Vérifier que l'authentification est bien active
      if (authStore.isAuthenticated && authStore.token && authStore.user) {
        console.log('✅ Connexion réussie, redirection...');
        router.replace('/app/dashboard');
      } else {
        throw new Error('Authentification échouée - données manquantes');
      }
    } else {
      throw new Error('La connexion a échoué');
    }
  } catch (err: any) {
    console.error('❌ Erreur de connexion:', err);
    
    // Afficher un message d'erreur plus clair
    if (err.userMessage) {
      error.value = err.userMessage;
    } else if (err.response?.data?.error) {
      error.value = err.response.data.error;
    } else if (err.message) {
      error.value = err.message;
    } else if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
      error.value = 'Le serveur backend n\'est pas accessible. Vérifiez qu\'il est démarré sur le port 3001.';
    } else {
      error.value = 'Erreur de connexion. Vérifiez vos identifiants.';
    }
  } finally {
    loading.value = false;
  }
}

function handleForgotPassword() {
  alert('Fonctionnalité "Mot de passe oublié" à venir. Contactez un administrateur.');
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.login-container::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  animation: pulse 20s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.3;
  }
}

.login-wrapper {
  width: 100%;
  max-width: 450px;
  z-index: 1;
  position: relative;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
  color: white;
}

.logo-container {
  width: 120px;
  height: 120px;
  margin: 0 auto 20px;
  background: white;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  padding: 20px;
}

.logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.login-header h1 {
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
  font-weight: 400;
}

.login-box {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.login-box h2 {
  text-align: center;
  margin: 0 0 32px 0;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

.error-alert {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fee2e2;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 24px;
  font-size: 14px;
  border: 1px solid #fecaca;
}

.error-alert .material-symbols-outlined {
  font-size: 20px;
  flex-shrink: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.form-group label .material-symbols-outlined {
  font-size: 18px;
  color: #6b7280;
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  font-size: 15px;
  transition: all 0.2s;
  box-sizing: border-box;
  background: #f9fafb;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input-wrapper input {
  padding-right: 48px;
}

.password-toggle {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
  z-index: 1;
}

.password-toggle:hover:not(:disabled) {
  color: #667eea;
}

.password-toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.password-toggle .material-symbols-outlined {
  font-size: 20px;
}

.login-btn {
  width: 100%;
  padding: 14px 24px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.login-btn:active:not(:disabled) {
  transform: translateY(0);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.login-btn .material-symbols-outlined {
  font-size: 20px;
}

.login-footer {
  margin-top: 24px;
  text-align: center;
}

.forgot-password {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #667eea;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;
}

.forgot-password:hover {
  color: var(--primary-dark);
  text-decoration: underline;
}

.forgot-password .material-symbols-outlined {
  font-size: 18px;
}

.login-page-footer {
  margin-top: 32px;
  text-align: center;
  color: white;
  opacity: 0.8;
  font-size: 14px;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 480px) {
  .login-box {
    padding: 32px 24px;
  }

  .login-header h1 {
    font-size: 28px;
  }

  .logo-container {
    width: 100px;
    height: 100px;
  }
}
</style>
