<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { getUserInfo, getMyCreditTransactions } from '@/api/userController'
import { getMyInviter } from '@/api/inviteController'
import { parseResponseData } from '@/utils/response'

const userStore = useUserStore()
const userInfo = ref<API.UserInfo | null>(null)
const inviter = ref<API.UserInfo | null>(null)
const loading = ref(true)

const creditTransactions = ref<API.CreditTransaction[]>([])
const creditLoading = ref(false)
const transactionTypeMap: Record<string, string> = {
  recharge: '充值',
  consume: '消费',
  admin_adjust: '管理员调整',
  gift: '赠送',
}

async function loadData() {
  loading.value = true
  try {
    const [infoRes, inviterRes] = await Promise.all([getUserInfo(), getMyInviter()])
    if (infoRes.data?.code === 0 && infoRes.data.data) {
      userInfo.value = JSON.parse(infoRes.data.data as unknown as string) as API.UserInfo
    }
    if (inviterRes.data?.code === 0 && inviterRes.data.data) {
      inviter.value = JSON.parse(inviterRes.data.data as unknown as string) as API.UserInfo
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

async function loadCreditTransactions() {
  creditLoading.value = true
  try {
    const res = await getMyCreditTransactions(1, 20)
    if (res.data?.code === 0 && res.data.data) {
      const data = parseResponseData<API.PageResponse<API.CreditTransaction>>(res.data.data)
      creditTransactions.value = data.records || []
    }
  } catch {
    // ignore
  } finally {
    creditLoading.value = false
  }
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

onMounted(() => {
  loadData()
  loadCreditTransactions()
})
</script>

<template>
  <div class="profile-page">
    <div class="page-header">
      <h2>个人中心</h2>
    </div>

    <a-spin :spinning="loading">
      <a-row :gutter="24">
        <a-col :xs="24" :md="12">
          <a-card title="基本信息" class="profile-card">
            <a-descriptions :column="1" bordered size="small">
              <a-descriptions-item label="用户名">
                {{ userStore.loginUser?.username || '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="邮箱">
                {{ userStore.loginUser?.email || '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="码点">
                <span class="credits-value">{{ userInfo?.remainingCredits ?? '-' }}</span>
                <span style="color: var(--text-secondary); font-size: 12px; margin-left: 8px">
                  / 累计 {{ userInfo?.totalCredits ?? 0 }}
                </span>
              </a-descriptions-item>
              <a-descriptions-item label="角色">
                <a-space v-if="userStore.roles.length">
                  <a-tag v-for="role in userStore.roles" :key="role" color="purple">{{ role }}</a-tag>
                </a-space>
                <span v-else>-</span>
              </a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>

        <a-col :xs="24" :md="12">
          <a-card title="邀请信息" class="profile-card">
            <a-descriptions :column="1" bordered size="small">
              <a-descriptions-item label="邀请人">
                {{ inviter?.userId || '无' }}
              </a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>
      </a-row>

      <a-card title="码点流水" class="profile-card" style="margin-top: 24px">
        <a-table
          :data-source="creditTransactions"
          :loading="creditLoading"
          :pagination="false"
          size="small"
          row-key="id"
        >
          <a-table-column title="类型" data-index="type" width="100">
            <template #default="{ record }">
              <a-tag :color="record.type === 'consume' ? 'red' : record.type === 'recharge' ? 'green' : 'blue'">
                {{ transactionTypeMap[record.type] || record.type }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="变动" data-index="amount" width="80">
            <template #default="{ record }">
              <span :style="{ color: record.amount > 0 ? '#52c41a' : '#ff4d4f' }">
                {{ record.amount > 0 ? '+' : '' }}{{ record.amount }}
              </span>
            </template>
          </a-table-column>
          <a-table-column title="余额" data-index="balanceAfter" width="80" />
          <a-table-column title="描述" data-index="description" ellipsis />
          <a-table-column title="时间" width="160">
            <template #default="{ record }">{{ formatDate(record.createTime) }}</template>
          </a-table-column>
        </a-table>
      </a-card>
    </a-spin>
  </div>
</template>

<style scoped>
.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  color: var(--text-primary);
}

.profile-card {
  margin-bottom: 24px;
}

.credits-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--accent);
}
</style>
