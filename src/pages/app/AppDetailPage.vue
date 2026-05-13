<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
  LikeOutlined,
  LikeFilled,
  ClockCircleOutlined,
  CodeOutlined,
  TagOutlined,
  MessageOutlined,
  GlobalOutlined,
  StarOutlined,
  RocketOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  LinkOutlined,
  StopOutlined,
} from '@ant-design/icons-vue'
import { getApp, editApp, deleteApp, deployApp, cancelDeploy, downloadApp, likeApp } from '@/api/appController'
import { getAllTags } from '@/api/tagController'
import { parseResponseData } from '@/utils/response'
import { useUserStore } from '@/stores/userStore'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const app = ref<API.AppVO | null>(null)
const loading = ref(true)
const editModalVisible = ref(false)
const editForm = ref({ appName: '', description: '', tagIds: [] as number[], isPublic: 0 })
const tagOptions = ref<API.TagVO[]>([])
const deploying = ref(false)

const canDeploy = computed(() => {
  if (!app.value) return false
  return app.value.status === 'generated' || app.value.status === 'deployed'
})

const deployedUrl = computed(() => {
  return app.value?.deployKey ? `/api/deploy/${app.value.deployKey}/` : ''
})

const appId = computed(() => {
  const param = route.params.appId
  return Array.isArray(param) ? param[0] : param
})

const isOwner = computed(() => String(app.value?.userId) === String(userStore.loginUser?.userId))

const isLiked = ref(false)
const likeLoading = ref(false)

async function handleLike() {
  if (!app.value?.id || likeLoading.value) return
  if (!userStore.isLoggedIn) {
    message.warning('请先登录')
    return
  }
  likeLoading.value = true
  try {
    const res = await likeApp(app.value.id)
    if (res.data?.code === 0 && res.data.data !== undefined) {
      const liked = res.data.data
      isLiked.value = liked
      app.value = {
        ...app.value!,
        likeCount: (app.value?.likeCount ?? 0) + (liked ? 1 : -1),
      }
    }
  } catch {
    // ignore
  } finally {
    likeLoading.value = false
  }
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: '草稿', color: '#64748B', bg: 'rgba(100, 116, 139, 0.15)' },
  generating: { label: '生成中', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  generated: { label: '已生成', color: '#22C55E', bg: 'rgba(34, 197, 94, 0.15)' },
  deployed: { label: '已部署', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
  disabled: { label: '已禁用', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
}

const darkGradients = [
  'linear-gradient(135deg, #065F46 0%, #064E3B 100%)',
  'linear-gradient(135deg, #1E3A5F 0%, #1E293B 100%)',
  'linear-gradient(135deg, #4C1D95 0%, #2D1B69 100%)',
  'linear-gradient(135deg, #92400E 0%, #78350F 100%)',
  'linear-gradient(135deg, #065F46 0%, #1E3A5F 100%)',
  'linear-gradient(135deg, #4C1D95 0%, #065F46 100%)',
]

const lightGradients = [
  'linear-gradient(135deg, #A7F3D0 0%, #6EE7B7 100%)',
  'linear-gradient(135deg, #BFDBFE 0%, #93C5FD 100%)',
  'linear-gradient(135deg, #DDD6FE 0%, #C4B5FD 100%)',
  'linear-gradient(135deg, #FDE68A 0%, #FCD34D 100%)',
  'linear-gradient(135deg, #A7F3D0 0%, #BFDBFE 100%)',
  'linear-gradient(135deg, #DDD6FE 0%, #A7F3D0 100%)',
]

function getGradient(name: string) {
  const hash = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const isLight = document.documentElement.getAttribute('data-theme') === 'light'
  const list = isLight ? lightGradients : darkGradients
  return list[hash % list.length]
}

async function loadApp() {
  if (!appId.value) return
  loading.value = true
  try {
    const res = await getApp(appId.value)
    if (res.data?.code === 0 && res.data.data) {
      app.value = parseResponseData<API.AppVO>(res.data.data)
      isLiked.value = app.value?.isLiked ?? false
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

async function openEditModal() {
  if (!app.value) return
  // 加载预设标签选项
  try {
    const res = await getAllTags()
    if (res.data?.code === 0 && res.data.data) {
      tagOptions.value = parseResponseData<API.TagVO[]>(res.data.data)
    }
  } catch {
    // ignore
  }
  // 根据标签名称匹配 ID
  const tagIds = (app.value.tags || [])
    .map(name => tagOptions.value.find(t => t.name === name)?.id)
    .filter((id): id is number => id !== undefined)
  editForm.value = {
    appName: app.value.appName || '',
    description: app.value.description || '',
    tagIds,
    isPublic: app.value.isPublic ?? 0,
  }
  editModalVisible.value = true
}

function handlePublicChange(val: boolean) {
  if (!val && app.value?.status === 'deployed') {
    Modal.confirm({
      title: '设为私有',
      content: '设为私有后，应用的部署将自动关闭，其他人将无法访问。确认设为私有吗？',
      okText: '确认',
      cancelText: '取消',
      onOk() {
        editForm.value.isPublic = 0
      },
    })
  } else {
    editForm.value.isPublic = val ? 1 : 0
  }
}

async function handleEdit() {
  if (!app.value?.id) return
  try {
    const res = await editApp({
      id: app.value.id,
      appName: editForm.value.appName,
      description: editForm.value.description,
      tagIds: editForm.value.tagIds,
      isPublic: editForm.value.isPublic,
    })
    if (res.data?.code === 0) {
      message.success('编辑成功')
      editModalVisible.value = false
      loadApp()
    } else {
      message.error(res.data?.message || '编辑失败')
    }
  } catch {
    message.error('编辑失败')
  }
}

function handleDelete() {
  if (!app.value?.id) return
  Modal.confirm({
    title: '确认删除',
    content: '删除后无法恢复，确认要删除此应用吗？',
    okText: '确认',
    cancelText: '取消',
    async onOk() {
      try {
        const res = await deleteApp(app.value!.id!)
        if (res.data?.code === 0) {
          message.success('删除成功')
          router.push('/app/my')
        } else {
          message.error(res.data?.message || '删除失败')
        }
      } catch {
        message.error('删除失败')
      }
    },
  })
}

async function handleDeploy() {
  if (deploying.value || !app.value?.id) return
  Modal.confirm({
    title: '确认部署',
    content: '部署后，该应用将自动设为公开状态，任何人都可以访问。确认部署吗？',
    okText: '确认部署',
    cancelText: '取消',
    async onOk() {
      deploying.value = true
      try {
        const res = await deployApp(app.value!.id!)
        if (res.data?.code === 0 && res.data.data) {
          const deployData = parseResponseData<API.AppDeployResponse>(res.data.data)
          if (deployData.deployKey) {
            app.value = { ...app.value!, deployKey: deployData.deployKey }
          }
          message.success('部署成功')
          loadApp()
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

async function handleDownload() {
  if (!app.value?.id) return
  try {
    const res = await downloadApp(app.value.id)
    const blob = new Blob([res.data as BlobPart], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${app.value.appName || 'app'}.zip`
    a.click()
    URL.revokeObjectURL(url)
    message.success('下载已开始')
  } catch {
    message.error('下载失败，请稍后重试')
  }
}

function handleCancelDeploy() {
  if (!app.value?.id) return
  Modal.confirm({
    title: '取消部署',
    content: '取消后应用将不再对外访问，确认取消部署吗？',
    okText: '确认',
    cancelText: '返回',
    async onOk() {
      try {
        const res = await cancelDeploy(app.value!.id!)
        if (res.data?.code === 0) {
          message.success('已取消部署')
          loadApp()
        } else {
          message.error(res.data?.message || '取消失败')
        }
      } catch {
        message.error('取消失败')
      }
    },
  })
}

onMounted(() => loadApp())
</script>

<template>
  <div class="detail-page">
    <!-- Back button -->
    <a-button type="text" class="back-btn" @click="router.back()">
      <ArrowLeftOutlined />
      返回
    </a-button>

    <a-spin :spinning="loading">
      <template v-if="app">
        <div class="detail-layout">
          <!-- Left: Sidebar -->
          <aside class="detail-sidebar">
            <!-- App Cover -->
            <div class="sidebar-cover" :style="!app.cover ? { background: getGradient(app.appName || '') } : {}">
              <img v-if="app.cover" :src="app.cover" :alt="app.appName" class="cover-img" />
              <span v-else class="cover-letter">{{ (app.appName || 'A')[0]?.toUpperCase() }}</span>
            </div>

            <!-- App Identity -->
            <div class="sidebar-identity">
              <h1 class="app-name">{{ app.appName || '未命名应用' }}</h1>
              <div class="badges-row">
                <span
                  class="status-badge"
                  :style="{
                    color: statusConfig[app.status || 'draft']?.color,
                    background: statusConfig[app.status || 'draft']?.bg,
                  }"
                >
                  {{ statusConfig[app.status || 'draft']?.label }}
                </span>
                <span class="stat-badge">
                  <EyeOutlined /> {{ app.viewCount ?? 0 }}
                </span>
                <span
                  class="stat-badge like-btn"
                  :class="{ 'liked': isLiked }"
                  @click.stop="handleLike"
                >
                  <LikeFilled v-if="isLiked" />
                  <LikeOutlined v-else />
                  {{ app.likeCount ?? 0 }}
                </span>
              </div>
              <p class="app-desc">{{ app.description || '暂无描述' }}</p>
            </div>

            <!-- Divider -->
            <div class="sidebar-divider" />

            <!-- Meta Info -->
            <div class="meta-list">
              <div class="meta-row">
                <CodeOutlined class="meta-icon" />
                <span class="meta-label">生成类型</span>
                <span class="meta-value">{{ app.codeGenType || '-' }}</span>
              </div>
              <div class="meta-row">
                <GlobalOutlined class="meta-icon" />
                <span class="meta-label">是否公开</span>
                <span class="meta-value" :class="app.isPublic === 1 ? 'val-yes' : 'val-no'">
                  <CheckCircleOutlined v-if="app.isPublic === 1" />
                  <CloseCircleOutlined v-else />
                  {{ app.isPublic === 1 ? '公开' : '私有' }}
                </span>
              </div>
              <div class="meta-row">
                <StarOutlined class="meta-icon" />
                <span class="meta-label">是否精选</span>
                <span class="meta-value" :class="app.isFeatured === 1 ? 'val-yes' : 'val-no'">
                  <CheckCircleOutlined v-if="app.isFeatured === 1" />
                  <CloseCircleOutlined v-else />
                  {{ app.isFeatured === 1 ? '精选' : '普通' }}
                </span>
              </div>
              <div class="meta-row">
                <ClockCircleOutlined class="meta-icon" />
                <span class="meta-label">创建时间</span>
                <span class="meta-value">{{ app.createTime || '-' }}</span>
              </div>
              <div class="meta-row">
                <RocketOutlined class="meta-icon" />
                <span class="meta-label">部署时间</span>
                <span class="meta-value">{{ app.deployedTime || '-' }}</span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div v-if="isOwner" class="sidebar-actions">
              <a-button block class="action-primary" @click="router.push(`/app/${appId}/chat`)">
                <MessageOutlined />
                AI 工作台
              </a-button>
              <div v-if="app?.status === 'deployed'" class="action-row">
                <a-button
                  class="action-deploy-row"
                  :loading="deploying"
                  @click="handleDeploy"
                >
                  <GlobalOutlined />
                  重新部署
                </a-button>
                <a-button class="action-danger" @click="handleCancelDeploy">
                  <StopOutlined />
                  取消部署
                </a-button>
              </div>
              <a-button
                v-else-if="canDeploy"
                block
                class="action-deploy"
                :loading="deploying"
                @click="handleDeploy"
              >
                <GlobalOutlined />
                部署应用
              </a-button>
              <div class="action-row">
                <a-button class="action-secondary" @click="handleDownload" style="flex:1">
                  <DownloadOutlined />
                  下载
                </a-button>
              </div>
              <div v-if="app?.status === 'deployed' && deployedUrl" class="action-row">
                <a-button class="action-link" style="flex:1">
                  <a :href="deployedUrl" target="_blank" class="link-inner">
                    <LinkOutlined />
                    访问部署地址
                  </a>
                </a-button>
              </div>
              <div class="sidebar-divider" />
              <div class="action-row">
                <a-button class="action-secondary" @click="openEditModal">
                  <EditOutlined />
                  编辑
                </a-button>
                <a-button class="action-danger" @click="handleDelete">
                  <DeleteOutlined />
                  删除
                </a-button>
              </div>
            </div>
          </aside>

          <!-- Right: Main Content -->
          <div class="detail-main">
            <!-- Initial Prompt -->
            <section v-if="app.initPrompt" class="content-section">
              <div class="section-header">
                <FileTextOutlined class="section-icon" />
                <h3 class="section-title">初始提示词</h3>
              </div>
              <div class="prompt-block">{{ app.initPrompt }}</div>
            </section>

            <!-- Tags -->
            <section v-if="app.tags?.length" class="content-section">
              <div class="section-header">
                <TagOutlined class="section-icon" />
                <h3 class="section-title">标签</h3>
              </div>
              <div class="tags-wrap">
                <span v-for="tag in app.tags" :key="tag" class="tag-chip">{{ tag }}</span>
              </div>
            </section>

            <!-- Empty prompt placeholder -->
            <section v-if="!app.initPrompt && !app.tags?.length" class="content-section">
              <div class="empty-hint">
                <CodeOutlined class="empty-hint-icon" />
                <p>暂无更多详细信息</p>
              </div>
            </section>
          </div>
        </div>
      </template>

      <div v-if="!loading && !app" class="empty-state">
        <CodeOutlined class="empty-icon" />
        <h3>应用不存在或无权访问</h3>
        <a-button type="primary" @click="router.push('/app/my')">返回我的应用</a-button>
      </div>
    </a-spin>

    <!-- Edit modal -->
    <a-modal v-model:open="editModalVisible" title="编辑应用" @ok="handleEdit" ok-text="保存">
      <a-form layout="vertical">
        <a-form-item label="应用名称">
          <a-input v-model:value="editForm.appName" />
        </a-form-item>
        <a-form-item label="应用描述">
          <a-textarea v-model:value="editForm.description" :rows="3" />
        </a-form-item>
        <a-form-item label="标签">
          <a-select v-model:value="editForm.tagIds" mode="multiple" placeholder="选择标签" :max-count="3"
            :options="tagOptions.map(t => ({ label: t.name, value: t.id }))" />
        </a-form-item>
        <a-form-item label="是否公开">
          <a-switch
            :checked="editForm.isPublic === 1"
            @change="handlePublicChange"
          />
          <span style="margin-left: 8px; color: var(--text-muted); font-size: 13px">
            {{ editForm.isPublic === 1 ? '公开可见' : '仅自己可见' }}
          </span>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.detail-page {
  max-width: 1100px;
  margin: 0 auto;
}

.back-btn {
  color: var(--text-secondary) !important;
  margin-bottom: var(--space-6);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 14px;
}

.back-btn:hover {
  color: var(--text-primary) !important;
}

/* ============================================
   Layout: Sidebar + Main
   ============================================ */
.detail-layout {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: var(--space-6);
  align-items: start;
}

/* ============================================
   Sidebar
   ============================================ */
.detail-sidebar {
  background: var(--bg-surface);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  position: sticky;
  top: calc(60px + var(--space-6));
  display: flex;
  flex-direction: column;
}

.sidebar-cover {
  height: 55%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.sidebar-cover::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(transparent, var(--bg-surface));
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}

.cover-letter {
  font-size: 64px;
  font-weight: 800;
  color: var(--watermark-color);
  font-family: var(--font-mono);
  position: relative;
  z-index: 1;
}

.sidebar-identity {
  padding: 0 var(--space-6) var(--space-4);
  margin-top: calc(-1 * var(--space-4));
  position: relative;
  z-index: 2;
}

.app-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--space-3);
  letter-spacing: -0.3px;
}

.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.badges-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.stat-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.like-btn {
  cursor: pointer;
  transition: color 0.2s;
}

.like-btn:hover {
  color: #EF4444;
}

.like-btn.liked {
  color: #EF4444;
}

.app-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

/* Divider */
.sidebar-divider {
  height: 1px;
  background: var(--glass-border);
  margin: var(--space-5) var(--space-6);
}

/* Meta list */
.meta-list {
  padding: 0 var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.meta-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: 13px;
}

.meta-icon {
  color: var(--text-muted);
  font-size: 14px;
  width: 16px;
  text-align: center;
}

.meta-label {
  color: var(--text-muted);
  min-width: 64px;
}

.meta-value {
  color: var(--text-primary);
  font-weight: 500;
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
}

.val-yes {
  color: #22C55E;
}

.val-no {
  color: var(--text-muted);
}

/* Sidebar actions */
.sidebar-actions {
  padding: var(--space-5) var(--space-6) var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.action-primary {
  height: 42px;
  border-radius: var(--radius-md) !important;
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

.action-row {
  display: flex;
  gap: var(--space-3);
}

.action-secondary,
.action-danger {
  flex: 1;
  height: 36px;
  border-radius: var(--radius-md) !important;
  font-size: 13px;
}

.action-secondary span,
.action-danger span,
.action-deploy-row span,
.action-deploy span {
  gap: 4px !important;
}

.action-secondary {
  background: var(--bg-elevated) !important;
  border: 1px solid var(--glass-border) !important;
  color: var(--text-secondary) !important;
}

.action-secondary:hover {
  border-color: var(--border-hover) !important;
  color: var(--text-primary) !important;
}

.action-danger {
  background: rgba(239, 68, 68, 0.1) !important;
  border: 1px solid rgba(239, 68, 68, 0.2) !important;
  color: #EF4444 !important;
}

.action-danger:hover {
  background: rgba(239, 68, 68, 0.18) !important;
}

.action-deploy-row {
  flex: 1;
  height: 36px;
  border-radius: var(--radius-md) !important;
  font-weight: 600;
  font-size: 13px;
  background: linear-gradient(135deg, #3B82F6, #2563EB) !important;
  border: none !important;
  color: white !important;
}

.action-deploy {
  height: 42px;
  border-radius: var(--radius-md) !important;
  font-weight: 600;
  font-size: 14px;
  background: linear-gradient(135deg, #3B82F6, #2563EB) !important;
  border: none !important;
  color: white !important;
}

.action-deploy:hover {
  opacity: 0.9;
}

.action-link {
  flex: 1;
  height: 36px;
  border-radius: var(--radius-md) !important;
  font-size: 13px;
  padding: 0 !important;
  border: 1px solid rgba(59, 130, 246, 0.3) !important;
  background: rgba(59, 130, 246, 0.08) !important;
}

.link-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  color: #3B82F6 !important;
  text-decoration: none;
  font-size: 13px;
  width: 100%;
  height: 100%;
}

.link-inner:hover {
  color: #2563EB !important;
}

/* ============================================
   Main Content
   ============================================ */
.detail-main {
  min-width: 0;
}

.content-section {
  background: var(--bg-surface);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  margin-bottom: var(--space-5);
  transition: border-color var(--duration-normal) var(--ease-out);
}

.content-section:hover {
  border-color: var(--border-hover);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.section-icon {
  color: var(--accent);
  font-size: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

/* Prompt block */
.prompt-block {
  background: var(--bg-elevated);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font-sans);
}

/* Tags */
.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.tag-chip {
  padding: 5px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all var(--duration-fast) var(--ease-out);
}

.tag-chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* Empty hint */
.empty-hint {
  text-align: center;
  padding: var(--space-12) 0;
}

.empty-hint-icon {
  font-size: 40px;
  color: var(--text-disabled);
  margin-bottom: var(--space-4);
}

.empty-hint p {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0;
}

/* ============================================
   Empty State
   ============================================ */
.empty-state {
  text-align: center;
  padding: var(--space-16) 0;
}

.empty-icon {
  font-size: 56px;
  color: var(--text-disabled);
  margin-bottom: var(--space-6);
}

.empty-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-6);
}

/* ============================================
   Responsive
   ============================================ */
@media (max-width: 768px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }

  .detail-sidebar {
    position: static;
  }
}
</style>
