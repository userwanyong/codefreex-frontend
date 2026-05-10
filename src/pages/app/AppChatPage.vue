<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  SendOutlined,
  PaperClipOutlined,
  EditOutlined,
  ThunderboltOutlined,
  LoadingOutlined,
  ArrowLeftOutlined,
  GlobalOutlined,
  BulbOutlined,
  EyeInvisibleOutlined,
  CodeOutlined,
  EyeOutlined,
  DownloadOutlined,
  StopOutlined,
  LinkOutlined,
} from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import { getApp, deployApp, cancelDeploy, downloadApp } from '@/api/appController'
import { optimizePrompt, streamChatGenCode, getChatHistory } from '@/api/aiController'
import { parseResponseData } from '@/utils/response'
import ChatMessage from '@/components/ChatMessage.vue'
import CodeFilesPanel from '@/components/CodeFilesPanel.vue'

interface ChatMsg {
  id: string
  role: 'user' | 'ai' | 'system'
  content: string
  status?: 'sending' | 'streaming' | 'done' | 'error'
  timestamp: number
}

const route = useRoute()
const router = useRouter()
const appId = computed(() => route.params.appId as string)
const initialPrompt = computed(() => (route.query.prompt as string) || '')

// App info
const appName = ref('')
const appStatus = ref<string>('')
const deployKey = ref('')
const initPrompt = ref('')
const loadingApp = ref(true)

// Chat state
const messages = ref<ChatMsg[]>([])
const inputText = ref('')
const sending = ref(false)
const optimizing = ref(false)
const chatEndRef = ref<HTMLElement | null>(null)
const messagesAreaRef = ref<HTMLElement | null>(null)
let currentEventSource: EventSource | null = null
let msgIdCounter = 0
let hasAutoSent = false
let historyCursor = ''
let historyHasMore = false
let loadingMoreHistory = false

function genId() {
  msgIdCounter += 1
  return 'msg-' + msgIdCounter + '-' + Date.now()
}

// Preview
const previewUrl = computed(() => (deployKey.value ? `/api/static/${deployKey.value}/` : ''))
const deployedUrl = computed(() => (deployKey.value ? `/api/deploy/${deployKey.value}/` : ''))
const showPreview = ref(true)

// Right panel view: 'code' | 'preview'
const rightView = ref<'code' | 'preview'>('code')

// Get the latest streaming/done AI message content for code panel
const currentAIContent = computed(() => {
  const aiMsgs = messages.value.filter(m => m.role === 'ai' && m.content)
  const last = aiMsgs[aiMsgs.length - 1]
  return last ? last.content : ''
})

const statusLabel = computed(() => {
  if (sending.value) return '生成中'
  const map: Record<string, string> = { generated: '已生成', draft: '草稿', deployed: '已部署', disabled: '已禁用' }
  return map[appStatus.value] || ''
})

// Load app info
async function loadApp() {
  loadingApp.value = true
  try {
    const res = await getApp(appId.value)
    if (res.data?.code === 0 && res.data.data) {
      const app = parseResponseData<API.App>(res.data.data)
      const promptName = (initialPrompt.value || app.initPrompt || '').slice(0, 6) || '新应用'; appName.value = (!app.appName || app.appName === '未命名应用') ? promptName : app.appName
      appStatus.value = app.status || ''
      deployKey.value = app.deployKey || ''
      initPrompt.value = initialPrompt.value || app.initPrompt || ''

      // 加载历史对话
      await loadChatHistory()

      // 仅在无历史记录且有 prompt 参数时自动发送
      if (!messages.value.length && initialPrompt.value && !hasAutoSent) {
        hasAutoSent = true
        await nextTick()
        addMessage('user', initialPrompt.value)
        // 移除 URL 中的 prompt 参数，防止刷新时重复执行
        router.replace({ path: route.path, query: {} })
        await sendToAI(initialPrompt.value)
      }
    }
  } catch {
    // ignore
  } finally {
    loadingApp.value = false
    // loading 结束后消息 DOM 才渲染，此时再滚动到底部
    await nextTick()
    scrollToBottom()
  }
}

async function loadChatHistory() {
  try {
    const res = await getChatHistory(appId.value)
    if (res.data?.code === 0 && res.data.data) {
      const pageData = parseResponseData<{ records?: API.ChatHistoryItem[]; nextCursor?: string; hasNext?: boolean }>(res.data.data)
      const historyList = pageData.records || []
      historyCursor = pageData.nextCursor || ''
      historyHasMore = !!pageData.hasNext
      if (historyList.length) {
        messages.value = historyList.map(mapHistoryItem)
      }
    }
  } catch (e) {
    console.error('[ChatHistory] error:', e)
  }
}

function mapHistoryItem(item: API.ChatHistoryItem): ChatMsg {
  return {
    id: item.id || genId(),
    role: item.messageType === 'ai' ? 'ai' as const : 'user' as const,
    content: item.message || '',
    status: 'done' as const,
    timestamp: new Date(item.createTime || Date.now()).getTime(),
  }
}

async function loadMoreHistory() {
  if (loadingMoreHistory || !historyHasMore) return
  loadingMoreHistory = true
  try {
    const el = messagesAreaRef.value
    const prevHeight = el?.scrollHeight || 0
    const res = await getChatHistory(appId.value, historyCursor)
    if (res.data?.code === 0 && res.data.data) {
      const pageData = parseResponseData<{ records?: API.ChatHistoryItem[]; nextCursor?: string; hasNext?: boolean }>(res.data.data)
      const historyList = pageData.records || []
      historyCursor = pageData.nextCursor || ''
      historyHasMore = !!pageData.hasNext
      if (historyList.length) {
        messages.value = [...historyList.map(mapHistoryItem), ...messages.value]
        await nextTick()
        // 保持滚动位置：加载后多出的高度补偿回去
        if (el) el.scrollTop = el.scrollHeight - prevHeight
      }
    }
  } catch (e) {
    console.error('[ChatHistory] loadMore error:', e)
  } finally {
    loadingMoreHistory = false
  }
}

function handleMessagesScroll() {
  const el = messagesAreaRef.value
  if (!el) return
  if (el.scrollTop < 50) {
    loadMoreHistory()
  }
}



function addMessage(role: ChatMsg['role'], content: string, status?: ChatMsg['status']) {
  const msg: ChatMsg = {
    id: genId(), role, content,
    status: status || (role === 'ai' ? 'streaming' : 'done'),
    timestamp: Date.now(),
  }
  messages.value.push(msg)
  scrollToBottom()
  return msg
}

function scrollToBottom() {
  nextTick(() => {
    const el = messagesAreaRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

async function sendToAI(text: string) {
  if (currentEventSource) { currentEventSource.close(); currentEventSource = null }

  sending.value = true
  const aiMsg = addMessage('ai', '', 'streaming')
  const aiMsgId = aiMsg.id

  // 用 RAF 批量刷新 SSE 数据，减少 Vue 渲染次数，避免长内容卡顿
  let buffer = ''
  let rafId = 0
  function flushBuffer() {
    const target = messages.value.find((m) => m.id === aiMsgId)
    if (target && buffer) { target.content += buffer; buffer = '' }
    scrollToBottom()
    rafId = 0
  }

  currentEventSource = streamChatGenCode(appId.value, text, {
    onMessage(event) {
      if (event.type === 'deployKey' && typeof event.data === 'string') {
        deployKey.value = event.data
        return
      }
      if (event.type === 'ai_r' && typeof event.data === 'string') {
        buffer += event.data
        if (!rafId) {
          rafId = requestAnimationFrame(flushBuffer)
        }
      }
    },
    onDone() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0 }
      const target = messages.value.find((m) => m.id === aiMsgId)
      if (target && buffer) { target.content += buffer; buffer = '' }
      if (target) target.status = 'done'
      sending.value = false
      currentEventSource = null
      appStatus.value = 'generated'
      refreshAppInfo()
      refreshPreview()
      rightView.value = 'preview'
      scrollToBottom()
    },
    onError(err) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0 }
      const target = messages.value.find((m) => m.id === aiMsgId)
      if (target) {
        if (buffer) { target.content += buffer; buffer = '' }
        target.status = 'error'; if (!target.content) target.content = '生成中断，请重试'
      }
      sending.value = false
      currentEventSource = null
    },
  })
}

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || sending) return
  inputText.value = ''
  addMessage('user', text, 'done')
  await sendToAI(text)
}

async function handleRetry(msg: ChatMsg) {
  const idx = messages.value.indexOf(msg)
  if (idx > 0) {
    const userMsg = messages.value[idx - 1]
    if (userMsg && userMsg.role === 'user') {
      const target = messages.value.find((m) => m.id === msg.id)
      if (target) { target.status = 'streaming'; target.content = '' }
      await sendToAI(userMsg.content)
    }
  }
}

async function handleOptimize() {
  const text = inputText.value.trim()
  if (!text) { message.warning('请先输入内容'); return }
  optimizing.value = true
  try {
    const res = await optimizePrompt(text)
    if (res.data?.code === 0 && res.data.data) {
      inputText.value = typeof res.data.data === 'string' ? res.data.data : String(res.data.data)
      message.success('提示词已优化')
    } else {
      message.warning(res.data?.message || '优化失败，使用原始提示词')
    }
  } catch { message.error('优化失败，请检查网络') }
  finally { optimizing.value = false }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
}

function refreshPreview() { previewKey.value += 1 }

async function refreshAppInfo() {
  try {
    const res = await getApp(appId.value)
    if (res.data?.code === 0 && res.data.data) {
      const app = parseResponseData<API.App>(res.data.data)
      deployKey.value = app.deployKey || ''
      appStatus.value = app.status || 'generated'
      if (!appName.value && app.appName) appName.value = app.appName
    }
  } catch { /* ignore */ }
}
const previewKey = ref(0)

// Deploy state
const deploying = ref(false)

const canDeploy = computed(() => {
  return appStatus.value === 'generated' || appStatus.value === 'deployed'
})

async function handleDeploy() {
  if (deploying.value || !appId.value) return
  deploying.value = true
  try {
    const res = await deployApp(appId.value)
    if (res.data?.code === 0 && res.data.data) {
      const data = parseResponseData<API.AppDeployResponse>(res.data.data)
      if (data.deployKey) deployKey.value = data.deployKey
      appStatus.value = 'deployed'
      message.success('部署成功')
    } else {
      message.error((res.data as { message?: string })?.message || '部署失败')
    }
  } catch {
    message.error('部署失败，请稍后重试')
  } finally {
    deploying.value = false
  }
}

function handleCancelDeploy() {
  if (!appId.value) return
  Modal.confirm({
    title: '取消部署',
    content: '取消后应用将不再对外访问，确认取消部署吗？',
    okText: '确认',
    cancelText: '返回',
    async onOk() {
      try {
        const res = await cancelDeploy(appId.value)
        if (res.data?.code === 0) {
          message.success('已取消部署')
          appStatus.value = 'generated'
        } else {
          message.error(res.data?.message || '取消失败')
        }
      } catch {
        message.error('取消失败，请稍后重试')
      }
    },
  })
}

async function handleDownload() {
  if (!appId.value) return
  try {
    const res = await downloadApp(appId.value)
    const blob = new Blob([res.data as BlobPart], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${appName.value || 'app'}.zip`
    a.click()
    URL.revokeObjectURL(url)
    message.success('下载已开始')
  } catch {
    message.error('下载失败，请稍后重试')
  }
}

onMounted(() => loadApp())
onUnmounted(() => currentEventSource?.close())
</script>

<template>
  <div class="chat-page">
    <!-- Top Bar -->
    <div class="chat-topbar">
      <div class="topbar-left">
        <a-button type="text" size="small" class="back-btn" @click="router.push('/app/my')">
          <ArrowLeftOutlined /> 返回
        </a-button>
        <div class="app-info-group">
          <span class="app-name">{{ appName }}</span>
          <span class="status-dot" :class="'dot-' + (sending ? 'generating' : appStatus)" />
          <span class="status-text">{{ sending ? '生成中' : statusLabel }}</span>
        </div>
      </div>

      <div class="topbar-right">
        <div class="view-switcher">
          <button class="switch-btn" :class="{ active: rightView === 'code' }" @click="rightView = 'code'; showPreview = true">
            <CodeOutlined /> 代码
          </button>
          <button class="switch-btn" :class="{ active: rightView === 'preview' }" @click="rightView = 'preview'; showPreview = true" :disabled="!deployKey">
            <EyeOutlined /> 预览
          </button>
        </div>

        <!-- 部署/取消部署 -->
        <template v-if="appStatus === 'deployed'">
          <a-button size="small" class="topbar-action topbar-redeploy" :loading="deploying" @click="handleDeploy">
            <GlobalOutlined /> 重新部署
          </a-button>
          <a-button size="small" class="topbar-action topbar-cancel" @click="handleCancelDeploy">
            <StopOutlined /> 取消部署
          </a-button>
          <a-button v-if="deployedUrl" size="small" class="topbar-action topbar-visit">
            <a :href="deployedUrl" target="_blank" class="visit-link">
              <LinkOutlined /> 访问部署地址
            </a>
          </a-button>
        </template>
        <a-button v-else-if="canDeploy" size="small" class="topbar-action topbar-deploy" :loading="deploying" @click="handleDeploy">
          <GlobalOutlined /> 部署
        </a-button>

        <!-- 下载 -->
        <a-button size="small" class="topbar-action topbar-download" :disabled="!deployKey" @click="handleDownload">
          <DownloadOutlined /> 下载
        </a-button>

        <a-button type="text" size="small" class="toggle-btn" @click="showPreview = !showPreview">
          <BulbOutlined v-if="showPreview" />
          <EyeInvisibleOutlined v-else />
        </a-button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="chat-main">
      <!-- Left: Chat Panel -->
      <div class="chat-panel">
        <!-- Messages -->
        <div ref="messagesAreaRef" class="messages-area" @scroll="handleMessagesScroll">
          <a-spin v-if="loadingApp" class="loading-spin" />
          <template v-else>
            <ChatMessage v-for="msg in messages" :key="msg.id" :message="msg" @retry="handleRetry(msg)" />
            <div v-if="!messages.length && !loadingApp" class="empty-chat">
              <div class="empty-icon-wrap"><ThunderboltOutlined /></div>
              <p>开始对话，让 AI 为你生成应用</p>
            </div>
          </template>
          <div ref="chatEndRef" />
        </div>

        <!-- Input Area -->
        <div class="input-area">
          <div class="input-toolbar">
            <button class="tool-btn"><PaperClipOutlined /> 上传</button>
            <button class="tool-btn"><EditOutlined /> 编辑</button>
            <button class="tool-btn optimize-btn" :class="{ loading: optimizing }" @click="handleOptimize">
              <ThunderboltOutlined /> 优化
            </button>
          </div>
          <div class="input-row">
            <textarea
              v-model="inputText"
              class="msg-input"
              placeholder="描述详细、页面越具体，可以一步一步完善生成效果"
              rows="3"
              :disabled="sending"
              @keydown="handleKeydown"
            />
            <button class="send-btn" :class="{ active: inputText.trim() && !sending }" :disabled="!inputText.trim() || sending" @click="handleSend">
              <LoadingOutlined v-if="sending" />
              <SendOutlined v-else />
            </button>
          </div>
        </div>
      </div>

      <!-- Right: Preview Panel -->
      <div v-show="showPreview" class="preview-panel">
        <!-- 代码文件视图 -->
        <template v-if="rightView === 'code'">
          <CodeFilesPanel
            v-if="currentAIContent"
            :content="currentAIContent"
            :is-streaming="sending"
          />
          <div v-else class="preview-content">
            <div class="preview-loading">
              <div class="loading-spinner" />
              <p class="loading-text">{{ sending ? 'AI 正在生成应用代码...' : '准备就绪，等待生成...' }}</p>
              <div class="loading-steps">
                <div class="step" :class="{ active: true }">
                  <span class="step-dot" />
                  <span>分析需求</span>
                </div>
                <div class="step-line" />
                <div class="step" :class="{ active: sending }">
                  <span class="step-dot" />
                  <span>生成代码</span>
                </div>
                <div class="step-line" />
                <div class="step" :class="{ active: false }">
                  <span class="step-dot" />
                  <span>预览部署</span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 预览视图 -->
        <template v-else>
          <div class="preview-header">
            <span class="preview-title">
              <EyeOutlined /> 应用预览
            </span>
          </div>
          <div class="preview-content">
            <iframe
              v-if="deployKey"
              :key="previewKey"
              :src="previewUrl"
              class="preview-iframe"
              sandbox="allow-scripts allow-same-origin"
              frameborder="0"
            />
            <div v-else class="preview-loading">
              <div class="loading-spinner" />
              <p class="loading-text">{{ sending ? 'AI 正在生成应用代码...' : '准备就绪，等待生成...' }}</p>
              <div class="loading-steps">
                <div class="step" :class="{ active: true }">
                  <span class="step-dot" />
                  <span>分析需求</span>
                </div>
                <div class="step-line" />
                <div class="step" :class="{ active: sending }">
                  <span class="step-dot" />
                  <span>生成代码</span>
                </div>
                <div class="step-line" />
                <div class="step" :class="{ active: false }">
                  <span class="step-dot" />
                  <span>预览部署</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
  margin: calc(-1 * var(--space-8)) calc(-1 * var(--space-6));
  background: var(--bg-base);
  overflow: hidden;
}

/* ============================================
   Top Bar
   ============================================ */
.chat-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 52px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.back-btn {
  color: var(--text-secondary) !important;
  font-size: 13px;
  padding: 4px 8px !important;
  border-radius: var(--radius-sm) !important;
}

.back-btn:hover { background: var(--bg-elevated) !important; color: var(--text-primary) !important; }

.app-info-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.app-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-generating { background: #eab308; animation: dotPulse 1.2s infinite; }
.dot-generated { background: #22c55e; }
.dot-draft { background: var(--text-muted); }
.dot-error { background: #ef4444; }

@keyframes dotPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

.status-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.view-switcher {
  display: flex;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  padding: 2px;
  border: 1px solid var(--glass-border);
}

.switch-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 150ms ease;
  white-space: nowrap;
}

.switch-btn:hover:not(:disabled) {
  color: var(--text-secondary);
}

.switch-btn.active {
  background: var(--bg-surface);
  color: var(--accent);
  box-shadow: var(--shadow-sm);
}

.switch-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.preview-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.deploy-btn {
  height: 30px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
}

.download-btn {
  height: 30px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
}

.topbar-action {
  height: 30px;
  border-radius: var(--radius-sm) !important;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.topbar-action span {
  gap: 4px !important;
}

.topbar-deploy {
  background: var(--accent) !important;
  border: none !important;
  color: white !important;
}

.topbar-deploy:hover {
  opacity: 0.9;
}

.topbar-redeploy {
  background: var(--accent) !important;
  border: none !important;
  color: white !important;
}

.topbar-redeploy:hover {
  opacity: 0.9;
}

.topbar-cancel {
  background: rgba(239, 68, 68, 0.1) !important;
  border: 1px solid rgba(239, 68, 68, 0.2) !important;
  color: #EF4444 !important;
}

.topbar-cancel:hover {
  background: rgba(239, 68, 68, 0.18) !important;
}

.topbar-download {
  background: var(--bg-elevated) !important;
  border: 1px solid var(--glass-border) !important;
  color: var(--text-secondary) !important;
}

.topbar-download:hover:not(:disabled) {
  border-color: var(--border-hover) !important;
  color: var(--text-primary) !important;
}

.topbar-visit {
  background: rgba(59, 130, 246, 0.08) !important;
  border: 1px solid rgba(59, 130, 246, 0.3) !important;
  padding: 0 !important;
}

.topbar-visit:hover {
  border-color: rgba(59, 130, 246, 0.5) !important;
}

.visit-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #3B82F6 !important;
  text-decoration: none;
  font-size: 12px;
  font-weight: 600;
  padding: 0 7px;
  width: 100%;
  height: 100%;
}

.visit-link:hover {
  color: #2563EB !important;
}

.toggle-btn {
  width: 32px;
  height: 32px;
  padding: 0 !important;
  border-radius: var(--radius-sm);
  color: var(--text-secondary) !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.toggle-btn:hover { background: var(--bg-elevated) !important; color: var(--text-primary) !important; }

/* ============================================
   Main Layout
   ============================================ */
.chat-main {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* ============================================
   Chat Panel (Left)
   ============================================ */
.chat-panel {
  width: 48%;
  min-width: 420px;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--glass-border);
  background: var(--bg-base);
  min-height: 0;
  overflow: hidden;
}

/* Messages Area */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  min-height: 0;
}

.messages-area::-webkit-scrollbar { width: 4px; }
.messages-area::-webkit-scrollbar-track { background: transparent; }
.messages-area::-webkit-scrollbar-thumb { background: var(--bg-elevated); border-radius: 2px; }

.loading-spin { display: flex; justify-content: center; padding: 80px 0; }

.empty-chat {
  text-align: center;
  padding: 100px 0;
  color: var(--text-muted);
}

.empty-icon-wrap {
  width: 56px;
  height: 56px;
  margin: 0 auto 14px;
  border-radius: 50%;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--text-disabled);
}

.empty-chat p { font-size: 14px; margin: 0; }

/* Input Area */
.input-area {
  border-top: 1px solid var(--glass-border);
  background: var(--bg-surface);
  flex-shrink: 0;
}

.input-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 8px 16px 0;
}

.tool-btn {
  font-size: 12px;
  height: 28px;
  padding: 0 10px;
  border-radius: var(--radius-sm);
  color: var(--text-muted) !important;
  background: transparent !important;
  border: none !important;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 150ms ease;
}

.tool-btn:hover { color: var(--text-secondary) !important; background: var(--bg-elevated) !important; }
.optimize-btn:hover { color: var(--accent) !important; background: rgba(34, 197, 94, 0.08) !important; }
.optimize-btn.loading { color: var(--accent) !important; }

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 8px 16px 14px;
}

.msg-input {
  flex: 1;
  background: var(--bg-elevated);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: 12px 16px;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.55;
  resize: none;
  outline: none;
  transition: border-color 200ms ease, box-shadow 200ms ease;
}

.msg-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--shadow-sm); }
.msg-input::placeholder { color: var(--text-muted); }
.msg-input:disabled { opacity: 0.5; pointer-events: none; }

.send-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  background: var(--bg-elevated);
  color: var(--text-disabled);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: not-allowed;
  transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
  flex-shrink: 0;
  font-size: 17px;
}

.send-btn.active {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  cursor: pointer;
  box-shadow: var(--shadow-md);
}

.send-btn.active:hover { transform: scale(1.06); box-shadow: var(--shadow-lg); }

/* ============================================
   Preview Panel (Right)
   ============================================ */
.preview-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-base);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.preview-header {
  padding: 0 16px;
  height: 40px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
  background: var(--bg-surface);
}


.preview-content {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--bg-base);
  min-height: 0;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  background: white;
}

/* Loading State */
.preview-loading {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 40px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 3px solid var(--glass-border);
  border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.2px;
}

.loading-steps {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0.6;
}

.step {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
  transition: all 300ms ease;
}

.step.active {
  color: var(--accent);
  opacity: 1;
}

.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--bg-elevated);
  border: 2px solid var(--glass-border);
  transition: all 300ms ease;
  flex-shrink: 0;
}

.step.active .step-dot {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: var(--shadow-sm);
}

.step-line {
  width: 40px;
  height: 2px;
  background: var(--glass-border);
  border-radius: 1px;
}

/* ============================================
   Responsive
   ============================================ */
@media (max-width: 960px) {
  .chat-panel {
    width: 100%;
    max-width: none;
    min-width: 0;
    border-right: none;
    border-bottom: 1px solid var(--glass-border);
  }
  .preview-panel { display: none; }
}
</style>
