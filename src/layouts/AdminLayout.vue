<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AppstoreOutlined, GiftOutlined, TagsOutlined, TeamOutlined } from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()

const menuItems = [
  { key: 'admin-user', label: '用户管理', path: '/admin/user', icon: TeamOutlined },
  { key: 'admin-apps', label: '应用管理', path: '/admin/app', icon: AppstoreOutlined },
  { key: 'admin-invites', label: '邀请码管理', path: '/admin/invites', icon: GiftOutlined },
  { key: 'admin-redeems', label: '兑换码管理', path: '/admin/redeem', icon: TagsOutlined },
]

const activeKey = computed(() => {
  const path = route.path
  return menuItems.find((item) => path.startsWith(item.path))?.key || 'admin-user'
})

function handleMenuClick(event: { key: string }) {
  router.push(menuItems.find((item) => item.key === event.key)?.path || '/admin/user')
}
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <div class="sidebar-header">
        <span class="sidebar-label">Admin Console</span>
        <h2>平台管理</h2>
      </div>
      <a-menu
        mode="inline"
        :selected-keys="[activeKey]"
        class="admin-menu"
        @click="handleMenuClick"
      >
        <a-menu-item v-for="item in menuItems" :key="item.key">
          <component :is="item.icon" />
          <span>{{ item.label }}</span>
        </a-menu-item>
      </a-menu>
    </aside>
    <section class="admin-main">
      <div class="admin-toolbar">
        <a-button type="link" @click="router.push('/')">返回前台</a-button>
      </div>
      <div class="admin-content">
        <router-view />
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin-layout {
  min-height: calc(100vh - 96px);
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 24px;
}

.admin-sidebar {
  background: var(--bg-surface);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  padding: 20px;
  box-shadow: var(--shadow-md);
  position: sticky;
  top: 84px;
  align-self: start;
}

.sidebar-header {
  margin-bottom: 16px;
}

.sidebar-label {
  display: inline-block;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
  margin-bottom: 8px;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 22px;
}

.admin-menu {
  background: transparent;
  border-inline-end: 0;
}

.admin-main {
  min-width: 0;
}

.admin-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.admin-content {
  background: var(--bg-surface);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  padding: 24px;
  box-shadow: var(--shadow-md);
}

@media (max-width: 960px) {
  .admin-layout {
    grid-template-columns: 1fr;
  }

  .admin-sidebar {
    position: static;
  }
}
</style>
