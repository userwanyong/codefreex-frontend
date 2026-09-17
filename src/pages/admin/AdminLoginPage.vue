<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { UnlockOutlined, LockOutlined, EditOutlined } from '@ant-design/icons-vue'
import { listLoginMethodConfigs, saveLoginMethodConfig } from '@/api/loginMethodController'
import { parseResponseData } from '@/utils/response'

/** 各登录方式自定义凭证的表单字段（usePlatformConfig=0 时填写，保存后整体替换） */
const CREDENTIAL_FIELDS: Record<string, { key: string; label: string; placeholder?: string; secret?: boolean }[]> = {
  'email:smtp': [
    { key: 'host', label: 'SMTP 服务器', placeholder: 'smtp.example.com' },
    { key: 'port', label: '端口', placeholder: '465' },
    { key: 'username', label: '发件账号', placeholder: 'noreply@example.com' },
    { key: 'password', label: '密码/授权码', secret: true },
    { key: 'encryption', label: '加密方式', placeholder: 'ssl' },
    { key: 'codeTtlMinutes', label: '验证码有效分钟', placeholder: '10' },
  ],
  'email:aliyun': [
    { key: 'accessKeyId', label: 'AccessKeyId' },
    { key: 'accessKeySecret', label: 'AccessKeySecret', secret: true },
    { key: 'accountName', label: '发信地址' },
    { key: 'fromAlias', label: '发件人别名' },
    { key: 'region', label: '区域', placeholder: 'cn-hangzhou' },
    { key: 'codeTtlMinutes', label: '验证码有效分钟', placeholder: '10' },
  ],
  'sms:aliyun': [
    { key: 'accessKeyId', label: 'AccessKeyId' },
    { key: 'accessKeySecret', label: 'AccessKeySecret', secret: true },
    { key: 'signName', label: '短信签名' },
    { key: 'templateCode', label: '模板CODE' },
  ],
  'oauth:gitee': oauthFields('gitee'),
  'oauth:github': oauthFields('github'),
}

function oauthFields(provider: string) {
  return [
    { key: 'clientId', label: 'Client ID' },
    { key: 'clientSecret', label: 'Client Secret', secret: true },
    { key: 'redirectUri', label: '回调地址', placeholder: `http://localhost:18123/api/auth/oauth/${provider}/callback` },
  ]
}

const methods = ref<API.LoginMethodConfigVO[]>([])
const loading = ref(true)
const saving = ref(false)
/** 编辑弹窗状态：editing 为当前编辑项的副本，取消不影响列表 */
const editOpen = ref(false)
const editing = ref<API.LoginMethodConfigVO | null>(null)
/** 各方法的自定义凭证表单值（method -> key -> value） */
const credentialForms = ref<Record<string, Record<string, string>>>({})

async function loadMethods() {
  loading.value = true
  try {
    const res = await listLoginMethodConfigs()
    if (res.data?.code === 0 && res.data.data) {
      methods.value = parseResponseData<API.LoginMethodConfigVO[]>(res.data.data)
      for (const method of methods.value) {
        if (!credentialForms.value[method.method!]) {
          credentialForms.value[method.method!] = {}
        }
      }
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

function isPassword(method: API.LoginMethodConfigVO) {
  return method.method === 'password'
}

function credentialFields(method: API.LoginMethodConfigVO | null) {
  return CREDENTIAL_FIELDS[method?.method || ''] || []
}

function useOwnCredentials(method: API.LoginMethodConfigVO | null) {
  return method?.usePlatformConfig === 0
}

function getCredential(method: string, key: string): string {
  return credentialForms.value[method]?.[key] || ''
}

function setCredential(method: string, key: string, value: string) {
  if (!credentialForms.value[method]) {
    credentialForms.value[method] = {}
  }
  credentialForms.value[method][key] = value
}

/** 编辑弹窗内更新凭证字段（editing 为空时忽略，规避事件回调中的类型收窄丢失） */
function updateEditingCredential(key: string, value: string) {
  const method = editing.value?.method
  if (method) {
    setCredential(method, key, value)
  }
}

function openEdit(method: API.LoginMethodConfigVO) {
  editing.value = { ...method }
  editOpen.value = true
}

function handleEditCancel() {
  editOpen.value = false
  editing.value = null
}

function setEditingEnabled(checked: any) {
  if (editing.value) {
    editing.value.enabled = checked ? 1 : 0
  }
}

function setEditingUsePlatform(value: any) {
  if (editing.value) {
    editing.value.usePlatformConfig = value
  }
}

async function handleEditSave() {
  const method = editing.value
  if (!method) {
    return
  }
  saving.value = true
  try {
    let configJson: string | undefined
    if (useOwnCredentials(method)) {
      const form = credentialForms.value[method.method!] || {}
      const filled: Record<string, string> = {}
      for (const field of credentialFields(method)) {
        const value = (form[field.key] || '').trim()
        if (value) {
          filled[field.key] = value
        }
      }
      if (Object.keys(filled).length === 0 && !method.hasConfig) {
        message.warning('请至少填写一项自定义凭证')
        return
      }
      configJson = Object.keys(filled).length > 0 ? JSON.stringify(filled) : undefined
    }
    const res = await saveLoginMethodConfig({
      method: method.method!,
      enabled: method.enabled || 0,
      usePlatformConfig: method.usePlatformConfig ?? 1,
      configJson,
    })
    if (res.data?.code === 0) {
      message.success(`「${method.displayName}」配置已保存，登录页实时生效`)
      handleEditCancel()
      loadMethods()
    } else {
      message.error(res.data?.message || '保存失败')
    }
  } catch {
    message.error('保存失败')
  } finally {
    saving.value = false
  }
}

const categoryMap: Record<string, string> = {
  password: '账号密码',
  email: '邮箱验证码',
  sms: '短信验证码',
  oauth: '第三方登录',
}

onMounted(() => loadMethods())
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">登录方式</h1>
        <p class="page-desc">开闭与凭证配置实时同步认证服务（auth-service），登录页即时生效</p>
      </div>
    </div>

    <a-alert type="info" show-icon style="margin-bottom: 20px">
      <template #message>
        仅显示平台已开放的登录方式；账号密码由平台锁定恒开启。点击「编辑」可配置启用状态与凭证（凭证默认用平台配置，切换自定义后须填写，保存后整体替换）。
      </template>
    </a-alert>

    <a-spin :spinning="loading">
      <div class="method-list">
        <div v-for="method in methods" :key="method.method" class="method-row">
          <div class="row-main">
            <div class="row-title">
              <span class="method-name">{{ method.displayName || method.method }}</span>
              <a-tag>{{ categoryMap[method.category || ''] || method.category }}</a-tag>
              <a-tag color="cyan" class="method-code">{{ method.method }}</a-tag>
            </div>
            <div class="row-meta">
              <a-tag v-if="isPassword(method)" color="green">
                <LockOutlined /> 平台锁定开启
              </a-tag>
              <a-tag v-else :color="method.enabled === 1 ? 'green' : 'default'">
                {{ method.enabled === 1 ? '已启用' : '已停用' }}
              </a-tag>
              <span v-if="method.hasConfig" class="meta-ok">
                <UnlockOutlined /> 凭证已配置
              </span>
              <span v-else-if="!isPassword(method)" class="meta-warn">凭证未配置</span>
              <span v-if="method.platformEnabled === false" class="meta-warn">平台未开启</span>
            </div>
          </div>
          <a-button v-if="!isPassword(method)" @click="openEdit(method)">
            <EditOutlined /> 编辑
          </a-button>
        </div>
      </div>
    </a-spin>

    <a-modal
      v-model:open="editOpen"
      :title="`编辑登录方式 - ${editing?.displayName || ''}`"
      :width="640"
      :confirm-loading="saving"
      ok-text="保存"
      cancel-text="取消"
      @ok="handleEditSave"
      @cancel="handleEditCancel"
    >
      <template v-if="editing">
        <div class="edit-section">
          <div class="edit-label">启用状态</div>
          <a-switch
            :checked="editing.enabled === 1"
            checked-children="启用"
            un-checked-children="停用"
            @change="setEditingEnabled"
          />
        </div>

        <div class="edit-section">
          <div class="edit-label">凭证来源</div>
          <a-radio-group
            :value="editing.usePlatformConfig ?? 1"
            @change="(e: any) => setEditingUsePlatform(e.target.value)"
          >
            <a-radio :value="1">使用平台默认凭证</a-radio>
            <a-radio :value="0">使用自定义凭证</a-radio>
          </a-radio-group>
        </div>

        <div v-if="useOwnCredentials(editing)" class="credential-form">
          <div class="credential-tip">
            凭证信息不回显；填写后保存将整体替换本租户凭证（留空字段不保存）
          </div>
          <div class="credential-grid">
            <div v-for="field in credentialFields(editing)" :key="field.key" class="credential-item">
              <label class="credential-label">{{ field.label }}</label>
              <a-input-password
                v-if="field.secret"
                :value="getCredential(editing.method!, field.key)"
                @update:value="(v: string) => updateEditingCredential(field.key, v)"
                :placeholder="field.placeholder || '不回显，留空不修改'"
              />
              <a-input
                v-else
                :value="getCredential(editing.method!, field.key)"
                @update:value="(v: string) => updateEditingCredential(field.key, v)"
                :placeholder="field.placeholder || ''"
              />
            </div>
          </div>
        </div>

        <a-alert
          v-if="editing.category === 'email'"
          type="warning"
          show-icon
          class="edit-tip"
          message="同类邮箱方式互斥：同一时间只能启用一种邮箱验证方式，启用前请先停用另一种。"
        />
        <div class="edit-tip-text">保存后实时同步认证服务，登录页立即生效。</div>
      </template>
    </a-modal>
  </div>
</template>

<style scoped>
.admin-page {
  padding-top: 4px;
}

.page-header {
  margin-bottom: 20px;
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

.method-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.method-row {
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 10px;
  padding: 14px 20px;
  background: var(--bg-card, transparent);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.row-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.row-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.method-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.method-code {
  font-family: var(--font-mono);
  font-size: 12px;
}

.row-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  flex-wrap: wrap;
}

.meta-ok {
  color: #52c41a;
}

.meta-warn {
  color: #faad14;
}

.edit-section {
  margin-bottom: 16px;
}

.edit-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.credential-form {
  border-top: 1px dashed var(--border-color, #e5e7eb);
  padding-top: 12px;
  margin-bottom: 16px;
}

.credential-tip {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.credential-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.credential-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.credential-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.edit-tip {
  margin-bottom: 12px;
}

.edit-tip-text {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
