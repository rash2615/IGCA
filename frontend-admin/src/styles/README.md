# Guide d'utilisation de la Charte UI/UX IGCA Paris

## 🎨 Vue d'ensemble

Cette charte UI/UX a été créée pour donner à l'application IGCA Paris une identité visuelle chaleureuse, moderne et élégante, inspirée des designs contemporains avec une palette de couleurs terreuses.

## 🚀 Utilisation rapide

### Import des styles

Les styles sont automatiquement importés dans `main.ts`. Vous n'avez rien à faire de plus !

```typescript
// Déjà fait dans main.ts
import './assets/main.css';
import './styles/design-system.css';
```

### Utilisation des variables CSS

Toutes les couleurs, espacements, et autres valeurs sont disponibles via les variables CSS :

```css
.mon-composant {
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: var(--spacing-lg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
```

### Classes utilitaires

Utilisez les classes prédéfinies pour un développement rapide :

```html
<div class="card bg-primary shadow-lg rounded-xl">
  <h1 class="text-primary">Titre</h1>
  <p class="text-secondary">Description</p>
  <button class="btn btn-primary">Action</button>
</div>
```

## 📦 Composants disponibles

### Boutons

```html
<!-- Bouton principal -->
<button class="btn btn-primary">Action principale</button>

<!-- Bouton secondaire (outlined) -->
<button class="btn btn-secondary">Action secondaire</button>

<!-- Bouton tertiaire (ghost) -->
<button class="btn btn-tertiary">Action tertiaire</button>
```

### Cartes

```html
<!-- Carte standard -->
<div class="card">
  <h3>Titre de la carte</h3>
  <p>Contenu de la carte</p>
</div>

<!-- Carte premium -->
<div class="card card-premium">
  <h3>Titre de la carte premium</h3>
  <p>Contenu avec plus d'espace</p>
</div>
```

### Formulaires

```html
<div class="form-group">
  <label>Nom</label>
  <input type="text" placeholder="Votre nom" />
</div>
```

### Headers de page

```html
<div class="page-header">
  <h1>Titre de la page</h1>
  <div class="header-actions">
    <button class="btn btn-primary">Action</button>
  </div>
</div>
```

## 🎨 Palette de couleurs

### Couleurs principales

- **Orange** (`--primary`): `#FF6B35` - Actions principales, liens
- **Marron** (`--secondary`): `#8B4513` - Texte, accents
- **Beige** (`--beige`): `#F5E6D3` - Arrière-plans subtils

### Couleurs fonctionnelles

- **Succès**: `--success` (`#10B981`)
- **Avertissement**: `--warning` (`#F59E0B`)
- **Erreur**: `--danger` (`#EF4444`)
- **Information**: `--info` (`#3B82F6`)

## 📐 Typographie

### Familles de polices

- **Titres**: `Playfair Display` (serif élégant)
- **Corps**: `Inter` (sans-serif moderne)
- **Accents**: `Poppins` (sans-serif dynamique)

### Tailles

Utilisez les variables CSS pour les tailles :

```css
.titre-hero {
  font-size: var(--font-size-6xl); /* 64px */
}

.titre-section {
  font-size: var(--font-size-4xl); /* 36px */
}

.texte-standard {
  font-size: var(--font-size-base); /* 16px */
}
```

## 🎯 Bonnes pratiques

### 1. Utilisez les variables CSS

✅ **Bon** :
```css
.button {
  background: var(--primary);
  padding: var(--spacing-md);
}
```

❌ **Mauvais** :
```css
.button {
  background: #FF6B35;
  padding: 16px;
}
```

### 2. Respectez les espacements

Utilisez le système d'espacement basé sur 8px :

```css
.container {
  padding: var(--spacing-lg); /* 24px */
  margin-bottom: var(--spacing-xl); /* 32px */
}
```

### 3. Utilisez les border radius appropriés

- **Petits éléments** : `--radius-sm` (6px)
- **Inputs, boutons** : `--radius-md` (10px)
- **Cartes** : `--radius-lg` (12px) ou `--radius-xl` (20px)
- **Modals** : `--radius-2xl` (24px)

### 4. Ajoutez des transitions

Tous les éléments interactifs doivent avoir des transitions :

```css
.element {
  transition: all var(--transition-base);
}
```

### 5. Utilisez les ombres appropriées

- **Subtile** : `--shadow-sm` pour les cartes légères
- **Moyenne** : `--shadow-md` pour les cartes standard
- **Large** : `--shadow-lg` pour les modals et éléments importants

## 📱 Responsive Design

La charte inclut des breakpoints responsives. Utilisez les media queries standard :

```css
@media (max-width: 640px) {
  .container {
    padding: var(--spacing-md);
  }
}
```

## ♿ Accessibilité

### Contraste

Toutes les couleurs respectent les standards WCAG :
- Texte sur fond clair : minimum 4.5:1
- Éléments interactifs : minimum 3:1

### Focus states

Les éléments interactifs ont des états de focus visibles :

```css
button:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}
```

## 🎭 Animations

Utilisez les classes d'animation prédéfinies :

```html
<div class="animate-fade-in">Contenu qui apparaît</div>
<div class="animate-slide-up">Contenu qui monte</div>
<div class="animate-scale-in">Contenu qui grandit</div>
```

## 📚 Documentation complète

Pour plus de détails, consultez le fichier `ui-ux-charte.md` qui contient la documentation complète de la charte.

## 🔄 Migration depuis l'ancien design

Si vous avez du code existant, les anciennes variables CSS sont toujours disponibles pour la compatibilité, mais nous recommandons de migrer vers les nouvelles variables.

### Ancien → Nouveau

- `--color-primary` → `--primary`
- `--color-text` → `--text-primary`
- `--color-bg` → `--bg-primary`
- `--radius-md` → `--radius-md` (inchangé)

## 💡 Exemples complets

Consultez les composants existants dans `src/views/` pour voir des exemples d'utilisation de la charte.

