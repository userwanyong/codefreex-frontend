<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  currentNode: API.WorkflowNode | null
  running: boolean
  retryCount: number
}>()

// 节点到阶段的映射
const NODE_PHASE_MAP: Record<string, number> = {
  promptGuardNode: 0,
  promptReviewNode: 0,
  intentClassifyNode: 1,
  prdGenNode: 1,
  routeNode: 1,
  imagePlanNode: 2,
  imageFetchNode: 2,
  promptEnhanceNode: 2,
  codeGenNode: 3,
  visualEditNode: 3,
  buildNode: 4,
  qualityCheckNode: 5,
  codeFixNode: 5,
  persistNode: 5,
}

const PHASE_LABELS = ['安全审查', '需求分析', '素材准备', '代码生成', '项目构建', '质量检查']

const NODE_DESCRIPTIONS: Record<string, string> = {
  promptGuardNode: '关键词安全检查中...',
  promptReviewNode: 'AI 安全审查中...',
  intentClassifyNode: '意图识别中...',
  prdGenNode: '生成产品需求文档...',
  imagePlanNode: '规划图片资源...',
  imageFetchNode: '获取图片素材...',
  promptEnhanceNode: '增强提示词...',
  routeNode: '确定生成方案...',
  codeGenNode: 'AI 生成代码中...',
  visualEditNode: '执行可视化修改...',
  buildNode: '项目构建打包中...',
  qualityCheckNode: '代码质量检查...',
  codeFixNode: '修复代码...',
  persistNode: '保存文件...',
}

const activePhase = computed(() => {
  if (!props.currentNode) return -1
  return NODE_PHASE_MAP[props.currentNode] ?? -1
})

const currentDescription = computed(() => {
  if (!props.currentNode) return ''
  return NODE_DESCRIPTIONS[props.currentNode] || ''
})

function phaseState(index: number): 'completed' | 'active' | 'pending' {
  if (!props.running) return 'pending'
  if (index < activePhase.value) return 'completed'
  if (index === activePhase.value) return 'active'
  return 'pending'
}
</script>

<template>
  <div class="workflow-progress">
    <div class="progress-steps">
      <template v-for="(label, idx) in PHASE_LABELS" :key="idx">
        <div class="phase" :class="phaseState(idx)">
          <span class="phase-dot" />
          <span class="phase-label">{{ label }}</span>
          <span v-if="idx === 3 && retryCount > 0 && phaseState(idx) !== 'pending'" class="retry-badge">
            重试 #{{ retryCount }}
          </span>
        </div>
        <div v-if="idx < PHASE_LABELS.length - 1" class="phase-line" :class="{ filled: phaseState(idx) === 'completed' }" />
      </template>
    </div>
    <div v-if="running && currentDescription" class="progress-desc">
      {{ currentDescription }}
    </div>
  </div>
</template>

<style scoped>
.workflow-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.progress-steps {
  display: flex;
  align-items: flex-start;
  gap: 0;
}

.phase {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 72px;
  position: relative;
}

.phase-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--bg-elevated);
  border: 2px solid var(--glass-border);
  transition: all 300ms ease;
  flex-shrink: 0;
}

.phase.completed .phase-dot {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.3);
}

.phase.active .phase-dot {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
  animation: dotPulse 1.2s ease-in-out infinite;
}

.phase-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
  transition: color 300ms ease;
}

.phase.completed .phase-label {
  color: var(--accent);
}

.phase.active .phase-label {
  color: var(--accent);
}

.phase-line {
  width: 32px;
  height: 2px;
  background: var(--glass-border);
  border-radius: 1px;
  margin-top: 5px;
  transition: background 300ms ease;
  flex-shrink: 0;
}

.phase-line.filled {
  background: var(--accent);
}

.retry-badge {
  position: absolute;
  top: -6px;
  right: -12px;
  font-size: 9px;
  font-weight: 700;
  color: #eab308;
  background: rgba(234, 179, 8, 0.1);
  padding: 1px 5px;
  border-radius: 4px;
  white-space: nowrap;
}

.progress-desc {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.2px;
  animation: fadeIn 300ms ease;
}

@keyframes dotPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.2); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
