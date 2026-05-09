import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/userStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // 空白布局（登录/注册）
    {
      path: '/user',
      component: () => import('@/layouts/BlankLayout.vue'),
      children: [
        {
          path: 'login',
          name: 'login',
          component: () => import('@/pages/user/AuthPage.vue'),
          meta: { guest: true },
        },
        {
          path: 'register',
          name: 'register',
          component: () => import('@/pages/user/AuthPage.vue'),
          meta: { guest: true },
        },
      ],
    },

    // 主布局
    {
      path: '/',
      component: () => import('@/layouts/BasicLayout.vue'),
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/pages/HomePage.vue'),
        },
        {
          path: 'app/my',
          name: 'myapps',
          component: () => import('@/pages/app/MyAppsPage.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'app/create',
          name: 'appcreate',
          component: () => import('@/pages/app/AppCreatePage.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'app/:appId',
          name: 'appdetail',
          component: () => import('@/pages/app/AppDetailPage.vue'),
        },
        {
          path: 'invite',
          name: 'invite',
          component: () => import('@/pages/invite/InvitePage.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'invite/:inviteId',
          name: 'invitedetail',
          component: () => import('@/pages/invite/InviteDetailPage.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'redeem',
          name: 'redeem',
          component: () => import('@/pages/redeem/RedeemPage.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/pages/profile/ProfilePage.vue'),
          meta: { requiresAuth: true },
        },
        // 管理页面
        {
          path: 'admin/apps',
          name: 'adminapps',
          component: () => import('@/pages/admin/AdminAppPage.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'admin/invites',
          name: 'admininvites',
          component: () => import('@/pages/admin/AdminInvitePage.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'admin/redeems',
          name: 'adminredeems',
          component: () => import('@/pages/admin/AdminRedeemPage.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
      ],
    },

    // 404
    {
      path: '/:pathMatch(.*)*',
      name: 'notfound',
      component: () => import('@/pages/NotFoundPage.vue'),
    },
  ],
})

// 路由守卫
let initialized = false

router.beforeEach(async (to, _from, next) => {
  const userStore = useUserStore()

  if (!initialized) {
    await userStore.initUser()
    initialized = true
  }

  // 已登录用户访问登录/注册页，重定向到首页
  if (to.meta.guest && userStore.isLoggedIn) {
    return next({ name: 'home' })
  }

  // 需要登录的页面
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  // 需要管理员权限的页面
  if (to.meta.requiresAdmin && !userStore.isAdmin) {
    return next({ name: 'home' })
  }

  next()
})

export default router
