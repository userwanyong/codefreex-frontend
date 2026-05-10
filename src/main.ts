import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(Antd)

// Initialize theme before mount to prevent flash
import { useThemeStore } from '@/stores/themeStore'
const themeStore = useThemeStore(pinia)
themeStore.initTheme()

app.mount('#app')
