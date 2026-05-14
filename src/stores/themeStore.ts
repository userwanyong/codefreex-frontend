import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { theme } from 'ant-design-vue'

const STORAGE_KEY = 'codefreex_theme'

const darkAntConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorBgContainer: 'transparent',
    colorBgElevated: '#1E293B',
    colorBgLayout: 'transparent',
    colorBgSpotlight: 'transparent',
    colorBorder: 'rgba(255, 255, 255, 0.08)',
    colorBorderSecondary: 'rgba(255, 255, 255, 0.06)',
    colorText: '#F8FAFC',
    colorTextSecondary: '#94A3B8',
    colorTextTertiary: '#64748B',
    colorTextQuaternary: '#475569',
    colorPrimary: '#22C55E',
    colorPrimaryHover: '#16A34A',
    borderRadius: 10,
  },
}

const lightAntConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
    colorBgLayout: '#F8FAFC',
    colorBgSpotlight: '#FFFFFF',
    colorBorder: 'rgba(0, 0, 0, 0.08)',
    colorBorderSecondary: 'rgba(0, 0, 0, 0.05)',
    colorText: '#0F172A',
    colorTextSecondary: '#475569',
    colorTextTertiary: '#64748B',
    colorTextQuaternary: '#94A3B8',
    colorPrimary: '#22C55E',
    colorPrimaryHover: '#16A34A',
    borderRadius: 10,
  },
}

export const useThemeStore = defineStore('theme', () => {
  const stored = localStorage.getItem(STORAGE_KEY)
  const themeMode = ref<'dark' | 'light'>(stored === 'dark' ? 'dark' : 'light')
  const isDark = computed(() => themeMode.value === 'dark')

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', themeMode.value)
  }

  function toggleTheme() {
    document.body.classList.add('theme-transitioning')
    themeMode.value = isDark.value ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, themeMode.value)
    applyTheme()
    setTimeout(() => {
      document.body.classList.remove('theme-transitioning')
    }, 450)
  }

  function initTheme() {
    applyTheme()
  }

  const antTheme = computed(() => (isDark.value ? darkAntConfig : lightAntConfig))

  return { themeMode, isDark, toggleTheme, initTheme, antTheme }
})
