<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AppstoreOutlined, GiftOutlined, TagsOutlined, TeamOutlined } from '@ant-design/icons-vue'
import { useThemeStore } from '@/stores/themeStore'

const router = useRouter()
const route = useRoute()
const themeStore = useThemeStore()

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

function navigate(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="admin-layout">
    <!-- Top Bar -->
    <header class="admin-header">
      <div class="header-left">
        <span class="header-logo">&lt;/&gt;</span>
        <span class="header-title">CodeFreex</span>
        <span class="header-badge">Admin</span>
      </div>
      <div class="header-right">
        <button class="theme-toggle" @click="themeStore.toggleTheme()" :title="themeStore.isDark ? '切换亮色' : '切换暗色'">
          <svg v-if="themeStore.isDark" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
        <button class="back-btn" @click="router.push('/')">返回前台 →</button>
      </div>
    </header>

    <!-- Body: Sidebar + Content -->
    <div class="admin-body">
      <aside class="admin-sidebar">
        <nav class="sidebar-nav">
          <a
            v-for="item in menuItems"
            :key="item.key"
            :class="['nav-item', { 'nav-item--active': activeKey === item.key }]"
            @click="navigate(item.path)"
          >
            <component :is="item.icon" class="nav-icon" />
            <span>{{ item.label }}</span>
          </a>
        </nav>
      </aside>

      <main class="admin-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ---- Top Bar ---- */
.admin-header {
  height: 52px;
  background: var(--bg-base);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-logo {
  font-family: var(--font-mono);
  font-size: 15px;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 2px 6px;
  border-radius: 4px;
}

.header-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.header-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 2px 8px;
  border-radius: 4px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.theme-toggle:hover {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.back-btn {
  background: none;
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
  padding: 5px 14px;
  border-radius: var(--radius-sm);
  transition: all var(--duration-fast) var(--ease-out);
}

.back-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}

/* ---- Body Grid ---- */
.admin-body {
  flex: 1;
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 0;
}

/* ---- Sidebar ---- */
.admin-sidebar {
  background: var(--bg-base);
  border-right: 1px solid var(--border);
  padding: 16px 12px;
  overflow-y: auto;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  font-size: 14px;
  font-weight: 500;
  user-select: none;
}

.nav-item:hover {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.nav-item--active {
  color: var(--accent);
  background: var(--accent-soft);
}

.nav-icon {
  font-size: 16px;
  color: var(--text-muted);
}

.nav-item--active .nav-icon {
  color: var(--accent);
}

/* ---- Content ---- */
.admin-content {
  padding: 24px 28px;
  overflow-y: auto;
  min-width: 0;
}

@media (max-width: 960px) {
  .admin-body {
    grid-template-columns: 1fr;
  }

  .admin-sidebar {
    border-right: none;
    border-bottom: 1px solid var(--border);
    padding: 12px;
  }

  .sidebar-nav {
    flex-direction: row;
    overflow-x: auto;
    gap: 4px;
  }

  .admin-content {
    padding: 20px 16px;
  }
}
</style>
