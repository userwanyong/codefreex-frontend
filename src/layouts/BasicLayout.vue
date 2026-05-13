<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import {
  HomeOutlined,
  AppstoreOutlined,
  GiftOutlined,
  TagsOutlined,
  UserOutlined,
  LogoutOutlined,
  CrownOutlined,
  MenuOutlined,
  CloseOutlined,
} from '@ant-design/icons-vue'
import { useThemeStore } from '@/stores/themeStore'

const themeStore = useThemeStore()

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const mobileMenuOpen = ref(false)
const scrolled = ref(false)

function handleScroll() {
  scrolled.value = window.scrollY > 10
}

onMounted(() => window.addEventListener('scroll', handleScroll))
onUnmounted(() => window.removeEventListener('scroll', handleScroll))

const navItems = computed(() => {
  const items = [
    { key: 'home', label: '发现', path: '/', icon: HomeOutlined },
    { key: 'myapps', label: '我的应用', path: '/app/my', icon: AppstoreOutlined },
    { key: 'invite', label: '邀请码', path: '/invite', icon: GiftOutlined },
    { key: 'redeem', label: '兑换码', path: '/redeem', icon: TagsOutlined },
  ]
  return items
})

const adminItems = [
  { key: 'adminusers', label: '用户管理', path: '/admin/user' },
  { key: 'adminapps', label: '应用管理', path: '/admin/app' },
  { key: 'admintags', label: '标签管理', path: '/admin/tags' },
  { key: 'admininvites', label: '邀请码管理', path: '/admin/invites' },
  { key: 'adminredeems', label: '兑换码管理', path: '/admin/redeem' },
]

const isHomePage = computed(() => route.path === '/')

const activeKey = computed(() => route.name as string)

async function handleLogout() {
  await userStore.logout()
  router.push('/user/login')
}

function navigate(path: string) {
  router.push(path)
  mobileMenuOpen.value = false
}
</script>

<template>
  <div class="layout">
    <!-- Top Navigation -->
    <header class="nav-header" :class="{ scrolled, 'nav-transparent': isHomePage && !scrolled }">
      <div class="nav-container">
        <!-- Logo -->
        <router-link to="/" class="nav-logo">
          <span class="logo-icon">&lt;/&gt;</span>
          <span class="logo-text">CodeFreex</span>
        </router-link>

        <!-- Desktop Nav -->
        <nav class="nav-links">
          <a
            v-for="item in navItems"
            :key="item.key"
            class="nav-link"
            :class="{ active: activeKey === item.key }"
            @click="navigate(item.path)"
          >
            <component :is="item.icon" />
            <span>{{ item.label }}</span>
          </a>

          <!-- Admin dropdown -->
          <a-dropdown v-if="userStore.isAdmin" placement="bottomRight">
            <a class="nav-link" :class="{ active: activeKey?.startsWith('admin') }">
              <CrownOutlined />
              <span>管理</span>
            </a>
            <template #overlay>
              <a-menu>
                <a-menu-item v-for="item in adminItems" :key="item.key" @click="navigate(item.path)">
                  {{ item.label }}
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </nav>

        <!-- Right side -->
        <div class="nav-right">
          <button class="theme-toggle" @click="themeStore.toggleTheme()" :title="themeStore.isDark ? '切换亮色' : '切换暗色'">
            <svg v-if="themeStore.isDark" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
          <template v-if="userStore.isLoggedIn">
            <a-button type="primary" class="create-btn" @click="router.push('/')">
              + 新建应用
            </a-button>
            <a-dropdown placement="bottomRight">
              <div class="user-avatar-btn">
                <a-avatar :src="userStore.avatar" :size="32" class="avatar">
                  {{ userStore.nickname?.charAt(0)?.toUpperCase() || 'U' }}
                </a-avatar>
              </div>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="profile" @click="router.push('/profile')">
                    <UserOutlined style="margin-right: 8px" />
                    个人中心
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="logout" @click="handleLogout">
                    <LogoutOutlined style="margin-right: 8px" />
                    退出登录
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </template>
          <template v-else>
            <a-button type="text" class="auth-btn" @click="router.push('/user/login')">登录</a-button>
            <a-button type="primary" class="auth-btn-primary" @click="router.push('/user/register')">注册</a-button>
          </template>

          <!-- Mobile menu toggle -->
          <a-button
            class="mobile-menu-btn"
            type="text"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <CloseOutlined v-if="mobileMenuOpen" />
            <MenuOutlined v-else />
          </a-button>
        </div>
      </div>
    </header>

    <!-- Mobile Menu -->
    <Transition name="slide-down">
      <div v-if="mobileMenuOpen" class="mobile-menu">
        <a
          v-for="item in navItems"
          :key="item.key"
          class="mobile-link"
          :class="{ active: activeKey === item.key }"
          @click="navigate(item.path)"
        >
          <component :is="item.icon" />
          <span>{{ item.label }}</span>
        </a>
        <template v-if="userStore.isAdmin">
          <div class="mobile-divider" />
          <a
            v-for="item in adminItems"
            :key="item.key"
            class="mobile-link"
            :class="{ active: activeKey === item.key }"
            @click="navigate(item.path)"
          >
            {{ item.label }}
          </a>
        </template>
      </div>
    </Transition>

    <!-- Main Content -->
    <main class="main-content" :class="{ 'main-home': isHomePage }">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ============================================
   Navigation Header
   ============================================ */
.nav-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  padding: 0 var(--space-6);
  transition: all var(--duration-normal) var(--ease-out);
  background: var(--nav-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid transparent;
}

.nav-header.scrolled {
  border-bottom-color: var(--glass-border);
  background: var(--nav-bg-scrolled);
}

.nav-header.nav-transparent {
  background: var(--nav-bg-transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom-color: transparent;
}

.nav-container {
  max-width: 1280px;
  margin: 0 auto;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
}

/* Logo */
.nav-logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  text-decoration: none;
  flex-shrink: 0;
}

.logo-icon {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-accent);
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

/* Nav Links */
.nav-links {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  text-decoration: none;
  user-select: none;
}

.nav-link:hover {
  color: var(--text-primary);
  background: var(--bg-surface);
}

.nav-link.active {
  color: var(--accent);
  background: var(--accent-soft);
}

/* Right side */
.nav-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.create-btn {
  height: 36px;
  border-radius: var(--radius-md);
  font-weight: 600;
  padding: 0 16px;
}

.user-avatar-btn {
  cursor: pointer;
  padding: 2px;
  border-radius: 50%;
  transition: all var(--duration-fast) var(--ease-out);
}

.user-avatar-btn:hover {
  background: var(--bg-surface);
}

.avatar {
  background: linear-gradient(135deg, var(--accent), var(--blue));
  font-weight: 600;
  font-size: 13px;
}

.auth-btn {
  color: var(--text-secondary) !important;
  font-weight: 500;
}

.auth-btn:hover {
  color: var(--text-primary) !important;
}

.auth-btn-primary {
  height: 36px;
  border-radius: var(--radius-md);
  font-weight: 600;
}

.mobile-menu-btn {
  display: none;
  color: var(--text-primary) !important;
  font-size: 18px;
}

/* Theme toggle */
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.theme-toggle:hover {
  color: var(--text-primary);
  background: var(--bg-surface);
}

/* ============================================
   Mobile Menu
   ============================================ */
.mobile-menu {
  display: none;
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  z-index: 49;
  background: var(--mobile-menu-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--glass-border);
  padding: var(--space-4) var(--space-6);
}

.mobile-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  color: var(--text-secondary);
  font-size: 15px;
  font-weight: 500;
  border-radius: var(--radius-md);
  cursor: pointer;
  text-decoration: none;
  transition: all var(--duration-fast) var(--ease-out);
}

.mobile-link:hover,
.mobile-link.active {
  color: var(--accent);
  background: var(--accent-soft);
}

.mobile-divider {
  height: 1px;
  background: var(--border);
  margin: var(--space-3) 0;
}

/* ============================================
   Main Content
   ============================================ */
.main-content {
  flex: 1;
  margin-top: 60px;
  padding: var(--space-8) var(--space-6);
}

.main-content.main-home {
  margin-top: 0;
  padding: 0;
}

/* ============================================
   Transitions
   ============================================ */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all var(--duration-normal) var(--ease-out);
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ============================================
   Responsive
   ============================================ */
@media (max-width: 768px) {
  .nav-links {
    display: none;
  }

  .create-btn {
    display: none;
  }

  .auth-btn,
  .auth-btn-primary {
    display: none;
  }

  .mobile-menu-btn {
    display: flex;
  }

  .mobile-menu {
    display: block;
  }

  .main-content {
    padding: var(--space-5) var(--space-4);
  }
}
</style>
