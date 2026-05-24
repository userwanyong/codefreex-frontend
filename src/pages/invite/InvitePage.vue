<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { CopyOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { generateInvite, getMyInvites } from '@/api/inviteController'
import { useUserStore } from '@/stores/userStore'
import { parseResponseData } from '@/utils/response'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const invites = ref<API.Invite[]>([])
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const generateModalVisible = ref(false)
const generateLoading = ref(false)
const generateForm = ref({
  expireDays: 7,
  maxUseCount: 1,
})
const createCost = computed(() => generateForm.value.maxUseCount * 50)
const remainingCredits = computed(() => userStore.userInfo?.remainingCredits ?? 0)
const maxUseCountLimit = computed(() => (userStore.isAdmin ? undefined : 10))

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
  if (!userStore.isAdmin && remainingCredits.value < createCost.value) {
    message.warning(`码点不足，生成该邀请码需要 ${createCost.value} 码点`)
    return
  }
  generateLoading.value = true
  try {
    const res = await generateInvite({
      expireHours: generateForm.value.expireDays * 24,
      maxUseCount: generateForm.value.maxUseCount,
    })
    if (res.data?.code === 0) {
      message.success('邀请码生成成功')
      generateModalVisible.value = false
      await Promise.all([loadInvites(), userStore.fetchUserInfo()])
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
  userStore.fetchUserInfo()
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

    <div class="reward-banner">
      <div class="reward-icon">100</div>
      <div class="reward-content">
        <div class="reward-title">邀请好友一起获得码点</div>
        <div class="reward-desc">对方使用您的邀请码进行注册，双方均可获得100码点。</div>
      </div>
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
        <a-form-item label="有效期（天）">
          <a-input-number v-model:value="generateForm.expireDays" :min="1" :max="7" style="width: 100%" />
          <div class="form-hint">有效期最长7天</div>
        </a-form-item>
        <a-form-item label="最大使用次数">
          <a-input-number
            v-model:value="generateForm.maxUseCount"
            :min="1"
            :max="maxUseCountLimit"
            style="width: 100%"
          />
          <div class="form-hint">
            {{ userStore.isAdmin ? '管理员不限制使用次数' : '普通用户最多使用10次，每次消耗50码点' }}
          </div>
        </a-form-item>
        <a-alert
          v-if="!userStore.isAdmin"
          type="info"
          show-icon
          :message="`本次将消耗 ${createCost} 码点，当前剩余 ${remainingCredits} 码点`"
        />
        <a-alert
          v-else
          type="success"
          show-icon
          message="管理员生成邀请码不消耗码点"
        />
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

.reward-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  margin-bottom: 18px;
  border: 1px solid rgba(245, 158, 11, 0.22);
  border-radius: 16px;
  background:
    radial-gradient(circle at 16px 10px, rgba(245, 158, 11, 0.18), transparent 30%),
    linear-gradient(135deg, rgba(255, 247, 237, 0.92), rgba(255, 251, 235, 0.68));
}

.reward-icon {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  flex: none;
  border-radius: 14px;
  color: #92400e;
  font-size: 17px;
  font-weight: 800;
  background: linear-gradient(135deg, #fde68a, #f59e0b);
  box-shadow: 0 10px 24px rgba(245, 158, 11, 0.28);
}

.reward-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.reward-desc {
  margin-top: 4px;
  color: var(--text-secondary);
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

.form-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}
</style>
