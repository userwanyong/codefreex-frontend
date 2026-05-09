<script setup lang="ts">
import { ref, reactive, computed, h, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  MailOutlined,
  LockOutlined,
  SafetyOutlined,
  GiftOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/userStore'
import { loginByEmail, sendEmailCode, register } from '@/api/authController'
import { parseResponseData } from '@/utils/response'
import WechatQrCode from '@/components/WechatQrCode.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const loading = ref(false)
const loginTab = ref('wechat')

// Mode: 'login' | 'register'
const mode = ref<'login' | 'register'>('login')

watch(
  () => route.name,
  (name) => {
    mode.value = name === 'register' ? 'register' : 'login'
  },
  { immediate: true },
)

function switchMode(target: 'login' | 'register') {
  loginTab.value = 'email'
  mode.value = target
  router.replace({ name: target })
}

// --- Login form ---
const loginForm = reactive({ email: '', password: '' })

async function handleEmailLogin() {
  if (loading.value) {
    return
  }
  if (!loginForm.email || !loginForm.password) {
    message.warning('请输入邮箱和密码')
    return
  }
  loading.value = true
  try {
    const res = await loginByEmail(loginForm.email, loginForm.password)
    if (res.data?.code === 0 && res.data.data) {
      const tokenData = parseResponseData<API.TokenResponse>(res.data.data)
      userStore.setToken(tokenData.accessToken || '')
      await Promise.all([userStore.fetchLoginUser(), userStore.fetchUserRoles(), userStore.fetchUserInfo()])
      message.success('登录成功')
      const redirect = (route.query.redirect as string) || '/'
      router.push(redirect)
    } else {
      message.error(res.data?.message || '登录失败')
    }
  } catch {
    message.error('登录失败，请检查网络')
  } finally {
    loading.value = false
  }
}

// --- Register form ---
const regForm = reactive({
  email: '',
  emailCode: '',
  password: '',
  confirmPassword: '',
  inviteCode: '',
})
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

async function handleSendCode() {
  if (countdown.value > 0 || loading.value) {
    return
  }
  if (!regForm.email) {
    message.warning('请输入邮箱')
    return
  }
  loading.value = true
  try {
    const res = await sendEmailCode(regForm.email)
    if (res.data?.code === 0) {
      message.success('验证码已发送')
      startCountdown()
    } else {
      message.error(res.data?.message || '发送失败')
    }
  } catch {
    message.error('发送失败，请检查网络')
  } finally {
    loading.value = false
  }
}

function startCountdown() {
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer!)
      countdownTimer = null
    }
  }, 1000)
}

async function handleRegister() {
  if (loading.value) {
    return
  }
  if (!regForm.email || !regForm.emailCode || !regForm.password || !regForm.inviteCode) {
    message.warning('请填写完整信息')
    return
  }
  if (regForm.password !== regForm.confirmPassword) {
    message.warning('两次密码输入不一致')
    return
  }
  if (regForm.password.length < 6) {
    message.warning('密码长度不能少于6位')
    return
  }
  loading.value = true
  try {
    const res = await register({
      email: regForm.email,
      emailCode: regForm.emailCode,
      password: regForm.password,
      inviteCode: regForm.inviteCode,
    })
    if (res.data?.code === 0 && res.data.data) {
      const tokenData = parseResponseData<API.TokenResponse>(res.data.data)
      userStore.setToken(tokenData.accessToken || '')
      await Promise.all([userStore.fetchLoginUser(), userStore.fetchUserRoles(), userStore.fetchUserInfo()])
      message.success('注册成功')
      const redirect = (route.query.redirect as string) || '/'
      router.push(redirect)
    } else {
      message.error(res.data?.message || '注册失败')
    }
  } catch {
    message.error('注册失败，请检查网络')
  } finally {
    loading.value = false
  }
}

// --- WeChat login ---
const wechatNewUser = ref(false)
const wechatTempToken = ref('')
const wechatInviteCode = ref('')

function handleWechatLogin(token: API.TokenResponse) {
  userStore.setToken(token.accessToken || '')
  Promise.all([userStore.fetchLoginUser(), userStore.fetchUserRoles(), userStore.fetchUserInfo()]).then(() => {
    message.success('登录成功')
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  })
}

function handleWechatNewUser(tempToken: string, nickname: string, _avatar: string) {
  wechatNewUser.value = true
  wechatTempToken.value = tempToken
  message.info(`${nickname}，请填写邀请码完成注册`)
}

async function handleWechatComplete() {
  if (loading.value) {
    return
  }
  if (!wechatInviteCode.value) {
    message.warning('请输入邀请码')
    return
  }
  loading.value = true
  try {
    const { completeWechatRegistration } = await import('@/api/authController')
    const res = await completeWechatRegistration(wechatTempToken.value, wechatInviteCode.value)
    if (res.data?.code === 0 && res.data.data) {
      const tokenData = parseResponseData<API.TokenResponse>(res.data.data)
      userStore.setToken(tokenData.accessToken || '')
      await Promise.all([userStore.fetchLoginUser(), userStore.fetchUserRoles(), userStore.fetchUserInfo()])
      message.success('注册成功')
      router.push('/')
    } else {
      message.error(res.data?.message || '注册失败')
    }
  } catch {
    message.error('注册失败，请检查网络')
  } finally {
    loading.value = false
  }
}

// --- Code generation animation ---
const codeLines = ref<string[]>([])
const currentLine = ref('')
const cursorVisible = ref(true)
let lineIndex = 0
let charIndex = 0
let typeTimer: ReturnType<typeof setTimeout> | null = null
let cursorTimer: ReturnType<typeof setInterval> | null = null

const loginScript = [
  { text: '<span class="ck">const</span> <span class="cf">app</span> = <span class="ck">await</span> <span class="cf">createApp</span>({', delay: 35 },
  { text: '  prompt: <span class="cs">"在线商城系统"</span>,', delay: 30 },
  { text: '  framework: <span class="cs">"vue3"</span>,', delay: 25 },
  { text: '  features: [<span class="cs">"支付"</span>, <span class="cs">"购物车"</span>],', delay: 30 },
  { text: '})', delay: 20 },
  { text: '', delay: 400 },
  { text: '<span class="cc">// AI 自动生成代码...</span>', delay: 25 },
  { text: '<span class="ck">const</span> <span class="cf">code</span> = <span class="ck">await</span> <span class="cf">ai</span>.<span class="cf">generate</span>(app)', delay: 35 },
  { text: '', delay: 300 },
  { text: '<span class="cc">// 一键部署上线</span>', delay: 25 },
  { text: '<span class="ck">await</span> <span class="cf">deploy</span>(code, { url: <span class="cs">"my-app.codefreex.com"</span> })', delay: 40 },
  { text: '', delay: 300 },
  { text: '<span class="cc">// 你的应用已上线！</span>', delay: 30 },
]

const registerScript = [
  { text: '<span class="ck">const</span> <span class="cf">user</span> = <span class="ck">await</span> <span class="cf">register</span>({', delay: 35 },
  { text: '  email: <span class="cs">"you@example.com"</span>,', delay: 30 },
  { text: '  inviteCode: <span class="cs">"FREEX2025"</span>,', delay: 25 },
  { text: '})', delay: 20 },
  { text: '', delay: 400 },
  { text: '<span class="cc">// 账号创建成功</span>', delay: 25 },
  { text: '<span class="ck">await</span> <span class="cf">user</span>.<span class="cf">activate</span>()', delay: 30 },
  { text: '', delay: 300 },
  { text: '<span class="cc">// 开始创造你的第一个应用</span>', delay: 25 },
  { text: '<span class="ck">const</span> <span class="cf">app</span> = <span class="ck">await</span> <span class="cf">createApp</span>({', delay: 35 },
  { text: '  prompt: <span class="cs">"我的第一个应用"</span>,', delay: 30 },
  { text: '})', delay: 20 },
  { text: '', delay: 300 },
  { text: '<span class="cc">// 欢迎加入 CodeFreex！</span>', delay: 30 },
]

const activeScript = computed(() => (mode.value === 'login' ? loginScript : registerScript))

function resetTyping() {
  if (typeTimer) clearTimeout(typeTimer)
  codeLines.value = []
  currentLine.value = ''
  lineIndex = 0
  charIndex = 0
}

function startTyping() {
  const script = activeScript.value
  if (lineIndex >= script.length) {
    setTimeout(() => {
      resetTyping()
      startTyping()
    }, 2000)
    return
  }

  const line = script[lineIndex]
  if (!line) {
    resetTyping()
    return
  }
  const plainText = line.text.replace(/<[^>]*>/g, '')

  if (charIndex <= plainText.length) {
    let result = ''
    let plainCount = 0
    let i = 0
    while (i < line.text.length && plainCount < charIndex) {
      if (line.text[i] === '<') {
        const end = line.text.indexOf('>', i)
        result += line.text.substring(i, end + 1)
        i = end + 1
      } else {
        result += line.text[i]
        plainCount++
        i++
      }
    }
    const openTags: string[] = []
    const tagRegex = /<\/?[^>]+>/g
    let match
    while ((match = tagRegex.exec(result)) !== null) {
      const tag = match[0]
      if (tag.startsWith('</')) openTags.pop()
      else if (!tag.endsWith('/>')) openTags.push(tag.match(/<(\w+)/)?.[1] || '')
    }
    let suffix = ''
    for (let t = openTags.length - 1; t >= 0; t--) suffix += `</${openTags[t]}>`
    currentLine.value = result + suffix
    charIndex++
    typeTimer = setTimeout(startTyping, line.delay)
  } else {
    codeLines.value.push(line.text)
    currentLine.value = ''
    charIndex = 0
    lineIndex++
    typeTimer = setTimeout(startTyping, line.delay)
  }
}

// Reset animation when mode changes
watch(mode, () => {
  resetTyping()
  startTyping()
})

onMounted(() => {
  startTyping()
  cursorTimer = setInterval(() => {
    cursorVisible.value = !cursorVisible.value
  }, 530)
})

onUnmounted(() => {
  if (typeTimer) clearTimeout(typeTimer)
  if (cursorTimer) clearInterval(cursorTimer)
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<template>
  <div class="auth-page">
    <!-- Left: Live code generation showcase -->
    <div class="brand-panel">
      <!-- Terminal window -->
      <div class="terminal">
        <div class="terminal-header">
          <div class="terminal-dots">
            <span class="dot dot-red" />
            <span class="dot dot-yellow" />
            <span class="dot dot-green" />
          </div>
          <span class="terminal-title">CodeFreex AI</span>
          <div class="terminal-actions">
            <ThunderboltOutlined class="terminal-icon" />
          </div>
        </div>
        <div class="terminal-body">
          <TransitionGroup name="code-line" tag="div">
            <div v-for="(line, i) in codeLines" :key="`${mode}-${i}-${line}`" class="code-line" v-html="line" />
          </TransitionGroup>
          <div class="code-line active-line">
            <span v-html="currentLine" />
            <span class="cursor" :class="{ visible: cursorVisible }">|</span>
          </div>
        </div>
      </div>

      <!-- Brand content -->
      <div class="brand-content">
        <router-link to="/" class="brand-logo">
          <span class="logo-icon">&lt;/&gt;</span>
          <span class="logo-text">CodeFreex</span>
        </router-link>
        <p class="brand-tagline">AI 驱动的零代码平台<br>从一句话到上线只需几分钟</p>
      </div>
    </div>

    <!-- Right: Form Panel -->
    <div class="form-panel">
      <div class="form-wrapper">
        <!-- WeChat new user completion -->
        <template v-if="wechatNewUser">
          <div class="form-header">
            <h1 class="form-title">完成注册</h1>
            <p class="form-subtitle">首次使用微信登录，请填写邀请码</p>
          </div>
          <a-form layout="vertical">
            <a-form-item label="邀请码">
              <a-input v-model:value="wechatInviteCode" placeholder="请输入邀请码" size="large" />
            </a-form-item>
            <a-form-item>
              <a-button type="primary" :loading="loading" block size="large" class="submit-btn" @click="handleWechatComplete">
                完成注册
              </a-button>
            </a-form-item>
          </a-form>
        </template>

        <!-- Login / Register -->
        <template v-else>
          <!-- Header -->
          <div class="form-header">
            <Transition name="title-swap" mode="out-in">
              <div :key="mode">
                <h1 class="form-title">{{ mode === 'login' ? '欢迎回来' : '创建账号' }}</h1>
                <p class="form-subtitle">{{ mode === 'login' ? '登录你的账号，继续创造' : '开启你的零代码创造之旅' }}</p>
              </div>
            </Transition>
          </div>

          <!-- Tabs: WeChat / Email -->
          <a-tabs v-model:activeKey="loginTab" centered class="auth-tabs">
            <!-- WeChat Tab -->
            <a-tab-pane key="wechat" tab="微信登录">
              <div class="wechat-wrapper">
                <WechatQrCode @login="handleWechatLogin" @new-user="handleWechatNewUser" />
              </div>
            </a-tab-pane>

            <!-- Email Tab -->
            <a-tab-pane key="email" :tab="mode === 'login' ? '邮箱登录' : '邮箱注册'">
              <!-- Login form -->
              <Transition name="form-swap" mode="out-in">
                <div v-if="mode === 'login'" key="login-form">
                  <a-form :model="loginForm" layout="vertical" @finish="handleEmailLogin">
                    <a-form-item name="email">
                      <a-input
                        v-model:value="loginForm.email"
                        placeholder="请输入邮箱"
                        size="large"
                        :prefix="h(MailOutlined)"
                      />
                    </a-form-item>
                    <a-form-item name="password">
                      <a-input-password
                        v-model:value="loginForm.password"
                        placeholder="请输入密码"
                        size="large"
                        :prefix="h(LockOutlined)"
                      />
                    </a-form-item>
                    <a-form-item>
                      <a-button
                        type="primary"
                        html-type="submit"
                        :loading="loading"
                        block
                        size="large"
                        class="submit-btn"
                      >
                        登录
                      </a-button>
                    </a-form-item>
                  </a-form>

                  <div class="form-footer">
                    还没有账号？
                    <a class="switch-link" @click="switchMode('register')">立即注册</a>
                  </div>
                </div>

                <!-- Register form -->
                <div v-else key="register-form">
                  <a-form :model="regForm" layout="vertical" @finish="handleRegister">
                    <a-form-item name="email">
                      <a-input
                        v-model:value="regForm.email"
                        placeholder="请输入邮箱"
                        size="large"
                        :prefix="h(MailOutlined)"
                      />
                    </a-form-item>
                    <a-form-item name="emailCode">
                      <a-input-search
                        v-model:value="regForm.emailCode"
                        placeholder="请输入验证码"
                        size="large"
                        :prefix="h(SafetyOutlined)"
                        @search="handleSendCode"
                      >
                        <template #enterButton>
                          <a-button :disabled="countdown > 0" class="code-btn">
                            {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
                          </a-button>
                        </template>
                      </a-input-search>
                    </a-form-item>
                    <a-form-item name="password">
                      <a-input-password
                        v-model:value="regForm.password"
                        placeholder="请输入密码（至少6位）"
                        size="large"
                        :prefix="h(LockOutlined)"
                      />
                    </a-form-item>
                    <a-form-item name="confirmPassword">
                      <a-input-password
                        v-model:value="regForm.confirmPassword"
                        placeholder="请确认密码"
                        size="large"
                        :prefix="h(LockOutlined)"
                      />
                    </a-form-item>
                    <a-form-item name="inviteCode">
                      <a-input
                        v-model:value="regForm.inviteCode"
                        placeholder="请输入邀请码"
                        size="large"
                        :prefix="h(GiftOutlined)"
                      />
                    </a-form-item>
                    <a-form-item>
                      <a-button
                        type="primary"
                        html-type="submit"
                        :loading="loading"
                        block
                        size="large"
                        class="submit-btn"
                      >
                        注册
                      </a-button>
                    </a-form-item>
                  </a-form>

                  <div class="form-footer">
                    已有账号？
                    <a class="switch-link" @click="switchMode('login')">立即登录</a>
                  </div>
                </div>
              </Transition>
            </a-tab-pane>
          </a-tabs>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
}

/* ============================================
   Left: Brand Panel
   ============================================ */
.brand-panel {
  flex: 1.2;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-10);
  overflow: hidden;
  background: #020408;
}

/* Terminal */
.terminal {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 520px;
  background: rgba(13, 17, 28, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
  backdrop-filter: blur(20px);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.03),
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 80px rgba(34, 197, 94, 0.05);
}

.terminal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.terminal-dots {
  display: flex;
  gap: 7px;
}

.dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
}

.dot-red { background: #FF5F57; }
.dot-yellow { background: #FFBD2E; }
.dot-green { background: #28CA42; }

.terminal-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  font-family: var(--font-mono);
  letter-spacing: 0.5px;
}

.terminal-actions {
  display: flex;
  gap: 8px;
}

.terminal-icon {
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
}

.terminal-body {
  padding: 20px;
  min-height: 280px;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.8;
  overflow: hidden;
}

.code-line {
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.7);
  min-height: 1.8em;
}

.active-line {
  color: rgba(255, 255, 255, 0.9);
}

.code-line :deep(.ck) { color: #C084FC; }
.code-line :deep(.cf) { color: #67E8F9; }
.code-line :deep(.cs) { color: #86EFAC; }
.code-line :deep(.cc) { color: rgba(255,255,255,0.35); font-style: italic; }

.cursor {
  color: #22C55E;
  font-weight: 300;
  opacity: 0;
  transition: opacity 0.1s;
  margin-left: 1px;
}

.cursor.visible {
  opacity: 1;
}

/* Code line transition */
.code-line-enter-active {
  animation: code-fade-in 0.3s ease-out;
}

@keyframes code-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Brand content */
.brand-content {
  position: relative;
  z-index: 2;
  text-align: center;
  margin-top: var(--space-10);
}

.brand-logo {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  text-decoration: none;
  margin-bottom: var(--space-4);
}

.logo-icon {
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 700;
  color: var(--accent);
  background: rgba(34, 197, 94, 0.12);
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: -0.5px;
}

.brand-tagline {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.35);
  line-height: 1.7;
  margin: 0;
}

/* ============================================
   Right: Form Panel
   ============================================ */
.form-panel {
  width: 480px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-10) var(--space-8);
  background: var(--bg-surface);
  border-left: 1px solid var(--glass-border);
  position: relative;
}

.form-wrapper {
  width: 100%;
  max-width: 380px;
}

.form-header {
  margin-bottom: var(--space-8);
  min-height: 72px;
}

.form-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--space-2);
  letter-spacing: -0.5px;
}

.form-subtitle {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0;
}

/* Title swap transition */
.title-swap-enter-active {
  transition: all 0.25s ease-out;
}

.title-swap-leave-active {
  transition: all 0.15s ease-in;
}

.title-swap-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.title-swap-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Form swap transition */
.form-swap-enter-active {
  transition: all 0.3s ease-out;
}

.form-swap-leave-active {
  transition: all 0.2s ease-in;
}

.form-swap-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.form-swap-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* Tabs */
.auth-tabs {
  margin-top: var(--space-2);
}

.auth-tabs :deep(.ant-tabs-nav) {
  margin-bottom: var(--space-4);
}

.wechat-wrapper {
  display: flex;
  justify-content: center;
  padding: var(--space-2) 0;
}

/* Code button (register) */
.code-btn {
  background: var(--bg-elevated) !important;
  border-color: var(--glass-border) !important;
  color: var(--text-secondary) !important;
  border-radius: var(--radius-md) !important;
}

.code-btn:hover:not(:disabled) {
  border-color: var(--accent) !important;
  color: var(--accent) !important;
}

/* Submit button */
.submit-btn {
  height: 46px !important;
  border-radius: var(--radius-md) !important;
  font-weight: 600 !important;
  font-size: 15px !important;
  background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%) !important;
  border: none !important;
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.25) !important;
  transition: all var(--duration-normal) var(--ease-out) !important;
}

.submit-btn:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 6px 24px rgba(34, 197, 94, 0.35) !important;
}

/* Footer */
.form-footer {
  text-align: center;
  margin-top: var(--space-6);
  padding-top: var(--space-6);
  border-top: 1px solid var(--border);
  font-size: 14px;
  color: var(--text-secondary);
}

.switch-link {
  color: var(--accent);
  font-weight: 500;
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease-out);
}

.switch-link:hover {
  color: #4ADE80;
}

/* ============================================
   Responsive
   ============================================ */
@media (max-width: 900px) {
  .brand-panel {
    display: none;
  }

  .form-panel {
    width: 100%;
    border-left: none;
  }
}

@media (max-width: 480px) {
  .form-panel {
    padding: var(--space-8) var(--space-5);
  }
}
</style>
