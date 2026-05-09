<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  PlusOutlined,
  EyeOutlined,
  LikeOutlined,
  DeleteOutlined,
  RocketOutlined,
  CodeOutlined,
} from '@ant-design/icons-vue'
import { getMyApps, deleteApp } from '@/api/appController'
import { parseResponseData } from '@/utils/response'

const router = useRouter()
const apps = ref<API.AppVO[]>([])
const loading = ref(true)
const pageNum = ref(1)
const pageSize = ref(12)
const total = ref(0)

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: '草稿', color: '#64748B', bg: 'rgba(100, 116, 139, 0.15)' },
  generating: { label: '生成中', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  generated: { label: '已生成', color: '#22C55E', bg: 'rgba(34, 197, 94, 0.15)' },
  deployed: { label: '已部署', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
  disabled: { label: '已禁用', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
}

const gradients = [
  'linear-gradient(135deg, #065F46 0%, #064E3B 100%)',
  'linear-gradient(135deg, #1E3A5F 0%, #1E293B 100%)',
  'linear-gradient(135deg, #4C1D95 0%, #2D1B69 100%)',
  'linear-gradient(135deg, #92400E 0%, #78350F 100%)',
  'linear-gradient(135deg, #065F46 0%, #1E3A5F 100%)',
  'linear-gradient(135deg, #4C1D95 0%, #065F46 100%)',
]

function getGradient(name: string) {
  const hash = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return gradients[hash % gradients.length]
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
      <a-button type="primary" class="create-btn" @click="router.push('/app/create')">
        <PlusOutlined />
        创建应用
      </a-button>
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
        <div class="card-cover" :style="{ background: getGradient(app.appName || '') }">
          <span class="cover-letter">{{ (app.appName || 'A')[0]?.toUpperCase() }}</span>
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

        <div class="card-body">
          <h3 class="card-title">{{ app.appName || '未命名应用' }}</h3>
          <p class="card-desc">{{ app.description || '暂无描述' }}</p>

          <div class="card-footer">
            <div class="card-stats">
              <span class="stat">
                <EyeOutlined />
                {{ app.viewCount ?? 0 }}
              </span>
              <span class="stat">
                <LikeOutlined />
                {{ app.likeCount ?? 0 }}
              </span>
            </div>
            <div class="card-actions">
              <a-button
                type="text"
                size="small"
                class="action-btn"
                @click.stop="router.push(`/app/${app.id}`)"
              >
                <CodeOutlined />
              </a-button>
              <a-button
                type="text"
                size="small"
                danger
                class="action-btn"
                @click="handleDelete(app.id, $event)"
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
      <p>创建你的第一个 AI 应用吧</p>
      <a-button type="primary" class="create-btn" @click="router.push('/app/create')">
        <PlusOutlined />
        创建应用
      </a-button>
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
}

.app-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.card-cover {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.cover-letter {
  font-size: 48px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.12);
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
  padding: var(--space-5);
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0 0 var(--space-4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 20px;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-stats {
  display: flex;
  gap: var(--space-4);
}

.stat {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 12px;
  color: var(--text-muted);
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
