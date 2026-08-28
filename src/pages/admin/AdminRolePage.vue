<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, EditOutlined, DeleteOutlined, SafetyOutlined } from '@ant-design/icons-vue'
import { listRoles, createRole, updateRole, deleteRole, assignRolePermissions } from '@/api/roleController'
import { listPermissions } from '@/api/permissionController'
import { parseResponseData } from '@/utils/response'

const roles = ref<API.RoleVO[]>([])
const permissions = ref<API.PermissionVO[]>([])
const loading = ref(true)

async function loadRoles() {
  loading.value = true
  try {
    const res = await listRoles()
    if (res.data?.code === 0 && res.data.data) {
      roles.value = parseResponseData<API.RoleVO[]>(res.data.data)
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

async function loadPermissions() {
  try {
    const res = await listPermissions()
    if (res.data?.code === 0 && res.data.data) {
      permissions.value = parseResponseData<API.PermissionVO[]>(res.data.data)
    }
  } catch {
    // ignore
  }
}

// === 创建/编辑角色 ===
const saveVisible = ref(false)
const saveLoading = ref(false)
const saveIsEdit = ref(false)
const saveForm = ref<API.RoleSaveRequest>({ id: undefined, code: '', name: '', description: '' })

function openCreateModal() {
  saveIsEdit.value = false
  saveForm.value = { id: undefined, code: '', name: '', description: '' }
  saveVisible.value = true
}

function openEditModal(role: API.RoleVO) {
  saveIsEdit.value = true
  saveForm.value = { id: role.id, code: role.code, name: role.name || '', description: role.description || '' }
  saveVisible.value = true
}

async function handleSave() {
  const form = saveForm.value
  if (!form.name) {
    message.warning('请填写角色名称')
    return
  }
  if (!saveIsEdit.value && !form.code) {
    message.warning('请填写角色编码')
    return
  }
  saveLoading.value = true
  try {
    const res = saveIsEdit.value
      ? await updateRole({ id: form.id, name: form.name, description: form.description })
      : await createRole({ code: form.code!, name: form.name, description: form.description })
    if (res.data?.code === 0) {
      message.success(saveIsEdit.value ? '角色已更新' : '角色创建成功')
      saveVisible.value = false
      loadRoles()
    } else {
      message.error(res.data?.message || '保存失败')
    }
  } catch {
    message.error('保存失败')
  } finally {
    saveLoading.value = false
  }
}

function confirmDelete(role: API.RoleVO) {
  Modal.confirm({
    title: '确认删除角色',
    content: `删除角色「${role.name}」后，拥有该角色的用户将失去对应权限。确定删除吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        const res = await deleteRole(role.id!)
        if (res.data?.code === 0) {
          message.success('角色已删除')
          loadRoles()
        } else {
          message.error(res.data?.message || '删除失败')
        }
      } catch {
        message.error('删除失败')
      }
    },
  })
}

// === 分配权限 ===
const permVisible = ref(false)
const permLoading = ref(false)
const permRoleName = ref('')
const permRoleId = ref('')
const selectedPermIds = ref<string[]>([])

function openPermModal(role: API.RoleVO) {
  permRoleId.value = role.id!
  permRoleName.value = role.name || role.code || ''
  const owned = new Set(role.permissions || [])
  selectedPermIds.value = permissions.value.filter((p) => owned.has(p.code || '')).map((p) => p.id!)
  permVisible.value = true
}

async function handleAssignPermissions() {
  permLoading.value = true
  try {
    const res = await assignRolePermissions(permRoleId.value, selectedPermIds.value)
    if (res.data?.code === 0) {
      message.success('权限已更新')
      permVisible.value = false
      loadRoles()
    } else {
      message.error(res.data?.message || '权限更新失败')
    }
  } catch {
    message.error('权限更新失败')
  } finally {
    permLoading.value = false
  }
}

onMounted(() => {
  loadRoles()
  loadPermissions()
})
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">角色管理</h1>
        <p class="page-desc">角色数据存储于认证服务（auth-service），实时同步</p>
      </div>
      <a-button type="primary" @click="openCreateModal">
        <template #icon><PlusOutlined /></template>
        创建角色
      </a-button>
    </div>

    <a-table :data-source="roles" :loading="loading" :pagination="false" row-key="id">
      <a-table-column title="角色编码" data-index="code" width="220">
        <template #default="{ record }">
          <span class="role-code">{{ record.code }}</span>
          <a-tag v-if="record.builtIn" color="orange" style="margin-left: 8px">内置</a-tag>
        </template>
      </a-table-column>
      <a-table-column title="角色名称" data-index="name" width="160" />
      <a-table-column title="描述" data-index="description" ellipsis />
      <a-table-column title="权限数" width="90">
        <template #default="{ record }">{{ record.permissions?.length || 0 }}</template>
      </a-table-column>
      <a-table-column title="操作" width="260">
        <template #default="{ record }">
          <a-space :size="0">
            <a-button type="link" size="small" @click.stop="openPermModal(record)">
              <template #icon><SafetyOutlined /></template>
              分配权限
            </a-button>
            <a-button type="link" size="small" @click.stop="openEditModal(record)">
              <template #icon><EditOutlined /></template>
              编辑
            </a-button>
            <a-button
              type="link"
              size="small"
              danger
              :disabled="record.builtIn"
              @click.stop="confirmDelete(record)"
            >
              <template #icon><DeleteOutlined /></template>
              删除
            </a-button>
          </a-space>
        </template>
      </a-table-column>
    </a-table>

    <!-- 创建/编辑角色弹窗 -->
    <a-modal
      v-model:open="saveVisible"
      :title="saveIsEdit ? '编辑角色' : '创建角色'"
      :confirm-loading="saveLoading"
      ok-text="保存"
      cancel-text="取消"
      @ok="handleSave"
    >
      <a-form :label-col="{ span: 5 }">
        <a-form-item label="角色编码">
          <a-input
            v-model:value="saveForm.code"
            :disabled="saveIsEdit"
            placeholder="如 ROLE_EDITOR（创建后不可修改）"
          />
        </a-form-item>
        <a-form-item label="角色名称" required>
          <a-input v-model:value="saveForm.name" :maxlength="100" placeholder="如 内容编辑" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model:value="saveForm.description" :rows="3" :maxlength="255" placeholder="可选" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 分配权限弹窗 -->
    <a-modal
      v-model:open="permVisible"
      :title="`分配权限 - ${permRoleName}`"
      :confirm-loading="permLoading"
      ok-text="保存"
      cancel-text="取消"
      width="560px"
      @ok="handleAssignPermissions"
    >
      <a-checkbox-group v-model:value="selectedPermIds" class="perm-checkbox-group">
        <a-checkbox v-for="perm in permissions" :key="perm.id" :value="perm.id">
          {{ perm.name }}（{{ perm.code }}）
        </a-checkbox>
      </a-checkbox-group>
      <div class="perm-tip">保存后为全量替换；不勾选任何权限将清空该角色的权限</div>
    </a-modal>
  </div>
</template>

<style scoped>
.admin-page {
  padding-top: 4px;
}

.page-header {
  margin-bottom: 24px;
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

.role-code {
  font-family: var(--font-mono);
  font-size: 13px;
}

.perm-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 360px;
  overflow-y: auto;
}

.perm-tip {
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
