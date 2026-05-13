<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import {
  FolderOutlined,
  FolderOpenOutlined,
  CodeOutlined,
  CopyOutlined,
  CheckOutlined,
  LoadingOutlined,
} from '@ant-design/icons-vue'
import { parseCodeFiles, buildFileTree, getFileIcon, type CodeFile } from '@/utils/codeFileParser'
import hljs from 'highlight.js'

interface TreeNode {
  name: string
  path: string
  isDir: boolean
  children?: TreeNode[]
  file?: CodeFile
}

const props = defineProps<{
  content: string
  isStreaming: boolean
}>()

const selectedPath = ref('')
const copied = ref(false)
const expandedDirs = ref<Set<string>>(new Set())
const codeWrapperRef = ref<HTMLElement | null>(null)

const files = computed(() => parseCodeFiles(props.content))
const fileTree = computed(() => buildFileTree(files.value))

const currentFile = computed(() => files.value.find(f => f.path === selectedPath.value))

// 自动选中第一个文件或正在流式写入的文件
watch(files, (newFiles) => {
  if (!newFiles.length) return
  const streamingFile = newFiles.find(f => f.streaming)
  const target = streamingFile || newFiles[0]
  if (target && selectedPath.value !== target.path) {
    selectedPath.value = target.path
    // 自动展开父目录
    expandParentDirs(target.path)
  }
}, { immediate: true })

function expandParentDirs(filePath: string) {
  const parts = filePath.split('/').filter(Boolean)
  for (let i = 1; i < parts.length; i++) {
    expandedDirs.value.add('/' + parts.slice(0, i).join('/'))
  }
}

function isExpanded(path: string) {
  return expandedDirs.value.has(path)
}

function toggleDir(path: string) {
  if (expandedDirs.value.has(path)) {
    expandedDirs.value.delete(path)
  } else {
    expandedDirs.value.add(path)
  }
}

function selectFile(path: string) {
  selectedPath.value = path
}

function handleCopy() {
  if (!currentFile.value) return
  navigator.clipboard.writeText(currentFile.value.content).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  })
}

const highlightedCode = computed(() => {
  if (!currentFile.value) return ''
  const raw = currentFile.value.content
  const lang = currentFile.value.language
  let highlighted: string
  try {
    highlighted = lang
      ? hljs.highlight(raw, { language: lang }).value
      : hljs.highlightAuto(raw).value
  } catch {
    highlighted = escapeHtml(raw)
  }
  const lines = balanceHtmlLines(highlighted)
  return lines.map(line => `<span class="hljs-ln">${line || ' '}</span>`).join('\n')
})

/**
 * 将 hljs 高亮后的 HTML 按行拆分，确保每行 HTML 标签平衡。
 * 解决多行 <span> 被截断导致 .hljs-ln 嵌套、CSS counter 行号混乱的问题。
 */
function balanceHtmlLines(html: string): string[] {
  const rawLines = html.split('\n')
  const result: string[] = []
  const openSpans: string[] = []

  for (const rawLine of rawLines) {
    const reopen = openSpans.join('')
    const lineStack = [...openSpans]

    const spanRegex = /<(\/?)span((?:\s[^>]*)?)>/g
    let m: RegExpExecArray | null
    while ((m = spanRegex.exec(rawLine)) !== null) {
      if (m[1] === '/') {
        lineStack.pop()
      } else {
        lineStack.push(`<span${m[2]}>`)
      }
    }

    // 关闭所有在行末仍打开的标签（包括继承的 + 本行新开的）
    const closeTags = lineStack.map(() => '</span>').reverse().join('')
    result.push(reopen + rawLine + closeTags)
    openSpans.length = 0
    openSpans.push(...lineStack)
  }

  return result
}

// 流式写入时跟随内容滚动
watch(() => props.content, () => {
  if (!props.isStreaming) return
  nextTick(() => {
    const el = codeWrapperRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
})

function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const fileCount = computed(() => files.value.length)
const totalLines = computed(() => files.value.reduce((sum, f) => sum + f.content.split('\n').length, 0))

// 将树结构展平为一维列表，支持任意嵌套深度
const flatTree = computed(() => {
  const result: { node: TreeNode; depth: number }[] = []
  function walk(nodes: TreeNode[], depth: number) {
    for (const node of nodes) {
      result.push({ node, depth })
      if (node.isDir && isExpanded(node.path) && node.children) {
        walk(node.children, depth + 1)
      }
    }
  }
  walk(fileTree.value, 0)
  return result
})

function getIconColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  const colorMap: Record<string, string> = {
    html: '#e34c26', htm: '#e34c26', css: '#264de4', js: '#f7df1e', ts: '#3178c6',
    jsx: '#61dafb', tsx: '#3178c6', vue: '#42b883', json: '#f7df1e', md: '#083fa1',
    py: '#3776ab', java: '#b07219', xml: '#e37933', svg: '#ffb13b', sh: '#89e051',
  }
  return colorMap[ext] || '#94a3b8'
}
</script>

<template>
  <div class="code-files-panel">
    <!-- 文件树侧栏 -->
    <div class="file-tree-sidebar">
      <div class="sidebar-header">
        <CodeOutlined />
        <span>项目文件</span>
        <span class="file-count">{{ fileCount }} 文件</span>
      </div>
      <div class="file-tree-content">
        <template v-if="flatTree.length">
          <div
            v-for="item in flatTree"
            :key="item.node.path"
            class="tree-node"
            :class="{
              'is-dir': item.node.isDir,
              'is-file': !item.node.isDir,
              'is-selected': !item.node.isDir && item.node.path === selectedPath,
              'is-streaming': item.node.file?.streaming,
            }"
            :style="{ paddingLeft: `${12 + item.depth * 16}px` }"
            @click="item.node.isDir ? toggleDir(item.node.path) : selectFile(item.node.path)"
          >
            <component
              :is="item.node.isDir ? (isExpanded(item.node.path) ? FolderOpenOutlined : FolderOutlined) : undefined"
              class="node-icon"
              :style="item.node.isDir ? {} : { color: getIconColor(item.node.name) }"
            />
            <span
              v-if="!item.node.isDir"
              class="file-dot"
              :style="{ background: getIconColor(item.node.name) }"
            />
            <span class="node-name">{{ item.node.name }}</span>
            <LoadingOutlined v-if="item.node.file?.streaming" class="streaming-indicator" />
          </div>
        </template>
        <div v-else class="tree-empty">
          <LoadingOutlined v-if="isStreaming" />
          <span>{{ isStreaming ? '等待代码生成...' : '暂无文件' }}</span>
        </div>
      </div>
    </div>

    <!-- 代码查看区 -->
    <div class="code-viewer">
      <div v-if="currentFile" class="code-viewer-inner">
        <div class="code-viewer-header">
          <div class="header-left">
            <span class="file-dot" :style="{ background: getIconColor(currentFile.name) }" />
            <span class="file-path">{{ currentFile.path }}</span>
            <span class="file-lang">{{ currentFile.language }}</span>
            <LoadingOutlined v-if="currentFile.streaming" class="header-streaming" />
          </div>
          <div class="header-right">
            <span class="line-count">{{ currentFile.content.split('\n').length }} 行</span>
            <button class="copy-btn" @click="handleCopy">
              <CheckOutlined v-if="copied" style="color: var(--accent)" />
              <CopyOutlined v-else />
              {{ copied ? '已复制' : '复制' }}
            </button>
          </div>
        </div>
        <div ref="codeWrapperRef" class="code-content-wrapper">
          <pre class="code-pre code-with-lines"><code class="hljs" v-html="highlightedCode" /></pre>
        </div>
      </div>
      <div v-else class="code-empty">
        <CodeOutlined class="empty-icon" />
        <p>{{ isStreaming ? 'AI 正在生成代码...' : '选择文件查看代码' }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.code-files-panel {
  display: flex;
  height: 100%;
  background: var(--bg-base);
  overflow: hidden;
}

/* ============ 文件树侧栏 ============ */
.file-tree-sidebar {
  width: 200px;
  min-width: 160px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--glass-border);
  background: var(--bg-base);
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
}

.file-count {
  margin-left: auto;
  font-size: 11px;
  font-weight: 400;
  color: var(--text-muted);
  background: var(--bg-elevated);
  padding: 1px 6px;
  border-radius: 10px;
}

.file-tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.file-tree-content::-webkit-scrollbar { width: 3px; }
.file-tree-content::-webkit-scrollbar-track { background: transparent; }
.file-tree-content::-webkit-scrollbar-thumb { background: var(--bg-elevated); border-radius: 2px; }

.tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  padding-right: 12px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
  transition: all 100ms ease;
  user-select: none;
}

.tree-node:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.tree-node.is-selected {
  background: rgba(34, 197, 94, 0.08);
  color: var(--accent);
}

.node-icon {
  font-size: 13px;
  flex-shrink: 0;
}

.file-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin: 0 2px;
}

.node-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.streaming-indicator {
  font-size: 11px;
  color: var(--accent);
  animation: blink 1s infinite;
  flex-shrink: 0;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.tree-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 20px;
  font-size: 12px;
  color: var(--text-muted);
}

/* ============ 代码查看器 ============ */
.code-viewer {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.code-viewer-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.code-viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 40px;
  border-bottom: 1px solid var(--glass-border);
  background: var(--bg-surface);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.file-path {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-lang {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--bg-elevated);
  color: var(--text-muted);
  text-transform: uppercase;
  flex-shrink: 0;
}

.header-streaming {
  font-size: 12px;
  color: var(--accent);
  animation: blink 1s infinite;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.line-count {
  font-size: 11px;
  color: var(--text-muted);
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
  background: transparent;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  cursor: pointer;
  transition: all 150ms ease;
}

.copy-btn:hover {
  color: var(--text-primary);
  border-color: var(--border-hover);
  background: var(--bg-elevated);
}

/* ============ 代码内容 ============ */
.code-content-wrapper {
  flex: 1;
  overflow: auto;
  background: var(--code-bg);
}

.code-content-wrapper::-webkit-scrollbar { width: 6px; height: 6px; }
.code-content-wrapper::-webkit-scrollbar-track { background: transparent; }
.code-content-wrapper::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

.code-with-lines {
  margin: 0;
  padding: 12px 16px 12px 0;
  overflow: visible;
  background: transparent;
  counter-reset: line;
}

.code-with-lines :deep(code) {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 14px;
  display: block;
}

.code-with-lines :deep(.hljs-ln) {
  display: block;
  padding-left: 52px;
  position: relative;
  height: 14px;
}

.code-with-lines :deep(.hljs-ln::before) {
  counter-increment: line;
  content: counter(line);
  position: absolute;
  left: 0;
  width: 40px;
  text-align: right;
  padding-right: 10px;
  height: 14px;
  line-height: 14px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 12px;
  user-select: none;
  border-right: 1px solid var(--border);
}

/* ============ 空状态 ============ */
.code-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 32px;
  opacity: 0.3;
}

.code-empty p {
  font-size: 13px;
  margin: 0;
}
</style>
