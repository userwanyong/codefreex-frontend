<script setup lang="ts">
import { computed, ref } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import { CopyOutlined, CheckOutlined } from '@ant-design/icons-vue'

const props = defineProps<{
  content: string
}>()

const copiedId = ref<string | null>(null)

const renderer = new marked.Renderer()
renderer.code = ({ text, lang }: { text?: string; lang?: string }) => {
  const id = `code-${Math.random().toString(36).slice(2, 9)}`
  const language = lang || 'plaintext'
  let highlighted: string
  try {
    highlighted = hljs.highlight(text || '', { language }).value
  } catch {
    highlighted = hljs.highlightAuto(text || '').value
  }
  return `<div class="md-code-block" data-id="${id}">
    <div class="code-header"><span class="code-lang">${language}</span><button class="copy-btn" data-copy-id="${id}">复制</button></div>
    <pre><code class="hljs language-${language}">${highlighted}</code></pre>
  </div>`
}

marked.setOptions({
  renderer,
  breaks: true,
  gfm: true,
})

const html = computed(() => marked.parse(props.content) as string)

function handleCopy(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.classList.contains('copy-btn')) {
    const block = target.closest('.md-code-block')
    const code = block?.querySelector('code')?.textContent || ''
    navigator.clipboard.writeText(code).then(() => {
      const id = target.getAttribute('data-copy-id')
      copiedId.value = id
      target.textContent = '已复制'
      setTimeout(() => {
        if (copiedId.value === id) copiedId.value = null
      }, 2000)
    })
  }
}
</script>

<template>
  <div class="markdown-body" v-html="html" @click="handleCopy" />
</template>

<style scoped>
.markdown-body {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary);
  word-wrap: break-word;
}

.markdown-body :deep(p) {
  margin: 0 0 12px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  color: var(--text-primary);
  font-weight: 700;
  margin: 16px 0 8px;
  line-height: 1.3;
}

.markdown-body :deep(h1) { font-size: 20px; }
.markdown-body :deep(h2) { font-size: 17px; }
.markdown-body :deep(h3) { font-size: 15px; }

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 20px;
  margin: 8px 0;
}

.markdown-body :deep(li) {
  margin: 4px 0;
}

.markdown-body :deep(a) {
  color: var(--accent);
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid var(--accent);
  padding: 8px 16px;
  margin: 12px 0;
  background: var(--bg-elevated);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  color: var(--text-secondary);
}

.markdown-body :deep(strong) {
  color: var(--text-primary);
  font-weight: 600;
}

/* Code Block */
.markdown-body :deep(.md-code-block) {
  margin: 12px 0;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #0d1117;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.markdown-body :deep(.code-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.markdown-body :deep(.code-lang) {
  font-size: 12px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  text-transform: uppercase;
}

.markdown-body :deep(.copy-btn) {
  font-size: 12px;
  color: var(--text-muted);
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-sm);
  padding: 2px 10px;
  cursor: pointer;
  transition: all 150ms ease;
  font-family: var(--font-sans);
}

.markdown-body :deep(.copy-btn:hover) {
  color: var(--text-primary);
  border-color: rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.06);
}

.markdown-body :deep(pre) {
  margin: 0;
  padding: 14px 16px;
  overflow-x: auto;
  background: transparent;
}

.markdown-body :deep(code) {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
}

/* Inline code */
.markdown-body :deep(:not(pre) > code) {
  background: var(--bg-elevated);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  color: #f97316;
}

/* Table */
.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 13px;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--glass-border);
  padding: 8px 12px;
  text-align: left;
}

.markdown-body :deep(th) {
  background: var(--bg-elevated);
  color: var(--text-primary);
  font-weight: 600;
}

/* HR */
.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--glass-border);
  margin: 16px 0;
}
</style>
