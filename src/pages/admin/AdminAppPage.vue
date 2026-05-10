<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { StarOutlined, StarFilled, RocketOutlined } from '@ant-design/icons-vue'
import { getAdminApps, setAppFeatured } from '@/api/appController'
import { parseResponseData } from '@/utils/response'

const router = useRouter()
const apps = ref<API.AppVO[]>([])
const loading = ref(true)
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const filterStatus = ref<string | undefined>(undefined)
const filterName = ref('')

const statusMap: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  generating: { text: '生成中', color: 'processing' },
  generated: { text: '已生成', color: 'success' },
  deployed: { text: '已部署', color: 'blue' },
  disabled: { text: '已禁用', color: 'error' },
}

async function loadApps() {
  loading.value = true
  try {
    const res = await getAdminApps({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      status: filterStatus.value,
      appName: filterName.value || undefined,
    })
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

async function toggleFeatured(app: API.AppVO) {
  const newFeatured = app.isFeatured === 1 ? 0 : 1
  try {
    const res = await setAppFeatured(app.id!, newFeatured)
    if (res.data?.code === 0) {
      message.success(newFeatured ? '已设为精选' : '已取消精选')
      loadApps()
    } else {
      message.error(res.data?.message || '操作失败')
    }
  } catch {
    message.error('操作失败')
  }
}

function handlePageChange(page: number) {
  pageNum.value = page
  loadApps()
}

function handleSearch() {
  pageNum.value = 1
  loadApps()
}

onMounted(() => loadApps())
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">应用管理</h1>
        <p class="page-desc">管理平台所有应用，设置精选推荐</p>
      </div>
    </div>

    <div class="filter-bar">
      <a-input
        v-model:value="filterName"
        placeholder="搜索应用名称"
        class="filter-input"
        @press-enter="handleSearch"
      />
      <a-select
        v-model:value="filterStatus"
        placeholder="筛选状态"
        allow-clear
        class="filter-select"
        @change="handleSearch"
      >
        <a-select-option v-for="(v, k) in statusMap" :key="k" :value="k">{{ v.text }}</a-select-option>
      </a-select>
      <a-button type="primary" @click="handleSearch">查询</a-button>
    </div>

    <a-table :data-source="apps" :loading="loading" :pagination="false" row-key="id">
      <a-table-column title="应用名称" data-index="appName" ellipsis>
        <template #default="{ record }">
          <span class="cell-name">{{ record.appName || '未命名应用' }}</span>
        </template>
      </a-table-column>
      <a-table-column title="状态" data-index="status" width="100">
        <template #default="{ record }">
          <a-tag :color="statusMap[record.status]?.color || 'default'">
            {{ statusMap[record.status]?.text || record.status }}
          </a-tag>
        </template>
      </a-table-column>
      <a-table-column title="作者ID" data-index="userId" width="140" ellipsis />
      <a-table-column title="浏览" data-index="viewCount" width="80" />
      <a-table-column title="点赞" data-index="likeCount" width="80" />
      <a-table-column title="创建时间" data-index="createTime" width="180" />
      <a-table-column title="操作" width="160">
        <template #default="{ record }">
          <a-space>
            <a-button
              type="link"
              size="small"
              @click.stop="router.push(`/app/${record.id}`)"
            >
              <template #icon><RocketOutlined /></template>
              查看详情
            </a-button>
            <a-button
              type="link"
              size="small"
              @click.stop="toggleFeatured(record)"
            >
              <template #icon>
                <StarFilled v-if="record.isFeatured === 1" style="color: #faad14" />
                <StarOutlined v-else />
              </template>
              {{ record.isFeatured === 1 ? '取消精选' : '设为精选' }}
            </a-button>
          </a-space>
        </template>
      </a-table-column>
    </a-table>

    <div class="pagination-wrapper">
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
.admin-page {
  padding-top: 4px;
}

.page-header {
  margin-bottom: 28px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
  letter-spacing: -0.3px;
}

.page-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.filter-input {
  width: 220px;
}

.filter-select {
  width: 150px;
}

.cell-name {
  font-weight: 500;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}
</style>
