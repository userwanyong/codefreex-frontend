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
  ClockCircleOutlined,
  CodeOutlined,
  TagOutlined,
} from '@ant-design/icons-vue'
import { getApp, editApp, deleteApp } from '@/api/appController'
import { parseResponseData } from '@/utils/response'
import { useUserStore } from '@/stores/userStore'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const app = ref<API.AppVO | null>(null)
const loading = ref(true)
const editModalVisible = ref(false)
const editForm = ref({ appName: '', description: '', tags: [] as string[] })

const appId = computed(() => {
  const param = route.params.appId
  return Array.isArray(param) ? param[0] : param
})

const isOwner = computed(() => app.value?.userId === userStore.loginUser?.userId)

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

async function loadApp() {
  if (!appId.value) return
  loading.value = true
  try {
    const res = await getApp(appId.value)
    if (res.data?.code === 0 && res.data.data) {
      app.value = parseResponseData<API.AppVO>(res.data.data)
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

function openEditModal() {
  if (!app.value) return
  editForm.value = {
    appName: app.value.appName || '',
    description: app.value.description || '',
    tags: app.value.tags || [],
  }
  editModalVisible.value = true
}

async function handleEdit() {
  if (!app.value?.id) return
  try {
    const res = await editApp({
      id: app.value.id,
      appName: editForm.value.appName,
      description: editForm.value.description,
      tags: editForm.value.tags,
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
        <!-- Hero banner -->
        <div class="detail-hero" :style="{ background: getGradient(app.appName || '') }">
          <div class="hero-content">
            <div class="hero-info">
              <div
                class="hero-status"
                :style="{
                  color: statusConfig[app.status || 'draft']?.color,
                  background: statusConfig[app.status || 'draft']?.bg,
                }"
              >
                {{ statusConfig[app.status || 'draft']?.label }}
              </div>
              <h1 class="hero-title">{{ app.appName || '未命名应用' }}</h1>
              <p class="hero-desc">{{ app.description || '暂无描述' }}</p>
            </div>
            <div v-if="isOwner" class="hero-actions">
              <a-button class="action-btn" @click="openEditModal">
                <EditOutlined />
                编辑
              </a-button>
              <a-button danger class="action-btn" @click="handleDelete">
                <DeleteOutlined />
                删除
              </a-button>
            </div>
          </div>
        </div>

        <!-- Info cards -->
        <div class="info-grid">
          <div class="info-card">
            <div class="info-icon">
              <CodeOutlined />
            </div>
            <div class="info-content">
              <span class="info-label">生成类型</span>
              <span class="info-value">{{ app.codeGenType || '-' }}</span>
            </div>
          </div>

          <div class="info-card">
            <div class="info-icon">
              <EyeOutlined />
            </div>
            <div class="info-content">
              <span class="info-label">浏览量</span>
              <span class="info-value">{{ app.viewCount ?? 0 }}</span>
            </div>
          </div>

          <div class="info-card">
            <div class="info-icon">
              <LikeOutlined />
            </div>
            <div class="info-content">
              <span class="info-label">点赞数</span>
              <span class="info-value">{{ app.likeCount ?? 0 }}</span>
            </div>
          </div>

          <div class="info-card">
            <div class="info-icon">
              <ClockCircleOutlined />
            </div>
            <div class="info-content">
              <span class="info-label">创建时间</span>
              <span class="info-value">{{ app.createTime || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- Tags -->
        <div v-if="app.tags?.length" class="tags-section">
          <h3 class="section-title">
            <TagOutlined />
            标签
          </h3>
          <div class="tags-list">
            <span v-for="tag in app.tags" :key="tag" class="tag-item">{{ tag }}</span>
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
          <a-select v-model:value="editForm.tags" mode="tags" placeholder="输入标签后回车" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.detail-page {
  max-width: 960px;
  margin: 0 auto;
}

.back-btn {
  color: var(--text-secondary) !important;
  margin-bottom: var(--space-5);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 14px;
}

.back-btn:hover {
  color: var(--text-primary) !important;
}

/* Hero banner */
.detail-hero {
  border-radius: var(--radius-xl);
  padding: var(--space-10) var(--space-8);
  margin-bottom: var(--space-6);
  position: relative;
  overflow: hidden;
}

.detail-hero::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.3) 100%);
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.hero-info {
  flex: 1;
}

.hero-status {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: var(--space-4);
  backdrop-filter: blur(8px);
}

.hero-title {
  font-size: 32px;
  font-weight: 700;
  color: white;
  margin: 0 0 var(--space-3);
  letter-spacing: -0.5px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.hero-desc {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  max-width: 500px;
}

.hero-actions {
  display: flex;
  gap: var(--space-3);
  flex-shrink: 0;
}

.action-btn {
  background: rgba(255, 255, 255, 0.15) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: white !important;
  backdrop-filter: blur(8px);
  border-radius: var(--radius-md) !important;
  font-weight: 500;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.25) !important;
}

/* Info grid */
.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.info-card {
  background: var(--bg-surface);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  align-items: center;
  gap: var(--space-4);
  transition: all var(--duration-normal) var(--ease-out);
}

.info-card:hover {
  border-color: var(--border-hover);
}

.info-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-soft);
  border-radius: var(--radius-md);
  color: var(--accent);
  font-size: 18px;
  flex-shrink: 0;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: 12px;
  color: var(--text-muted);
}

.info-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

/* Tags */
.tags-section {
  background: var(--bg-surface);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.tag-item {
  padding: 4px 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  font-size: 13px;
  color: var(--text-secondary);
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
  margin: 0 0 var(--space-6);
}

/* Responsive */
@media (max-width: 768px) {
  .hero-content {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-5);
  }

  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .hero-title {
    font-size: 24px;
  }
}
</style>
