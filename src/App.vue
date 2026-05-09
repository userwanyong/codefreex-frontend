<script setup lang="ts">
import { onMounted } from 'vue'
import { healthCheck } from '@/api/healthController'

onMounted(async () => {
  try {
    await healthCheck()
  } catch {
    // Health check is best-effort and should not block app startup.
  }
})
</script>

<template>
  <router-view />
</template>
