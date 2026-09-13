<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  UserOutlined, EditOutlined, CameraOutlined, MailOutlined, CrownOutlined,
  GiftOutlined, ClockCircleOutlined, KeyOutlined, LinkOutlined, IdcardOutlined,
  MobileOutlined, GithubOutlined, SafetyOutlined,
} from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/userStore'
import {
  getUserInfo, getMyCreditTransactions, uploadAvatar, updateProfile,
  changePassword, getAccountBindings, sendEmailBindCode, bindEmail, unbindEmail,
  sendPhoneBindCode, bindPhone, unbindPhone, getOAuthBindUrl, unbindOAuth,
} from '@/api/userController'
import { getMyInviter } from '@/api/inviteController'
import { parseResponseData } from '@/utils/response'
import { formatDateTime } from '@/utils/datetime'

/** 第三方/验证码自动注册账号的初始密码（与后端常量一致） */
const AUTO_PASSWORD = '123456'

const userStore = useUserStore()
const userInfo = ref<API.UserInfo | null>(null)
const bindings = ref<API.AccountBindings | null>(null)
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

/** 是否为第三方登录创建的账号 */
const isThirdPartyAccount = computed(() => {
  const username = userInfo.value?.username || userStore.loginUser?.username || ''
  return username.startsWith('gitee_') || username.startsWith('github_')
})

/** 已绑定的第三方平台集合 */
const boundProviders = computed(() => new Set(bindings.value?.oauthBindings?.map((b) => b.provider) || []))

/** 可绑定的第三方平台（与登录方式注册表一致） */
const OAUTH_PROVIDERS = [
  { provider: 'gitee', name: 'Gitee' },
  { provider: 'github', name: 'GitHub' },
]

async function loadData() {
  loading.value = true
  try {
    const [infoRes, bindRes, inviterRes] = await Promise.all([getUserInfo(), getAccountBindings(), getMyInviter()])
    if (infoRes.data?.code === 0 && infoRes.data.data) {
      userInfo.value = parseResponseData<API.UserInfo>(infoRes.data.data)
    }
    if (bindRes.data?.code === 0 && bindRes.data.data) {
      bindings.value = parseResponseData<API.AccountBindings>(bindRes.data.data)
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

// === 资料编辑 ===

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
        if (userStore.loginUser) {
          userStore.loginUser = { ...userStore.loginUser, avatar: url }
        }
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

// === 修改密码 ===

const pwdVisible = ref(false)
const pwdLoading = ref(false)
const pwdForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })

function openPwdModal() {
  pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  pwdVisible.value = true
}

async function handleChangePassword() {
  const form = pwdForm.value
  if (!form.oldPassword || !form.newPassword) {
    message.warning('请填写旧密码与新密码')
    return
  }
  if (form.newPassword.length < 6) {
    message.warning('新密码长度至少 6 位')
    return
  }
  if (form.newPassword !== form.confirmPassword) {
    message.warning('两次输入的新密码不一致')
    return
  }
  pwdLoading.value = true
  try {
    const res = await changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword })
    if (res.data?.code === 0) {
      message.success('密码修改成功，下次登录请使用新密码')
      pwdVisible.value = false
    } else {
      message.error(res.data?.message || '密码修改失败')
    }
  } catch {
    message.error('密码修改失败')
  } finally {
    pwdLoading.value = false
  }
}

// === 邮箱绑定 ===

const emailBindMode = ref<'idle' | 'binding'>('idle')
const emailBindTarget = ref('')
const emailBindCode = ref('')
const emailCodeSending = ref(false)
const emailCodeCountdown = ref(0)
const emailBindLoading = ref(false)

function startEmailBind() {
  emailBindMode.value = 'binding'
  emailBindTarget.value = bindings.value?.email || ''
  emailBindCode.value = ''
}

async function sendEmailCode() {
  if (!emailBindTarget.value.trim()) {
    message.warning('请先填写邮箱地址')
    return
  }
  emailCodeSending.value = true
  try {
    const res = await sendEmailBindCode(emailBindTarget.value.trim())
    if (res.data?.code === 0) {
      message.success('验证码已发送，请查收邮箱')
      emailCodeCountdown.value = 60
      const timer = setInterval(() => {
        emailCodeCountdown.value--
        if (emailCodeCountdown.value <= 0) clearInterval(timer)
      }, 1000)
    } else {
      message.error(res.data?.message || '验证码发送失败')
    }
  } catch {
    message.error('验证码发送失败')
  } finally {
    emailCodeSending.value = false
  }
}

async function handleBindEmail() {
  if (!emailBindTarget.value.trim() || !emailBindCode.value.trim()) {
    message.warning('请填写邮箱地址与验证码')
    return
  }
  emailBindLoading.value = true
  try {
    const res = await bindEmail(emailBindTarget.value.trim(), emailBindCode.value.trim())
    if (res.data?.code === 0) {
      message.success('邮箱绑定成功')
      emailBindMode.value = 'idle'
      loadData()
    } else {
      message.error(res.data?.message || '绑定失败')
    }
  } catch {
    message.error('绑定失败')
  } finally {
    emailBindLoading.value = false
  }
}

function confirmUnbindEmail() {
  Modal.confirm({
    title: '解绑邮箱',
    content: '解绑后将无法通过邮箱接收通知与验证码，确定解绑吗？',
    okText: '解绑',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        const res = await unbindEmail()
        if (res.data?.code === 0) {
          message.success('邮箱已解绑')
          loadData()
        } else {
          message.error(res.data?.message || '解绑失败')
        }
      } catch {
        message.error('解绑失败')
      }
    },
  })
}

// === 手机绑定 ===

const phoneBindMode = ref<'idle' | 'binding'>('idle')
const phoneBindTarget = ref('')
const phoneBindCode = ref('')
const phoneCodeSending = ref(false)
const phoneCodeCountdown = ref(0)
const phoneBindLoading = ref(false)

function startPhoneBind() {
  phoneBindMode.value = 'binding'
  phoneBindTarget.value = bindings.value?.phone || ''
  phoneBindCode.value = ''
}

async function sendPhoneCode() {
  if (!/^1[3-9]\d{9}$/.test(phoneBindTarget.value.trim())) {
    message.warning('请填写正确的手机号')
    return
  }
  phoneCodeSending.value = true
  try {
    const res = await sendPhoneBindCode(phoneBindTarget.value.trim())
    if (res.data?.code === 0) {
      message.success('验证码已发送')
      phoneCodeCountdown.value = 60
      const timer = setInterval(() => {
        phoneCodeCountdown.value--
        if (phoneCodeCountdown.value <= 0) clearInterval(timer)
      }, 1000)
    } else {
      message.error(res.data?.message || '验证码发送失败')
    }
  } catch {
    message.error('验证码发送失败')
  } finally {
    phoneCodeSending.value = false
  }
}

async function handleBindPhone() {
  if (!phoneBindTarget.value.trim() || !phoneBindCode.value.trim()) {
    message.warning('请填写手机号与验证码')
    return
  }
  phoneBindLoading.value = true
  try {
    const res = await bindPhone(phoneBindTarget.value.trim(), phoneBindCode.value.trim())
    if (res.data?.code === 0) {
      message.success('手机号绑定成功')
      phoneBindMode.value = 'idle'
      loadData()
    } else {
      message.error(res.data?.message || '绑定失败')
    }
  } catch {
    message.error('绑定失败')
  } finally {
    phoneBindLoading.value = false
  }
}

function confirmUnbindPhone() {
  Modal.confirm({
    title: '解绑手机号',
    content: '解绑后将无法通过手机号接收验证码，确定解绑吗？',
    okText: '解绑',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        const res = await unbindPhone()
        if (res.data?.code === 0) {
          message.success('手机号已解绑')
          loadData()
        } else {
          message.error(res.data?.message || '解绑失败')
        }
      } catch {
        message.error('解绑失败')
      }
    },
  })
}

// === 第三方绑定 ===

async function handleOAuthBind(provider: string, name: string) {
  try {
    const res = await getOAuthBindUrl(provider)
    if (res.data?.code === 0 && res.data.data) {
      const url = typeof res.data.data === 'string' ? res.data.data : String(res.data.data)
      if (url) {
        window.location.href = url
        return
      }
    }
    message.error(res.data?.message || `获取${name}绑定授权地址失败`)
  } catch {
    message.error(`获取${name}绑定授权地址失败`)
  }
}

function confirmOAuthUnbind(provider: string, name: string) {
  Modal.confirm({
    title: `解绑${name}`,
    content: `解绑后将无法使用${name}账号快捷登录，确定解绑吗？`,
    okText: '解绑',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        const res = await unbindOAuth(provider)
        if (res.data?.code === 0) {
          message.success(`${name}已解绑`)
          loadData()
        } else {
          message.error(res.data?.message || '解绑失败')
        }
      } catch {
        message.error('解绑失败')
      }
    },
  })
}

/** OAuth 绑定回调落地：#bind=success|failed&message=.. */
function handleBindHash() {
  const hash = window.location.hash
  if (!hash.startsWith('#bind=')) {
    return
  }
  const params = new URLSearchParams(hash.substring('#bind='.length))
  window.location.hash = ''
  if (params.get('bind') === 'success') {
    message.success('第三方账号绑定成功')
  } else {
    message.error(decodeURIComponent(params.get('message') || '绑定失败'))
  }
  loadData()
}

function formatDate(dateStr?: string) {
  return formatDateTime(dateStr)
}

function getAvatarUrl() {
  return userInfo.value?.avatar || userStore.loginUser?.avatar || userStore.avatar
}

onMounted(() => {
  handleBindHash()
  loadData()
  loadCreditTransactions()
})
</script>

<template>
  <div class="profile-page">
    <a-spin :spinning="loading">
      <!-- 用户信息卡片 -->
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
            <IdcardOutlined class="info-icon" />
            <span class="account-text">账号：{{ userInfo?.username || userStore.loginUser?.username || '-' }}</span>
            <a-tag v-if="isThirdPartyAccount" color="blue" class="third-party-tag">第三方登录</a-tag>
          </div>
          <div class="info-row">
            <MailOutlined class="info-icon" />
            <span>{{ userInfo?.email || userStore.loginUser?.email || '未绑定邮箱' }}</span>
          </div>
          <div class="info-row">
            <CrownOutlined class="info-icon" />
            <a-space v-if="userStore.roles.length" :size="4">
              <a-tag v-for="role in userStore.roles" :key="role" color="purple">{{ role }}</a-tag>
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
            <span class="extra-value">{{ formatDate(userInfo?.createTime) }}</span>
          </div>
          <div class="extra-item">
            <span class="extra-label">邀请人</span>
            <span class="extra-value">{{ userInfo?.inviterId || inviter?.inviterId ? `用户 ${userInfo?.inviterId || inviter?.inviterId}` : '无' }}</span>
          </div>
        </div>
      </div>

      <!-- 第三方账号默认密码提示 -->
      <a-alert v-if="isThirdPartyAccount" type="warning" show-icon class="default-password-alert">
        <template #message>
          当前账号由第三方登录创建，初始密码为 <b>{{ AUTO_PASSWORD }}</b>，可直接使用账号 +
          该密码登录，建议尽快修改密码。
        </template>
      </a-alert>

      <!-- 账号绑定 -->
      <div class="section-card">
        <h3 class="section-title">
          <LinkOutlined /> 账号绑定
        </h3>

        <div class="bind-row">
          <div class="bind-item">
            <div class="bind-icon"><MailOutlined /></div>
            <div class="bind-body">
              <div class="bind-name">邮箱</div>
              <div class="bind-desc">
                <template v-if="bindings?.email">
                  {{ bindings.email }}
                  <a-tag v-if="bindings.emailVerified" color="green" style="margin-left: 6px">已验证</a-tag>
                </template>
                <span v-else>未绑定</span>
              </div>
            </div>
            <div class="bind-actions">
              <template v-if="emailBindMode === 'binding'">
                <a-input v-model:value="emailBindTarget" placeholder="邮箱地址" size="small" style="width: 200px" />
                <a-button size="small" :loading="emailCodeSending" :disabled="emailCodeCountdown > 0" @click="sendEmailCode">
                  {{ emailCodeCountdown > 0 ? `${emailCodeCountdown}s` : '发验证码' }}
                </a-button>
                <a-input v-model:value="emailBindCode" placeholder="验证码" size="small" style="width: 100px" :maxlength="6" />
                <a-button size="small" type="primary" :loading="emailBindLoading" @click="handleBindEmail">绑定</a-button>
                <a-button size="small" @click="emailBindMode = 'idle'">取消</a-button>
              </template>
              <template v-else>
                <a-button v-if="bindings?.emailBindable" size="small" @click="startEmailBind">
                  {{ bindings?.email ? '换绑' : '绑定' }}
                </a-button>
                <a-button v-if="bindings?.email" size="small" danger @click="confirmUnbindEmail">解绑</a-button>
                <a-tooltip v-if="!bindings?.emailBindable" title="邮箱验证码服务未启用，请联系管理员">
                  <a-button size="small" disabled>绑定</a-button>
                </a-tooltip>
              </template>
            </div>
          </div>

          <div class="bind-item">
            <div class="bind-icon"><MobileOutlined /></div>
            <div class="bind-body">
              <div class="bind-name">手机号</div>
              <div class="bind-desc">
                <template v-if="bindings?.phone">
                  {{ bindings.phone }}
                  <a-tag v-if="bindings.phoneVerified" color="green" style="margin-left: 6px">已验证</a-tag>
                </template>
                <span v-else>未绑定</span>
              </div>
            </div>
            <div class="bind-actions">
              <template v-if="phoneBindMode === 'binding'">
                <a-input v-model:value="phoneBindTarget" placeholder="手机号" size="small" style="width: 160px" :maxlength="11" />
                <a-button size="small" :loading="phoneCodeSending" :disabled="phoneCodeCountdown > 0" @click="sendPhoneCode">
                  {{ phoneCodeCountdown > 0 ? `${phoneCodeCountdown}s` : '发验证码' }}
                </a-button>
                <a-input v-model:value="phoneBindCode" placeholder="验证码" size="small" style="width: 100px" :maxlength="6" />
                <a-button size="small" type="primary" :loading="phoneBindLoading" @click="handleBindPhone">绑定</a-button>
                <a-button size="small" @click="phoneBindMode = 'idle'">取消</a-button>
              </template>
              <template v-else>
                <a-button v-if="bindings?.phoneBindable" size="small" @click="startPhoneBind">
                  {{ bindings?.phone ? '换绑' : '绑定' }}
                </a-button>
                <a-button v-if="bindings?.phone" size="small" danger @click="confirmUnbindPhone">解绑</a-button>
                <a-tooltip v-if="!bindings?.phoneBindable" title="短信验证码服务未启用，请联系管理员">
                  <a-button size="small" disabled>绑定</a-button>
                </a-tooltip>
              </template>
            </div>
          </div>

          <div v-for="p in OAUTH_PROVIDERS" :key="p.provider" class="bind-item">
            <div class="bind-icon"><GithubOutlined /></div>
            <div class="bind-body">
              <div class="bind-name">{{ p.name }}</div>
              <div class="bind-desc">
                <template v-if="boundProviders.has(p.provider)">已绑定</template>
                <span v-else>未绑定</span>
              </div>
            </div>
            <div class="bind-actions">
              <a-button v-if="!boundProviders.has(p.provider)" size="small" @click="handleOAuthBind(p.provider, p.name)">
                绑定
              </a-button>
              <a-button v-else size="small" danger @click="confirmOAuthUnbind(p.provider, p.name)">解绑</a-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 账号安全 -->
      <div class="section-card">
        <h3 class="section-title">
          <SafetyOutlined /> 账号安全
        </h3>
        <div class="security-row">
          <div class="bind-body">
            <div class="bind-name">登录密码</div>
            <div class="bind-desc">{{ isThirdPartyAccount ? `第三方登录账号初始密码为 ${AUTO_PASSWORD}，建议修改` : '定期修改密码可提升账号安全性' }}</div>
          </div>
          <a-button type="primary" size="small" @click="openPwdModal">
            <template #icon><KeyOutlined /></template>
            修改密码
          </a-button>
        </div>
      </div>

      <!-- 码点流水 -->
      <div class="section-card">
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
                <a-tag :color="record.type === 'consume' ? 'red' : record.type === 'recharge' ? 'green' : 'blue'">
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
            <a-table-column title="时间" width="160">
              <template #default="{ record }">{{ formatDate(record.createTime) }}</template>
            </a-table-column>
          </a-table>
        </div>
      </div>

      <!-- 修改密码弹窗 -->
      <a-modal
        v-model:open="pwdVisible"
        title="修改密码"
        :confirm-loading="pwdLoading"
        ok-text="确认修改"
        cancel-text="取消"
        @ok="handleChangePassword"
      >
        <a-form :label-col="{ span: 5 }">
          <a-form-item label="旧密码" required>
            <a-input-password v-model:value="pwdForm.oldPassword" placeholder="当前密码（第三方账号初始密码为默认密码）" />
          </a-form-item>
          <a-form-item label="新密码" required>
            <a-input-password v-model:value="pwdForm.newPassword" placeholder="6-50 位" />
          </a-form-item>
          <a-form-item label="确认新密码" required>
            <a-input-password v-model:value="pwdForm.confirmPassword" placeholder="再次输入新密码" />
          </a-form-item>
        </a-form>
      </a-modal>
    </a-spin>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 24px;
}

/* 卡片实际位于 a-spin 的内层容器中，需让该容器也成为纵向 flex 布局，卡片间才有间距 */
.profile-page :deep(.ant-spin-nested-loading),
.profile-page :deep(.ant-spin-container) {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.account-text {
  font-family: var(--font-mono);
}

.third-party-tag {
  margin-left: 4px;
}

.default-password-alert {
  border-radius: var(--radius-lg);
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

/* Section Card */
.section-card {
  background: var(--bg-surface);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  padding: 18px 24px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Bind rows */
.bind-row {
  display: flex;
  flex-direction: column;
}

.bind-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px solid var(--glass-border);
}

.bind-item:last-child {
  border-bottom: none;
}

.bind-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--accent);
  flex-shrink: 0;
}

.bind-body {
  flex: 1;
  min-width: 0;
}

.bind-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.bind-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.bind-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.security-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

/* Credit table */
.credit-table-wrapper {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  overflow: hidden;
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

  .bind-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .bind-actions {
    justify-content: flex-start;
  }
}
</style>
