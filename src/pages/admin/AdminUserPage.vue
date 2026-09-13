<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  UserOutlined, StopOutlined, CheckCircleOutlined, EyeOutlined, DollarOutlined,
  PlusOutlined, EditOutlined, TeamOutlined, DeleteOutlined,
} from '@ant-design/icons-vue'
import {
  adminListUsers, adminGetUserDetail, adminSetUserStatus, adminAdjustCredits,
  adminGetCreditTransactions, adminCreateUser, adminUpdateUser, adminAssignUserRoles, adminDeleteUser,
} from '@/api/userController'
import { listRoles } from '@/api/roleController'
import { parseResponseData } from '@/utils/response'
import { formatDateTime } from '@/utils/datetime'

/** 第三方/验证码自动注册账号的初始密码（后端在账号落地时统一重置） */
const AUTO_PASSWORD = '123456'

const users = ref<API.AdminUserVO[]>([])
const loading = ref(true)
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const filterSearch = ref('')
const filterStatus = ref<number | undefined>(undefined)

const statusOptions = [
  { value: 1, text: '正常', color: 'success' },
  { value: 0, text: '已禁用', color: 'error' },
]
function statusMeta(status?: number) {
  return statusOptions.find((s) => s.value === status) || { text: '-', color: 'default' }
}

function providerTag(username?: string): { text: string; color: string } | null {
  if (!username) return null
  if (username.startsWith('gitee_')) return { text: 'Gitee', color: 'red' }
  if (username.startsWith('github_')) return { text: 'GitHub', color: 'purple' }
  return null
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
      const data = parseResponseData<API.PageResponse<API.AdminUserVO>>(res.data.data)
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

async function toggleStatus(user: API.AdminUserVO) {
  const newStatus = user.status === 0 ? 1 : 0
  const actionText = newStatus === 0 ? '禁用' : '启用'

  Modal.confirm({
    title: `确认${actionText}用户`,
    content: `确定要${actionText}用户「${user.nickname || user.username}」吗？${newStatus === 0 ? '禁用后该用户将立即下线。' : ''}`,
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

function confirmDelete(user: API.AdminUserVO) {
  Modal.confirm({
    title: '确认删除用户',
    content: `删除用户「${user.nickname || user.username}」不可恢复，其账号、角色与第三方绑定将被清除，码点流水保留。确定删除吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        const res = await adminDeleteUser(user.userId!)
        if (res.data?.code === 0) {
          message.success('已删除用户')
          loadUsers()
        } else {
          message.error(res.data?.message || '删除失败')
        }
      } catch {
        message.error('删除失败')
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

// === 创建用户 ===
const createVisible = ref(false)
const createLoading = ref(false)
const createForm = ref({ username: '', password: '', nickname: '', email: '', roleIds: [] as string[] })

function openCreateModal() {
  createForm.value = { username: '', password: '', nickname: '', email: '', roleIds: [] }
  createVisible.value = true
}

async function handleCreate() {
  const form = createForm.value
  if (!form.username || !form.password) {
    message.warning('请填写账号和密码')
    return
  }
  createLoading.value = true
  try {
    const res = await adminCreateUser({
      username: form.username,
      password: form.password,
      nickname: form.nickname || undefined,
      email: form.email || undefined,
      roleIds: form.roleIds.length ? form.roleIds : undefined,
    })
    if (res.data?.code === 0) {
      message.success('用户创建成功')
      createVisible.value = false
      loadUsers()
    } else {
      message.error(res.data?.message || '创建失败')
    }
  } catch {
    message.error('创建失败')
  } finally {
    createLoading.value = false
  }
}

// === 编辑用户 ===
const editVisible = ref(false)
const editLoading = ref(false)
const editForm = ref<API.UserAdminUpdateRequest>({ userId: '', nickname: '', email: '', phone: '', password: '' })

function openEditModal(user: API.AdminUserVO) {
  editForm.value = {
    userId: user.userId!,
    nickname: user.nickname || '',
    email: user.email || '',
    phone: user.phone || '',
    password: '',
  }
  editVisible.value = true
}

async function handleEdit() {
  const form = editForm.value
  editLoading.value = true
  try {
    const data: API.UserAdminUpdateRequest = {
      userId: form.userId,
      nickname: form.nickname ?? undefined,
      email: form.email ?? undefined,
      phone: form.phone ?? undefined,
      password: form.password || undefined,
    }
    const res = await adminUpdateUser(data)
    if (res.data?.code === 0) {
      message.success('用户已更新')
      editVisible.value = false
      loadUsers()
      if (detailVisible.value && detailUser.value?.userId === form.userId) {
        viewDetail(form.userId)
      }
    } else {
      message.error(res.data?.message || '更新失败')
    }
  } catch {
    message.error('更新失败')
  } finally {
    editLoading.value = false
  }
}

// === 分配角色 ===
const allRoles = ref<API.RoleVO[]>([])
const rolesVisible = ref(false)
const rolesLoading = ref(false)
const rolesUserId = ref('')
const rolesUserName = ref('')
const selectedRoleIds = ref<string[]>([])

async function loadRoles() {
  try {
    const res = await listRoles()
    if (res.data?.code === 0 && res.data.data) {
      allRoles.value = parseResponseData<API.RoleVO[]>(res.data.data)
    }
  } catch {
    // ignore
  }
}

function openRolesModal(user: API.AdminUserVO) {
  rolesUserId.value = user.userId!
  rolesUserName.value = user.nickname || user.username || ''
  const roleCodes = new Set(user.roles || [])
  // 以角色编码匹配当前选中项（列表行已含角色编码）
  selectedRoleIds.value = allRoles.value
    .filter((role) => roleCodes.has(role.code || ''))
    .map((role) => role.id!)
  rolesVisible.value = true
}

async function handleAssignRoles() {
  rolesLoading.value = true
  try {
    const res = await adminAssignUserRoles(rolesUserId.value, selectedRoleIds.value)
    if (res.data?.code === 0) {
      message.success('角色已更新')
      rolesVisible.value = false
      loadUsers()
    } else {
      message.error(res.data?.message || '角色更新失败')
    }
  } catch {
    message.error('角色更新失败')
  } finally {
    rolesLoading.value = false
  }
}

const oauthProviderNames = computed(() => ({
  gitee: 'Gitee',
  github: 'GitHub',
}))

function formatDate(dateStr?: string) {
  return formatDateTime(dateStr)
}

onMounted(() => {
  loadUsers()
  loadRoles()
})
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">用户管理</h1>
        <p class="page-desc">用户、角色与状态统一由认证服务（auth-service）管理，此处数据实时同步</p>
      </div>
      <a-button type="primary" @click="openCreateModal">
        <template #icon><PlusOutlined /></template>
        创建用户
      </a-button>
    </div>

    <a-alert type="info" show-icon class="password-hint">
      <template #message>
        第三方登录（Gitee / GitHub）创建的账号，初始密码为
        <b>{{ AUTO_PASSWORD }}</b>，用户可在个人中心修改。
      </template>
    </a-alert>

    <div class="filter-bar">
      <a-input
        v-model:value="filterSearch"
        placeholder="搜索账号或邮箱"
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
        <a-select-option :value="1">正常</a-select-option>
        <a-select-option :value="0">已禁用</a-select-option>
      </a-select>
      <a-button type="primary" @click="handleSearch">查询</a-button>
    </div>

    <a-table :data-source="users" :loading="loading" :pagination="false" row-key="userId">
      <a-table-column title="账号" width="240">
        <template #default="{ record }">
          <div class="account-cell">
            <span class="account-name">{{ record.username || '-' }}</span>
            <a-tag v-if="providerTag(record.username)" :color="providerTag(record.username)!.color" class="provider-tag">
              {{ providerTag(record.username)!.text }}
            </a-tag>
          </div>
        </template>
      </a-table-column>
      <a-table-column title="用户" width="220">
        <template #default="{ record }">
          <div class="user-cell">
            <img v-if="record.avatar" :src="record.avatar" class="user-avatar" />
            <span v-else class="user-avatar-placeholder">
              <UserOutlined />
            </span>
            <div class="user-info-text">
              <span class="user-nickname">{{ record.nickname || '未设置昵称' }}</span>
              <span class="user-id">ID: {{ record.userId }}</span>
            </div>
          </div>
        </template>
      </a-table-column>
      <a-table-column title="角色" width="160">
        <template #default="{ record }">
          <a-tag v-for="role in record.roles" :key="role" color="blue">{{ role }}</a-tag>
          <span v-if="!record.roles?.length">-</span>
        </template>
      </a-table-column>
      <a-table-column title="状态" data-index="status" width="90">
        <template #default="{ record }">
          <a-tag :color="statusMeta(record.status).color">
            {{ statusMeta(record.status).text }}
          </a-tag>
        </template>
      </a-table-column>
      <a-table-column title="剩余码点" data-index="remainingCredits" width="95" />
      <a-table-column title="注册时间" data-index="createTime" width="170">
        <template #default="{ record }">
          {{ formatDate(record.createTime) }}
        </template>
      </a-table-column>
      <a-table-column title="操作" width="280">
        <template #default="{ record }">
          <a-space :size="0" wrap>
            <a-button type="link" size="small" @click.stop="viewDetail(record.userId)">
              <template #icon><EyeOutlined /></template>
              详情
            </a-button>
            <a-button type="link" size="small" @click.stop="openEditModal(record)">
              <template #icon><EditOutlined /></template>
              编辑
            </a-button>
            <a-button type="link" size="small" @click.stop="openRolesModal(record)">
              <template #icon><TeamOutlined /></template>
              角色
            </a-button>
            <a-button
              v-if="record.status !== 0"
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
            <a-button type="link" size="small" danger @click.stop="confirmDelete(record)">
              <template #icon><DeleteOutlined /></template>
              删除
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
              <h3>{{ detailUser.nickname || '未设置昵称' }}</h3>
              <a-space>
                <a-tag :color="statusMeta(detailUser.status).color">
                  {{ statusMeta(detailUser.status).text }}
                </a-tag>
                <a-tag v-if="providerTag(detailUser.username)" :color="providerTag(detailUser.username)!.color">
                  {{ providerTag(detailUser.username)!.text }} 登录
                </a-tag>
              </a-space>
            </div>
          </div>
          <a-alert
            v-if="providerTag(detailUser.username)"
            type="info"
            show-icon
            class="password-hint"
            :message="`该账号由第三方登录创建，初始密码为 ${AUTO_PASSWORD}`"
          />
          <a-descriptions :column="1" bordered size="small" class="detail-descriptions">
            <a-descriptions-item label="账号">{{ detailUser.username || '-' }}</a-descriptions-item>
            <a-descriptions-item label="用户 ID">{{ detailUser.userId }}</a-descriptions-item>
            <a-descriptions-item label="邮箱">{{ detailUser.email || '-' }}</a-descriptions-item>
            <a-descriptions-item label="手机">{{ detailUser.phone || '-' }}</a-descriptions-item>
            <a-descriptions-item label="角色">
              <a-tag v-for="role in detailUser.roles" :key="role" color="blue">{{ role }}</a-tag>
              <span v-if="!detailUser.roles?.length">-</span>
            </a-descriptions-item>
            <a-descriptions-item label="第三方绑定">
              <template v-if="detailUser.oauthProviders?.length">
                <a-tag v-for="p in detailUser.oauthProviders" :key="p" :color="p === 'gitee' ? 'red' : 'purple'">
                  {{ oauthProviderNames[p as keyof typeof oauthProviderNames] || p }}
                </a-tag>
              </template>
              <span v-else>未绑定</span>
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

    <!-- 创建用户弹窗 -->
    <a-modal
      v-model:open="createVisible"
      title="创建用户"
      :confirm-loading="createLoading"
      ok-text="创建"
      cancel-text="取消"
      @ok="handleCreate"
    >
      <a-form :label-col="{ span: 5 }">
        <a-form-item label="账号" required>
          <a-input v-model:value="createForm.username" placeholder="3-50 位字母、数字、下划线" />
        </a-form-item>
        <a-form-item label="密码" required>
          <a-input-password v-model:value="createForm.password" placeholder="6-50 位" />
        </a-form-item>
        <a-form-item label="昵称">
          <a-input v-model:value="createForm.nickname" placeholder="可选" />
        </a-form-item>
        <a-form-item label="邮箱">
          <a-input v-model:value="createForm.email" placeholder="可选" />
        </a-form-item>
        <a-form-item label="角色">
          <a-select
            v-model:value="createForm.roleIds"
            mode="multiple"
            placeholder="默认为普通用户（ROLE_USER）"
            :options="allRoles.map((r) => ({ value: r.id, label: `${r.name}（${r.code}）` }))"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 编辑用户弹窗 -->
    <a-modal
      v-model:open="editVisible"
      title="编辑用户"
      :confirm-loading="editLoading"
      ok-text="保存"
      cancel-text="取消"
      @ok="handleEdit"
    >
      <a-form :label-col="{ span: 5 }">
        <a-form-item label="昵称">
          <a-input v-model:value="editForm.nickname" :maxlength="32" />
        </a-form-item>
        <a-form-item label="邮箱">
          <a-input v-model:value="editForm.email" placeholder="留空表示清空" />
        </a-form-item>
        <a-form-item label="手机">
          <a-input v-model:value="editForm.phone" placeholder="留空表示清空" />
        </a-form-item>
        <a-form-item label="重置密码">
          <a-input-password v-model:value="editForm.password" placeholder="留空表示不修改" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 分配角色弹窗 -->
    <a-modal
      v-model:open="rolesVisible"
      :title="`分配角色 - ${rolesUserName}`"
      :confirm-loading="rolesLoading"
      ok-text="保存"
      cancel-text="取消"
      @ok="handleAssignRoles"
    >
      <a-checkbox-group v-model:value="selectedRoleIds" class="roles-checkbox-group">
        <a-checkbox v-for="role in allRoles" :key="role.id" :value="role.id">
          {{ role.name }}（{{ role.code }}）
        </a-checkbox>
      </a-checkbox-group>
      <div class="roles-tip">保存后为全量替换；不勾选任何角色将清空该用户的角色</div>
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
          {{ detailUser?.nickname || detailUser?.username || detailUser?.userId }}
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
  margin-bottom: 20px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
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

.password-hint {
  margin-bottom: 16px;
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

.account-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.account-name {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-primary);
  word-break: break-all;
}

.provider-tag {
  flex-shrink: 0;
  margin-inline-end: 0;
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
  margin-bottom: 16px;
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
  max-height: calc(80vh - 420px);
  min-height: 120px;
  overflow-y: auto;
}

.roles-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.roles-tip {
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
