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
  UserOutlined,
  MobileOutlined,
} from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/userStore'
import {
  getLoginMethods,
  loginByPassword,
  sendLoginCode,
  loginByCode,
  register,
  getOAuthAuthorizeUrl,
  completeOAuthRegistration,
} from '@/api/authController'
import { parseResponseData } from '@/utils/response'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const loading = ref(false)

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
  mode.value = target
  router.replace({ name: target })
}

// ==================== 动态登录方式（与管理端配置实时同步） ====================

const methods = ref<string[]>([])
const methodsLoading = ref(true)

const passwordEnabled = computed(() => methods.value.includes('password'))
const codeMethods = computed(() =>
  methods.value.filter((m) => m.startsWith('email:') || m.startsWith('sms:')),
)
const oauthMethods = computed(() => methods.value.filter((m) => m.startsWith('oauth:')))

const CODE_METHOD_LABELS: Record<string, string> = {
  'email:smtp': '邮箱验证码',
  'email:aliyun': '邮箱验证码',
  'sms:aliyun': '手机验证码',
}
const OAUTH_META: Record<string, { label: string; className: string }> = {
  'oauth:gitee': { label: 'Gitee', className: 'oauth-gitee' },
  'oauth:github': { label: 'GitHub', className: 'oauth-github' },
}

/** 主登录方式列表：密码 + 各验证码方式 */
const primaryMethods = computed(() => {
  const list: string[] = []
  if (passwordEnabled.value) {
    list.push('password')
  }
  list.push(...codeMethods.value)
  return list
})

const activeMethod = ref('password')

async function loadMethods() {
  methodsLoading.value = true
  try {
    const res = await getLoginMethods()
    if (res.data?.code === 0 && res.data.data) {
      methods.value = parseResponseData<string[]>(res.data.data)
    }
  } catch {
    message.error('获取登录方式失败，请刷新重试')
  } finally {
    methodsLoading.value = false
    if (!primaryMethods.value.includes(activeMethod.value)) {
      activeMethod.value = primaryMethods.value[0] || 'password'
    }
  }
}

function methodLabel(method: string): string {
  if (method === 'password') {
    return '密码登录'
  }
  return CODE_METHOD_LABELS[method] || method
}

watch(primaryMethods, (list) => {
  if (list.length && !list.includes(activeMethod.value)) {
    activeMethod.value = list[0] || 'password'
  }
})

// ==================== 密码登录 ====================

const passwordForm = reactive({ username: '', password: '' })

async function handlePasswordLogin() {
  if (loading.value) {
    return
  }
  if (!passwordForm.username || !passwordForm.password) {
    message.warning('请输入账号和密码')
    return
  }
  loading.value = true
  try {
    const res = await loginByPassword(passwordForm.username, passwordForm.password)
    if (res.data?.code === 0 && res.data.data) {
      const tokenData = parseResponseData<API.TokenResponse>(res.data.data)
      await userStore.applyLogin(tokenData)
      message.success('登录成功')
      router.push((route.query.redirect as string) || '/')
    } else {
      message.error(res.data?.message || '登录失败')
    }
  } catch {
    message.error('登录失败，请检查网络')
  } finally {
    loading.value = false
  }
}

// ==================== 验证码登录 ====================

const codeForm = reactive({ target: '', code: '', inviteCode: '' })
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

function activeCodeMethod(): string {
  return activeMethod.value
}

async function handleSendCode() {
  if (countdown.value > 0 || loading.value) {
    return
  }
  if (!codeForm.target) {
    message.warning(activeMethod.value.startsWith('sms:') ? '请输入手机号' : '请输入邮箱')
    return
  }
  loading.value = true
  try {
    const res = await sendLoginCode(activeCodeMethod(), codeForm.target)
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

async function handleCodeLogin() {
  if (loading.value) {
    return
  }
  if (!codeForm.target || !codeForm.code) {
    message.warning('请填写完整信息')
    return
  }
  loading.value = true
  try {
    const res = await loginByCode({
      method: activeCodeMethod(),
      target: codeForm.target,
      code: codeForm.code,
      inviteCode: codeForm.inviteCode || undefined,
    })
    if (res.data?.code === 0 && res.data.data) {
      const tokenData = parseResponseData<API.TokenResponse>(res.data.data)
      await userStore.applyLogin(tokenData)
      message.success('登录成功')
      router.push((route.query.redirect as string) || '/')
    } else {
      message.error(res.data?.message || '登录失败')
    }
  } catch {
    message.error('登录失败，请检查网络')
  } finally {
    loading.value = false
  }
}

// ==================== 注册 ====================

const regForm = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  inviteCode: '',
})

async function handleRegister() {
  if (loading.value) {
    return
  }
  if (!regForm.email || !regForm.password || !regForm.inviteCode) {
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
      password: regForm.password,
      inviteCode: regForm.inviteCode,
    })
    if (res.data?.code === 0 && res.data.data) {
      const tokenData = parseResponseData<API.TokenResponse>(res.data.data)
      await userStore.applyLogin(tokenData)
      message.success('注册成功')
      router.push((route.query.redirect as string) || '/')
    } else {
      message.error(res.data?.message || '注册失败')
    }
  } catch {
    message.error('注册失败，请检查网络')
  } finally {
    loading.value = false
  }
}

// ==================== OAuth 登录 ====================

async function handleOAuthLogin(method: string) {
  if (loading.value) {
    return
  }
  const provider = method.substring('oauth:'.length)
  loading.value = true
  try {
    const res = await getOAuthAuthorizeUrl(provider)
    if (res.data?.code === 0 && res.data.data) {
      // 授权地址是普通字符串，不是 JSON 编码的数据，直接使用
      const url = typeof res.data.data === 'string' ? res.data.data : parseResponseData<string>(res.data.data)
      if (url) {
        window.location.href = url
        return
      }
    }
    message.error(res.data?.message || '获取授权地址失败')
  } catch {
    message.error('获取授权地址失败，请检查网络')
  } finally {
    loading.value = false
  }
}

// OAuth 回调落地：#oauth=success&accessToken=.. / pending&tempToken=.. / failed&message=..
const oauthPending = ref(false)
const oauthTempToken = ref('')
const oauthNickname = ref('')
const oauthInviteCode = ref('')

function handleOAuthHash() {
  const hash = window.location.hash
  if (!hash.startsWith('#oauth=')) {
    return
  }
  // 清除 hash，避免刷新后重复处理
  history.replaceState(null, '', window.location.pathname + window.location.search)

  const params = new URLSearchParams(hash.substring(1))
  const status = params.get('oauth')
  if (status === 'success') {
    const accessToken = params.get('accessToken') || ''
    const refreshTokenValue = params.get('refreshToken') || ''
    if (accessToken) {
      userStore.setTokens(accessToken, refreshTokenValue || undefined)
      userStore
        .applyLogin({ accessToken, refreshToken: refreshTokenValue })
        .then(() => {
          message.success('登录成功')
          router.push((route.query.redirect as string) || '/')
        })
        .catch(() => message.error('登录信息获取失败，请重新登录'))
    }
  } else if (status === 'pending') {
    oauthTempToken.value = params.get('tempToken') || ''
    oauthNickname.value = params.get('nickname') || ''
    if (oauthTempToken.value) {
      oauthPending.value = true
      message.info(`${oauthNickname.value || '新用户'}，请填写邀请码完成注册`)
    }
  } else if (status === 'failed') {
    message.error(params.get('message') || 'OAuth 登录失败')
  }
}

async function handleOAuthComplete() {
  if (loading.value) {
    return
  }
  if (!oauthInviteCode.value) {
    message.warning('请输入邀请码')
    return
  }
  loading.value = true
  try {
    const res = await completeOAuthRegistration(oauthTempToken.value, oauthInviteCode.value)
    if (res.data?.code === 0 && res.data.data) {
      const tokenData = parseResponseData<API.TokenResponse>(res.data.data)
      await userStore.applyLogin(tokenData)
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

// ==================== 代码生成动画（品牌面板） ====================

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
  loadMethods()
  handleOAuthHash()
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
        <!-- OAuth new user completion -->
        <template v-if="oauthPending">
          <div class="form-header">
            <h1 class="form-title">完成注册</h1>
            <p class="form-subtitle">首次使用第三方账号登录，请填写邀请码</p>
          </div>
          <a-form layout="vertical">
            <a-form-item label="邀请码">
              <a-input
                v-model:value="oauthInviteCode"
                placeholder="请输入邀请码"
                size="large"
                :prefix="h(GiftOutlined)"
              />
            </a-form-item>
            <a-form-item>
              <a-button
                type="primary"
                :loading="loading"
                block
                size="large"
                class="submit-btn"
                @click="handleOAuthComplete"
              >
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
                <p class="form-subtitle">
                  {{ mode === 'login' ? '登录你的账号，继续创造' : '开启你的零代码创造之旅' }}
                </p>
              </div>
            </Transition>
          </div>

          <div v-if="methodsLoading" class="methods-loading">
            <a-spin tip="加载登录方式..." />
          </div>

          <template v-else>
            <!-- ==================== 登录 ==================== -->
            <div v-if="mode === 'login'" key="login-view">
              <!-- 多种主登录方式时显示切换 -->
              <div v-if="primaryMethods.length > 1" class="method-switch">
                <button
                  v-for="m in primaryMethods"
                  :key="m"
                  type="button"
                  class="method-switch-item"
                  :class="{ active: activeMethod === m }"
                  @click="activeMethod = m"
                >
                  {{ methodLabel(m) }}
                </button>
              </div>

              <!-- 密码登录表单 -->
              <Transition name="form-swap" mode="out-in">
                <a-form
                  v-if="activeMethod === 'password' && passwordEnabled"
                  key="password-form"
                  :model="passwordForm"
                  layout="vertical"
                  @finish="handlePasswordLogin"
                >
                  <a-form-item name="username">
                    <a-input
                      v-model:value="passwordForm.username"
                      placeholder="请输入用户名或邮箱"
                      size="large"
                      :prefix="h(UserOutlined)"
                    />
                  </a-form-item>
                  <a-form-item name="password">
                    <a-input-password
                      v-model:value="passwordForm.password"
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

                <!-- 验证码登录表单 -->
                <a-form
                  v-else-if="codeMethods.includes(activeMethod)"
                  :key="`${activeMethod}-form`"
                  :model="codeForm"
                  layout="vertical"
                  @finish="handleCodeLogin"
                >
                  <a-form-item name="target">
                    <a-input
                      v-model:value="codeForm.target"
                      :placeholder="activeMethod.startsWith('sms:') ? '请输入手机号' : '请输入邮箱'"
                      size="large"
                      :prefix="activeMethod.startsWith('sms:') ? h(MobileOutlined) : h(MailOutlined)"
                    />
                  </a-form-item>
                  <a-form-item name="code">
                    <a-input-search
                      v-model:value="codeForm.code"
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
                  <a-form-item name="inviteCode">
                    <a-input
                      v-model:value="codeForm.inviteCode"
                      placeholder="邀请码（新用户必填，老用户可忽略）"
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
                      登录 / 注册
                    </a-button>
                  </a-form-item>
                </a-form>

                <!-- 无可用登录方式 -->
                <div v-else key="no-method" class="no-method">
                  <p>暂无可用的登录方式，请联系管理员</p>
                </div>
              </Transition>

              <!-- OAuth 第三方登录 -->
              <div v-if="oauthMethods.length" class="oauth-section">
                <div class="divider">
                  <span>其他登录方式</span>
                </div>
                <div class="oauth-buttons">
                  <button
                    v-for="m in oauthMethods"
                    :key="m"
                    type="button"
                    class="oauth-btn"
                    :class="OAUTH_META[m]?.className"
                    :disabled="loading"
                    @click="handleOAuthLogin(m)"
                  >
                    <span class="oauth-icon">{{ OAUTH_META[m]?.label.charAt(0) || 'O' }}</span>
                    {{ OAUTH_META[m]?.label || m }} 登录
                  </button>
                </div>
              </div>

              <div v-if="passwordEnabled" class="form-footer">
                还没有账号？
                <a class="switch-link" @click="switchMode('register')">立即注册</a>
              </div>
            </div>

            <!-- ==================== 注册 ==================== -->
            <Transition v-else name="form-swap" mode="out-in">
              <div key="register-view">
                <template v-if="passwordEnabled">
                  <a-form :model="regForm" layout="vertical" @finish="handleRegister">
                    <a-form-item name="email">
                      <a-input
                        v-model:value="regForm.email"
                        placeholder="请输入邮箱"
                        size="large"
                        :prefix="h(MailOutlined)"
                      />
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
                </template>
                <div v-else class="no-method">
                  <p>当前未开放自主注册，请使用左侧提供的登录方式</p>
                  <a class="switch-link" @click="switchMode('login')">返回登录</a>
                </div>
              </div>
            </Transition>
          </template>
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

.methods-loading {
  display: flex;
  justify-content: center;
  padding: var(--space-10) 0;
}

.no-method {
  text-align: center;
  padding: var(--space-8) 0;
  color: var(--text-secondary);
  font-size: 14px;
}

/* 登录方式切换（分段控件） */
.method-switch {
  display: flex;
  gap: 4px;
  padding: 4px;
  margin-bottom: var(--space-6);
  background: var(--bg-elevated);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
}

.method-switch-item {
  flex: 1;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: calc(var(--radius-md) - 2px);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.method-switch-item:hover {
  color: var(--text-primary);
}

.method-switch-item.active {
  color: #16A34A;
  background: var(--bg-surface);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

/* OAuth */
.oauth-section {
  margin-top: var(--space-4);
}

.divider {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin: var(--space-4) 0;
  color: var(--text-muted);
  font-size: 12px;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.oauth-buttons {
  display: flex;
  gap: var(--space-3);
}

.oauth-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  background: var(--bg-elevated);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.oauth-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: var(--accent);
}

.oauth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.oauth-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 50%;
  color: #fff;
}

.oauth-gitee .oauth-icon {
  background: #c71d23;
}

.oauth-gitee:hover:not(:disabled) {
  border-color: #c71d23;
}

.oauth-github .oauth-icon {
  background: #24292f;
}

.oauth-github:hover:not(:disabled) {
  border-color: #24292f;
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
