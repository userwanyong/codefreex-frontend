<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { CopyOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { generateInvite, getMyInvites, getMyInviter } from '@/api/inviteController'
import { parseResponseData } from '@/utils/response'

const router = useRouter()
const loading = ref(false)
const invites = ref<API.Invite[]>([])
const inviter = ref<API.UserInfo | null>(null)
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)

const statusMap: Record<string, { text: string; color: string }> = {
  active: { text: '可用', color: 'success' },
  used: { text: '已使用', color: 'default' },
  expired: { text: '已过期', color: 'error' },
}

async function loadInvites() {
  loading.value = true
  try {
    const res = await getMyInvites(pageNum.value, pageSize.value)
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

async function loadInviter() {
  try {
    const res = await getMyInviter()
    if (res.data?.code === 0 && res.data.data) {
      inviter.value = parseResponseData<API.UserInfo>(res.data.data)
    }
  } catch {
    // ignore
  }
}

async function handleGenerate() {
  try {
    const res = await generateInvite({})
    if (res.data?.code === 0) {
      message.success('邀请码生成成功')
      loadInvites()
    } else {
      message.error(res.data?.message || '生成失败')
    }
  } catch {
    message.error('生成失败')
  }
}

function copyCode(code: string) {
  navigator.clipboard.writeText(code).then(() => {
    message.success('已复制到剪贴板')
  })
}

function handlePageChange(page: number) {
  pageNum.value = page
  loadInvites()
}

onMounted(() => {
  loadInvites()
  loadInviter()
})
</script>

<template>
  <div class="invite-page">
    <div class="page-header">
      <h2>邀请码管理</h2>
      <a-button type="primary" @click="handleGenerate">
        <PlusOutlined /> 生成邀请码
      </a-button>
    </div>

    <a-card v-if="inviter" class="inviter-card" size="small">
      <span>我的邀请人：{{ inviter.userId || '-' }}</span>
    </a-card>

    <a-table
      :data-source="invites"
      :loading="loading"
      :pagination="false"
      row-key="id"
      style="margin-top: 16px"
    >
      <a-table-column title="邀请码" data-index="inviteCode">
        <template #default="{ record }">
          <a-space>
            <span>{{ record.inviteCode }}</span>
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
      <a-table-column title="使用次数" width="120">
        <template #default="{ record }">
          <span>{{ record.usedCount ?? 0 }} / {{ record.maxUseCount ?? 1 }}</span>
        </template>
      </a-table-column>
      <a-table-column title="创建时间" data-index="createTime" width="180" />
      <a-table-column title="操作" width="100">
        <template #default="{ record }">
          <a-button type="link" size="small" @click="router.push(`/invite/${record.id}`)">详情</a-button>
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
}

.inviter-card {
  margin-bottom: 16px;
  background: #f6f8fa;
}

.copy-icon {
  cursor: pointer;
  color: #667eea;
}

.copy-icon:hover {
  color: #764ba2;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}
</style>
