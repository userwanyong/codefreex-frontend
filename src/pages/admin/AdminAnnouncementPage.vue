<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons-vue'
import {
  adminListAnnouncements,
  adminCreateAnnouncement,
  adminUpdateAnnouncement,
  adminDeleteAnnouncement,
} from '@/api/announcementController'
import { parseResponseData } from '@/utils/response'
import { formatDateTime } from '@/utils/datetime'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'

const announcements = ref<API.Announcement[]>([])
const loading = ref(false)
const total = ref(0)
const pageNum = ref(1)
const pageSize = 10

const editModalVisible = ref(false)
const editLoading = ref(false)
const editingId = ref<string | null>(null)
const form = ref({ title: '', content: '', status: 'draft' })
const previewMode = ref(false)

const statusLabels: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
  offline: '已下线',
}

const statusColors: Record<string, string> = {
  draft: 'default',
  published: 'green',
  offline: 'red',
}

async function loadAnnouncements() {
  loading.value = true
  try {
    const res = await adminListAnnouncements(pageNum.value, pageSize)
    if (res.data?.code === 0 && res.data.data) {
      const data = parseResponseData<API.PageResponse<API.Announcement>>(res.data.data)
      announcements.value = data.records || []
      total.value = data.total || 0
    } else {
      message.error(res.data?.message || '加载公告失败')
    }
  } catch {
    message.error('加载公告失败')
  } finally {
    loading.value = false
  }
}

function handlePageChange(page: number) {
  pageNum.value = page
  loadAnnouncements()
}

function showCreateModal() {
  editingId.value = null
  form.value = { title: '', content: '', status: 'draft' }
  previewMode.value = false
  editModalVisible.value = true
}

function showEditModal(record: API.Announcement) {
  editingId.value = record.id || null
  form.value = {
    title: record.title || '',
    content: record.content || '',
    status: record.status || 'draft',
  }
  previewMode.value = false
  editModalVisible.value = true
}

async function handleSave() {
  if (!form.value.title.trim()) {
    message.warning('请输入公告标题')
    return
  }
  editLoading.value = true
  try {
    const res = editingId.value
      ? await adminUpdateAnnouncement({ id: editingId.value, ...form.value, title: form.value.title.trim() })
      : await adminCreateAnnouncement({ ...form.value, title: form.value.title.trim() })
    if (res.data?.code === 0) {
      message.success(editingId.value ? '公告已更新' : '公告已创建')
      editModalVisible.value = false
      loadAnnouncements()
    } else {
      message.error(res.data?.message || '保存失败')
    }
  } catch {
    message.error('保存失败')
  } finally {
    editLoading.value = false
  }
}

function handleDelete(record: API.Announcement) {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除公告「${record.title}」吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        const res = await adminDeleteAnnouncement(record.id!)
        if (res.data?.code === 0) {
          message.success('删除成功')
          loadAnnouncements()
        } else {
          message.error(res.data?.message || '删除失败')
        }
      } catch {
        message.error('删除失败')
      }
    },
  })
}

function formatTime(dateStr?: string) {
  return formatDateTime(dateStr)
}

onMounted(() => loadAnnouncements())
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">公告管理</h1>
        <p class="page-desc">维护首页弹窗公告，内容支持 Markdown；已发布公告修改后会重新弹出让用户知晓</p>
      </div>
      <a-button type="primary" @click="showCreateModal">
        <PlusOutlined /> 新建公告
      </a-button>
    </div>

    <a-table
      :data-source="announcements"
      :loading="loading"
      :pagination="false"
      row-key="id"
    >
      <a-table-column title="标题" data-index="title" ellipsis />
      <a-table-column title="状态" data-index="status" width="100">
        <template #default="{ record }">
          <a-tag :color="statusColors[record.status] || 'default'">
            {{ statusLabels[record.status] || record.status }}
          </a-tag>
        </template>
      </a-table-column>
      <a-table-column title="发布时间" width="170">
        <template #default="{ record }">{{ formatTime(record.publishTime) }}</template>
      </a-table-column>
      <a-table-column title="更新时间" width="170">
        <template #default="{ record }">{{ formatTime(record.updateTime) }}</template>
      </a-table-column>
      <a-table-column title="操作" width="140">
        <template #default="{ record }">
          <a-button type="link" size="small" @click="showEditModal(record)">
            <EditOutlined /> 编辑
          </a-button>
          <a-button type="link" size="small" danger @click="handleDelete(record)">删除</a-button>
        </template>
      </a-table-column>
    </a-table>

    <div class="pagination-wrapper">
      <a-pagination
        :current="pageNum"
        :page-size="pageSize"
        :total="total"
        size="small"
        :show-size-changer="false"
        @change="handlePageChange"
      />
    </div>

    <a-modal
      v-model:open="editModalVisible"
      :title="editingId ? '编辑公告' : '新建公告'"
      :confirm-loading="editLoading"
      width="720px"
      ok-text="保存"
      cancel-text="取消"
      @ok="handleSave"
    >
      <a-form layout="vertical">
        <a-form-item label="公告标题" required>
          <a-input v-model:value="form.title" placeholder="输入公告标题" :maxlength="128" show-count />
        </a-form-item>
        <a-form-item label="状态">
          <a-radio-group v-model:value="form.status">
            <a-radio value="draft">草稿（不弹出）</a-radio>
            <a-radio value="published">发布（首页弹出）</a-radio>
            <a-radio value="offline">下线（不再弹出）</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="公告内容（Markdown）">
          <div class="content-toolbar">
            <a-button size="small" @click="previewMode = !previewMode">
              <EyeOutlined /> {{ previewMode ? '返回编辑' : '预览' }}
            </a-button>
          </div>
          <a-textarea
            v-if="!previewMode"
            v-model:value="form.content"
            :rows="14"
            placeholder="支持 Markdown 语法，例如：## 标题&#10;- 列表项&#10;**加粗** 与 `代码`"
          />
          <div v-else class="content-preview">
            <MarkdownRenderer v-if="form.content" :content="form.content" />
            <div v-else class="preview-empty">暂无内容，请输入后预览</div>
          </div>
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

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.content-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.content-preview {
  min-height: 260px;
  max-height: 420px;
  overflow-y: auto;
  padding: 12px 16px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--bg-base);
}

.preview-empty {
  color: var(--text-muted);
  text-align: center;
  padding-top: 100px;
}
</style>
