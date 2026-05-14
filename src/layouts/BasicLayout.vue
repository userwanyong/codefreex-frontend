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
  BellOutlined,
} from '@ant-design/icons-vue'
import { useThemeStore } from '@/stores/themeStore'
import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from '@/api/notificationController'
import { parseResponseData } from '@/utils/response'
import { message } from 'ant-design-vue'

const themeStore = useThemeStore()

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const mobileMenuOpen = ref(false)
const scrolled = ref(false)

// 通知相关
const notificationVisible = ref(false)
const notifications = ref<API.Notification[]>([])
const unreadCount = ref(0)
const notifLoading = ref(false)
const notifTotal = ref(0)
const notifPageNum = ref(1)

async function loadUnreadCount() {
  if (!userStore.isLoggedIn) return
  try {
    const res = await getUnreadCount()
    if (res.data?.code === 0) {
      unreadCount.value = res.data.data || 0
    }
  } catch { /* ignore */ }
}

async function loadNotifications() {
  if (!userStore.isLoggedIn) return
  notifLoading.value = true
  try {
    const res = await getNotifications(notifPageNum.value, 10)
    if (res.data?.code === 0 && res.data.data) {
      const data = parseResponseData<API.PageResponse<API.Notification>>(res.data.data)
      notifications.value = data.records || []
      notifTotal.value = data.total || 0
    }
  } catch { /* ignore */ } finally {
    notifLoading.value = false
  }
}

function handleNotificationVisibleChange(visible: boolean) {
  notificationVisible.value = visible
  if (visible) {
    notifPageNum.value = 1
    loadNotifications()
  }
}

async function handleNotificationClick(item: API.Notification) {
  if (item.isRead === 0 && item.id) {
    try {
      await markNotificationRead(item.id)
      item.isRead = 1
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch { /* ignore */ }
  }
  notificationVisible.value = false
}

async function handleMarkAllRead() {
  try {
    await markAllNotificationsRead()
    notifications.value.forEach(n => n.isRead = 1)
    unreadCount.value = 0
    message.success('已全部标记为已读')
  } catch {
    message.error('操作失败')
  }
}

function handleNotifPageChange(page: number) {
  notifPageNum.value = page
  loadNotifications()
}

function formatNotifTime(dateStr?: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前'
  return date.toLocaleDateString('zh-CN')
}

function handleScroll() {
  scrolled.value = window.scrollY > 10
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  loadUnreadCount()
  // 每30秒刷新未读数
  const timer = setInterval(loadUnreadCount, 30000)
  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
    clearInterval(timer)
  })
})

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
  { key: 'adminfeatured', label: '精选审批', path: '/admin/featured-applications' },
  { key: 'admintags', label: '标签管理', path: '/admin/tags' },
  { key: 'adminusage', label: '用量统计', path: '/admin/usage' },
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
        <!-- Left side: Logo + Credits -->
        <div class="nav-left">
          <router-link to="/" class="nav-logo">
            <span class="logo-icon">&lt;/&gt;</span>
            <span class="logo-text">CodeFreex</span>
          </router-link>
          <div v-if="userStore.isLoggedIn" class="credits-badge" @click="router.push('/profile')" title="剩余码点">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span class="credits-num">{{ userStore.userInfo?.remainingCredits ?? 0 }}</span>
          </div>
        </div>

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
            <!-- 通知铃铛 -->
            <a-dropdown v-model:open="notificationVisible" :trigger="['click']" placement="bottomRight" @visibleChange="handleNotificationVisibleChange">
              <div class="notification-bell" :class="{ 'has-unread': unreadCount > 0 }">
                <BellOutlined style="font-size: 18px" />
                <span v-if="unreadCount > 0" class="notification-badge">
                  {{ unreadCount > 99 ? '99+' : unreadCount }}
                </span>
              </div>
              <template #overlay>
                <div class="notification-panel" @click.stop>
                  <div class="notif-header">
                    <span class="notif-title">通知</span>
                    <a-button v-if="unreadCount > 0" type="link" size="small" @click="handleMarkAllRead">全部已读</a-button>
                  </div>
                  <div class="notif-list">
                    <a-spin :spinning="notifLoading">
                      <div v-if="notifications.length === 0 && !notifLoading" class="notif-empty">暂无通知</div>
                      <div
                        v-for="item in notifications"
                        :key="item.id"
                        class="notif-item"
                        :class="{ unread: item.isRead === 0 }"
                        @click="handleNotificationClick(item)"
                      >
                        <div class="notif-dot" v-if="item.isRead === 0"></div>
                        <div class="notif-content">
                          <div class="notif-item-title">{{ item.title }}</div>
                          <div class="notif-item-desc">{{ item.content }}</div>
                          <div class="notif-item-time">{{ formatNotifTime(item.createTime) }}</div>
                        </div>
                      </div>
                    </a-spin>
                  </div>
                  <div v-if="notifTotal > 10" class="notif-footer">
                    <a-pagination
                      size="small"
                      :current="notifPageNum"
                      :total="notifTotal"
                      :page-size="10"
                      :simple="true"
                      @change="handleNotifPageChange"
                    />
                  </div>
                </div>
              </template>
            </a-dropdown>
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
}

/* Logo */
.nav-left {
  display: flex;
  align-items: center;
  gap: 24px;
  flex: 1;
}

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
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-evenly;
}

/* Right side */
.nav-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: 1;
  justify-content: flex-end;
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

/* Credits Badge */
.credits-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--accent-soft), rgba(99, 102, 241, 0.08));
  border: 1px solid var(--border-accent);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  user-select: none;
}

.credits-badge:hover {
  background: linear-gradient(135deg, var(--accent-soft), rgba(99, 102, 241, 0.15));
  border-color: var(--accent);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
}

.credits-badge svg {
  color: var(--accent);
  flex-shrink: 0;
}

.credits-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #52c41a;
  box-shadow: 0 0 6px rgba(82, 196, 26, 0.5);
  flex-shrink: 0;
}

.credits-num {
  font-size: 14px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: -0.3px;
  font-variant-numeric: tabular-nums;
}

.create-btn {
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

/* Notification Bell */
.notification-bell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.notification-bell:hover {
  color: var(--text-primary);
  background: var(--bg-surface);
}

.notification-bell.has-unread {
  color: var(--accent);
}

.notification-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: #ff4d4f;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
}

/* Notification Panel */
.notification-panel {
  width: 360px;
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  max-height: 480px;
}

.notif-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.notif-title {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
}

.notif-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.notif-list :deep(.ant-spin-nested-loading) {
  height: 100%;
}

.notif-list :deep(.ant-spin-container) {
  display: flex;
  flex-direction: column;
}

.notif-empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
}

.notif-item:hover {
  background: var(--bg-surface);
}

.notif-item.unread {
  background: rgba(99, 102, 241, 0.12);
}

.notif-item.unread:hover {
  background: rgba(99, 102, 241, 0.18);
}

.notif-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6366f1;
  flex-shrink: 0;
  margin-top: 6px;
}

.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-item-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.notif-item-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notif-item-time {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}

.notif-footer {
  display: flex;
  justify-content: center;
  padding: 8px 16px 12px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
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

  .create-btn,
  .credits-badge {
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
