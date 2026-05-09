<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { generateRedeem, getRedeemList } from '@/api/redeemController'
import { parseResponseData } from '@/utils/response'

const redeems = ref<API.Redeem[]>([])
const loading = ref(true)
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const filterStatus = ref<string | undefined>(undefined)
const generateModalVisible = ref(false)
const generateLoading = ref(false)
const generateForm = ref({ quota: 100, batch: '', expireHours: 720, maxUseCount: 1 })

const statusMap: Record<string, { text: string; color: string }> = {
  active: { text: '可用', color: 'success' },
  used: { text: '已使用', color: 'default' },
  expired: { text: '已过期', color: 'error' },
  disabled: { text: '已禁用', color: 'error' },
}

async function loadRedeems() {
  loading.value = true
  try {
    const res = await getRedeemList({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      status: filterStatus.value,
    })
    if (res.data?.code === 0 && res.data.data) {
      const data = parseResponseData<API.PageResponse<API.Redeem>>(res.data.data)
      redeems.value = data.records || []
      total.value = data.total || 0
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

async function handleGenerate() {
  if (generateForm.value.quota <= 0) {
    message.warning('额度必须大于0')
    return
  }
  generateLoading.value = true
  try {
    const res = await generateRedeem({
      quota: generateForm.value.quota,
      batch: generateForm.value.batch || undefined,
      expireHours: generateForm.value.expireHours,
      maxUseCount: generateForm.value.maxUseCount,
    })
    if (res.data?.code === 0) {
      message.success('兑换码生成成功')
      generateModalVisible.value = false
      loadRedeems()
    } else {
      message.error(res.data?.message || '生成失败')
    }
  } catch {
    message.error('生成失败')
  } finally {
    generateLoading.value = false
  }
}

function handlePageChange(page: number) {
  pageNum.value = page
  loadRedeems()
}

function handleSearch() {
  pageNum.value = 1
  loadRedeems()
}

onMounted(() => loadRedeems())
</script>

<template>
  <div class="admin-redeem-page">
    <div class="page-header">
      <h2>兑换码管理</h2>
      <a-button type="primary" @click="generateModalVisible = true">
        <PlusOutlined /> 生成兑换码
      </a-button>
    </div>

    <div class="filter-bar">
      <a-select
        v-model:value="filterStatus"
        placeholder="筛选状态"
        allow-clear
        style="width: 150px"
        @change="handleSearch"
      >
        <a-select-option v-for="(v, k) in statusMap" :key="k" :value="k">{{ v.text }}</a-select-option>
      </a-select>
      <a-button type="primary" @click="handleSearch">查询</a-button>
    </div>

    <a-table :data-source="redeems" :loading="loading" :pagination="false" row-key="id">
      <a-table-column title="兑换码" data-index="redeemCode" width="160" />
      <a-table-column title="额度" data-index="quota" width="100" />
      <a-table-column title="状态" data-index="status" width="100">
        <template #default="{ record }">
          <a-tag :color="statusMap[record.status]?.color || 'default'">
            {{ statusMap[record.status]?.text || record.status }}
          </a-tag>
        </template>
      </a-table-column>
      <a-table-column title="使用次数" width="100">
        <template #default="{ record }">
          <span>{{ record.usedCount ?? 0 }} / {{ record.maxUseCount ?? 1 }}</span>
        </template>
      </a-table-column>
      <a-table-column title="批次" data-index="batch" width="120" />
      <a-table-column title="过期时间" data-index="expireTime" width="180" />
      <a-table-column title="创建时间" data-index="createTime" width="180" />
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

    <!-- 生成兑换码弹窗 -->
    <a-modal
      v-model:open="generateModalVisible"
      title="生成兑换码"
      :confirm-loading="generateLoading"
      @ok="handleGenerate"
      ok-text="生成"
    >
      <a-form layout="vertical">
        <a-form-item label="额度" required>
          <a-input-number v-model:value="generateForm.quota" :min="1" style="width: 100%" />
        </a-form-item>
        <a-form-item label="批次标识">
          <a-input v-model:value="generateForm.batch" placeholder="可选，便于归类" />
        </a-form-item>
        <a-form-item label="有效期（小时）">
          <a-input-number v-model:value="generateForm.expireHours" :min="1" style="width: 100%" />
        </a-form-item>
        <a-form-item label="最大使用次数">
          <a-input-number v-model:value="generateForm.maxUseCount" :min="1" style="width: 100%" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}
</style>
