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
} from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/userStore'
import { getUserInfo, getMyCreditTransactions, uploadAvatar, updateProfile } from '@/api/userController'
import { getMyInviter } from '@/api/inviteController'
import { parseResponseData } from '@/utils/response'

const userStore = useUserStore()
const userInfo = ref<API.UserInfo | null>(null)
const inviter = ref<API.UserInfo | null>(null)
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
        // 同步更新 userStore
        if (userStore.loginUser) {
          userStore.loginUser = { ...userStore.loginUser, avatar: url }
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
      // 同步更新 userStore
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
  return userInfo.value?.avatar || userStore.loginUser?.avatar
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
      <!-- Profile Header Card -->
      <div class="profile-header-card">
        <div class="avatar-section" @click="triggerAvatarUpload">
          <div class="avatar-wrapper">
            <a-avatar :size="96" :src="getAvatarUrl()" class="profile-avatar">
              <template #icon><UserOutlined /></template>
            </a-avatar>
            <div class="avatar-overlay" :class="{ uploading: avatarUploading }">
              <a-spin v-if="avatarUploading" :size="20" />
              <template v-else>
                <CameraOutlined class="overlay-icon" />
                <span class="overlay-text">更换头像</span>
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
                style="max-width: 200px"
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
            <a-space v-if="userStore.roles.length">
              <a-tag v-for="role in userStore.roles" :key="role" color="purple" size="small">{{ role }}</a-tag>
            </a-space>
            <span v-else>暂无角色</span>
          </div>
        </div>
        <div class="credits-section">
          <div class="credits-card">
            <GiftOutlined class="credits-icon" />
            <div class="credits-info">
              <span class="credits-value">{{ userInfo?.remainingCredits ?? 0 }}</span>
              <span class="credits-label">剩余码点</span>
            </div>
          </div>
        </div>
      </div>

      <a-row :gutter="24" style="margin-top: 24px">
        <a-col :xs="24" :md="12">
          <a-card title="邀请信息" class="profile-card">
            <a-descriptions :column="1" bordered size="small">
              <a-descriptions-item label="邀请人">
                {{ inviter?.userId || '无' }}
              </a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>

        <a-col :xs="24" :md="12">
          <a-card title="账户信息" class="profile-card">
            <a-descriptions :column="1" bordered size="small">
              <a-descriptions-item label="累计码点">
                {{ userInfo?.totalCredits ?? 0 }}
              </a-descriptions-item>
              <a-descriptions-item label="注册时间">
                {{ formatDate(userInfo?.createTime) }}
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
.profile-page {
  max-width: 1100px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  color: var(--text-primary);
}

/* Profile Header Card */
.profile-header-card {
  display: flex;
  align-items: center;
  gap: 32px;
  background: var(--bg-surface);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  padding: 32px;
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
  flex-direction: column;
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
  font-size: 20px;
  margin-bottom: 4px;
}

.overlay-text {
  color: white;
  font-size: 12px;
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
  margin-bottom: 8px;
}

.nickname {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}

.edit-icon {
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
}

.edit-icon:hover {
  color: var(--accent);
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 4px;
}

.info-icon {
  color: var(--text-muted);
  font-size: 14px;
}

/* Credits Section */
.credits-section {
  flex-shrink: 0;
}

.credits-card {
  background: var(--bg-elevated);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: 20px 28px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.credits-icon {
  font-size: 28px;
  color: var(--accent);
}

.credits-info {
  display: flex;
  flex-direction: column;
}

.credits-value {
  font-size: 28px;
  font-weight: 800;
  color: var(--accent);
  line-height: 1.2;
}

.credits-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 2px;
}

.profile-card {
  margin-bottom: 24px;
}

/* Responsive */
@media (max-width: 768px) {
  .profile-header-card {
    flex-direction: column;
    text-align: center;
    gap: 16px;
    padding: 24px;
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
}
</style>
