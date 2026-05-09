<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { StarOutlined, StarFilled } from '@ant-design/icons-vue'
import { getAdminApps, setAppFeatured } from '@/api/appController'
import { parseResponseData } from '@/utils/response'

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
  <div class="admin-app-page">
    <div class="page-header">
      <h2>应用管理</h2>
    </div>

    <div class="filter-bar">
      <a-input
        v-model:value="filterName"
        placeholder="搜索应用名称"
        style="width: 200px"
        @press-enter="handleSearch"
      />
      <a-select
        v-model:value="filterStatus"
        placeholder="筛选状态"
        allow-clear
        style="width: 150px"
        @change="handleSearch"
      >
        <a-select-option v-for="(v, k) in statusMap" :key="k" :value="k">{{ v.text }}</a-select-option>
      </a-select>
      <a-button type="primary" @click="handleSearch">查询</a-button>
    </div>

    <a-table :data-source="apps" :loading="loading" :pagination="false" row-key="id">
      <a-table-column title="应用名称" data-index="appName" ellipsis>
        <template #default="{ record }">
          <span>{{ record.appName || '未命名应用' }}</span>
        </template>
      </a-table-column>
      <a-table-column title="状态" data-index="status" width="100">
        <template #default="{ record }">
          <a-tag :color="statusMap[record.status]?.color || 'default'">
            {{ statusMap[record.status]?.text || record.status }}
          </a-tag>
        </template>
      </a-table-column>
      <a-table-column title="作者ID" data-index="userId" width="120" ellipsis />
      <a-table-column title="浏览" data-index="viewCount" width="80" />
      <a-table-column title="点赞" data-index="likeCount" width="80" />
      <a-table-column title="创建时间" data-index="createTime" width="180" />
      <a-table-column title="操作" width="120">
        <template #default="{ record }">
          <a-button
            type="link"
            size="small"
            @click="toggleFeatured(record)"
          >
            <template #icon>
              <StarFilled v-if="record.isFeatured === 1" style="color: #faad14" />
              <StarOutlined v-else />
            </template>
            {{ record.isFeatured === 1 ? '取消精选' : '设为精选' }}
          </a-button>
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
.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}
</style>
