<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { CopyOutlined } from '@ant-design/icons-vue'
import { getAdminInvites } from '@/api/inviteController'
import { parseResponseData } from '@/utils/response'

const invites = ref<API.Invite[]>([])
const loading = ref(true)
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const filterStatus = ref<string | undefined>(undefined)

const statusMap: Record<string, { text: string; color: string }> = {
  unused: { text: '未使用', color: 'success' },
  partial: { text: '部分使用', color: 'processing' },
  used: { text: '已使用', color: 'default' },
  expired: { text: '已过期', color: 'error' },
  disabled: { text: '已禁用', color: 'error' },
}

async function loadInvites() {
  loading.value = true
  try {
    const res = await getAdminInvites({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      status: filterStatus.value,
    })
    if (res.data?.code === 0 && res.data.data) {
      const data = parseResponseData<API.PageResponse<API.Invite>>(res.data.data)
      invites.value = data.records || []
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
  loadInvites()
}

function handleSearch() {
  pageNum.value = 1
  loadInvites()
}

onMounted(() => loadInvites())

function copyCode(code: string) {
  navigator.clipboard.writeText(code).then(() => {
    message.success('已复制到剪贴板')
  })
}
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">邀请码管理</h1>
        <p class="page-desc">查看和管理平台所有邀请码</p>
      </div>
    </div>

    <div class="filter-bar">
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

    <a-table :data-source="invites" :loading="loading" :pagination="false" row-key="id">
      <a-table-column title="邀请码" data-index="inviteCode" width="200">
        <template #default="{ record }">
          <a-space>
            <span class="code-text">{{ record.inviteCode }}</span>
            <CopyOutlined class="copy-icon" @click="copyCode(record.inviteCode)" />
          </a-space>
        </template>
      </a-table-column>
      <a-table-column title="状态" data-index="status" width="100">
        <template #default="{ record }">
          <a-tag :color="statusMap[record.status]?.color || 'default'">
            {{ statusMap[record.status]?.text || record.status }}
          </a-tag>
        </template>
      </a-table-column>
      <a-table-column title="创建者ID" data-index="userId" width="140" ellipsis />
      <a-table-column title="使用次数" width="100">
        <template #default="{ record }">
          <span>{{ record.usedCount ?? 0 }} / {{ record.maxUseCount ?? 1 }}</span>
        </template>
      </a-table-column>
      <a-table-column title="过期时间" data-index="expireTime" width="180" />
      <a-table-column title="创建时间" data-index="createTime" width="180" />
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

.filter-select {
  width: 150px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}

.code-text {
  user-select: none;
}

.copy-icon {
  cursor: pointer;
  color: var(--accent);
}

.copy-icon:hover {
  color: var(--accent-hover);
}
</style>
