<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { CheckOutlined, CloseOutlined, ClockCircleOutlined } from '@ant-design/icons-vue'
import { getAdminFeaturedApplications, reviewFeaturedApplication, cancelFeaturedApplication } from '@/api/appController'
import { parseResponseData } from '@/utils/response'

const applications = ref<API.FeaturedApplication[]>([])
const loading = ref(true)
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const filterStatus = ref<string | undefined>('pending')

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待审核', color: 'warning' },
  approved: { text: '已通过', color: 'success' },
  rejected: { text: '已拒绝', color: 'error' },
  cancelled: { text: '已取消', color: 'default' },
}

const remarkValue = ref('')
const reviewModalVisible = ref(false)
const reviewTarget = ref<API.FeaturedApplication | null>(null)
const reviewApproved = ref(false)
const reviewLoading = ref(false)

async function loadApplications() {
  loading.value = true
  try {
    const res = await getAdminFeaturedApplications({
      status: filterStatus.value,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    if (res.data?.code === 0 && res.data.data) {
      const data = parseResponseData<API.PageResponse<API.FeaturedApplication>>(res.data.data)
      applications.value = data.records || []
      total.value = data.total || 0
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

function handleReview(record: API.FeaturedApplication, approved: boolean) {
  reviewTarget.value = record
  reviewApproved.value = approved
  remarkValue.value = ''
  reviewModalVisible.value = true
}

async function confirmReview() {
  if (!reviewTarget.value) return
  reviewLoading.value = true
  try {
    const res = await reviewFeaturedApplication(reviewTarget.value.id!, reviewApproved.value, remarkValue.value || undefined)
    if (res.data?.code === 0) {
      message.success(reviewApproved.value ? '已通过' : '已拒绝')
      reviewModalVisible.value = false
      loadApplications()
    } else {
      message.error(res.data?.message || '操作失败')
    }
  } catch {
    message.error('操作失败')
  } finally {
    reviewLoading.value = false
  }
}

function handleCancelFeatured(record: API.FeaturedApplication) {
  Modal.confirm({
    title: '取消精选',
    content: '确认取消此应用的精选状态？',
    okText: '确认',
    cancelText: '取消',
    async onOk() {
      try {
        const res = await cancelFeaturedApplication(record.appId!)
        if (res.data?.code === 0) {
          message.success('已取消精选')
          loadApplications()
        } else {
          message.error(res.data?.message || '操作失败')
        }
      } catch {
        message.error('操作失败')
      }
    },
  })
}

function handlePageChange(page: number) {
  pageNum.value = page
  loadApplications()
}

function handleSearch() {
  pageNum.value = 1
  loadApplications()
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

onMounted(() => loadApplications())
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">精选审批</h1>
        <p class="page-desc">审核用户提交的精选申请</p>
      </div>
    </div>

    <div class="filter-bar">
      <a-select
        v-model:value="filterStatus"
        placeholder="筛选状态"
        allow-clear
        class="filter-select"
        @change="handleSearch"
      >
        <a-select-option value="pending">待审核</a-select-option>
        <a-select-option value="approved">已通过</a-select-option>
        <a-select-option value="rejected">已拒绝</a-select-option>
        <a-select-option value="cancelled">已取消</a-select-option>
      </a-select>
    </div>

    <a-table :data-source="applications" :loading="loading" :pagination="false" row-key="id">
      <a-table-column title="应用ID" data-index="appId" width="160" ellipsis />
      <a-table-column title="申请人ID" data-index="userId" width="140" ellipsis />
      <a-table-column title="申请理由" data-index="reason" ellipsis>
        <template #default="{ record }">
          {{ record.reason || '未填写' }}
        </template>
      </a-table-column>
      <a-table-column title="状态" data-index="status" width="100">
        <template #default="{ record }">
          <a-tag :color="statusMap[record.status]?.color || 'default'">
            {{ statusMap[record.status]?.text || record.status }}
          </a-tag>
        </template>
      </a-table-column>
      <a-table-column title="管理员备注" data-index="adminRemark" ellipsis>
        <template #default="{ record }">
          {{ record.adminRemark || '-' }}
        </template>
      </a-table-column>
      <a-table-column title="申请时间" width="180">
        <template #default="{ record }">{{ formatDate(record.createTime) }}</template>
      </a-table-column>
      <a-table-column title="审核时间" width="180">
        <template #default="{ record }">{{ formatDate(record.reviewTime) }}</template>
      </a-table-column>
      <a-table-column title="操作" width="180">
        <template #default="{ record }">
          <a-space v-if="record.status === 'pending'">
            <a-button type="link" size="small" @click="handleReview(record, true)">
              <template #icon><CheckOutlined /></template>
              通过
            </a-button>
            <a-button type="link" size="small" danger @click="handleReview(record, false)">
              <template #icon><CloseOutlined /></template>
              拒绝
            </a-button>
          </a-space>
          <a-button v-else-if="record.status === 'approved'" type="link" size="small" danger @click="handleCancelFeatured(record)">
            <template #icon><CloseOutlined /></template>
            取消精选
          </a-button>
          <a-space v-else-if="record.status === 'rejected' || record.status === 'cancelled'">
            <a-button type="link" size="small" @click="handleReview(record, true)">
              <template #icon><CheckOutlined /></template>
              设为精选
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

    <!-- 审批弹窗 -->
    <a-modal
      v-model:open="reviewModalVisible"
      :title="reviewApproved ? '通过申请' : '拒绝申请'"
      :confirm-loading="reviewLoading"
      @ok="confirmReview"
      ok-text="确认"
      cancel-text="取消"
    >
      <p style="color: var(--text-secondary); margin-bottom: 16px;">
        {{ reviewApproved ? '确认将此应用设为精选？' : '确认拒绝此精选申请？' }}
      </p>
      <a-textarea
        v-model:value="remarkValue"
        placeholder="请填写审批备注（选填）"
        :rows="3"
        :maxlength="200"
        show-count
      />
    </a-modal>
  </div>
</template>

<style scoped>
.admin-page {
  padding-top: 4px;
}

.page-header {
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

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.filter-select {
  width: 150px;
}

.text-muted {
  color: var(--text-muted);
  font-size: 13px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}
</style>
