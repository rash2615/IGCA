import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './assets/main.css';
import './styles/design-system.css';
import './styles/buttons.css';
import './styles/grids-spacing.css';
import './styles/sections.css';
import './styles/view-base.css';
import './styles/accessibility.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');

