<script setup lang="ts">
import { useUserStore } from '@/stores/userStore'

const userStore = useUserStore()
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">用户管理</h1>
        <p class="page-desc">管理平台用户信息与权限</p>
      </div>
    </div>

    <a-alert
      type="warning"
      show-icon
      message="接口阻塞"
      description="要完整满足 F1 的管理员用户管理验收项，还需要后端补充用户列表、详情和编辑接口。"
      class="alert-box"
    />

    <div class="info-card">
      <h3 class="info-title">当前登录管理员</h3>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">用户 ID</span>
          <span class="info-value">{{ userStore.loginUser?.userId || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">用户名</span>
          <span class="info-value">{{ userStore.loginUser?.username || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">邮箱</span>
          <span class="info-value">{{ userStore.loginUser?.email || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">角色</span>
          <span class="info-value">{{ userStore.roles.join(', ') || '-' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  padding-top: 4px;
}

.page-header {
  margin-bottom: 28px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
  letter-spacing: -0.3px;
}

.page-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.alert-box {
  margin-bottom: 20px;
}

.info-card {
  background: var(--bg-surface);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: 24px;
}

.info-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.info-value {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

@media (max-width: 640px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
