<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getInviteUsers } from '@/api/inviteController'
import { parseResponseData } from '@/utils/response'

const route = useRoute()
const users = ref<API.InviteUser[]>([])
const loading = ref(true)

const inviteId = computed(() => {
  const param = route.params.inviteId
  return Array.isArray(param) ? param[0] : param
})

async function loadUsers() {
  if (!inviteId.value) return
  loading.value = true
  try {
    const res = await getInviteUsers(inviteId.value)
    if (res.data?.code === 0 && res.data.data) {
      users.value = parseResponseData<API.InviteUser[]>(res.data.data)
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

onMounted(() => loadUsers())
</script>

<template>
  <div class="invite-detail-page">
    <div class="page-header">
      <h2>邀请详情</h2>
    </div>

    <a-table
      :data-source="users"
      :loading="loading"
      :pagination="false"
      row-key="id"
    >
      <a-table-column title="被邀请人ID" data-index="inviteeId" />
      <a-table-column title="邀请时间" data-index="createTime" width="180" />
    </a-table>
  </div>
</template>

<style scoped>
.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
}
</style>
