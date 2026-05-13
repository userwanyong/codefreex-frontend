<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  PlusOutlined,
  DeleteOutlined,
  RocketOutlined,
  CodeOutlined,
  MessageOutlined,
  EditOutlined,
} from '@ant-design/icons-vue'
import { getMyApps, deleteApp } from '@/api/appController'
import { parseResponseData } from '@/utils/response'

const router = useRouter()
const apps = ref<API.AppVO[]>([])
const loading = ref(true)
const pageNum = ref(1)
const pageSize = ref(8)
const total = ref(0)

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: '草稿', color: '#64748B', bg: 'rgba(100, 116, 139, 0.15)' },
  generating: { label: '生成中', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  generated: { label: '已生成', color: '#22C55E', bg: 'rgba(34, 197, 94, 0.15)' },
  deployed: { label: '已部署', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
  disabled: { label: '已禁用', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
}

const darkGradients = [
  'linear-gradient(135deg, #065F46 0%, #10B981 100%)',
  'linear-gradient(135deg, #1E3A5F 0%, #3B82F6 100%)',
  'linear-gradient(135deg, #4C1D95 0%, #8B5CF6 100%)',
  'linear-gradient(135deg, #92400E 0%, #F59E0B 100%)',
  'linear-gradient(135deg, #991B1B 0%, #EF4444 100%)',
  'linear-gradient(135deg, #065F46 0%, #3B82F6 100%)',
  'linear-gradient(135deg, #4C1D95 0%, #10B981 100%)',
  'linear-gradient(135deg, #1E3A5F 0%, #8B5CF6 100%)',
]

const lightGradients = [
  'linear-gradient(135deg, #A7F3D0 0%, #6EE7B7 100%)',
  'linear-gradient(135deg, #BFDBFE 0%, #93C5FD 100%)',
  'linear-gradient(135deg, #DDD6FE 0%, #C4B5FD 100%)',
  'linear-gradient(135deg, #FDE68A 0%, #FCD34D 100%)',
  'linear-gradient(135deg, #FECACA 0%, #FCA5A5 100%)',
  'linear-gradient(135deg, #A7F3D0 0%, #BFDBFE 100%)',
  'linear-gradient(135deg, #DDD6FE 0%, #A7F3D0 100%)',
  'linear-gradient(135deg, #BFDBFE 0%, #DDD6FE 100%)',
]

const infoBgLight = [
  'rgba(167, 243, 208, 0.28)',
  'rgba(191, 219, 254, 0.28)',
  'rgba(221, 214, 254, 0.28)',
  'rgba(253, 230, 138, 0.28)',
  'rgba(254, 202, 202, 0.28)',
  'rgba(167, 243, 208, 0.20)',
  'rgba(221, 214, 254, 0.20)',
  'rgba(191, 219, 254, 0.20)',
]

const infoBgDark = [
  'rgba(16, 185, 129, 0.12)',
  'rgba(59, 130, 246, 0.12)',
  'rgba(139, 92, 246, 0.12)',
  'rgba(245, 158, 11, 0.12)',
  'rgba(239, 68, 68, 0.12)',
  'rgba(59, 130, 246, 0.09)',
  'rgba(16, 185, 129, 0.09)',
  'rgba(139, 92, 246, 0.09)',
]

function djb2Hash(str: string) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
  }
  return hash >>> 0
}

function getColorIndex(id: string) {
  return djb2Hash(id || '') % darkGradients.length
}

function getGradient(id: string) {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light'
  return (isLight ? lightGradients : darkGradients)[getColorIndex(id)]
}

function getAppInfoBg(id: string) {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light'
  return (isLight ? infoBgLight : infoBgDark)[getColorIndex(id)]
}

const tagColors = [
  { background: 'rgba(34, 197, 94, 0.55)', border: '1px solid rgba(34, 197, 94, 0.3)' },
  { background: 'rgba(59, 130, 246, 0.55)', border: '1px solid rgba(59, 130, 246, 0.3)' },
  { background: 'rgba(168, 85, 247, 0.55)', border: '1px solid rgba(168, 85, 247, 0.3)' },
  { background: 'rgba(245, 158, 11, 0.55)', border: '1px solid rgba(245, 158, 11, 0.3)' },
  { background: 'rgba(239, 68, 68, 0.55)', border: '1px solid rgba(239, 68, 68, 0.3)' },
  { background: 'rgba(20, 184, 166, 0.55)', border: '1px solid rgba(20, 184, 166, 0.3)' },
  { background: 'rgba(236, 72, 153, 0.55)', border: '1px solid rgba(236, 72, 153, 0.3)' },
  { background: 'rgba(99, 102, 241, 0.55)', border: '1px solid rgba(99, 102, 241, 0.3)' },
]

function getTagColor(tag: string) {
  return tagColors[djb2Hash(tag) % tagColors.length]
}

async function loadApps() {
  loading.value = true
  try {
    const res = await getMyApps(pageNum.value, pageSize.value)
    if (res.data?.code === 0 && res.data.data) {
      const data = parseResponseData<API.PageResponse<API.AppVO>>(res.data.data)
      apps.value = data.records || []
      total.value = data.total || 0
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

function handlePageChange(page: number) {
  pageNum.value = page
  loadApps()
}

function handleDelete(appId: string, e: Event) {
  e.stopPropagation()
  Modal.confirm({
    title: '确认删除',
    content: '删除后无法恢复，确认要删除此应用吗？',
    okText: '确认',
    cancelText: '取消',
    async onOk() {
      try {
        const res = await deleteApp(appId)
        if (res.data?.code === 0) {
          message.success('删除成功')
          loadApps()
        } else {
          message.error(res.data?.message || '删除失败')
        }
      } catch {
        message.error('删除失败')
      }
    },
  })
}

onMounted(() => loadApps())
</script>

<template>
  <div class="my-apps-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">我的应用</h1>
        <p class="page-subtitle">管理你创建的所有应用</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-grid">
      <div v-for="i in 6" :key="i" class="skeleton-card">
        <div class="skeleton-cover" />
        <div class="skeleton-content">
          <div class="skeleton-line skeleton-title" />
          <div class="skeleton-line skeleton-desc" />
        </div>
      </div>
    </div>

    <!-- Apps Grid -->
    <div v-else-if="apps.length" class="apps-grid">
      <div
        v-for="app in apps"
        :key="app.id"
        class="app-card"
        @click="router.push(`/app/${app.id}`)"
      >
        <div class="card-cover" :style="!app.cover ? { background: getGradient(app.id || '') } : {}">
          <img v-if="app.cover" :src="app.cover" :alt="app.appName" class="cover-img" />
          <span v-else class="cover-letter">{{ (app.appName || 'A')[0]?.toUpperCase() }}</span>
          <div
            class="card-status"
            :style="{
              color: statusConfig[app.status || 'draft']?.color || '#64748B',
              background: statusConfig[app.status || 'draft']?.bg || 'rgba(100,116,139,0.15)',
            }"
          >
            {{ statusConfig[app.status || 'draft']?.label || app.status }}
          </div>
        </div>

        <div class="card-body" :style="{ background: getAppInfoBg(app.id || '') }">
          <h3 class="card-title">{{ app.appName || '未命名应用' }}</h3>
          <p class="card-desc">{{ app.description || '暂无描述' }}</p>

          <div class="card-footer">
            <div v-if="app.tags?.length" class="card-tags">
              <span v-for="tag in app.tags.slice(0, 3)" :key="tag" class="my-tag" :style="getTagColor(tag)">{{ tag }}</span>
            </div>
            <span v-else class="card-tags-empty">暂无标签</span>
            <div class="card-actions">
              <a-button
                type="text"
                size="small"
                class="action-btn action-chat"
                @click.stop="router.push(`/app/${app.id}/chat`)"
              >
                <MessageOutlined />
              </a-button>
              <a-button
                type="text"
                size="small"
                class="action-btn action-edit"
                @click.stop="router.push(`/app/${app.id}`)"
              >
                <EditOutlined />
              </a-button>
              <a-button
                type="text"
                size="small"
                class="action-btn action-delete"
                @click="app.id && handleDelete(app.id, $event)"
              >
                <DeleteOutlined />
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="empty-state">
      <RocketOutlined class="empty-icon" />
      <h3>还没有应用</h3>
      <p>前往首页创建你的第一个 AI 应用吧</p>
    </div>

    <!-- Pagination -->
    <div v-if="total > pageSize" class="pagination-wrapper">
      <a-pagination
        v-model:current="pageNum"
        :total="total"
        :page-size="pageSize"
        show-quick-jumper
        @change="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped>
.my-apps-page {
  max-width: 1200px;
  margin: 0 auto;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-8);
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--space-2);
  letter-spacing: -0.5px;
}

.page-subtitle {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0;
}

.create-btn {
  height: 40px;
  padding: 0 20px;
  border-radius: var(--radius-md);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

/* Skeleton loading */
.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-5);
}

.skeleton-card {
  background: var(--bg-surface);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.skeleton-cover {
  height: 140px;
  background: var(--bg-elevated);
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-content {
  padding: var(--space-5);
}

.skeleton-line {
  height: 12px;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-title {
  width: 60%;
  margin-bottom: var(--space-3);
}

.skeleton-desc {
  width: 80%;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}

/* Apps Grid */
.apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-5);
}

.app-card {
  background: var(--bg-surface);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--duration-normal) var(--ease-out);
  display: flex;
  flex-direction: column;
}

.app-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.card-cover {
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}

.cover-letter {
  font-size: 48px;
  font-weight: 800;
  color: var(--watermark-color);
  font-family: var(--font-mono);
}

.card-status {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  backdrop-filter: blur(8px);
}

.card-body {
  padding: var(--space-4) var(--space-5);
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0 0 var(--space-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-tags {
  display: flex;
  gap: var(--space-1);
  min-width: 0;
  overflow: hidden;
}

.card-tags-empty {
  font-size: 12px;
  color: var(--text-disabled);
}

.my-tag {
  padding: 2px 8px;
  backdrop-filter: blur(8px);
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  gap: var(--space-1);
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.app-card:hover .card-actions {
  opacity: 1;
}

.action-btn {
  color: var(--text-muted) !important;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm) !important;
}

.action-btn:hover {
  background: var(--bg-elevated) !important;
}

.action-chat {
  color: var(--accent) !important;
}

.action-chat:hover {
  background: var(--accent-soft) !important;
}

.action-edit {
  color: #3B82F6 !important;
}

.action-edit:hover {
  background: rgba(59, 130, 246, 0.1) !important;
}

.action-deploy {
  color: #3B82F6 !important;
}

.action-deploy:hover {
  background: rgba(59, 130, 246, 0.1) !important;
}

.action-download {
  color: #22C55E !important;
}

.action-download:hover {
  background: rgba(34, 197, 94, 0.1) !important;
}

.action-delete {
  color: #EF4444 !important;
}

.action-delete:hover {
  background: rgba(239, 68, 68, 0.1) !important;
}

/* Empty state */
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
  margin: 0 0 var(--space-2);
}

.empty-state p {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0 0 var(--space-8);
}

/* Pagination */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: var(--space-10);
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: var(--space-4);
  }

  .apps-grid {
    grid-template-columns: 1fr;
  }
}
</style>
