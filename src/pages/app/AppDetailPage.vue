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
  StarFilled,
  RocketOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  LinkOutlined,
  StopOutlined,
  CrownOutlined,
} from '@ant-design/icons-vue'
import {
  getApp,
  editApp,
  deleteApp,
  deployApp,
  cancelDeploy,
  downloadApp,
  likeApp,
  applyFeatured,
  getFeaturedApplicationStatus,
} from '@/api/appController'
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

// 精选申请状态
const featuredApplication = ref<API.FeaturedApplication | null>(null)
const applyModalVisible = ref(false)
const applyReason = ref('')
const applying = ref(false)

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

// 是否可以申请精选：已部署 + 是自己的 + 未精选 + 无待审核申请
const canApplyFeatured = computed(() => {
  if (!app.value || !isOwner.value) return false
  if (app.value.status !== 'deployed') return false
  if (app.value.isFeatured === 1) return false
  if (featuredApplication.value?.status === 'pending') return false
  return true
})

// 精选申请状态文本
const featuredStatusText = computed(() => {
  if (!featuredApplication.value) return ''
  const map: Record<string, string> = {
    pending: '审核中',
    approved: '已通过',
    rejected: '已拒绝',
  }
  return map[featuredApplication.value.status || ''] || ''
})

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

function getAvatarFallback(name: string) {
  return (name || 'A')[0]?.toUpperCase()
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
    // 加载精选申请状态（仅自己的应用）
    if (userStore.isLoggedIn && isOwner.value) {
      await loadFeaturedApplication()
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

async function loadFeaturedApplication() {
  if (!appId.value) return
  try {
    const res = await getFeaturedApplicationStatus(appId.value)
    if (res.data?.code === 0 && res.data.data) {
      featuredApplication.value = parseResponseData<API.FeaturedApplication>(res.data.data)
    }
  } catch {
    // ignore
  }
}

async function handleApplyFeatured() {
  if (!app.value?.id || applying.value) return
  applying.value = true
  try {
    const res = await applyFeatured(app.value.id, applyReason.value || undefined)
    if (res.data?.code === 0) {
      message.success('申请已提交，等待管理员审核')
      applyModalVisible.value = false
      applyReason.value = ''
      await loadFeaturedApplication()
    } else {
      message.error(res.data?.message || '申请失败')
    }
  } catch {
    message.error('申请失败')
  } finally {
    applying.value = false
  }
}

async function openEditModal() {
  if (!app.value) return
  try {
    const res = await getAllTags()
    if (res.data?.code === 0 && res.data.data) {
      tagOptions.value = parseResponseData<API.TagVO[]>(res.data.data)
    }
  } catch {
    // ignore
  }
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
    <a-button type="text" class="back-btn" @click="router.back()">
      <ArrowLeftOutlined />
      返回
    </a-button>

    <a-spin :spinning="loading">
      <template v-if="app">
        <!-- 顶部横幅：封面图 + 核心信息 -->
        <div class="detail-banner">
          <div class="banner-cover">
            <img v-if="app.cover" :src="app.cover" :alt="app.appName" class="cover-img" />
            <div v-else class="cover-placeholder">
              <span class="cover-letter">{{ getAvatarFallback(app.appName || '') }}</span>
            </div>
          </div>
          <div class="banner-body">
            <div class="banner-top">
              <h1 class="app-name">{{ app.appName || '未命名应用' }}</h1>
              <span
                class="status-badge"
                :style="{
                  color: statusConfig[app.status || 'draft']?.color,
                  background: statusConfig[app.status || 'draft']?.bg,
                }"
              >
                {{ statusConfig[app.status || 'draft']?.label }}
              </span>
              <span v-if="app.isFeatured === 1" class="featured-badge">
                <CrownOutlined /> 精选
              </span>
            </div>
            <div class="banner-meta">
              <span class="stat-item">
                <EyeOutlined /> {{ app.viewCount ?? 0 }}
              </span>
              <span
                class="stat-item like-btn"
                :class="{ liked: isLiked }"
                @click.stop="handleLike"
              >
                <LikeFilled v-if="isLiked" />
                <LikeOutlined v-else />
                {{ app.likeCount ?? 0 }}
              </span>
              <span v-if="featuredStatusText" class="stat-item apply-status-tag">
                <ClockCircleOutlined /> {{ featuredStatusText }}
              </span>
            </div>
            <!-- 详细信息 -->
            <div class="banner-detail">
              <span class="detail-item">
                <CodeOutlined /> {{ app.codeGenType || '-' }}
              </span>
              <span class="detail-item" :class="app.isPublic === 1 ? 'val-yes' : 'val-no'">
                <GlobalOutlined /> {{ app.isPublic === 1 ? '公开' : '私有' }}
              </span>
              <span class="detail-item">
                <ClockCircleOutlined /> {{ app.createTime?.slice(0, 10) || '-' }}
              </span>
              <template v-if="app?.status === 'deployed' && deployedUrl">
                <a :href="deployedUrl" target="_blank" class="detail-item link-item" @click.stop>
                  <LinkOutlined /> 访问部署
                </a>
              </template>
              <a v-if="isOwner" class="detail-item link-item" @click.stop="handleDownload">
                <DownloadOutlined /> 下载源码
              </a>
            </div>
            <!-- 标签 -->
            <div v-if="app.tags?.length" class="banner-tags">
              <span v-for="tag in app.tags" :key="tag" class="tag-chip">{{ tag }}</span>
            </div>
            <!-- 操作按钮 -->
            <div v-if="isOwner" class="banner-actions">
              <a-button type="primary" size="small" @click="router.push(`/app/${appId}/chat`)">
                <MessageOutlined /> AI 工作台
              </a-button>
              <a-button
                v-if="canDeploy && app?.status !== 'deployed'"
                size="small"
                :loading="deploying"
                @click="handleDeploy"
              >
                <GlobalOutlined /> 部署
              </a-button>
              <template v-if="app?.status === 'deployed'">
                <a-button size="small" :loading="deploying" @click="handleDeploy">
                  <GlobalOutlined /> 重新部署
                </a-button>
                <a-button size="small" @click="handleCancelDeploy">
                  <StopOutlined /> 取消部署
                </a-button>
              </template>
              <a-button v-if="canApplyFeatured" size="small" @click="applyModalVisible = true">
                <StarOutlined /> 申请精选
              </a-button>
              <a-button size="small" @click="openEditModal">
                <EditOutlined /> 编辑
              </a-button>
              <a-button size="small" danger @click="handleDelete">
                <DeleteOutlined /> 删除
              </a-button>
            </div>
          </div>
        </div>

        <!-- 应用描述（折叠） -->
        <div class="desc-section">
          <a-collapse :bordered="false" class="desc-collapse">
            <a-collapse-panel key="desc" header="应用描述">
              <div class="desc-content">{{ app.description || '暂无描述' }}</div>
            </a-collapse-panel>
          </a-collapse>
        </div>

        <!-- 提示词（折叠） -->
        <div v-if="app.initPrompt" class="prompt-section">
          <a-collapse :bordered="false" class="desc-collapse">
            <a-collapse-panel key="prompt" header="初始提示词">
              <div class="desc-content">{{ app.initPrompt }}</div>
            </a-collapse-panel>
          </a-collapse>
        </div>
      </template>

      <div v-if="!loading && !app" class="empty-state">
        <CodeOutlined class="empty-icon" />
        <h3>应用不存在或无权访问</h3>
        <a-button type="primary" @click="router.push('/app/my')">返回我的应用</a-button>
      </div>
    </a-spin>

    <!-- 编辑弹窗 -->
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

    <!-- 申请精选弹窗 -->
    <a-modal
      v-model:open="applyModalVisible"
      title="申请精选"
      :confirm-loading="applying"
      @ok="handleApplyFeatured"
      ok-text="提交申请"
    >
      <p style="color: var(--text-secondary); margin-bottom: 16px;">
        申请精选后，管理员将审核您的应用。通过后将展示在首页精选区域。
      </p>
      <a-textarea
        v-model:value="applyReason"
        placeholder="请简要说明为什么您的应用应该被精选（选填）"
        :rows="3"
        :maxlength="200"
        show-count
      />
    </a-modal>
  </div>
</template>

<style scoped>
.detail-page {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px - 48px);
  overflow: hidden;
}

.back-btn {
  color: var(--text-secondary) !important;
  margin-bottom: var(--space-4);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 14px;
  flex-shrink: 0;
}

.back-btn:hover {
  color: var(--text-primary) !important;
}

/* ============================================
   Banner: 封面 + 核心信息 + 操作
   ============================================ */
.detail-banner {
  display: flex;
  gap: var(--space-6);
  padding: var(--space-5);
  background: var(--bg-surface);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  flex-shrink: 0;
}

.banner-cover {
  width: 160px;
  height: 100px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  flex-shrink: 0;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-letter {
  font-size: 36px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.8);
  font-family: var(--font-mono);
}

.banner-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.banner-top {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.app-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.featured-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: #FAAD14;
  background: rgba(250, 173, 20, 0.12);
  flex-shrink: 0;
}

.banner-meta {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
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

.apply-status-tag {
  color: #F59E0B;
}

/* 详细信息行 */
.banner-detail {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.detail-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.detail-item.val-yes {
  color: #22C55E;
}

.detail-item.val-no {
  color: var(--text-muted);
}

.link-item {
  color: #3B82F6 !important;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s;
}

.link-item:hover {
  color: #2563EB !important;
}

/* 标签 */
.banner-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.tag-chip {
  padding: 2px 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* 操作按钮 */
.banner-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

/* ============================================
   Description Section (Collapsible)
   ============================================ */
.desc-section {
  margin-top: var(--space-4);
  flex-shrink: 0;
}

.desc-collapse {
  background: var(--bg-surface) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: var(--radius-lg) !important;
}

.desc-collapse :deep(.ant-collapse-header) {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary) !important;
  padding: var(--space-3) var(--space-5) !important;
}

.desc-collapse :deep(.ant-collapse-content-box) {
  padding: 0 var(--space-5) var(--space-4) !important;
}

.desc-content {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
}

/* ============================================
   Prompt Section (Collapsible)
   ============================================ */
.prompt-section {
  margin-top: var(--space-4);
  flex-shrink: 0;
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
  .detail-banner {
    flex-direction: column;
  }

  .banner-cover {
    width: 100%;
    height: 120px;
  }

  .banner-actions {
    justify-content: flex-start;
  }

  .detail-page {
    height: auto;
    overflow: auto;
  }
}
</style>
