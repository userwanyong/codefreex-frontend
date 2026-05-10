/**
 * 从流式 Markdown 内容中解析出代码文件
 * 支持格式: ```lang:filepath 或 ```filepath
 */

export interface CodeFile {
  path: string
  name: string
  language: string
  content: string
  streaming: boolean
}

interface FileTreeNode {
  name: string
  path: string
  isDir: boolean
  children?: FileTreeNode[]
  file?: CodeFile
}

/** 从 code block 的 lang 标记中提取 filepath 和 language */
function parseLangHint(lang: string): { language: string; filepath: string } | null {
  if (!lang) return null

  // ```html:index.html
  if (lang.includes(':')) {
    const idx = lang.indexOf(':')
    return { language: lang.slice(0, idx).trim(), filepath: lang.slice(idx + 1).trim() }
  }

  // ```index.html 或 ```/src/app.js (纯路径，无 language)
  if (lang.includes('.') || lang.includes('/')) {
    const ext = lang.includes('.') ? lang.split('.').pop()! : ''
    return { language: extToLang(ext), filepath: lang.trim() }
  }

  // ```html (只有 language，无 filepath)
  return { language: lang.trim(), filepath: '' }
}

function extToLang(ext: string): string {
  const map: Record<string, string> = {
    html: 'html', htm: 'html', css: 'css', js: 'javascript', ts: 'typescript',
    jsx: 'javascript', tsx: 'typescript', vue: 'vue', json: 'json', md: 'markdown',
    py: 'python', java: 'java', xml: 'xml', svg: 'xml', txt: 'plaintext',
  }
  return map[ext] || ext || 'plaintext'
}

const LANG_EXT_MAP: Record<string, string> = {
  html: 'html', css: 'css', javascript: 'js', typescript: 'ts', js: 'js', ts: 'ts',
  jsx: 'jsx', tsx: 'tsx', vue: 'vue', json: 'json', python: 'py', java: 'java',
  xml: 'xml', markdown: 'md', bash: 'sh', shell: 'sh', plaintext: 'txt',
}

function langToExt(lang: string): string {
  return LANG_EXT_MAP[lang] || lang
}

/**
 * 解析 Markdown 内容，提取所有代码文件
 * 支持流式增量内容（未关闭的代码块视为正在写入的文件）
 */
export function parseCodeFiles(content: string): CodeFile[] {
  const files: CodeFile[] = []
  const lines = content.split('\n')

  let inCodeBlock = false
  let currentLang = ''
  let currentFilepath = ''
  let currentLangHint = ''
  let codeLines: string[] = []

  // 在代码块之前的文本中查找 filepath 提示
  let pendingFilepath = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 检测代码块开始
    if (!inCodeBlock && line.startsWith('```')) {
      inCodeBlock = true
      currentLangHint = line.slice(3).trim()
      const parsed = parseLangHint(currentLangHint)
      currentLang = parsed?.language || ''
      currentFilepath = parsed?.filepath || pendingFilepath
      codeLines = []
      pendingFilepath = ''
      continue
    }

    // 检测代码块结束
    if (inCodeBlock && line.startsWith('```')) {
      inCodeBlock = false
      const fileContent = codeLines.join('\n')

      if (fileContent.trim()) {
        // 如果没有 filepath，根据语言生成默认文件名
        if (!currentFilepath) {
          const ext = langToExt(currentLang)
          const idx = files.filter(f => f.language === currentLang).length
          currentFilepath = ext ? `file${idx || ''}.${ext}` : `file${idx || ''}.txt`
        }

        files.push({
          path: currentFilepath.startsWith('/') ? currentFilepath : `/${currentFilepath}`,
          name: currentFilepath.split('/').pop() || currentFilepath,
          language: currentLang,
          content: fileContent,
          streaming: false,
        })
      }

      currentLang = ''
      currentFilepath = ''
      codeLines = []
      continue
    }

    if (inCodeBlock) {
      codeLines.push(line)
    } else {
      // 在代码块外检测 filepath 提示
      const filepathMatch = line.match(/(?:文件|File|filename|path)[：:]\s*[`"']?([^\s`"']+)/i)
        || line.match(/(?:创建|修改|更新)\s*[`"']([^`"']+)[`"']/)
        || line.match(/^[`']([^`']+\.\w{1,10})[`']\s*[:：]/)
      if (filepathMatch) {
        pendingFilepath = filepathMatch[1]
      } else {
        pendingFilepath = ''
      }
    }
  }

  // 处理未关闭的代码块（正在流式写入中）
  if (inCodeBlock && codeLines.length > 0) {
    if (!currentFilepath) {
      const ext = langToExt(currentLang)
      const idx = files.filter(f => f.language === currentLang).length
      currentFilepath = ext ? `file${idx || ''}.${ext}` : `file${idx || ''}.txt`
    }

    files.push({
      path: currentFilepath.startsWith('/') ? currentFilepath : `/${currentFilepath}`,
      name: currentFilepath.split('/').pop() || currentFilepath,
      language: currentLang,
      content: codeLines.join('\n'),
      streaming: true,
    })
  }

  return files
}

/** 将文件列表构建为目录树 */
export function buildFileTree(files: CodeFile[]): FileTreeNode[] {
  const root: FileTreeNode[] = []

  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean)
    let currentLevel = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const existingNode = currentLevel.find(n => n.name === part)

      if (existingNode) {
        if (!isLast) {
          currentLevel = existingNode.children || []
        } else {
          existingNode.file = file
        }
      } else {
        if (isLast) {
          const node: FileTreeNode = { name: part, path: file.path, isDir: false, file }
          currentLevel.push(node)
        } else {
          const dirPath = '/' + parts.slice(0, i + 1).join('/')
          const node: FileTreeNode = { name: part, path: dirPath, isDir: true, children: [] }
          currentLevel.push(node)
          currentLevel = node.children!
        }
      }
    }
  }

  // 排序：目录在前，文件在后，按名称排列
  function sortNodes(nodes: FileTreeNode[]): FileTreeNode[] {
    return nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    }).map(node => {
      if (node.children) node.children = sortNodes(node.children)
      return node
    })
  }

  return sortNodes(root)
}

/** 获取文件的语言图标类型 */
export function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  const iconMap: Record<string, string> = {
    html: 'html', htm: 'html', css: 'css', js: 'js', ts: 'ts',
    jsx: 'js', tsx: 'ts', vue: 'vue', json: 'json', md: 'md',
    py: 'py', java: 'java', xml: 'xml', svg: 'xml', sh: 'sh',
  }
  return iconMap[ext] || 'file'
}
