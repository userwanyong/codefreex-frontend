<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { CopyOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { generateInvite, getMyInvites } from '@/api/inviteController'
import { parseResponseData } from '@/utils/response'

const router = useRouter()
const loading = ref(false)
const invites = ref<API.Invite[]>([])
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const generateModalVisible = ref(false)
const generateLoading = ref(false)
const generateForm = ref({
  batch: '',
  expireHours: 168,
  maxUseCount: 1,
})

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

async function handleGenerate() {
  generateLoading.value = true
  try {
    const res = await generateInvite({
      batch: generateForm.value.batch || undefined,
      expireHours: generateForm.value.expireHours,
      maxUseCount: generateForm.value.maxUseCount,
    })
    if (res.data?.code === 0) {
      message.success('邀请码生成成功')
      generateModalVisible.value = false
      loadInvites()
    } else {
      message.error(res.data?.message || '生成失败')
    }
  } catch {
    message.error('生成失败')
  } finally {
    generateLoading.value = false
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
})
</script>

<template>
  <div class="invite-page">
    <div class="page-header">
      <h2>邀请码管理</h2>
      <a-button type="primary" @click="generateModalVisible = true">
        <PlusOutlined /> 生成邀请码
      </a-button>
    </div>

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

    <a-modal
      v-model:open="generateModalVisible"
      title="生成邀请码"
      :confirm-loading="generateLoading"
      @ok="handleGenerate"
      ok-text="生成"
    >
      <a-form layout="vertical">
        <a-form-item label="批次标识">
          <a-input v-model:value="generateForm.batch" placeholder="可选，便于归类" />
        </a-form-item>
        <a-form-item label="有效期（小时）">
          <a-input-number v-model:value="generateForm.expireHours" :min="1" style="width: 100%" />
        </a-form-item>
        <a-form-item label="最大使用次数">
          <a-input-number v-model:value="generateForm.maxUseCount" :min="1" style="width: 100%" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.invite-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  color: var(--text-primary);
}

.copy-icon {
  cursor: pointer;
  color: var(--accent);
}

.copy-icon:hover {
  color: var(--accent-hover);
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}
</style>
