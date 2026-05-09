<script setup lang="ts">
import { ref, h } from 'vue'
import { message } from 'ant-design-vue'
import { GiftOutlined } from '@ant-design/icons-vue'
import { useRedeem } from '@/api/redeemController'

const redeemCode = ref('')
const loading = ref(false)

async function handleRedeem() {
  if (!redeemCode.value.trim()) {
    message.warning('请输入兑换码')
    return
  }
  loading.value = true
  try {
    const res = await useRedeem(redeemCode.value.trim())
    if (res.data?.code === 0) {
      message.success('兑换成功')
      redeemCode.value = ''
    } else {
      message.error(res.data?.message || '兑换失败')
    }
  } catch {
    message.error('兑换失败，请检查网络')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="redeem-page">
    <div class="page-header">
      <h2>兑换码</h2>
      <p>输入兑换码即可获得相应额度</p>
    </div>

    <a-card class="redeem-card">
      <a-space direction="vertical" :size="16" style="width: 100%">
        <a-input
          v-model:value="redeemCode"
          placeholder="请输入兑换码"
          size="large"
          :prefix="h(GiftOutlined)"
          @press-enter="handleRedeem"
        />
        <a-button type="primary" block size="large" :loading="loading" @click="handleRedeem">
          立即兑换
        </a-button>
      </a-space>
    </a-card>
  </div>
</template>

<style scoped>
.redeem-page {
  max-width: 480px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
}

.page-header h2 {
  font-size: 22px;
  margin: 0 0 8px;
}

.page-header p {
  color: #999;
  margin: 0;
}
</style>
