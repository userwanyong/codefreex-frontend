<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  UserOutlined,
  EditOutlined,
  CameraOutlined,
  MailOutlined,
  CrownOutlined,
  GiftOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/userStore'
import { getUserInfo, getMyCreditTransactions, uploadAvatar, updateProfile } from '@/api/userController'
import { getMyInviter } from '@/api/inviteController'
import { parseResponseData } from '@/utils/response'

const userStore = useUserStore()
const userInfo = ref<API.UserInfo | null>(null)
const inviter = ref<API.InviteUser | null>(null)
const loading = ref(true)
const avatarUploading = ref(false)

const creditTransactions = ref<API.CreditTransaction[]>([])
const creditLoading = ref(false)
const transactionTypeMap: Record<string, string> = {
  recharge: '充值',
  consume: '消费',
  admin_adjust: '管理员调整',
  gift: '赠送',
}

const nicknameEditing = ref(false)
const nicknameValue = ref('')
const nicknameSaving = ref(false)

async function loadData() {
  loading.value = true
  try {
    const [infoRes, inviterRes] = await Promise.all([getUserInfo(), getMyInviter()])
    if (infoRes.data?.code === 0 && infoRes.data.data) {
      userInfo.value = parseResponseData<API.UserInfo>(infoRes.data.data)
    }
    if (inviterRes.data?.code === 0 && inviterRes.data.data) {
      inviter.value = parseResponseData<API.InviteUser>(inviterRes.data.data)
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
    const res = await getMyCreditTransactions(1, 50)
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

function triggerAvatarUpload() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/jpeg,image/png,image/gif,image/webp'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      message.warning('头像文件不能超过 2MB')
      return
    }
    avatarUploading.value = true
    try {
      const res = await uploadAvatar(file)
      if (res.data?.code === 0 && res.data.data) {
        const url = typeof res.data.data === 'string' ? res.data.data : String(res.data.data)
        if (userInfo.value) {
          userInfo.value = { ...userInfo.value, avatar: url }
        }
        // 同步更新 userStore（loginUser 已由后端 session 更新，前端也需同步）
        if (userStore.loginUser) {
          userStore.loginUser = { ...userStore.loginUser, avatar: url }
        }
        // 同时更新 userStore.userInfo
        if (userStore.userInfo) {
          userStore.userInfo = { ...userStore.userInfo, avatar: url }
        }
        message.success('头像更新成功')
      } else {
        message.error(res.data?.message || '上传失败')
      }
    } catch {
      message.error('上传失败')
    } finally {
      avatarUploading.value = false
    }
  }
  input.click()
}

function startEditNickname() {
  nicknameValue.value = userInfo.value?.nickname || userStore.loginUser?.nickname || ''
  nicknameEditing.value = true
}

async function saveNickname() {
  if (!nicknameValue.value.trim()) {
    message.warning('昵称不能为空')
    return
  }
  nicknameSaving.value = true
  try {
    const res = await updateProfile({ nickname: nicknameValue.value.trim() })
    if (res.data?.code === 0) {
      if (userInfo.value) {
        userInfo.value = { ...userInfo.value, nickname: nicknameValue.value.trim() }
      }
      if (userStore.loginUser) {
        userStore.loginUser = { ...userStore.loginUser, nickname: nicknameValue.value.trim() }
      }
      message.success('昵称更新成功')
      nicknameEditing.value = false
    } else {
      message.error(res.data?.message || '更新失败')
    }
  } catch {
    message.error('更新失败')
  } finally {
    nicknameSaving.value = false
  }
}

function cancelEditNickname() {
  nicknameEditing.value = false
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

function getAvatarUrl() {
  return userInfo.value?.avatar || userStore.loginUser?.avatar || userStore.avatar
}

onMounted(() => {
  loadData()
  loadCreditTransactions()
})
</script>

<template>
  <div class="profile-page">
    <a-spin :spinning="loading">
      <!-- 合并的用户信息卡片 -->
      <div class="profile-header-card">
        <div class="avatar-section" @click="triggerAvatarUpload">
          <div class="avatar-wrapper">
            <a-avatar :size="72" :src="getAvatarUrl()" class="profile-avatar">
              <template #icon><UserOutlined /></template>
            </a-avatar>
            <div class="avatar-overlay" :class="{ uploading: avatarUploading }">
              <a-spin v-if="avatarUploading" :size="16" />
              <template v-else>
                <CameraOutlined class="overlay-icon" />
              </template>
            </div>
          </div>
        </div>

        <div class="profile-info">
          <div class="nickname-row">
            <template v-if="nicknameEditing">
              <a-input
                v-model:value="nicknameValue"
                :maxlength="32"
                style="max-width: 180px"
                size="small"
                @press-enter="saveNickname"
              />
              <a-button type="link" size="small" :loading="nicknameSaving" @click="saveNickname">保存</a-button>
              <a-button type="link" size="small" @click="cancelEditNickname">取消</a-button>
            </template>
            <template v-else>
              <span class="nickname">{{ userInfo?.nickname || userStore.loginUser?.username || '未设置昵称' }}</span>
              <EditOutlined class="edit-icon" @click="startEditNickname" />
            </template>
          </div>
          <div class="info-row">
            <MailOutlined class="info-icon" />
            <span>{{ userStore.loginUser?.email || '-' }}</span>
          </div>
          <div class="info-row">
            <CrownOutlined class="info-icon" />
            <a-space v-if="userStore.roles.length" :size="4">
              <a-tag v-for="role in userStore.roles" :key="role" color="purple" size="small">{{ role }}</a-tag>
            </a-space>
            <span v-else>暂无角色</span>
          </div>
        </div>

        <!-- 码点信息 -->
        <div class="credits-section">
          <div class="credits-card">
            <GiftOutlined class="credits-icon" />
            <div class="credits-info">
              <span class="credits-value">{{ userInfo?.remainingCredits ?? 0 }}</span>
              <span class="credits-label">剩余码点</span>
            </div>
          </div>
        </div>

        <!-- 账户 & 邀请信息 -->
        <div class="extra-info">
          <div class="extra-item">
            <span class="extra-label">累计码点</span>
            <span class="extra-value">{{ userInfo?.totalCredits ?? 0 }}</span>
          </div>
          <div class="extra-item">
            <span class="extra-label">注册时间</span>
            <span class="extra-value">{{ formatDate(userInfo?.createTime).split(' ')[0] }}</span>
          </div>
          <div class="extra-item">
            <span class="extra-label">邀请人</span>
            <span class="extra-value">{{ inviter?.inviterId ? `用户 ${inviter.inviterId}` : '无' }}</span>
          </div>
        </div>
      </div>

      <!-- 码点流水 -->
      <div class="credit-section">
        <h3 class="section-title">
          <ClockCircleOutlined /> 码点流水
        </h3>
        <div class="credit-table-wrapper">
          <a-table
            :data-source="creditTransactions"
            :loading="creditLoading"
            :pagination="false"
            size="small"
            row-key="id"
            class="credit-table"
          >
            <a-table-column title="类型" data-index="type" width="90">
              <template #default="{ record }">
                <a-tag :color="record.type === 'consume' ? 'red' : record.type === 'recharge' ? 'green' : 'blue'" size="small">
                  {{ transactionTypeMap[record.type] || record.type }}
                </a-tag>
              </template>
            </a-table-column>
            <a-table-column title="变动" data-index="amount" width="70">
              <template #default="{ record }">
                <span :style="{ color: record.amount > 0 ? '#52c41a' : '#ff4d4f', fontWeight: 600 }">
                  {{ record.amount > 0 ? '+' : '' }}{{ record.amount }}
                </span>
              </template>
            </a-table-column>
            <a-table-column title="余额" data-index="balanceAfter" width="70" />
            <a-table-column title="描述" data-index="description" ellipsis />
            <a-table-column title="时间" width="140">
              <template #default="{ record }">{{ formatDate(record.createTime).split(' ')[0] + ' ' + formatDate(record.createTime).split(' ')[1]?.slice(0,5) }}</template>
            </a-table-column>
          </a-table>
        </div>
      </div>
    </a-spin>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px - 48px);
  overflow: hidden;
}

/* 让 a-spin 内部容器也传递 flex 布局 */
.profile-page :deep(.ant-spin-nested-loading) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.profile-page :deep(.ant-spin-container) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Profile Header Card */
.profile-header-card {
  display: flex;
  align-items: center;
  gap: 24px;
  background: var(--bg-surface);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  padding: 24px 28px;
  flex-shrink: 0;
}

.avatar-section {
  cursor: pointer;
  flex-shrink: 0;
}

.avatar-wrapper {
  position: relative;
  border-radius: 50%;
  overflow: hidden;
}

.profile-avatar {
  border: 3px solid var(--glass-border);
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  border-radius: 50%;
}

.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.avatar-overlay.uploading {
  opacity: 1;
  background: rgba(0, 0, 0, 0.6);
}

.overlay-icon {
  color: white;
  font-size: 18px;
}

/* Profile Info */
.profile-info {
  flex: 1;
  min-width: 0;
}

.nickname-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.nickname {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.edit-icon {
  color: var(--text-muted);
  cursor: pointer;
  font-size: 13px;
}

.edit-icon:hover {
  color: var(--accent);
}

.info-row {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 13px;
  margin-bottom: 3px;
}

.info-icon {
  color: var(--text-muted);
  font-size: 13px;
}

/* Credits Section */
.credits-section {
  flex-shrink: 0;
}

.credits-card {
  background: var(--bg-elevated);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: 16px 22px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.credits-icon {
  font-size: 24px;
  color: var(--accent);
}

.credits-info {
  display: flex;
  flex-direction: column;
}

.credits-value {
  font-size: 24px;
  font-weight: 800;
  color: var(--accent);
  line-height: 1.2;
}

.credits-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* Extra Info */
.extra-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 24px;
  border-left: 1px solid var(--glass-border);
  flex-shrink: 0;
}

.extra-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.extra-label {
  color: var(--text-muted);
  white-space: nowrap;
}

.extra-value {
  color: var(--text-primary);
  font-weight: 500;
}

/* Credit Section */
.credit-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-top: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.credit-table-wrapper {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
}

.credit-table-wrapper :deep(.ant-table) {
  background: transparent;
}

.credit-table-wrapper :deep(.ant-table-thead > tr > th) {
  background: var(--bg-elevated) !important;
  font-size: 12px;
  padding: 8px 12px !important;
}

.credit-table-wrapper :deep(.ant-table-tbody > tr > td) {
  padding: 6px 12px !important;
  font-size: 13px;
}

/* Responsive */
@media (max-width: 768px) {
  .profile-header-card {
    flex-direction: column;
    text-align: center;
    gap: 16px;
    padding: 20px;
  }

  .profile-info {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .nickname-row {
    justify-content: center;
  }

  .info-row {
    justify-content: center;
  }

  .extra-info {
    border-left: none;
    border-top: 1px solid var(--glass-border);
    padding-left: 0;
    padding-top: 12px;
    align-items: center;
  }

  .profile-page {
    height: auto;
    overflow: auto;
  }
}
</style>
