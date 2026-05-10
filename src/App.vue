<script setup lang="ts">
import { onMounted } from 'vue'
import { theme } from 'ant-design-vue'
import { healthCheck } from '@/api/healthController'

const darkTheme = {
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

onMounted(async () => {
  try {
    await healthCheck()
  } catch {
    // Health check is best-effort and should not block app startup.
  }
})
</script>

<template>
  <a-config-provider :theme="darkTheme">
    <router-view />
  </a-config-provider>
</template>
