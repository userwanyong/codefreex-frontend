<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listUsageStats } from '@/api/usageController'
import { parseResponseData } from '@/utils/response'

const usages = ref<API.UserUsage[]>([])
const loading = ref(true)
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const filterUserId = ref<string | undefined>(undefined)
const filterAppId = ref<string | undefined>(undefined)
const filterModelId = ref<string | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)

const statusMap: Record<string, { text: string; color: string }> = {
  success: { text: '成功', color: 'success' },
  fail: { text: '失败', color: 'error' },
}

async function loadUsages() {
  loading.value = true
  try {
    const res = await listUsageStats({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      userId: filterUserId.value,
      appId: filterAppId.value,
      modelId: filterModelId.value,
      status: filterStatus.value,
    })
    if (res.data?.code === 0 && res.data.data) {
      const data = parseResponseData<API.PageResponse<API.UserUsage>>(res.data.data)
      usages.value = data.records || []
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
  loadUsages()
}

function handleSearch() {
  pageNum.value = 1
  loadUsages()
}

function handleReset() {
  filterUserId.value = undefined
  filterAppId.value = undefined
  filterModelId.value = undefined
  filterStatus.value = undefined
  pageNum.value = 1
  loadUsages()
}

onMounted(() => loadUsages())
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">用量统计</h1>
        <p class="page-desc">查看平台所有 AI 调用的用量统计数据</p>
      </div>
    </div>

    <div class="filter-bar">
      <a-input
        v-model:value="filterUserId"
        placeholder="用户 ID"
        allow-clear
        class="filter-input"
        @pressEnter="handleSearch"
      />
      <a-input
        v-model:value="filterAppId"
        placeholder="应用 ID"
        allow-clear
        class="filter-input"
        @pressEnter="handleSearch"
      />
      <a-input
        v-model:value="filterModelId"
        placeholder="模型标识"
        allow-clear
        class="filter-input"
        @pressEnter="handleSearch"
      />
      <a-select
        v-model:value="filterStatus"
        placeholder="调用状态"
        allow-clear
        class="filter-select"
        @change="handleSearch"
      >
        <a-select-option v-for="(v, k) in statusMap" :key="k" :value="k">{{ v.text }}</a-select-option>
      </a-select>
      <a-button type="primary" @click="handleSearch">查询</a-button>
      <a-button @click="handleReset">重置</a-button>
    </div>

    <a-table :data-source="usages" :loading="loading" :pagination="false" row-key="id" :scroll="{ x: 1100 }">
      <a-table-column title="用户 ID" data-index="userId" width="140" ellipsis />
      <a-table-column title="应用 ID" data-index="appId" width="140" ellipsis />
      <a-table-column title="模型" data-index="modelId" width="160" ellipsis>
        <template #default="{ record }">
          <span>{{ record.modelId || '-' }}</span>
        </template>
      </a-table-column>
      <a-table-column title="状态" data-index="status" width="80">
        <template #default="{ record }">
          <a-tag :color="statusMap[record.status]?.color || 'default'">
            {{ statusMap[record.status]?.text || record.status }}
          </a-tag>
        </template>
      </a-table-column>
      <a-table-column title="输入 Token" data-index="inputTokens" width="100" />
      <a-table-column title="输出 Token" data-index="outputTokens" width="100" />
      <a-table-column title="总 Token" data-index="totalTokens" width="100" />
      <a-table-column title="耗时(s)" data-index="latency" width="100">
        <template #default="{ record }">
          <span>{{ record.latency != null ? (record.latency / 1000).toFixed(1) : '-' }}</span>
        </template>
      </a-table-column>
      <a-table-column title="错误信息" data-index="errorInfo" width="200" ellipsis>
        <template #default="{ record }">
          <span>{{ record.errorInfo || '-' }}</span>
        </template>
      </a-table-column>
      <a-table-column title="时间" data-index="createTime" width="180" />
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
  flex-wrap: wrap;
}

.filter-input {
  width: 140px;
}

.filter-select {
  width: 130px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}
</style>
