<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { adminListTags, adminCreateTag, adminUpdateTag, adminDeleteTag } from '@/api/tagController'
import { parseResponseData } from '@/utils/response'

const tags = ref<API.TagVO[]>([])
const loading = ref(true)

const createModalVisible = ref(false)
const createLoading = ref(false)
const createForm = ref({ name: '', sortOrder: 0 })

const editModalVisible = ref(false)
const editLoading = ref(false)
const editForm = ref<{ id: number; name: string; sortOrder: number }>({ id: 0, name: '', sortOrder: 0 })

async function loadTags() {
  loading.value = true
  try {
    const res = await adminListTags()
    if (res.data?.code === 0 && res.data.data) {
      tags.value = parseResponseData<API.TagVO[]>(res.data.data)
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

function showCreateModal() {
  createForm.value = { name: '', sortOrder: 0 }
  createModalVisible.value = true
}

async function handleCreate() {
  if (!createForm.value.name.trim()) {
    message.warning('请输入标签名称')
    return
  }
  createLoading.value = true
  try {
    const res = await adminCreateTag(createForm.value.name.trim(), createForm.value.sortOrder || 0)
    if (res.data?.code === 0) {
      message.success('标签创建成功')
      createModalVisible.value = false
      loadTags()
    } else {
      message.error(res.data?.message || '创建失败')
    }
  } catch {
    message.error('创建失败')
  } finally {
    createLoading.value = false
  }
}

function showEditModal(record: API.TagVO) {
  editForm.value = { id: record.id!, name: record.name || '', sortOrder: record.sortOrder || 0 }
  editModalVisible.value = true
}

async function handleEdit() {
  if (!editForm.value.name.trim()) {
    message.warning('请输入标签名称')
    return
  }
  editLoading.value = true
  try {
    const res = await adminUpdateTag(editForm.value.id, editForm.value.name.trim(), editForm.value.sortOrder || 0)
    if (res.data?.code === 0) {
      message.success('标签更新成功')
      editModalVisible.value = false
      loadTags()
    } else {
      message.error(res.data?.message || '更新失败')
    }
  } catch {
    message.error('更新失败')
  } finally {
    editLoading.value = false
  }
}

function handleDelete(record: API.TagVO) {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除标签「${record.name}」吗？删除后应用关联的该标签也会被移除。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        const res = await adminDeleteTag(record.id!)
        if (res.data?.code === 0) {
          message.success('删除成功')
          loadTags()
        } else {
          message.error(res.data?.message || '删除失败')
        }
      } catch {
        message.error('删除失败')
      }
    },
  })
}

onMounted(() => loadTags())
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">标签管理</h1>
        <p class="page-desc">管理预设标签，用户创建应用时可从中选择</p>
      </div>
      <a-button type="primary" @click="showCreateModal">
        <PlusOutlined /> 新建标签
      </a-button>
    </div>

    <a-table :data-source="tags" :loading="loading" :pagination="false" row-key="id">
      <a-table-column title="标签名称" data-index="name" width="200" />
      <a-table-column title="排序" data-index="sortOrder" width="100" />
      <a-table-column title="关联应用数" data-index="appCount" width="120" />
      <a-table-column title="操作" width="160">
        <template #default="{ record }">
          <a-button type="link" size="small" @click="showEditModal(record)">编辑</a-button>
          <a-button type="link" size="small" danger @click="handleDelete(record)">删除</a-button>
        </template>
      </a-table-column>
    </a-table>

    <a-modal
      v-model:open="createModalVisible"
      title="新建标签"
      :confirm-loading="createLoading"
      @ok="handleCreate"
      ok-text="创建"
    >
      <a-form layout="vertical">
        <a-form-item label="标签名称" required>
          <a-input v-model:value="createForm.name" placeholder="输入标签名称" :maxlength="64" />
        </a-form-item>
        <a-form-item label="排序值">
          <a-input-number v-model:value="createForm.sortOrder" :min="0" style="width: 100%" placeholder="越小越靠前" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="editModalVisible"
      title="编辑标签"
      :confirm-loading="editLoading"
      @ok="handleEdit"
      ok-text="保存"
    >
      <a-form layout="vertical">
        <a-form-item label="标签名称" required>
          <a-input v-model:value="editForm.name" placeholder="输入标签名称" :maxlength="64" />
        </a-form-item>
        <a-form-item label="排序值">
          <a-input-number v-model:value="editForm.sortOrder" :min="0" style="width: 100%" placeholder="越小越靠前" />
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
</style>
