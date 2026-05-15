<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { RocketOutlined, ArrowLeftOutlined } from '@ant-design/icons-vue'
import { createApp } from '@/api/appController'
import { getAllTags } from '@/api/tagController'
import { parseResponseData } from '@/utils/response'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const tagOptions = ref<API.TagVO[]>([])

const form = reactive({
  initPrompt: '',
  appName: '',
  description: '',
  tagIds: [] as number[],
})

async function handleCreate() {
  if (!form.initPrompt.trim()) {
    message.warning('请输入生成提示词')
    return
  }

  // 创建前检查码点余额
  await userStore.fetchUserInfo()
  const remaining = userStore.userInfo?.remainingCredits ?? 0
  if (remaining < 50) {
    message.error('码点不足，创建应用需要 50 码点，请先兑换码点')
    return
  }

  loading.value = true
  try {
    // 创建应用（安全审查已集成到工作流节点中）
    const res = await createApp({
      initPrompt: form.initPrompt,
      appName: form.appName || undefined,
      description: form.description || undefined,
      tagIds: form.tagIds.length > 0 ? form.tagIds : undefined,
    })
    if (res.data?.code === 0 && res.data.data) {
      const appData = res.data.data as API.App
      message.success('应用创建成功，请耐心等待...')
      router.push({
        path: `/app/${appData.id}/chat`,
        query: { prompt: form.initPrompt.trim() },
      })
    } else {
      const errMsg = res.data?.message || '创建失败'
      if (errMsg.includes('请求过于频繁')) {
        message.warning(errMsg)
      } else {
        message.error(errMsg)
      }
    }
  } catch {
    message.error('创建失败，请检查网络')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    const res = await getAllTags()
    if (res.data?.code === 0 && res.data.data) {
      tagOptions.value = parseResponseData<API.TagVO[]>(res.data.data)
    }
  } catch {
    // ignore
  }
})
</script>

<template>
  <div class="create-page">
    <a-button type="text" class="back-btn" @click="router.back()">
      <ArrowLeftOutlined />
      返回
    </a-button>

    <div class="create-card">
      <div class="card-header">
        <RocketOutlined class="header-icon" />
        <h1 class="card-title">创建应用</h1>
        <p class="card-desc">描述你想要的应用，AI 将为你生成代码</p>
      </div>

      <a-form layout="vertical">
        <a-form-item label="生成提示词" required>
          <a-textarea
            v-model:value="form.initPrompt"
            placeholder="描述你想要的应用，例如：一个个人博客网站，支持文章发布、分类、标签功能，风格简洁现代..."
            :rows="6"
            show-count
            :maxlength="2000"
          />
        </a-form-item>

        <a-form-item label="应用名称">
          <a-input v-model:value="form.appName" placeholder="给你的应用起个名字（可选）" />
        </a-form-item>

        <a-form-item label="应用描述">
          <a-textarea
            v-model:value="form.description"
            placeholder="简要描述应用的功能（可选）"
            :rows="3"
            :maxlength="1024"
            show-count
          />
        </a-form-item>

        <a-form-item label="标签">
          <a-select
            v-model:value="form.tagIds"
            mode="multiple"
            placeholder="选择标签（可选）"
            :max-count="3"
            :options="tagOptions.map(t => ({ label: t.name, value: t.id }))"
          />
        </a-form-item>

        <a-form-item>
          <div class="form-actions">
            <a-button type="primary" :loading="loading" class="submit-btn" @click="handleCreate">
              <RocketOutlined />
              创建应用
            </a-button>
            <a-button class="cancel-btn" @click="router.back()">取消</a-button>
          </div>
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>

<style scoped>
.create-page {
  max-width: 680px;
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

.create-card {
  background: var(--bg-surface);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  padding: var(--space-10) var(--space-8);
  box-shadow: var(--shadow-lg);
}

.card-header {
  text-align: center;
  margin-bottom: var(--space-8);
}

.header-icon {
  font-size: 36px;
  color: var(--accent);
  margin-bottom: var(--space-4);
}

.card-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--space-2);
  letter-spacing: -0.5px;
}

.card-desc {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0;
}

.form-actions {
  display: flex;
  gap: var(--space-3);
}

.submit-btn {
  height: 44px;
  padding: 0 28px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.cancel-btn {
  height: 44px;
  padding: 0 24px;
  border-radius: var(--radius-md);
}

@media (max-width: 480px) {
  .create-card {
    padding: var(--space-8) var(--space-5);
  }
}
</style>
