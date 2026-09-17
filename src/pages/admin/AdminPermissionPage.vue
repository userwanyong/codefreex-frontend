<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { listPermissions, createPermission, deletePermission } from '@/api/permissionController'
import { parseResponseData } from '@/utils/response'

const permissions = ref<API.PermissionVO[]>([])
const loading = ref(true)

async function loadPermissions() {
  loading.value = true
  try {
    const res = await listPermissions()
    if (res.data?.code === 0 && res.data.data) {
      permissions.value = parseResponseData<API.PermissionVO[]>(res.data.data)
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

// === 创建权限 ===
const createVisible = ref(false)
const createLoading = ref(false)
const createForm = ref<API.PermissionSaveRequest>({ code: '', name: '', resource: '', action: '', description: '' })

function openCreateModal() {
  createForm.value = { code: '', name: '', resource: '', action: '', description: '' }
  createVisible.value = true
}

async function handleCreate() {
  const form = createForm.value
  if (!form.code || !form.name) {
    message.warning('请填写权限编码与名称')
    return
  }
  createLoading.value = true
  try {
    const res = await createPermission({
      code: form.code,
      name: form.name,
      resource: form.resource || undefined,
      action: form.action || undefined,
      description: form.description || undefined,
    })
    if (res.data?.code === 0) {
      message.success('权限创建成功')
      createVisible.value = false
      loadPermissions()
    } else {
      message.error(res.data?.message || '创建失败')
    }
  } catch {
    message.error('创建失败')
  } finally {
    createLoading.value = false
  }
}

function confirmDelete(permission: API.PermissionVO) {
  Modal.confirm({
    title: '确认删除权限',
    content: `删除权限「${permission.name}」将同时解除所有角色的关联。确定删除吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        const res = await deletePermission(permission.id!)
        if (res.data?.code === 0) {
          message.success('权限已删除')
          loadPermissions()
        } else {
          message.error(res.data?.message || '删除失败')
        }
      } catch {
        message.error('删除失败')
      }
    },
  })
}

onMounted(() => loadPermissions())
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">权限管理</h1>
        <p class="page-desc">权限数据存储于认证服务（auth-service），实时同步</p>
      </div>
      <a-button type="primary" @click="openCreateModal">
        <template #icon><PlusOutlined /></template>
        创建权限
      </a-button>
    </div>

    <a-table :data-source="permissions" :loading="loading" :pagination="false" row-key="id">
      <a-table-column title="权限编码" data-index="code" width="200">
        <template #default="{ record }">
          <span class="perm-code">{{ record.code }}</span>
        </template>
      </a-table-column>
      <a-table-column title="名称" data-index="name" width="160" />
      <a-table-column title="资源" data-index="resource" width="140" />
      <a-table-column title="操作" data-index="action" width="100" />
      <a-table-column title="描述" data-index="description" ellipsis />
      <a-table-column title="操作" width="100">
        <template #default="{ record }">
          <a-button type="link" size="small" danger @click.stop="confirmDelete(record)">
            <template #icon><DeleteOutlined /></template>
            删除
          </a-button>
        </template>
      </a-table-column>
    </a-table>

    <!-- 创建权限弹窗 -->
    <a-modal
      v-model:open="createVisible"
      title="创建权限"
      :confirm-loading="createLoading"
      ok-text="创建"
      cancel-text="取消"
      @ok="handleCreate"
    >
      <a-form :label-col="{ span: 5 }">
        <a-form-item label="权限编码" required>
          <a-input v-model:value="createForm.code" placeholder="如 app:publish（租户内不可重复）" />
        </a-form-item>
        <a-form-item label="名称" required>
          <a-input v-model:value="createForm.name" placeholder="如 应用发布" />
        </a-form-item>
        <a-form-item label="资源">
          <a-input v-model:value="createForm.resource" placeholder="可选，如 app" />
        </a-form-item>
        <a-form-item label="操作">
          <a-input v-model:value="createForm.action" placeholder="可选，如 publish" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model:value="createForm.description" :rows="2" :maxlength="255" placeholder="可选" />
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

.perm-code {
  font-family: var(--font-mono);
  font-size: 13px;
}
</style>
