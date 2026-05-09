<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import { generateWechatQrCode, pollWechatQrCodeStatus, wechatQrCodeLogin } from '@/api/authController'
import { parseResponseData } from '@/utils/response'

const emit = defineEmits<{
  login: [token: API.TokenResponse]
  newUser: [tempToken: string, nickname: string, avatar: string]
}>()

const qrCodeUrl = ref('')
const qrcodeId = ref('')
const status = ref<'PENDING' | 'SCANNED' | 'AUTHORIZED' | 'CONFIRMED' | 'EXPIRED'>('PENDING')
const displayName = ref('')
const loading = ref(true)
let pollTimer: ReturnType<typeof setInterval> | null = null
/** Incremented on each new QR code; used to discard stale poll responses */
let generation = 0

async function initQrCode() {
  stopPolling()
  generation++
  const myGen = generation

  loading.value = true
  status.value = 'PENDING'
  displayName.value = ''
  try {
    const res = await generateWechatQrCode()
    // Discard if a newer init happened while we were waiting
    if (myGen !== generation) return

    if (res.data?.code === 0 && res.data.data) {
      const data = parseResponseData<API.WechatQrCodeResponse>(res.data.data)
      qrCodeUrl.value = data.qrCodeUrl || ''
      qrcodeId.value = data.qrcodeId || ''
      startPolling(myGen)
    }
  } catch {
    if (myGen === generation) {
      message.error('生成二维码失败，请重试')
    }
  } finally {
    if (myGen === generation) {
      loading.value = false
    }
  }
}

function startPolling(gen: number) {
  stopPolling()
  pollTimer = setInterval(async () => {
    // Stale timer from a previous generation
    if (gen !== generation) {
      stopPolling()
      return
    }
    if (!qrcodeId.value) return

    const currentId = qrcodeId.value
    try {
      const res = await pollWechatQrCodeStatus(currentId)
      // Discard if generation changed while request was in flight
      if (gen !== generation) return

      if (res.data?.code === 0 && res.data.data) {
        const data = parseResponseData<API.WechatQrCodeResponse>(res.data.data)
        status.value = (data.status as typeof status.value) || 'PENDING'
        displayName.value = data.displayName || ''

        if (data.status === 'CONFIRMED' || data.status === 'AUTHORIZED') {
          stopPolling()
          handleConfirm(data.ticket || '', gen)
        } else if (data.status === 'EXPIRED') {
          stopPolling()
          message.warning('二维码已过期，请刷新')
        }
      }
    } catch {
      // ignore polling errors
    }
  }, 2000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function handleConfirm(ticket: string, gen: number) {
  try {
    const res = await wechatQrCodeLogin(ticket)
    if (gen !== generation) return

    if (res.data?.code === 0 && res.data.data) {
      const loginData = parseResponseData<API.WechatLoginResponse>(res.data.data)
      if (loginData.newUser) {
        emit('newUser', loginData.tempToken || '', loginData.nickname || '', loginData.avatar || '')
      } else if (loginData.token) {
        emit('login', loginData.token)
      }
    }
  } catch {
    if (gen === generation) {
      message.error('登录失败，请重试')
    }
  }
}

function handleRefresh() {
  initQrCode()
}

onMounted(() => {
  initQrCode()
})

onUnmounted(() => {
  generation++
  stopPolling()
})
</script>

<template>
  <div class="wechat-qr">
    <div v-if="loading" class="qr-loading">
      <a-spin tip="正在生成二维码..." />
    </div>
    <template v-else>
      <div class="qr-image-wrapper">
        <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="微信扫码登录" class="qr-image" />
        <div v-if="status === 'EXPIRED'" class="qr-overlay">
          <p>二维码已过期</p>
          <a-button type="primary" size="small" @click="handleRefresh">刷新</a-button>
        </div>
        <div v-if="status === 'SCANNED' || status === 'AUTHORIZED'" class="qr-overlay scanned">
          <p>{{ displayName ? `${displayName} 已扫码` : '已扫码，请确认登录' }}</p>
        </div>
      </div>
      <p class="qr-tip">
        <template v-if="status === 'PENDING'">请使用微信扫一扫登录</template>
        <template v-else-if="status === 'SCANNED' || status === 'AUTHORIZED'">已授权，正在登录...</template>
        <template v-else-if="status === 'EXPIRED'">二维码已过期</template>
      </p>
    </template>
  </div>
</template>

<style scoped>
.wechat-qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.qr-loading {
  padding: 60px 0;
}

.qr-image-wrapper {
  position: relative;
  width: 200px;
  height: 200px;
  border: 1px solid var(--glass-border, #334155);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.qr-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qr-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 14px;
  color: #666;
}

.qr-overlay.scanned {
  color: #52c41a;
}

.qr-tip {
  margin-top: 16px;
  color: var(--text-muted, #94a3b8);
  font-size: 13px;
}
</style>
