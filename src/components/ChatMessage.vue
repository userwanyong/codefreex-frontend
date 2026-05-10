<script setup lang="ts">
import { computed } from 'vue'
import { RobotOutlined, UserOutlined, LoadingOutlined, WarningOutlined, RedoOutlined } from '@ant-design/icons-vue'
import MarkdownRenderer from './MarkdownRenderer.vue'

export interface ChatMsg {
  id: string
  role: 'user' | 'ai' | 'system'
  content: string
  status?: 'sending' | 'streaming' | 'done' | 'error'
  timestamp: number
}

const props = defineProps<{
  message: ChatMsg
}>()

const emit = defineEmits<{
  retry: []
}>()

const isUser = computed(() => props.message.role === 'user')
const isStreaming = computed(() => props.message.status === 'streaming')
const isError = computed(() => props.message.status === 'error')

function formatTime(ts: number) {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<template>
  <div class="chat-msg" :class="[`msg-${message.role}`, { 'msg-error': isError }]">
    <!-- AI: avatar on left -->
    <div v-if="!isUser" class="msg-avatar">
      <RobotOutlined />
    </div>

    <!-- Body -->
    <div class="msg-body">
      <!-- Role label -->
      <div class="msg-label">
        <span v-if="isUser">用户消息</span>
        <span v-else class="label-ai">AI 回复</span>
        <span class="msg-time">{{ formatTime(message.timestamp) }}</span>
      </div>

      <!-- Content -->
      <div class="msg-content" :class="{ 'content-streaming': isStreaming, 'content-error': isError }">
        <template v-if="isUser">
          {{ message.content }}
        </template>
        <template v-else-if="isStreaming && !message.content">
          <LoadingOutlined class="streaming-icon" />
          <span>AI 正在思考...</span>
        </template>
        <template v-else>
          <MarkdownRenderer :content="message.content" />
        </template>
      </div>

      <!-- Error actions -->
      <div v-if="isError" class="msg-actions">
        <a-button type="text" size="small" class="retry-btn" @click="emit('retry')">
          <RedoOutlined /> 重试
        </a-button>
      </div>
    </div>

    <!-- User: avatar on right -->
    <div v-if="isUser" class="msg-avatar">
      <UserOutlined />
    </div>
  </div>
</template>

<style scoped>
.chat-msg {
  display: flex;
  gap: 12px;
  padding: 16px 0;
  animation: fadeInUp 0.3s ease;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* User message: align right */
.msg-user {
  flex-direction: row;
  justify-content: flex-end;
}

/* AI message: align left */
.msg-ai,
.msg-system {
  flex-direction: row;
  justify-content: flex-start;
}

/* Avatar */
.msg-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 2px;
}

.msg-user .msg-avatar {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
}

.msg-ai .msg-avatar,
.msg-system .msg-avatar {
  background: linear-gradient(135deg, #22c55e, #15803d);
  color: white;
}

/* Body */
.msg-body {
  min-width: 0;
}

.msg-user .msg-body {
  max-width: 75%;
}

.msg-ai .msg-body,
.msg-system .msg-body {
  max-width: 85%;
}

/* Label */
.msg-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 13px;
}

.msg-user .msg-label {
  justify-content: flex-end;
}

.msg-ai .msg-label,
.msg-system .msg-label {
  justify-content: flex-start;
}

.label-ai {
  color: #ef4444;
  font-weight: 600;
}

.msg-time {
  color: var(--text-muted);
  font-size: 11px;
}

/* Content bubble */
.msg-content {
  padding: 14px 18px;
  border-radius: var(--radius-lg);
  word-break: break-word;
  line-height: 1.7;
  font-size: 14px;
}

.msg-user .msg-content {
  background: linear-gradient(135deg, #1e3a5f, #1e293b);
  border: 1px solid rgba(59, 130, 246, 0.2);
  color: var(--text-primary);
  border-top-right-radius: 4px;
}

.msg-ai .msg-content,
.msg-system .msg-content {
  background: var(--bg-surface);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
  border-top-left-radius: 4px;
}

.content-streaming {
  position: relative;
}

.content-streaming::after {
  content: '';
  position: absolute;
  bottom: 8px;
  right: 14px;
  width: 8px;
  height: 8px;
  background: var(--accent);
  border-radius: 50%;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.streaming-icon {
  color: var(--accent);
  margin-right: 6px;
}

.content-error {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.05);
}

/* Actions */
.msg-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}

.retry-btn {
  color: #ef4444 !important;
  font-size: 12px;
  height: 28px;
}
</style>
