<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { UserOutlined, StopOutlined, CheckCircleOutlined, EyeOutlined, DollarOutlined } from '@ant-design/icons-vue'
import { adminListUsers, adminGetUserDetail, adminSetUserStatus, adminAdjustCredits, adminGetCreditTransactions } from '@/api/userController'
import { parseResponseData } from '@/utils/response'

const users = ref<API.UserInfo[]>([])
const loading = ref(true)
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const filterSearch = ref('')
const filterStatus = ref<string | undefined>(undefined)

const statusMap: Record<string, { text: string; color: string }> = {
  active: { text: '正常', color: 'success' },
  disabled: { text: '已禁用', color: 'error' },
}

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailUser = ref<API.AdminUserVO | null>(null)

async function loadUsers() {
  loading.value = true
  try {
    const res = await adminListUsers({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      searchKey: filterSearch.value || undefined,
      status: filterStatus.value,
    })
    if (res.data?.code === 0 && res.data.data) {
      const data = parseResponseData<API.PageResponse<API.UserInfo>>(res.data.data)
      users.value = data.records || []
      total.value = data.total || 0
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

async function viewDetail(userId: string) {
  detailVisible.value = true
  detailLoading.value = true
  try {
    const res = await adminGetUserDetail(userId)
    if (res.data?.code === 0 && res.data.data) {
      detailUser.value = parseResponseData<API.AdminUserVO>(res.data.data)
    }
    loadCreditTransactions(userId)
  } catch {
    message.error('获取用户详情失败')
  } finally {
    detailLoading.value = false
  }
}

async function toggleStatus(user: API.UserInfo) {
  const newStatus = user.status === 'disabled' ? 'active' : 'disabled'
  const actionText = newStatus === 'disabled' ? '禁用' : '启用'

  Modal.confirm({
    title: `确认${actionText}用户`,
    content: `确定要${actionText}用户「${user.nickname || user.userId}」吗？`,
    okText: '确认',
    cancelText: '取消',
    async onOk() {
      try {
        const res = await adminSetUserStatus(user.userId!, newStatus)
        if (res.data?.code === 0) {
          message.success(`已${actionText}用户`)
          loadUsers()
        } else {
          message.error(res.data?.message || '操作失败')
        }
      } catch {
        message.error('操作失败')
      }
    },
  })
}

function handlePageChange(page: number) {
  pageNum.value = page
  loadUsers()
}

function handleSearch() {
  pageNum.value = 1
  loadUsers()
}

// === 码点流水 ===
const creditTransactions = ref<API.CreditTransaction[]>([])
const creditLoading = ref(false)
const transactionTypeMap: Record<string, string> = {
  recharge: '充值',
  consume: '消费',
  admin_adjust: '管理员调整',
  gift: '赠送',
}

async function loadCreditTransactions(userId: string) {
  creditLoading.value = true
  try {
    const res = await adminGetCreditTransactions(userId, 1, 9999)
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

// === 调整码点 ===
const adjustVisible = ref(false)
const adjustLoading = ref(false)
const adjustAmount = ref(0)
const adjustDescription = ref('')

function openAdjustModal() {
  adjustAmount.value = 0
  adjustDescription.value = ''
  adjustVisible.value = true
}

async function handleAdjustCredits() {
  if (!detailUser.value?.userId || adjustAmount.value === 0) {
    message.warning('请输入调整数量')
    return
  }
  adjustLoading.value = true
  try {
    const res = await adminAdjustCredits({
      userId: detailUser.value.userId,
      amount: adjustAmount.value,
      description: adjustDescription.value || undefined,
    })
    if (res.data?.code === 0) {
      message.success('调整成功')
      adjustVisible.value = false
      viewDetail(detailUser.value.userId)
      loadUsers()
    } else {
      message.error(res.data?.message || '调整失败')
    }
  } catch {
    message.error('调整失败')
  } finally {
    adjustLoading.value = false
  }
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

onMounted(() => loadUsers())
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">用户管理</h1>
        <p class="page-desc">管理平台用户信息与权限</p>
      </div>
    </div>

    <div class="filter-bar">
      <a-input
        v-model:value="filterSearch"
        placeholder="搜索用户昵称"
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

    <a-table :data-source="users" :loading="loading" :pagination="false" row-key="userId">
      <a-table-column title="用户" width="260">
        <template #default="{ record }">
          <div class="user-cell">
            <img v-if="record.avatar" :src="record.avatar" class="user-avatar" />
            <span v-else class="user-avatar-placeholder">
              <UserOutlined />
            </span>
            <div class="user-info-text">
              <span class="user-nickname">{{ record.nickname || '未知用户' }}</span>
              <span class="user-id">ID: {{ record.userId }}</span>
            </div>
          </div>
        </template>
      </a-table-column>
      <a-table-column title="状态" data-index="status" width="100">
        <template #default="{ record }">
          <a-tag :color="statusMap[record.status ?? '']?.color || 'default'">
            {{ statusMap[record.status ?? '']?.text || record.status }}
          </a-tag>
        </template>
      </a-table-column>
      <a-table-column title="剩余码点" data-index="remainingCredits" width="100" />
      <a-table-column title="累计码点" data-index="totalCredits" width="100" />
      <a-table-column title="注册时间" data-index="createTime" width="180">
        <template #default="{ record }">
          {{ formatDate(record.createTime) }}
        </template>
      </a-table-column>
      <a-table-column title="操作" width="180">
        <template #default="{ record }">
          <a-space>
            <a-button type="link" size="small" @click.stop="viewDetail(record.userId)">
              <template #icon><EyeOutlined /></template>
              详情
            </a-button>
            <a-button
              v-if="record.status !== 'disabled'"
              type="link"
              size="small"
              danger
              @click.stop="toggleStatus(record)"
            >
              <template #icon><StopOutlined /></template>
              禁用
            </a-button>
            <a-button
              v-else
              type="link"
              size="small"
              @click.stop="toggleStatus(record)"
            >
              <template #icon><CheckCircleOutlined /></template>
              启用
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

    <!-- 用户详情弹窗 -->
    <a-modal
      v-model:open="detailVisible"
      title="用户详情"
      :footer="null"
      width="780px"
      centered
      :body-style="{ maxHeight: 'calc(100vh - 110px)', overflowY: 'auto' }"
    >
      <a-spin :spinning="detailLoading">
        <div v-if="detailUser" class="detail-content">
          <div class="detail-avatar-row">
            <img v-if="detailUser.avatar" :src="detailUser.avatar" class="detail-avatar" />
            <span v-else class="detail-avatar-placeholder-large">
              <UserOutlined />
            </span>
            <div class="detail-basic">
              <h3>{{ detailUser.nickname || '未知用户' }}</h3>
              <a-tag :color="statusMap[detailUser.status ?? '']?.color || 'default'">
                {{ statusMap[detailUser.status ?? '']?.text || detailUser.status }}
              </a-tag>
            </div>
          </div>
          <a-descriptions :column="1" bordered size="small" class="detail-descriptions">
            <a-descriptions-item label="用户 ID">{{ detailUser.userId }}</a-descriptions-item>
            <a-descriptions-item label="邮箱">{{ detailUser.email || '-' }}</a-descriptions-item>
            <a-descriptions-item label="手机">{{ detailUser.phone || '-' }}</a-descriptions-item>
            <a-descriptions-item label="角色">
              <a-tag v-for="role in detailUser.roles" :key="role">{{ role }}</a-tag>
              <span v-if="!detailUser.roles?.length">-</span>
            </a-descriptions-item>
            <a-descriptions-item label="累计码点">
              {{ detailUser.totalCredits ?? 0 }}
              <a-button type="link" size="small" @click="openAdjustModal">
                <template #icon><DollarOutlined /></template>
                调整
              </a-button>
            </a-descriptions-item>
            <a-descriptions-item label="剩余码点">{{ detailUser.remainingCredits ?? 0 }}</a-descriptions-item>
            <a-descriptions-item label="注册时间">{{ formatDate(detailUser.createTime) }}</a-descriptions-item>
          </a-descriptions>

          <a-divider>码点流水（共 {{ creditTransactions.length }} 条）</a-divider>
          <div class="credit-transactions-scroll">
            <a-table
              :data-source="creditTransactions"
              :loading="creditLoading"
              :pagination="false"
              size="small"
              row-key="id"
            >
              <a-table-column title="类型" data-index="type" width="90">
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
              <a-table-column title="时间" data-index="createTime" width="150">
                <template #default="{ record }">{{ formatDate(record.createTime) }}</template>
              </a-table-column>
            </a-table>
          </div>
        </div>
      </a-spin>
    </a-modal>

    <!-- 调整码点弹窗 -->
    <a-modal
      v-model:open="adjustVisible"
      title="调整码点"
      @ok="handleAdjustCredits"
      :confirm-loading="adjustLoading"
    >
      <a-form :label-col="{ span: 6 }">
        <a-form-item label="用户">
          {{ detailUser?.nickname || detailUser?.userId }}
        </a-form-item>
        <a-form-item label="当前码点">
          {{ detailUser?.remainingCredits ?? 0 }}
        </a-form-item>
        <a-form-item label="调整数量">
          <a-input-number v-model:value="adjustAmount" :step="10" style="width: 100%" />
          <div style="color: var(--text-secondary); font-size: 12px; margin-top: 4px">
            正数为增加，负数为减少
          </div>
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="adjustDescription" :rows="2" placeholder="可选" />
        </a-form-item>
      </a-form>
    </a-modal>
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

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.user-avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.user-info-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.user-nickname {
  font-weight: 500;
  font-size: 14px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-id {
  font-size: 12px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}

.detail-content {
  padding: 8px 0;
}

.detail-avatar-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.detail-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
}

.detail-avatar-placeholder-large {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--text-muted);
}

.detail-basic h3 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.detail-descriptions {
  margin-top: 8px;
}

.credit-transactions-scroll {
  max-height: calc(80vh - 380px);
  min-height: 120px;
  overflow-y: auto;
}
</style>
