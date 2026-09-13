<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { Component } from 'vue'
import { message } from 'ant-design-vue'
import { RobotOutlined, DollarOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { adminListSystemConfigs, adminUpdateSystemConfigs } from '@/api/systemConfigController'
import { parseResponseData } from '@/utils/response'

const loading = ref(false)
const savingGroup = ref<string | null>(null)
const groups = ref<API.SystemConfigGroup[]>([])
// 配置键 -> 编辑中的值（统一以字符串承载，提交时按后端类型校验）
const formValues = reactive<Record<string, string>>({})

const groupIconMap: Record<string, Component> = {
  ai: RobotOutlined,
  credit: DollarOutlined,
}

const groupIcons = computed(() => {
  return (group?: string) => groupIconMap[group || ''] || RobotOutlined
})

async function loadConfigs() {
  loading.value = true
  try {
    const res = await adminListSystemConfigs()
    if (res.data?.code === 0 && res.data.data) {
      const data = parseResponseData<API.SystemConfigGroup[]>(res.data.data)
      groups.value = data || []
      for (const group of groups.value) {
        for (const item of group.items || []) {
          if (item.key) {
            formValues[item.key] = item.value ?? ''
          }
        }
      }
    } else {
      message.error(res.data?.message || '加载系统配置失败')
    }
  } catch {
    message.error('加载系统配置失败')
  } finally {
    loading.value = false
  }
}

function hasChanged(group: API.SystemConfigGroup) {
  return (group.items || []).some((item) => item.key && formValues[item.key] !== (item.value ?? ''))
}

async function handleSaveGroup(group: API.SystemConfigGroup) {
  const configs: Record<string, string> = {}
  for (const item of group.items || []) {
    if (!item.key) continue
    const value = (formValues[item.key] ?? '').trim()
    if (item.valueType !== 'STRING' && value === '') {
      message.warning(`请填写「${item.label}」`)
      return
    }
    configs[item.key] = value
  }
  savingGroup.value = group.group || null
  try {
    const res = await adminUpdateSystemConfigs(configs)
    if (res.data?.code === 0) {
      message.success(`「${group.groupName}」已保存，即时生效`)
      await loadConfigs()
    } else {
      message.error(res.data?.message || '保存失败')
    }
  } catch {
    message.error('保存失败')
  } finally {
    savingGroup.value = null
  }
}

function resetGroup(group: API.SystemConfigGroup) {
  for (const item of group.items || []) {
    if (item.key) {
      formValues[item.key] = item.value ?? ''
    }
  }
}

function numberValue(key: string) {
  const raw = formValues[key]
  if (raw === undefined || raw === null || raw === '') return undefined
  const num = Number(raw)
  return Number.isNaN(num) ? undefined : num
}

function onNumberChange(key: string, value: number | null | undefined) {
  formValues[key] = value === null || value === undefined ? '' : String(value)
}

onMounted(() => loadConfigs())
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">系统配置</h1>
        <p class="page-desc">AI 服务商密钥、码点计费等运行时配置，保存后立即生效（无需重启）</p>
      </div>
      <a-button :loading="loading" @click="loadConfigs">
        <ReloadOutlined /> 刷新
      </a-button>
    </div>

    <a-spin :spinning="loading">
      <div class="config-groups">
        <div v-for="group in groups" :key="group.group" class="config-group-card">
          <div class="group-header">
            <div class="group-title">
              <component :is="groupIcons(group.group)" class="group-icon" />
              <span>{{ group.groupName }}</span>
            </div>
            <a-space>
              <a-button size="small" v-if="hasChanged(group)" @click="resetGroup(group)">重置</a-button>
              <a-button
                size="small"
                type="primary"
                :disabled="!hasChanged(group)"
                :loading="savingGroup === group.group"
                @click="handleSaveGroup(group)"
              >
                <SaveOutlined /> 保存
              </a-button>
            </a-space>
          </div>

          <div class="config-items">
            <div v-for="item in group.items" :key="item.key" class="config-item">
              <div class="item-meta">
                <div class="item-label">
                  {{ item.label }}
                  <a-tag v-if="item.sensitive" color="orange" class="sensitive-tag">敏感</a-tag>
                </div>
                <div v-if="item.description" class="item-desc">{{ item.description }}</div>
                <div class="item-key">{{ item.key }}</div>
              </div>
              <div class="item-control">
                <a-switch
                  v-if="item.valueType === 'BOOLEAN'"
                  :checked="formValues[item.key!] === 'true'"
                  @update:checked="(checked: boolean) => (formValues[item.key!] = String(checked))"
                />
                <a-input-number
                  v-else-if="item.valueType === 'INT' || item.valueType === 'DOUBLE'"
                  class="number-input"
                  :value="numberValue(item.key!)"
                  :min="0"
                  :precision="item.valueType === 'INT' ? 0 : undefined"
                  :step="item.valueType === 'DOUBLE' ? 0.1 : 1"
                  :placeholder="`默认 ${item.defaultValue || 0}`"
                  @update:value="(v: number | null | undefined) => onNumberChange(item.key!, v)"
                />
                <a-input-password
                  v-else-if="item.sensitive"
                  v-model:value="formValues[item.key!]"
                  :placeholder="item.value ? '已配置，输入新值以更换' : '未配置'"
                  allow-clear
                />
                <a-input
                  v-else
                  v-model:value="formValues[item.key!]"
                  :placeholder="item.defaultValue ? `默认 ${item.defaultValue}` : '请输入'"
                  allow-clear
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-spin>
  </div>
</template>

<style scoped>
.admin-page {
  padding-top: 4px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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

.config-groups {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.config-group-card {
  background: var(--bg-surface);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  padding: 20px 24px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.group-icon {
  font-size: 18px;
  color: var(--accent);
}

.config-items {
  display: flex;
  flex-direction: column;
}

.config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 14px 0;
  border-bottom: 1px solid var(--glass-border);
}

.config-item:last-child {
  border-bottom: none;
}

.item-meta {
  flex: 1;
  min-width: 0;
}

.item-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.sensitive-tag {
  font-size: 11px;
  line-height: 16px;
  padding: 0 4px;
}

.item-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.item-key {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  margin-top: 2px;
}

.item-control {
  width: 320px;
  flex-shrink: 0;
}

.number-input {
  width: 100%;
}

@media (max-width: 768px) {
  .config-item {
    flex-direction: column;
    align-items: stretch;
  }

  .item-control {
    width: 100%;
  }
}
</style>
