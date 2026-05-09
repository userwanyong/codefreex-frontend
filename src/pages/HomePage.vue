<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { EyeOutlined, LikeOutlined, ArrowRightOutlined, ThunderboltOutlined, CodeOutlined, RocketOutlined } from '@ant-design/icons-vue'
import { getFeaturedApps, createApp } from '@/api/appController'
import { parseResponseData } from '@/utils/response'
import { useUserStore } from '@/stores/userStore'
import { message } from 'ant-design-vue'
import FlowBackground from '@/components/FlowBackground.vue'

const router = useRouter()
const userStore = useUserStore()
const apps = ref<API.AppVO[]>([])
const loading = ref(false)
const creating = ref(false)
const hasNext = ref(false)
const nextCursor = ref<string | undefined>(undefined)
const promptText = ref('')

const features = [
  { icon: ThunderboltOutlined, title: 'AI 智能生成', desc: '描述你的需求，AI 自动生成完整应用' },
  { icon: CodeOutlined, title: '多模式支持', desc: '单文件 HTML、多文件项目、Vue 工程' },
  { icon: RocketOutlined, title: '一键部署', desc: '生成完成即可预览和部署，即刻上线' },
]

const statusColors: Record<string, string> = {
  draft: 'var(--status-draft)',
  generating: 'var(--status-generating)',
  generated: 'var(--status-generated)',
  deployed: 'var(--status-deployed)',
  disabled: 'var(--status-disabled)',
}

const statusLabels: Record<string, string> = {
  draft: '草稿',
  generating: '生成中',
  generated: '已生成',
  deployed: '已部署',
  disabled: '已禁用',
}

function getAppGradient(name: string) {
  const gradients = [
    'linear-gradient(135deg, #065F46 0%, #064E3B 100%)',
    'linear-gradient(135deg, #1E3A5F 0%, #1E293B 100%)',
    'linear-gradient(135deg, #4C1D95 0%, #2D1B69 100%)',
    'linear-gradient(135deg, #92400E 0%, #78350F 100%)',
    'linear-gradient(135deg, #991B1B 0%, #7F1D1D 100%)',
    'linear-gradient(135deg, #065F46 0%, #1E3A5F 100%)',
    'linear-gradient(135deg, #4C1D95 0%, #065F46 100%)',
    'linear-gradient(135deg, #1E3A5F 0%, #4C1D95 100%)',
  ]
  const hash = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return gradients[hash % gradients.length]
}

async function loadApps(isLoadMore = false) {
  if (loading.value) return
  loading.value = true
  try {
    const res = await getFeaturedApps(isLoadMore ? nextCursor.value : undefined, 12)
    if (res.data?.code === 0 && res.data.data) {
      const data = parseResponseData<API.FeaturedAppResponse>(res.data.data)
      const records = data.records || []
      if (isLoadMore) {
        apps.value = [...apps.value, ...records]
      } else {
        apps.value = records
      }
      hasNext.value = data.hasNext ?? false
      nextCursor.value = data.nextCursor
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

async function handleCreateApp() {
  if (!promptText.value.trim()) {
    message.warning('请描述你想要的应用')
    return
  }
  if (!userStore.isLoggedIn) {
    router.push('/user/login')
    return
  }
  creating.value = true
  try {
    const res = await createApp({ initPrompt: promptText.value.trim() })
    if (res.data?.code === 0 && res.data.data) {
      const appId = res.data.data as unknown as string
      message.success('应用创建成功')
      router.push(`/app/${appId}`)
    } else {
      message.error(res.data?.message || '创建失败')
    }
  } catch {
    message.error('创建失败，请检查网络')
  } finally {
    creating.value = false
  }
}

onMounted(() => loadApps())
</script>

<template>
  <div class="home-page">
    <FlowBackground />
    <!-- Hero Section -->
    <section class="hero">
      <!-- Ambient glow -->
      <div class="hero-glow hero-glow-1" />
      <div class="hero-glow hero-glow-2" />

      <div class="hero-content">
        <div class="hero-badge">
          <ThunderboltOutlined />
          <span>AI 驱动 · 零代码 · 一键生成</span>
        </div>

        <h1 class="hero-title">
          用自然语言<br>
          <span class="title-accent">创造你的应用</span>
        </h1>

        <p class="hero-desc">
          描述你想要的应用，AI 自动生成、部署、上线。<br>
          无需编码经验，从想法到成品只需一句话。
        </p>

        <!-- AI Input -->
        <div class="hero-input-wrapper">
          <div class="hero-input-container">
            <textarea
              v-model="promptText"
              class="hero-input"
              placeholder="描述你想要的应用，例如：一个在线协作文档工具，支持实时编辑和评论..."
              rows="3"
              @keydown.enter.exact.prevent="handleCreateApp"
            />
            <div class="hero-input-footer">
              <span class="input-hint">按 Enter 发送</span>
              <a-button
                type="primary"
                class="submit-btn"
                :loading="creating"
                @click="handleCreateApp"
              >
                <RocketOutlined />
                生成应用
              </a-button>
            </div>
          </div>
        </div>

        <!-- Quick examples -->
        <div class="hero-examples">
          <span class="examples-label">试试这些：</span>
          <a-button
            v-for="example in ['个人博客', '待办清单', '天气应用', 'Markdown 编辑器']"
            :key="example"
            type="text"
            size="small"
            class="example-tag"
            @click="promptText = `创建一个${example}`"
          >
            {{ example }}
          </a-button>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="features-section">
      <div class="features-grid">
        <div v-for="f in features" :key="f.title" class="feature-card">
          <div class="feature-icon">
            <component :is="f.icon" />
          </div>
          <h3>{{ f.title }}</h3>
          <p>{{ f.desc }}</p>
        </div>
      </div>
    </section>

    <!-- Featured Apps -->
    <section class="apps-section">
      <div class="section-header">
        <h2>精选应用</h2>
        <p>探索社区创建的优秀应用</p>
      </div>

      <a-spin :spinning="loading && apps.length === 0">
        <div v-if="apps.length" class="apps-grid">
          <div
            v-for="app in apps"
            :key="app.id"
            class="app-card"
            @click="router.push(`/app/${app.id}`)"
          >
            <div class="app-cover" :style="{ background: getAppGradient(app.appName || '') }">
              <span class="cover-letter">{{ (app.appName || 'A')[0]?.toUpperCase() }}</span>
              <div v-if="app.status" class="app-status" :style="{ background: statusColors[app.status] || 'var(--status-draft)' }">
                {{ statusLabels[app.status] || app.status }}
              </div>
            </div>
            <div class="app-info">
              <h3 class="app-name">{{ app.appName || '未命名应用' }}</h3>
              <p class="app-desc">{{ app.description || '暂无描述' }}</p>
              <div class="app-meta">
                <span class="meta-item">
                  <EyeOutlined />
                  {{ app.viewCount ?? 0 }}
                </span>
                <span class="meta-item">
                  <LikeOutlined />
                  {{ app.likeCount ?? 0 }}
                </span>
                <div v-if="app.tags?.length" class="app-tags">
                  <span v-for="tag in app.tags.slice(0, 2)" :key="tag" class="tag">{{ tag }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!loading && apps.length === 0" class="empty-state">
          <CodeOutlined class="empty-icon" />
          <p>暂无精选应用</p>
        </div>
      </a-spin>

      <div v-if="hasNext" class="load-more">
        <a-button :loading="loading" class="load-more-btn" @click="loadApps(true)">
          加载更多
          <ArrowRightOutlined />
        </a-button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
}

/* ============================================
   Hero Section
   ============================================ */
.hero {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: var(--space-16) 0 var(--space-12);
  overflow: hidden;
}

.hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.12;
  pointer-events: none;
}

.hero-glow-1 {
  width: 600px;
  height: 600px;
  background: var(--accent);
  top: -200px;
  left: 50%;
  transform: translateX(-50%);
}

.hero-glow-2 {
  width: 400px;
  height: 400px;
  background: var(--blue);
  bottom: -100px;
  right: -100px;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--accent-soft);
  border: 1px solid var(--border-accent);
  border-radius: 999px;
  color: var(--accent);
  font-size: 13px;
  font-weight: 500;
  margin-bottom: var(--space-8);
}

.hero-title {
  font-size: clamp(32px, 5vw, 56px);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -1.5px;
  color: var(--text-primary);
  margin: 0 0 var(--space-6);
}

.title-accent {
  background: linear-gradient(135deg, var(--accent), #4ADE80);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-desc {
  font-size: 17px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0 auto var(--space-10);
  max-width: 560px;
}

/* ============================================
   Hero Input
   ============================================ */
.hero-input-wrapper {
  max-width: 680px;
  margin: 0 auto var(--space-6);
}

.hero-input-container {
  background: var(--bg-surface);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--duration-normal) var(--ease-out);
  box-shadow: var(--shadow-md);
}

.hero-input-container:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow), var(--shadow-lg);
}

.hero-input {
  width: 100%;
  padding: var(--space-5) var(--space-5) var(--space-2);
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.6;
  resize: none;
}

.hero-input::placeholder {
  color: var(--text-muted);
}

.hero-input-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3) var(--space-3);
}

.input-hint {
  font-size: 12px;
  color: var(--text-muted);
  padding-left: var(--space-2);
}

.submit-btn {
  height: 38px;
  padding: 0 20px;
  border-radius: var(--radius-md);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* Quick examples */
.hero-examples {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.examples-label {
  font-size: 13px;
  color: var(--text-muted);
}

.example-tag {
  font-size: 13px;
  color: var(--text-secondary) !important;
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  height: 28px;
  padding: 0 12px;
  transition: all var(--duration-fast) var(--ease-out);
}

.example-tag:hover {
  border-color: var(--accent) !important;
  color: var(--accent) !important;
  background: var(--accent-soft) !important;
}

/* ============================================
   Features
   ============================================ */
.features-section {
  position: relative;
  z-index: 1;
  padding: var(--space-12) 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-5);
}

.feature-card {
  padding: var(--space-8) var(--space-6);
  background: var(--bg-surface);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  text-align: center;
  transition: all var(--duration-normal) var(--ease-out);
}

.feature-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.feature-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto var(--space-4);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-soft);
  border: 1px solid var(--border-accent);
  border-radius: var(--radius-md);
  color: var(--accent);
  font-size: 22px;
}

.feature-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-2);
}

.feature-card p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
}

/* ============================================
   Apps Grid
   ============================================ */
.apps-section {
  position: relative;
  z-index: 1;
  padding: var(--space-8) 0 var(--space-16);
}

.section-header {
  margin-bottom: var(--space-8);
}

.section-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--space-2);
  letter-spacing: -0.5px;
}

.section-header p {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0;
}

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

.app-cover {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.cover-letter {
  font-size: 48px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.15);
  font-family: var(--font-mono);
}

.app-status {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: white;
}

.app-info {
  padding: var(--space-5);
}

.app-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0 0 var(--space-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-meta {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 12px;
  color: var(--text-muted);
}

.app-tags {
  display: flex;
  gap: var(--space-1);
  margin-left: auto;
}

.tag {
  padding: 1px 8px;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  font-size: 11px;
  color: var(--text-secondary);
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: var(--space-16) 0;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: var(--space-4);
  color: var(--text-disabled);
}

.empty-state p {
  font-size: 15px;
  margin: 0;
}

/* Load more */
.load-more {
  text-align: center;
  margin-top: var(--space-10);
}

.load-more-btn {
  height: 40px;
  padding: 0 24px;
  border-radius: var(--radius-md);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

/* ============================================
   Responsive
   ============================================ */
@media (max-width: 768px) {
  .hero {
    padding: var(--space-10) 0 var(--space-8);
  }

  .hero-title {
    font-size: 28px;
    letter-spacing: -0.5px;
  }

  .hero-desc {
    font-size: 15px;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }

  .feature-card {
    padding: var(--space-5);
    display: flex;
    align-items: center;
    text-align: left;
    gap: var(--space-4);
  }

  .feature-icon {
    margin: 0;
    flex-shrink: 0;
  }

  .apps-grid {
    grid-template-columns: 1fr;
  }

  .hero-examples {
    gap: var(--space-2);
  }
}
</style>
