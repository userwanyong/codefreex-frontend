<script setup lang="ts">
import { onMounted } from 'vue'
import { healthCheck } from '@/api/healthController'
import { useThemeStore } from '@/stores/themeStore'

const themeStore = useThemeStore()

onMounted(async () => {
  themeStore.initTheme()
  try {
    await healthCheck()
  } catch {
    // Health check is best-effort and should not block app startup.
  }
})
</script>

<template>
  <a-config-provider :theme="themeStore.antTheme">
    <router-view />
  </a-config-provider>
</template>
