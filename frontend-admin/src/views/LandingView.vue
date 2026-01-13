<template>
  <div class="landing">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">IGCA Paris</h1>
        <p class="hero-subtitle">Plateforme de gestion des adhésions et cartes membres</p>
        <p class="hero-description">
          Solution complète et moderne pour gérer vos adhésions, cartes membres, dons et événements en toute simplicité
        </p>
        <div class="hero-buttons">
          <router-link to="/login" class="btn btn-primary">Se connecter</router-link>
          <a href="#features" class="btn btn-secondary">Découvrir</a>
        </div>
      </div>
      <div class="hero-image">
        <div class="floating-card">
          <div class="card-header">
            <span class="card-icon">🎫</span>
            <span class="card-title">Carte Membre</span>
          </div>
          <div class="card-body">
            <div class="card-number">IGCA-2024-0001</div>
            <div class="card-name">IGCA Paris</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features">
      <div class="container">
        <h2 class="section-title">Fonctionnalités principales</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">📊</div>
            <h3>Gestion des adhésions</h3>
            <p>Import automatique depuis HelloAsso, gestion intelligente des doublons, suivi complet des adhérents avec historique</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🎴</div>
            <h3>Cartes membres</h3>
            <p>Génération automatique des cartes, suivi de remise en temps réel, téléchargement PDF haute qualité</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">✅</div>
            <h3>Vérification rapide</h3>
            <p>Vérification d'adhésion en temps réel depuis mobile ou web, recherche par nom, email ou numéro de carte</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">💰</div>
            <h3>Comptabilité</h3>
            <p>Séparation automatique adhésions/dons, exports comptables, statistiques détaillées par période</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🍽️</div>
            <h3>Menu du jour</h3>
            <p>Gestion du menu des événements, affichage des prix, gestion de la disponibilité, duplication rapide</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">👥</div>
            <h3>Gestion des rôles</h3>
            <p>Rôles personnalisés pour bénévoles, permissions granulaires, traçabilité complète des actions</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Benefits Section -->
    <section class="benefits">
      <div class="container">
        <h2 class="section-title">Pourquoi choisir cette plateforme ?</h2>
        <div class="benefits-list">
          <div class="benefit-item">
            <div class="benefit-icon">⚡</div>
            <div class="benefit-content">
              <h3>Gain de temps considérable</h3>
              <p>Fini les traitements manuels répétitifs. Automatisation complète des processus d'import, de génération de cartes et de suivi</p>
            </div>
          </div>
          <div class="benefit-item">
            <div class="benefit-icon">🔒</div>
            <div class="benefit-content">
              <h3>Sécurisé et conforme</h3>
              <p>Authentification robuste, gestion fine des rôles et permissions, conformité totale RGPD</p>
            </div>
          </div>
          <div class="benefit-item">
            <div class="benefit-icon">📱</div>
            <div class="benefit-content">
              <h3>Multi-plateforme</h3>
              <p>Application mobile iOS/Android et interface web responsive, accessible partout, tout le temps</p>
            </div>
          </div>
          <div class="benefit-item">
            <div class="benefit-icon">🎯</div>
            <div class="benefit-content">
              <h3>100% centralisé</h3>
              <p>Toutes vos données en un seul endroit, synchronisées en temps réel, accessible par tous les bénévoles autorisés</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="stats">
      <div class="container">
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-number">100%</div>
            <div class="stat-label">Automatisé</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">0</div>
            <div class="stat-label">Traitement manuel</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">24/7</div>
            <div class="stat-label">Disponible</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">∞</div>
            <div class="stat-label">Évolutif</div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta">
      <div class="container">
        <h2>Prêt à commencer ?</h2>
        <p>Connectez-vous pour accéder à la plateforme et découvrir toutes les fonctionnalités</p>
        <router-link to="/login" class="btn btn-large">Accéder à la plateforme</router-link>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <p>&copy; 2024 IGCA Paris. Tous droits réservés.</p>
        <p class="footer-subtitle">Plateforme développée pour simplifier la gestion associative</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// Landing page - Page d'accueil de la plateforme IGCA Paris
</script>

<style scoped>
.landing {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Hero Section */
.hero {
  min-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 80px 5%;
  max-width: 1400px;
  margin: 0 auto;
  color: white;
}

.hero-content {
  flex: 1;
  max-width: 600px;
  z-index: 2;
}

.hero-title {
  font-size: 64px;
  font-weight: 800;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #fff 0%, #e0e0e0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 15px;
  opacity: 0.95;
}

.hero-description {
  font-size: 18px;
  line-height: 1.6;
  margin-bottom: 40px;
  opacity: 0.9;
}

.hero-buttons {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.btn {
  padding: 16px 32px;
  border-radius: 50px;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  display: inline-block;
  border: 2px solid transparent;
  cursor: pointer;
}

.btn-primary {
  background: white;
  color: #667eea;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.btn-secondary {
  background: transparent;
  color: white;
  border-color: white;
}

.btn-secondary:hover {
  background: white;
  color: #667eea;
}

.btn-large {
  padding: 20px 40px;
  font-size: 18px;
}

.hero-image {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.floating-card {
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  transform: rotate(-5deg);
  animation: float 3s ease-in-out infinite;
  color: #2c3e50;
  min-width: 300px;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(-5deg);
  }
  50% {
    transform: translateY(-20px) rotate(-5deg);
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e0e0e0;
}

.card-icon {
  font-size: 32px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
}

.card-body {
  text-align: center;
}

.card-number {
  font-size: 24px;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 10px;
}

.card-name {
  font-size: 20px;
  color: #555;
}

/* Features Section */
.features {
  padding: 100px 5%;
  background: white;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  text-align: center;
  font-size: 42px;
  font-weight: 700;
  margin-bottom: 60px;
  color: #2c3e50;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
}

.feature-card {
  background: #f8f9fa;
  padding: 40px;
  border-radius: 15px;
  text-align: center;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.feature-card h3 {
  font-size: 24px;
  margin-bottom: 15px;
  color: #2c3e50;
}

.feature-card p {
  color: #666;
  line-height: 1.6;
}

/* Benefits Section */
.benefits {
  padding: 100px 5%;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.benefits-list {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 30px;
  background: white;
  padding: 40px;
  border-radius: 15px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.benefit-icon {
  font-size: 64px;
  flex-shrink: 0;
}

.benefit-content h3 {
  font-size: 28px;
  margin-bottom: 10px;
  color: #2c3e50;
}

.benefit-content p {
  font-size: 16px;
  color: #666;
  line-height: 1.6;
}

/* Stats Section */
.stats {
  padding: 80px 5%;
  background: #2c3e50;
  color: white;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 40px;
  text-align: center;
}

.stat-item {
  padding: 30px;
}

.stat-number {
  font-size: 56px;
  font-weight: 800;
  margin-bottom: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 18px;
  opacity: 0.9;
}

/* CTA Section */
.cta {
  padding: 100px 5%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  text-align: center;
  color: white;
}

.cta h2 {
  font-size: 42px;
  margin-bottom: 20px;
}

.cta p {
  font-size: 20px;
  margin-bottom: 40px;
  opacity: 0.9;
}

/* Footer */
.footer {
  padding: 40px 5%;
  background: #1a1a1a;
  color: white;
  text-align: center;
}

.footer-subtitle {
  margin-top: 10px;
  opacity: 0.7;
  font-size: 14px;
}

/* Responsive */
@media (max-width: 968px) {
  .hero {
    flex-direction: column;
    text-align: center;
    padding: 60px 5%;
  }

  .hero-title {
    font-size: 48px;
  }

  .hero-subtitle {
    font-size: 24px;
  }

  .benefit-item {
    flex-direction: column;
    text-align: center;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>
