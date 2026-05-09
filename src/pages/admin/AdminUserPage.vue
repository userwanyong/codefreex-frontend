<script setup lang="ts">
import { useUserStore } from '@/stores/userStore'

const userStore = useUserStore()
</script>

<template>
  <div class="admin-user-page">
    <div class="page-header">
      <div>
        <h2>用户管理</h2>
        <p>当前前端已接好管理入口，但后端尚未提供用户列表、用户编辑与密码管理接口。</p>
      </div>
    </div>

    <a-alert
      type="warning"
      show-icon
      message="接口阻塞"
      description="要完整满足 F1 的管理员用户管理验收项，还需要后端补充用户列表、详情和编辑接口。"
    />

    <a-card class="fallback-card" title="当前登录管理员">
      <a-descriptions :column="1" bordered size="small">
        <a-descriptions-item label="用户 ID">
          {{ userStore.loginUser?.userId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="用户名">
          {{ userStore.loginUser?.username || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="邮箱">
          {{ userStore.loginUser?.email || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="角色">
          {{ userStore.roles.join(', ') || '-' }}
        </a-descriptions-item>
      </a-descriptions>
    </a-card>
  </div>
</template>

<style scoped>
.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px;
  font-size: 24px;
}

.page-header p {
  margin: 0;
  color: var(--text-secondary);
}

.fallback-card {
  margin-top: 20px;
}
</style>
