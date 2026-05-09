<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { getUserInfo } from '@/api/userController'
import { getMyInviter } from '@/api/inviteController'

const userStore = useUserStore()
const userInfo = ref<API.UserInfo | null>(null)
const inviter = ref<API.UserInfo | null>(null)
const loading = ref(true)

async function loadData() {
  loading.value = true
  try {
    const [infoRes, inviterRes] = await Promise.all([getUserInfo(), getMyInviter()])
    if (infoRes.data?.code === 0 && infoRes.data.data) {
      userInfo.value = JSON.parse(infoRes.data.data as unknown as string) as API.UserInfo
    }
    if (inviterRes.data?.code === 0 && inviterRes.data.data) {
      inviter.value = JSON.parse(inviterRes.data.data as unknown as string) as API.UserInfo
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

onMounted(() => loadData())
</script>

<template>
  <div class="profile-page">
    <div class="page-header">
      <h2>个人中心</h2>
    </div>

    <a-spin :spinning="loading">
      <a-row :gutter="24">
        <a-col :xs="24" :md="12">
          <a-card title="基本信息" class="profile-card">
            <a-descriptions :column="1" bordered size="small">
              <a-descriptions-item label="用户名">
                {{ userStore.loginUser?.username || '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="邮箱">
                {{ userStore.loginUser?.email || '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="积分">
                <span class="credits-value">{{ userInfo?.remainingCredits ?? '-' }}</span>
              </a-descriptions-item>
              <a-descriptions-item label="角色">
                <a-space v-if="userStore.roles.length">
                  <a-tag v-for="role in userStore.roles" :key="role" color="purple">{{ role }}</a-tag>
                </a-space>
                <span v-else>-</span>
              </a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>

        <a-col :xs="24" :md="12">
          <a-card title="邀请信息" class="profile-card">
            <a-descriptions :column="1" bordered size="small">
              <a-descriptions-item label="邀请人">
                {{ inviter?.userId || '无' }}
              </a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>
      </a-row>
    </a-spin>
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

.profile-card {
  margin-bottom: 24px;
}

.credits-value {
  font-size: 18px;
  font-weight: 600;
  color: #667eea;
}
</style>
