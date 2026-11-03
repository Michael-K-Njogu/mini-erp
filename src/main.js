import { createApp } from 'vue'
import './style.css'
import './composables/useTheme'
import App from './App.vue'
import router from './router'

async function bootstrap() {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MSW === 'true') {
    const { worker } = await import('./mocks/browser')
    await worker.start()
  }

  createApp(App).use(router).mount('#app')
}

bootstrap()
