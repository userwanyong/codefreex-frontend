<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  SendOutlined,
  EditOutlined,
  LoadingOutlined,
  ArrowLeftOutlined,
  GlobalOutlined,
  CodeOutlined,
  EyeOutlined,
  DownloadOutlined,
  StopOutlined,
  LinkOutlined,
  CloseOutlined,
} from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import { useUserStore } from '@/stores/userStore'
import { getApp, deployApp, cancelDeploy, downloadApp, getAppCode } from '@/api/appController'
import { streamWorkflowGenerate, getChatHistory, getWorkflowStatus, reconnectWorkflow } from '@/api/aiController'
import { parseResponseData } from '@/utils/response'
import { parseCodeFiles } from '@/utils/codeFileParser'
import ChatMessage from '@/components/ChatMessage.vue'
import CodeFilesPanel from '@/components/CodeFilesPanel.vue'
import WorkflowProgress from '@/components/WorkflowProgress.vue'

interface StatusItem {
  icon: string
  label: string
  detail?: string
  status: 'done' | 'running' | 'error' | 'warning'
  downloadAction?: string
  nodeKey?: string
}

interface ChatMsg {
  id: string
  role: 'user' | 'ai' | 'system'
  content: string
  status?: 'sending' | 'streaming' | 'done' | 'error'
  timestamp: number
  statusItems?: StatusItem[]
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
const chatEndRef = ref<HTMLElement | null>(null)
const messagesAreaRef = ref<HTMLElement | null>(null)
let currentAbortController: AbortController | null = null
let reconnecting = false
let msgIdCounter = 0
let hasAutoSent = false
let historyCursor = ''
let historyHasMore = false
let loadingMoreHistory = false

// Workflow state
const currentNode = ref<API.WorkflowNode | null>(null)
const retryCount = ref(0)
const codeContent = ref('')
const prdContent = ref('')
const historyPrdContent = ref('')
const fileCodeContent = ref('')

const NODE_DESCRIPTIONS: Record<string, string> = {
  promptGuardNode: '关键词安全检查中...',
  promptReviewNode: 'AI 安全审查中...',
  intentClassifyNode: '意图识别中...',
  prdGenNode: '生成产品需求文档...',
  imagePlanNode: '规划图片资源...',
  imageFetchNode: '获取图片素材...',
  promptEnhanceNode: '增强提示词...',
  routeNode: '确定生成方案...',
  codeGenNode: 'AI 生成代码中...',
  buildNode: '项目构建打包中...',
  qualityCheckNode: '质量验证中...',
  persistNode: '保存文件中...',
  chatDirectNode: 'AI 思考回复中...',
}

const NODE_LABELS: Record<string, { icon: string; label: string }> = {
  promptReviewNode: { icon: '🛡️', label: '检查内容安全性' },
  intentClassifyNode: { icon: '🔍', label: '分析用户意图' },
  prdGenNode: { icon: '📋', label: '生成需求文档' },
  imagePlanNode: { icon: '🖼️', label: '规划图片资源' },
  imageFetchNode: { icon: '🖼️', label: '获取图片素材' },
  promptEnhanceNode: { icon: '✨', label: '优化提示词' },
  routeNode: { icon: '🎯', label: '确定生成方案' },
  codeGenNode: { icon: '💻', label: '编写代码' },
  buildNode: { icon: '📦', label: '项目构建' },
  visualEditNode: { icon: '🎨', label: '执行修改' },
  qualityCheckNode: { icon: '🔍', label: '代码质量检查' },
  codeFixNode: { icon: '🔧', label: '修复代码' },
  persistNode: { icon: '✅', label: '生成完成' },
}

// 节点完成后预显示下一个节点，消除后端处理空档
const NEXT_NODE: Record<string, string> = {
  promptReviewNode: 'intentClassifyNode',
  // intentClassifyNode 由 handler 根据意图动态预显示，不在此映射
  prdGenNode: 'routeNode',
  routeNode: 'imagePlanNode',
  imagePlanNode: 'imageFetchNode',
  imageFetchNode: 'promptEnhanceNode',
  promptEnhanceNode: 'codeGenNode',
  codeGenNode: 'qualityCheckNode',
  // qualityCheckNode 是条件边，在 handler 中根据结果动态预显示
}


function genId() {
  msgIdCounter += 1
  return 'msg-' + msgIdCounter + '-' + Date.now()
}

// Preview
const previewUrl = computed(() => (deployKey.value ? `/api/static/${deployKey.value}/` : ''))
const deployedUrl = computed(() => (deployKey.value ? `/api/deploy/${deployKey.value}/` : ''))
const rightView = ref<'code' | 'preview'>('code')

// Get the latest code content for the right panel
const currentAIContent = computed(() => {
  // 生成完成后：优先使用 API 返回的磁盘文件内容（更准确）
  if (!sending.value) return fileCodeContent.value || codeContent.value || ''
  // 流式生成中：如果 codeContent 能解析出文件，优先用它（正常流式或完整回放）
  // 否则 fallback 到磁盘文件（回放不完整时，codeContent 缺少代码块开头标记）
  if (codeContent.value && parseCodeFiles(codeContent.value).length > 0) {
    return codeContent.value
  }
  return fileCodeContent.value || codeContent.value || ''
})

const statusLabel = computed(() => {
  if (sending.value && currentNode.value) {
    return NODE_DESCRIPTIONS[currentNode.value] || '处理中'
  }
  if (sending.value) return '生成中'
  const map: Record<string, string> = { generated: '已生成', draft: '草稿', deployed: '已部署', disabled: '已禁用' }
  return map[appStatus.value] || ''
})

// 尝试重连正在运行的工作流（页面刷新后调用）
async function tryReconnect() {
  // 防止并发调用
  if (reconnecting) return
  reconnecting = true
  // 中止旧的重连 SSE 连接，确保同一时刻只有一个
  if (currentAbortController) {
    currentAbortController.abort()
    currentAbortController = null
  }
  try {
    const res = await getWorkflowStatus(appId.value)
    if (res.data?.code !== 0 || !res.data.data) return
    const status = res.data.data
    if (status.status !== 'running') return

    console.log('[Reconnect] 检测到运行中的工作流，开始重连 appId=', appId.value)

    // 设置发送状态
    sending.value = true
    currentNode.value = status.currentNode as API.WorkflowNode || null
    retryCount.value = status.retryCount || 0
    codeContent.value = ''
    rightView.value = 'code'

    // 复用已有的最后一条 AI 消息，避免与历史记录重复显示
    let statusMsg: ChatMsg | null = null
    for (let i = messages.value.length - 1; i >= 0; i--) {
      if (messages.value[i].role === 'ai') {
        statusMsg = messages.value[i]
        break
      }
    }
    if (!statusMsg) {
      statusMsg = addMessage('ai', '', 'streaming')
    } else {
      // 清空已有消息的状态，准备从回放重建
      statusMsg.status = 'streaming'
      statusMsg.statusItems = []
      statusMsg.content = ''
    }
    const statusMsgId = statusMsg.id
    const statusItems: StatusItem[] = []
    let codeStatusAdded = false
    let isChatMode = false
    let isVisualEditMode = false
    let chatMsgCreated = false
    let chatMsgId = ''
    let buffer = ''
    let rafId = 0

    function flushBufferChat() {
      const target = messages.value.find((m) => m.id === chatMsgId)
      if (target && buffer) { target.content += buffer; buffer = '' }
      scrollToBottom()
      rafId = 0
    }

    function syncStatus() {
      const target = messages.value.find((m) => m.id === statusMsgId)
      if (target) {
        target.statusItems = [...statusItems]
      }
      scrollToBottom()
    }

    currentAbortController = reconnectWorkflow(appId.value, {
      onMessage(event) {
        // 复用 sendToAI 中相同的事件处理逻辑
        if (event.type === 'tool_request') {
          const data = event.data as { node?: string } | undefined
          if (data?.node) {
            if (data.node === 'codeGenNode' && currentNode.value === 'qualityCheckNode') {
              retryCount.value += 1
            }
            currentNode.value = data.node as API.WorkflowNode

            if (data.node !== 'chatDirectNode') {
              const cfg = NODE_LABELS[data.node]
              if (cfg) {
                const old = statusItems.findIndex(it => it.nodeKey === data.node)
                if (old >= 0) statusItems.splice(old, 1)
                statusItems.push({ icon: cfg.icon, label: cfg.label, status: 'running', nodeKey: data.node })

                if (data.node === 'buildNode') {
                  const cwIdx = statusItems.findIndex(it => it.nodeKey === 'codeWriting')
                  if (cwIdx >= 0) {
                    statusItems[cwIdx] = { icon: '💻', label: '编写代码', status: 'done', detail: '已完成' }
                  }
                  const veIdx = statusItems.findIndex(it => it.nodeKey === 'visualEditNode')
                  if (veIdx >= 0) {
                    statusItems[veIdx] = { icon: '🎨', label: '执行修改', status: 'done', detail: '已完成' }
                  }
                }

                syncStatus()
              }
            }
          }
        }

        if (event.type === 'tool_executed') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const eventData = event.data as { node?: string; message?: string; data?: Record<string, any> } | undefined
          const node = eventData?.node
          const msg = eventData?.message
          const nodeData = eventData?.data

          if (node) {
            // 移除该节点的 "running" 项
            const runIdx = statusItems.findIndex(it => it.nodeKey === node)
            if (runIdx >= 0) statusItems.splice(runIdx, 1)

            if (node === 'intentClassifyNode' && msg) {
              const isCoding = msg.includes('编码')
              const isVisualEdit = msg.includes('可视化编辑')
              const isChat = !isCoding && !isVisualEdit
              statusItems.push({ icon: '🔍', label: '分析用户意图', status: 'done', detail: isCoding ? '开发任务' : isVisualEdit ? '可视化编辑' : '普通对话' })
              if (isChat) isChatMode = true
              if (isVisualEdit) isVisualEditMode = true
              if (isVisualEdit) {
                const veCfg = NODE_LABELS['visualEditNode']
                if (veCfg) statusItems.push({ icon: veCfg.icon, label: veCfg.label, status: 'running', nodeKey: 'visualEditNode' })
                syncStatus()
              }
              if (isCoding) {
                const prdCfg = NODE_LABELS['prdGenNode']
                if (prdCfg) statusItems.push({ icon: prdCfg.icon, label: prdCfg.label, status: 'running', nodeKey: 'prdGenNode' })
                syncStatus()
              }
            } else if (node === 'chatDirectNode') {
              // 对话模式不添加状态项
            } else if (node === 'visualEditNode') {
              const buildIdx = statusItems.findIndex(it => it.nodeKey === 'buildNode')
              const veDoneItem: StatusItem = { icon: '🎨', label: '执行修改', status: 'done', detail: '已完成' }
              if (buildIdx >= 0) statusItems.splice(buildIdx, 0, veDoneItem)
              else statusItems.push(veDoneItem)
              if (!isChatMode) {
                const qcCfg = NODE_LABELS['qualityCheckNode']
                if (qcCfg) statusItems.push({ icon: qcCfg.icon, label: qcCfg.label, status: 'running', nodeKey: 'qualityCheckNode' })
              }
            } else if (node === 'prdGenNode' && msg) {
              prdContent.value = msg
              statusItems.push({ icon: '📋', label: '生成需求文档', status: 'done', detail: 'PRD.md', downloadAction: 'prd' })
            } else if (node === 'routeNode' && msg) {
              statusItems.push({ icon: '🎯', label: '确定生成方案', status: 'done', detail: msg.replace('Route: ', '') })
            } else if (node === 'promptReviewNode' && msg) {
              const passed = msg.toLowerCase().includes('passed')
              statusItems.push({ icon: '🛡️', label: '检查内容安全性', status: passed ? 'done' : 'error', detail: passed ? '通过' : '未通过' })
            } else if (node === 'imagePlanNode') {
              statusItems.push({ icon: '🖼️', label: '规划图片资源', status: 'done', detail: '已完成' })
            } else if (node === 'imageFetchNode') {
              statusItems.push({ icon: '🖼️', label: '获取图片素材', status: 'done', detail: '已完成' })
            } else if (node === 'promptEnhanceNode') {
              statusItems.push({ icon: '✨', label: '优化提示词', status: 'done', detail: '已完成' })
            } else if (node === 'persistNode') {
              statusItems.push({ icon: '✅', label: '生成完成', status: 'done', detail: '已完成' })
            } else if (node === 'buildNode') {
              const step = nodeData?.step
              const isDone = nodeData?.result === 'success'
              const buildItem = { icon: '📦', label: '项目构建', status: (isDone ? 'done' : 'running') as StatusItem['status'], detail: isDone ? '构建完成' : step === 'npm_build' ? '打包中...' : step === 'npm_install' ? '安装依赖...' : '构建中...', nodeKey: 'buildNode' }
              const qcIdx = statusItems.findIndex(it => it.nodeKey === 'qualityCheckNode')
              if (qcIdx >= 0) statusItems.splice(qcIdx, 0, buildItem)
              else statusItems.push(buildItem)
            } else if (node === 'qualityCheckNode') {
              const passed = nodeData?.pass ?? (nodeData?.reason?.toLowerCase()?.includes('ok'))
              statusItems.push({ icon: '🔍', label: '代码质量检查', status: passed ? 'done' : 'warning', detail: passed ? '通过' : nodeData?.reason || '未通过' })
              if (!isChatMode) {
                if (passed) {
                  statusItems.push({ icon: '✅', label: isVisualEditMode ? '修改完成' : '生成完成', status: 'done', detail: '已完成' })
                } else {
                  const fixCfg = NODE_LABELS['codeFixNode']
                  if (fixCfg) statusItems.push({ icon: fixCfg.icon, label: fixCfg.label, status: 'running', nodeKey: 'codeFixNode' })
                }
              }
            } else if (node === 'codeFixNode') {
              statusItems.push({ icon: '🔧', label: '修复代码', status: 'done', detail: '已完成' })
              if (!isChatMode) {
                const qcCfg = NODE_LABELS['qualityCheckNode']
                if (qcCfg) statusItems.push({ icon: qcCfg.icon, label: qcCfg.label, status: 'running', nodeKey: 'qualityCheckNode' })
              }
            } else if (node === 'failNode') {
              statusItems.push({ icon: '❌', label: '生成失败', status: 'error', detail: nodeData?.reason || '质量检查未通过' })
            }

            // 预显示下一个节点
            const nextNodeKey = NEXT_NODE[node]
            if (nextNodeKey && !isChatMode) {
              const nextCfg = NODE_LABELS[nextNodeKey]
              if (nextCfg) statusItems.push({ icon: nextCfg.icon, label: nextCfg.label, status: 'running', nodeKey: nextNodeKey })
            }
            syncStatus()
          }
        }

        if (event.type === 'ai_r' && typeof event.data === 'string') {
          if (isChatMode) {
            // 对话模式：文本写入新气泡
            if (!chatMsgCreated) {
              chatMsgCreated = true
              const statusTarget = messages.value.find((m) => m.id === statusMsgId)
              if (statusTarget) statusTarget.status = 'done'
              const chatMsg = addMessage('ai', '', 'streaming')
              chatMsgId = chatMsg.id
            }
            buffer += event.data
            if (!rafId) rafId = requestAnimationFrame(flushBufferChat)
          } else {
            // 编码模式：写入右侧代码面板
            codeContent.value += event.data
            if (!codeStatusAdded) {
              codeStatusAdded = true
              const cgIdx = statusItems.findIndex(it => it.nodeKey === 'codeGenNode')
              if (cgIdx >= 0) statusItems.splice(cgIdx, 1)
              if (!isVisualEditMode) {
                statusItems.push({ icon: '💻', label: '编写代码', status: 'running', nodeKey: 'codeWriting' })
                syncStatus()
              }
            }
            scrollToBottom()
          }
        }
      },
      onDone() {
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0 }

        if (isChatMode) {
          const statusTarget = messages.value.find((m) => m.id === statusMsgId)
          if (statusTarget) statusTarget.status = 'done'
          if (chatMsgCreated) {
            const chatTarget = messages.value.find((m) => m.id === chatMsgId)
            if (chatTarget && buffer) { chatTarget.content += buffer; buffer = '' }
            if (chatTarget) chatTarget.status = 'done'
          }
        } else {
          const target = messages.value.find((m) => m.id === statusMsgId)
          if (target && buffer) { target.content += buffer; buffer = '' }
          const codeIdx = statusItems.findIndex(it => it.nodeKey === 'codeWriting')
          if (codeIdx >= 0) {
            statusItems[codeIdx] = { icon: '💻', label: '编写代码', status: 'done', detail: '已完成' }
          }
          if (target) {
            target.statusItems = [...statusItems]
            target.status = 'done'
          }
          refreshPreview()
          if (codeContent.value) rightView.value = 'preview'
        }

        sending.value = false
        currentNode.value = null
        currentAbortController = null
        appStatus.value = 'generated'
        loadAppCode()
        refreshAppInfo()
        scrollToBottom()
        useUserStore().fetchUserInfo()
      },
      onError(err) {
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0 }

        // 限流错误：显示友好提示
        const errText = typeof err === 'string' ? err : ''
        if (errText.includes('请求过于频繁')) {
          message.warning(errText)
          const target = messages.value.find((m) => m.id === statusMsgId)
          if (target) target.status = 'done'
          sending.value = false
          currentNode.value = null
          currentAbortController = null
          return
        }

        const target = messages.value.find((m) => m.id === statusMsgId)
        if (target && buffer) { target.content += buffer; buffer = '' }
        statusItems.forEach(it => { if (it.status === 'running') it.status = 'error' })
        statusItems.push({ icon: '❌', label: '重连失败，请重新生成', status: 'error' })
        if (target) {
          target.statusItems = [...statusItems]
          target.status = 'error'
        }

        sending.value = false
        currentNode.value = null
        currentAbortController = null
      },
    })
  } catch (e) {
    console.error('[Reconnect] 重连失败:', e)
  } finally {
    reconnecting = false
  }
}

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

      // 从文件 API 加载代码内容
      await loadAppCode()

      // 检查是否有正在运行的工作流需要重连
      if (!hasAutoSent) {
        await tryReconnect()
      }

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

async function loadAppCode() {
  if (!deployKey.value) return
  try {
    const res = await getAppCode(appId.value)
    if (res.data?.code === 0 && res.data.data) {
      fileCodeContent.value = res.data.data
      // 只有不在流式生成中时才切到预览
      if (fileCodeContent.value && !sending.value) rightView.value = 'preview'
    }
  } catch { /* ignore */ }
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
        messages.value = groupStatusMessages(historyList.map(mapRawHistoryItem))
      }
    }
  } catch (e) {
    console.error('[ChatHistory] error:', e)
  }
}

function mapRawHistoryItem(item: API.ChatHistoryItem): ChatMsg {
  return {
    id: item.id || genId(),
    role: item.messageType === 'ai' ? 'ai' as const : 'user' as const,
    content: item.message || '',
    status: 'done' as const,
    timestamp: new Date(item.createTime || Date.now()).getTime(),
  }
}

function parseStatusMarker(content: string): { item: StatusItem; memoryContent: string } | null {
  const match = content.match(/^<!--STATUS:(.*?)-->\n?/)
  if (!match) return null
  try {
    const data = JSON.parse(match[1])
    return {
      item: {
        icon: data.icon || '',
        label: data.label || '',
        detail: data.detail,
        status: data.status || 'done',
        downloadAction: data.downloadAction,
      },
      memoryContent: content.slice(match[0].length),
    }
  } catch {
    return null
  }
}

function groupStatusMessages(items: ChatMsg[]): ChatMsg[] {
  const result: ChatMsg[] = []
  let statusGroup: StatusItem[] = []
  let groupMsg: ChatMsg | null = null

  for (const item of items) {
    if (item.role === 'ai' && !item.statusItems) {
      const parsed = parseStatusMarker(item.content)
      if (parsed) {
        statusGroup.push(parsed.item)
        if (parsed.item.downloadAction === 'prd' && parsed.memoryContent) {
          historyPrdContent.value = parsed.memoryContent
        }
        if (!groupMsg) groupMsg = item
        continue
      }
    }
    // Flush status group
    if (statusGroup.length && groupMsg) {
      result.push({ ...groupMsg, content: '', statusItems: [...statusGroup] })
      statusGroup = []
      groupMsg = null
    }
    result.push(item)
  }
  if (statusGroup.length && groupMsg) {
    result.push({ ...groupMsg, content: '', statusItems: [...statusGroup] })
  }
  return result
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
        const newItems = historyList.map(mapRawHistoryItem)
        // 加载更早的历史时，保留最新 PRD 内容不被旧消息覆盖
        const savedPrd = historyPrdContent.value
        messages.value = groupStatusMessages([...newItems, ...messages.value])
        if (savedPrd) historyPrdContent.value = savedPrd
        await nextTick()
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



function downloadPrd() {
  const content = prdContent.value || historyPrdContent.value
  if (!content) return
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${appName.value || 'app'}-PRD.md`
  a.click()
  URL.revokeObjectURL(url)
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
  if (currentAbortController) { currentAbortController.abort(); currentAbortController = null }

  // 余额检查（首次生成已在创建应用时扣减50码点，这里只检查后续对话的10码点）
  const userStore = useUserStore()
  await userStore.fetchUserInfo()
  const remaining = userStore.userInfo?.remainingCredits ?? 0
  const isFirst = messages.value.length === 0
  if (!isFirst && remaining < 10) {
    message.error('码点不足，对话需要 10 码点，请先兑换码点')
    return
  }

  sending.value = true
  currentNode.value = null
  retryCount.value = 0
  codeContent.value = ''
  prdContent.value = ''

  // 创建一条 AI 消息（编码模式显示 statusItems，对话模式显示文本）
  const statusMsg = addMessage('ai', '', 'streaming')
  const statusMsgId = statusMsg.id
  const statusItems: StatusItem[] = []
  let codeStatusAdded = false
  let isChatMode = false
  let isVisualEditMode = false

  // 对话模式：第二个气泡（文本回复）
  let chatMsgCreated = false
  let chatMsgId = ''

  // 文本流式缓冲
  let buffer = ''
  let rafId = 0

  function flushBufferChat() {
    const target = messages.value.find((m) => m.id === chatMsgId)
    if (target && buffer) { target.content += buffer; buffer = '' }
    scrollToBottom()
    rafId = 0
  }

  function syncStatus() {
    const target = messages.value.find((m) => m.id === statusMsgId)
    if (target) {
      target.statusItems = [...statusItems]
    }
    scrollToBottom()
  }

  currentAbortController = streamWorkflowGenerate(appId.value, text, {
    onMessage(event) {
      // tool_request：节点开始执行 → 显示 "running" 状态
      if (event.type === 'tool_request') {
        const data = event.data as { node?: string } | undefined
        if (data?.node) {
          if (data.node === 'codeGenNode' && currentNode.value === 'qualityCheckNode') {
            retryCount.value += 1
          }
          currentNode.value = data.node as API.WorkflowNode

          // chatDirectNode 不显示 running 状态
          if (data.node !== 'chatDirectNode') {
            const cfg = NODE_LABELS[data.node]
            if (cfg) {
              const old = statusItems.findIndex(it => it.nodeKey === data.node)
              if (old >= 0) statusItems.splice(old, 1)
              statusItems.push({ icon: cfg.icon, label: cfg.label, status: 'running', nodeKey: data.node })

              // buildNode 启动时，将前置节点标记为完成
              if (data.node === 'buildNode') {
                const cwIdx = statusItems.findIndex(it => it.nodeKey === 'codeWriting')
                if (cwIdx >= 0) {
                  statusItems[cwIdx] = { icon: '💻', label: '编写代码', status: 'done', detail: '已完成' }
                }
                const veIdx = statusItems.findIndex(it => it.nodeKey === 'visualEditNode')
                if (veIdx >= 0) {
                  statusItems[veIdx] = { icon: '🎨', label: '执行修改', status: 'done', detail: '已完成' }
                }
              }

              syncStatus()
            }
          }
        }
      }

      // tool_executed：节点执行完毕 → 更新为 "done" 状态
      if (event.type === 'tool_executed') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const eventData = event.data as { node?: string; message?: string; data?: Record<string, any> } | undefined
        const node = eventData?.node
        const msg = eventData?.message
        const nodeData = eventData?.data

        if (node) {
          // 移除该节点的 "running" 项
          const runIdx = statusItems.findIndex(it => it.nodeKey === node)
          if (runIdx >= 0) statusItems.splice(runIdx, 1)

          if (node === 'intentClassifyNode' && msg) {
            const isCoding = msg.includes('编码')
            const isVisualEdit = msg.includes('可视化编辑')
            const isChat = !isCoding && !isVisualEdit
            statusItems.push({ icon: '🔍', label: '分析用户意图', status: 'done', detail: isCoding ? '开发任务' : isVisualEdit ? '可视化编辑' : '普通对话' })
            if (isChat) {
              isChatMode = true
            }
            if (isVisualEdit) {
              isVisualEditMode = true
            }
            // 可视化编辑意图：直接预显示 visualEditNode
            if (isVisualEdit) {
              const veCfg = NODE_LABELS['visualEditNode']
              if (veCfg) {
                statusItems.push({ icon: veCfg.icon, label: veCfg.label, status: 'running', nodeKey: 'visualEditNode' })
              }
              syncStatus()
            }
            // 编码意图：预显示 prdGenNode
            if (isCoding) {
              const prdCfg = NODE_LABELS['prdGenNode']
              if (prdCfg) {
                statusItems.push({ icon: prdCfg.icon, label: prdCfg.label, status: 'running', nodeKey: 'prdGenNode' })
              }
              syncStatus()
            }
          } else if (node === 'visualEditNode') {
            // 插入到 buildNode 之前，保证"执行修改"在"项目构建"前面
            const buildIdx = statusItems.findIndex(it => it.nodeKey === 'buildNode')
            const veDoneItem: StatusItem = { icon: '🎨', label: '执行修改', status: 'done', detail: '已完成' }
            if (buildIdx >= 0) {
              statusItems.splice(buildIdx, 0, veDoneItem)
            } else {
              statusItems.push(veDoneItem)
            }
            // 预显示 qualityCheckNode
            if (!isChatMode) {
              const qcCfg = NODE_LABELS['qualityCheckNode']
              if (qcCfg) {
                statusItems.push({ icon: qcCfg.icon, label: qcCfg.label, status: 'running', nodeKey: 'qualityCheckNode' })
              }
            }
          } else if (node === 'chatDirectNode') {
            // 对话模式不添加状态项
          } else if (node === 'prdGenNode' && msg) {
            prdContent.value = msg
            statusItems.push({ icon: '📋', label: '生成需求文档', status: 'done', detail: 'PRD.md', downloadAction: 'prd' })
          } else if (node === 'routeNode' && msg) {
            statusItems.push({ icon: '🎯', label: '确定生成方案', status: 'done', detail: msg.replace('Route: ', '') })
          } else if (node === 'promptReviewNode' && msg) {
            const passed = msg.toLowerCase().includes('passed')
            statusItems.push({ icon: '🛡️', label: '检查内容安全性', status: passed ? 'done' : 'error', detail: passed ? '通过' : '未通过' })
          } else if (node === 'imagePlanNode') {
            statusItems.push({ icon: '🖼️', label: '规划图片资源', status: 'done', detail: '已完成' })
          } else if (node === 'imageFetchNode') {
            statusItems.push({ icon: '🖼️', label: '获取图片素材', status: 'done', detail: '已完成' })
          } else if (node === 'promptEnhanceNode') {
            statusItems.push({ icon: '✨', label: '优化提示词', status: 'done', detail: '已完成' })
          } else if (node === 'persistNode') {
            statusItems.push({ icon: '✅', label: '生成完成', status: 'done', detail: '已完成' })
          } else if (node === 'buildNode') {
            const step = nodeData?.step
            const isDone = nodeData?.result === 'success'
            const buildItem = { icon: '📦', label: '项目构建', status: (isDone ? 'done' : 'running') as StatusItem['status'], detail: isDone ? '构建完成' : step === 'npm_build' ? '打包中...' : step === 'npm_install' ? '安装依赖...' : '构建中...', nodeKey: 'buildNode' }
            // 将构建节点插入到质检节点之前（可视化编辑流程：修改→构建→质检）
            const qcIdx = statusItems.findIndex(it => it.nodeKey === 'qualityCheckNode')
            if (qcIdx >= 0) {
              statusItems.splice(qcIdx, 0, buildItem)
            } else {
              statusItems.push(buildItem)
            }
          } else if (node === 'qualityCheckNode') {
            const passed = nodeData?.pass ?? (nodeData?.reason?.toLowerCase()?.includes('ok'))
            statusItems.push({ icon: '🔍', label: '代码质量检查', status: passed ? 'done' : 'warning', detail: passed ? '通过' : nodeData?.reason || '未通过' })
            if (!isChatMode) {
              if (passed) {
                statusItems.push({ icon: '✅', label: isVisualEditMode ? '修改完成' : '生成完成', status: 'done', detail: '已完成' })
              } else {
                // 未通过 → 预显示 codeFixNode
                const fixCfg = NODE_LABELS['codeFixNode']
                if (fixCfg) {
                  statusItems.push({ icon: fixCfg.icon, label: fixCfg.label, status: 'running', nodeKey: 'codeFixNode' })
                }
              }
            }
          } else if (node === 'codeFixNode') {
            statusItems.push({ icon: '🔧', label: '修复代码', status: 'done', detail: nodeData?.summary ? '已完成' : '已完成' })
            // 修复完成 → 预显示 qualityCheckNode（再次检查）
            if (!isChatMode) {
              const qcCfg = NODE_LABELS['qualityCheckNode']
              if (qcCfg) {
                statusItems.push({ icon: qcCfg.icon, label: qcCfg.label, status: 'running', nodeKey: 'qualityCheckNode' })
              }
            }
          } else if (node === 'failNode') {
            statusItems.push({ icon: '❌', label: '生成失败', status: 'error', detail: nodeData?.reason || '质量检查未通过' })
          }

          // 预显示下一个节点，消除后端处理空档
          const nextNodeKey = NEXT_NODE[node]
          if (nextNodeKey && !isChatMode) {
            const nextCfg = NODE_LABELS[nextNodeKey]
            if (nextCfg) {
              statusItems.push({ icon: nextCfg.icon, label: nextCfg.label, status: 'running', nodeKey: nextNodeKey })
            }
          }
          syncStatus()
        }
      }

      // ai_r：流式输出
      if (event.type === 'ai_r' && typeof event.data === 'string') {
        if (isChatMode) {
          // 对话模式：状态项保留在第一个气泡，文本写入新气泡
          if (!chatMsgCreated) {
            chatMsgCreated = true
            // 先把状态消息标记为完成
            const statusTarget = messages.value.find((m) => m.id === statusMsgId)
            if (statusTarget) statusTarget.status = 'done'
            // 创建新的文本消息
            const chatMsg = addMessage('ai', '', 'streaming')
            chatMsgId = chatMsg.id
          }
          buffer += event.data
          if (!rafId) rafId = requestAnimationFrame(flushBufferChat)
        } else {
          // 编码模式：写入右侧代码面板
          codeContent.value += event.data
          if (!codeStatusAdded) {
            codeStatusAdded = true
            // 清理可能残留的 codeGenNode 预显示项
            const cgIdx = statusItems.findIndex(it => it.nodeKey === 'codeGenNode')
            if (cgIdx >= 0) statusItems.splice(cgIdx, 1)
            // 可视化编辑模式不显示"编写代码"状态（已有"执行修改"状态）
            if (!isVisualEditMode) {
              statusItems.push({ icon: '💻', label: '编写代码', status: 'running', nodeKey: 'codeWriting' })
              syncStatus()
            }
          }
          scrollToBottom()
        }
      }
    },
    onDone() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0 }

      if (isChatMode) {
        // 对话模式：将状态消息标记完成，文本消息也标记完成
        const statusTarget = messages.value.find((m) => m.id === statusMsgId)
        if (statusTarget) {
          statusTarget.status = 'done'
        }
        // flush 文本到第二个气泡
        if (chatMsgCreated) {
          const chatTarget = messages.value.find((m) => m.id === chatMsgId)
          if (chatTarget && buffer) { chatTarget.content += buffer; buffer = '' }
          if (chatTarget) chatTarget.status = 'done'
        }
      } else {
        const target = messages.value.find((m) => m.id === statusMsgId)
        if (target && buffer) { target.content += buffer; buffer = '' }
        // 编码模式：完成状态项
        const codeIdx = statusItems.findIndex(it => it.nodeKey === 'codeWriting')
        if (codeIdx >= 0) {
          statusItems[codeIdx] = { icon: '💻', label: '编写代码', status: 'done', detail: '已完成' }
        }
        if (target) {
          target.statusItems = [...statusItems]
          target.status = 'done'
        }
        refreshPreview()
        if (codeContent.value) rightView.value = 'preview'
      }

      sending.value = false
      currentNode.value = null
      currentAbortController = null
      appStatus.value = 'generated'
      loadAppCode()
      refreshAppInfo()
      scrollToBottom()
      // 刷新用户余额（码点已扣减）
      useUserStore().fetchUserInfo()
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onError(err) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0 }

      // 限流错误：显示友好提示，不显示"生成失败"状态
      const errText = typeof err === 'string' ? err : ''
      if (errText.includes('请求过于频繁')) {
        message.warning(errText)
        const target = messages.value.find((m) => m.id === statusMsgId)
        if (target) target.status = 'done'
        sending.value = false
        currentNode.value = null
        currentAbortController = null
        return
      }

      if (isChatMode) {
        // 对话模式：状态消息保持不变，文本消息标记错误
        const statusTarget = messages.value.find((m) => m.id === statusMsgId)
        if (statusTarget) statusTarget.status = 'done'
        if (chatMsgCreated) {
          const chatTarget = messages.value.find((m) => m.id === chatMsgId)
          if (chatTarget && buffer) { chatTarget.content += buffer; buffer = '' }
          if (chatTarget) {
            chatTarget.status = 'error'
            if (!chatTarget.content) chatTarget.content = '对话中断，请重试'
          }
        }
      } else {
        const target = messages.value.find((m) => m.id === statusMsgId)
        if (target && buffer) { target.content += buffer; buffer = '' }
        statusItems.forEach(it => { if (it.status === 'running') it.status = 'error' })
        statusItems.push({ icon: '❌', label: '生成失败', status: 'error' })
        if (target) {
          target.statusItems = [...statusItems]
          target.status = 'error'
        }
      }
      sending.value = false
      currentNode.value = null
      currentAbortController = null
    },
  })
}

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || sending.value) return
  inputText.value = ''

  if (editSelector.value) {
    const selector = editSelector.value
    const ctx = editContext.value
    const fullText = `[可视化编辑]\n${ctx}\n\n用户指令: ${text}`
    addMessage('user', `[编辑] 目标元素: ${selector}\n${text}`, 'done')
    editSelector.value = ''
    editContext.value = ''
    await sendToAI(fullText)
  } else {
    addMessage('user', text, 'done')
    await sendToAI(text)
  }
}

async function handleRetry(msg: ChatMsg) {
  const idx = messages.value.indexOf(msg)
  if (idx < 1) return
  // 向前找到触发该生成的用户消息
  let userIdx = idx - 1
  while (userIdx >= 0 && messages.value[userIdx]!.role !== 'user') {
    userIdx--
  }
  if (userIdx < 0) return
  const userMsg = messages.value[userIdx]!
  // 删除该用户消息之后的所有消息（包括当前这条和后续 AI 消息）
  messages.value = messages.value.slice(0, userIdx + 1)
  await sendToAI(userMsg.content)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
}

function refreshPreview() { previewKey.value += 1 }

// Visual edit mode
const editMode = ref(false)
const editSelector = ref('')
const editContext = ref('')

function collectElementContext(el: HTMLElement, iframe: HTMLIFrameElement): string {
  const doc = iframe.contentDocument!
  const win = iframe.contentWindow!
  const selector = buildSelector(el, doc.body)
  const lines: string[] = []

  // 1. 选择器
  lines.push(`目标选择器: ${selector}`)

  // 2. 元素标签与属性
  const tag = el.tagName.toLowerCase()
  const attrs: string[] = []
  for (const attr of Array.from(el.attributes)) {
    if (attr.name !== 'class' && attr.name !== 'style' && attr.name !== 'id') {
      attrs.push(`${attr.name}="${attr.value}"`)
    }
  }
  const classStr = el.className && typeof el.className === 'string' ? ` class="${el.className}"` : ''
  const idStr = el.id ? ` id="${el.id}"` : ''
  const attrStr = attrs.length ? ' ' + attrs.join(' ') : ''
  lines.push(`元素: <${tag}${idStr}${classStr}${attrStr}>`)

  // 3. 元素 HTML 片段（截取前 500 字符）
  const outerHtml = el.outerHTML
  const htmlSnippet = outerHtml.length > 500 ? outerHtml.slice(0, 500) + '...' : outerHtml
  lines.push(`HTML: ${htmlSnippet}`)

  // 4. 文本内容摘要
  const text = (el.textContent || '').trim().slice(0, 200)
  if (text) lines.push(`文本内容: ${text}`)

  // 5. 关键计算样式
  const cs = win.getComputedStyle(el)
  const pick = (prop: string) => cs.getPropertyValue(prop)
  const styles = [
    `display: ${pick('display')}`,
    `position: ${pick('position')}`,
    `color: ${pick('color')}`,
    `background: ${pick('background-color')}`,
    `font-size: ${pick('font-size')}`,
    `font-weight: ${pick('font-weight')}`,
    `width: ${pick('width')}`,
    `height: ${pick('height')}`,
    `margin: ${pick('margin')}`,
    `padding: ${pick('padding')}`,
    `border: ${pick('border')}`,
  ]
  lines.push(`计算样式: { ${styles.join(', ')} }`)

  // 6. 尺寸与位置
  const rect = el.getBoundingClientRect()
  lines.push(`位置尺寸: { top: ${Math.round(rect.top)}, left: ${Math.round(rect.left)}, width: ${Math.round(rect.width)}, height: ${Math.round(rect.height)} }`)

  // 7. 父级上下文
  const parent = el.parentElement
  if (parent && parent !== doc.body) {
    const pTag = parent.tagName.toLowerCase()
    const pClass = parent.className && typeof parent.className === 'string' ? ` class="${parent.className}"` : ''
    lines.push(`父元素: <${pTag}${parent.id ? ` id="${parent.id}"` : ''}${pClass}>`)
  }

  // 8. 页面视口信息
  lines.push(`页面视口: ${doc.documentElement.scrollWidth}x${doc.documentElement.scrollHeight} (可见区: ${win.innerWidth}x${win.innerHeight})`)

  return lines.join('\n')
}

function toggleEditMode() {
  if (!deployKey.value) {
    message.warning('请先生成应用后再编辑')
    return
  }
  editMode.value = !editMode.value
  if (editMode.value) {
    rightView.value = 'preview'
    message.info('点击预览中的应用元素来选择要编辑的部分')
  } else {
    clearHighlight()
  }
  editSelector.value = ''
  editContext.value = ''
}

function handleIframeClick(e: MessageEvent) {
  if (!editMode.value) return
  const data = e.data
  if (data?.type === 'visual-edit-select') {
    editSelector.value = data.selector
  }
}

function buildSelector(el: Element, root: Element): string {
  if (el === root || !el.parentElement) return ''
  const parts: string[] = []
  let current: Element | null = el
  while (current && current !== root) {
    const tag = current.tagName.toLowerCase()
    if (current.id) {
      parts.unshift(`#${current.id}`)
      break
    }
    const parent: Element | null = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter((c: Element) => c.tagName === current!.tagName)
      const idx = siblings.indexOf(current)
      parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${idx + 1})` : tag)
    } else {
      parts.unshift(tag)
    }
    current = parent
  }
  return parts.join(' > ')
}

function ensureHighlightEl(iframe: HTMLIFrameElement) {
  let el = iframe.contentDocument!.getElementById('__ve_highlight__')
  if (!el) {
    el = iframe.contentDocument!.createElement('div')
    el.id = '__ve_highlight__'
    el.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #1890ff;background:rgba(24,144,255,0.08);z-index:99999;transition:all .1s ease;border-radius:3px;'
    iframe.contentDocument!.body.appendChild(el)
  }
  return el
}

function positionHighlight(iframe: HTMLIFrameElement, target: HTMLElement) {
  try {
    const highlight = ensureHighlightEl(iframe)
    const r = target.getBoundingClientRect()
    highlight.style.top = r.top + 'px'
    highlight.style.left = r.left + 'px'
    highlight.style.width = r.width + 'px'
    highlight.style.height = r.height + 'px'
    highlight.style.display = 'block'
  } catch { /* cross-origin */ }
}

function clearHighlight() {
  const iframe = document.querySelector('.preview-iframe') as HTMLIFrameElement
  if (!iframe?.contentDocument) return
  try {
    const prev = iframe.contentDocument.getElementById('__ve_highlight__')
    if (prev) prev.remove()
  } catch { /* cross-origin */ }
}

function resolveElement(e: MouseEvent) {
  const overlay = e.currentTarget as HTMLElement
  const iframe = overlay.previousElementSibling as HTMLIFrameElement
  if (!iframe?.contentDocument) return null

  const rect = iframe.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  overlay.style.pointerEvents = 'none'
  const el = iframe.contentDocument.elementFromPoint(x, y) as HTMLElement | null
  overlay.style.pointerEvents = 'auto'

  if (!el || el === iframe.contentDocument.body || el === iframe.contentDocument.documentElement) return null
  return { el, iframe }
}

function handleEditOverlayMove(e: MouseEvent) {
  if (!editMode.value) return
  const result = resolveElement(e)
  if (!result) return
  positionHighlight(result.iframe, result.el)
}

function handleEditOverlayClick(e: MouseEvent) {
  if (!editMode.value) return
  const result = resolveElement(e)
  if (!result) {
    message.warning('请点击具体的页面元素')
    return
  }
  const { el, iframe } = result

  editSelector.value = buildSelector(el, iframe.contentDocument!.body)
  editContext.value = collectElementContext(el, iframe)

  // 退出编辑模式，清除高亮
  editMode.value = false
  clearHighlight()
  message.success('已选中元素，请在左侧输入修改指令')
}

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
  Modal.confirm({
    title: '确认部署',
    content: '部署后，该应用将自动设为公开状态，任何人都可以访问。确认部署吗？',
    okText: '确认部署',
    cancelText: '取消',
    async onOk() {
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
    },
  })
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

onMounted(() => {
  loadApp()
  window.addEventListener('message', handleIframeClick)
})
onUnmounted(() => {
  currentAbortController?.abort()
  window.removeEventListener('message', handleIframeClick)
})
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
          <span class="status-badge" :class="'badge-' + (sending ? 'generating' : appStatus)">
            <span class="status-dot" :class="'dot-' + (sending ? 'generating' : appStatus)" />
            {{ statusLabel }}
          </span>
        </div>
      </div>

      <div class="topbar-right">
        <div class="view-switcher">
          <button class="switch-btn" :class="{ active: rightView === 'code' }" @click="rightView = 'code'">
            <CodeOutlined /> 代码
          </button>
          <button class="switch-btn" :class="{ active: rightView === 'preview' }" @click="rightView = 'preview'" :disabled="!deployKey || sending">
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
            <ChatMessage v-for="msg in messages" :key="msg.id" :message="msg" @retry="handleRetry(msg)" @download="downloadPrd" />
            <div v-if="!messages.length && !loadingApp" class="empty-chat">
              <div class="empty-icon-wrap"><ThunderboltOutlined /></div>
              <p>开始对话，让 AI 为你生成应用</p>
            </div>
          </template>
          <div ref="chatEndRef" />
        </div>

        <!-- Input Area -->
        <div class="input-area">
          <div class="input-row">
            <div class="input-field-wrap">
              <div v-if="editSelector" class="edit-target-tag">
                <EditOutlined style="margin-right: 4px" />
                <span class="edit-target-label">已选中元素</span>
                <button class="edit-target-clear" @click="editSelector = ''">
                  <CloseOutlined style="font-size: 10px" />
                </button>
              </div>
              <textarea
                v-model="inputText"
                :class="['msg-input', { 'has-tag': editSelector }]"
                :placeholder="editSelector ? '输入修改指令，如：将背景色改为蓝色' : '描述详细、页面越具体，可以一步一步完善生成效果'"
                rows="3"
                :disabled="sending"
                @keydown="handleKeydown"
              />
              <div class="input-bottom-bar">
                <button class="edit-toggle-btn" :class="{ active: editMode }" @click="toggleEditMode">
                  <EditOutlined /> {{ editMode ? '退出编辑' : '编辑' }}
                </button>
                <button class="send-btn" :class="{ active: inputText.trim() && !sending }" :disabled="!inputText.trim() || sending" @click="handleSend">
                  <LoadingOutlined v-if="sending" />
                  <SendOutlined v-else />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Preview Panel -->
      <div class="preview-panel">
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
              <p class="loading-text">{{ sending ? 'AI 工作流运行中...' : '准备就绪，等待生成...' }}</p>
              <WorkflowProgress
                :current-node="currentNode"
                :running="sending"
                :retry-count="retryCount"
              />
            </div>
          </div>
        </template>

        <!-- 预览视图 -->
        <template v-else>
          <a-tag v-if="editMode" color="blue" style="position: absolute; top: 8px; left: 8px; z-index: 10;">编辑模式 - 点击元素选择</a-tag>
          <div class="preview-content" style="position: relative">
            <iframe
              v-if="deployKey"
              :key="previewKey"
              :src="previewUrl"
              class="preview-iframe"
              :class="{ 'edit-mode': editMode }"
              sandbox="allow-scripts allow-same-origin"
              frameborder="0"
            />
            <!-- 编辑模式覆盖层：拦截点击，定位 iframe 内元素 -->
            <div
              v-if="editMode && deployKey"
              class="edit-overlay"
              @mousemove="handleEditOverlayMove"
              @click="handleEditOverlayClick"
            />
            <div v-else class="preview-loading">
              <div class="loading-spinner" />
              <p class="loading-text">{{ sending ? 'AI 工作流运行中...' : '准备就绪，等待生成...' }}</p>
              <WorkflowProgress
                :current-node="currentNode"
                :running="sending"
                :retry-count="retryCount"
              />
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
  padding: 0 8px !important;
  height: 28px;
  line-height: 28px;
  border-radius: var(--radius-sm) !important;
  display: inline-flex !important;
  align-items: center !important;
}

.back-btn:hover { background: var(--bg-elevated) !important; color: var(--text-primary) !important; }

.app-info-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.badge-generating { background: rgba(234, 179, 8, 0.1); color: #ca8a04; }
.badge-generated { background: rgba(34, 197, 94, 0.1); color: #16a34a; }
.badge-deployed { background: rgba(59, 130, 246, 0.1); color: #2563eb; }
.badge-draft { background: var(--bg-elevated); color: var(--text-muted); }
.badge-error { background: rgba(239, 68, 68, 0.1); color: #dc2626; }
.badge-disabled { background: var(--bg-elevated); color: var(--text-muted); }

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-generating { background: #eab308; animation: dotPulse 1.2s infinite; }
.dot-generated { background: #22c55e; }
.dot-deployed { background: #3b82f6; }
.dot-draft { background: var(--text-muted); }
.dot-error { background: #ef4444; }
.dot-disabled { background: var(--text-muted); }

@keyframes dotPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
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

.input-bottom-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 8px;
}

.edit-toggle-btn {
  font-size: 12px;
  height: 26px;
  padding: 0 10px;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  background: transparent;
  border: 1px solid var(--glass-border);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all 150ms ease;
}

.edit-toggle-btn:hover {
  color: var(--text-secondary);
  background: var(--bg-elevated);
  border-color: var(--border-hover);
}

.edit-toggle-btn.active {
  background: #1890ff;
  color: #fff;
  border-color: #1890ff;
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 8px 16px 14px;
}

.input-field-wrap {
  flex: 1;
  background: var(--bg-elevated);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  transition: border-color 200ms ease, box-shadow 200ms ease;
  overflow: hidden;
}
.input-field-wrap:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--shadow-sm); }

.msg-input {
  width: 100%;
  background: transparent;
  border: none;
  padding: 12px 16px 4px;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.55;
  resize: none;
  outline: none;
}
.msg-input.has-tag { padding-top: 6px; }

.msg-input::placeholder { color: var(--text-muted); }
.msg-input:disabled { opacity: 0.5; pointer-events: none; }

.send-btn {
  width: 28px;
  height: 28px;
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
  font-size: 13px;
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
.preview-iframe.edit-mode {
  outline: 2px solid #1890ff;
  outline-offset: -2px;
}

/* Edit mode overlay */
.edit-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 80px; /* leave space for instruction bar */
  cursor: crosshair;
  z-index: 5;
}

/* Edit target tag inside input field */
.edit-target-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  margin: 10px 16px 0;
  background: #e6f4ff;
  border: 1px solid #91caff;
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1;
}
.edit-target-tag code {
  background: var(--bg-primary, #fff);
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  color: #1890ff;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.edit-target-label {
  color: #1890ff;
  font-weight: 500;
}
.edit-target-clear {
  margin-left: auto;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  padding: 0;
  flex-shrink: 0;
}
.edit-target-clear:hover {
  background: rgba(0,0,0,0.06);
  color: var(--text-primary);
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
