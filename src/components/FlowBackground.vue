<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animId = 0

function isDarkMode(): boolean {
  return document.documentElement.getAttribute('data-theme') !== 'light'
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const canvasEl = canvas
  const ctx2 = ctx

  // Code snippets pool
  const codePool = [
    'const app = createApp(',
    'async function generate(',
    'export default {',
    'return res.data.map(',
    'import { ref } from "vue"',
    'await deploy(code)',
    'if (!token) return',
    'const users = query(',
    'router.push("/home")',
    'response.json()',
    '<template>',
    'npm run build',
    'git push origin main',
    'SELECT * FROM apps',
    'docker compose up',
    'class App extends Vue',
    'interface User {',
    'type Props = {',
    'console.log(data)',
    'catch (err) {',
    'Promise.all(reqs)',
    'new WebSocket(url)',
    'fetch("/api/apps")',
    'Math.random() * 100',
    'JSON.parse(body)',
    'addEventListener(',
    'requestAnimationFrame',
    'Object.keys(obj)',
    'Array.from(list)',
    'setTimeout(() => {',
    'export type API = {',
    'vue-router',
    'ant-design-vue',
    'defineComponent(',
    'computed(() =>',
    'watchEffect(() =>',
    'onMounted(() =>',
    'reactive({ name:',
    'v-model="value"',
    'v-for="item in"',
  ]

  // Column state
  interface Column {
    x: number
    speed: number
    chars: string[]
    y: number
    opacity: number
    fontSize: number
    lastCharTime: number
    charInterval: number
  }

  let columns: Column[] = []
  let w = 0
  let h = 0
  const colWidth = 12
  const pickSnippet = () => codePool[Math.floor(Math.random() * codePool.length)] ?? 'const code = []'

  function init() {
    const dpr = Math.min(window.devicePixelRatio, 2)
    w = canvasEl.clientWidth
    h = canvasEl.clientHeight
    canvasEl.width = w * dpr
    canvasEl.height = h * dpr
    ctx2.setTransform(dpr, 0, 0, dpr, 0, 0)

    const numCols = Math.ceil(w / colWidth)
    columns = []
    for (let i = 0; i < numCols; i++) {
      // Edge columns always active to avoid gaps
      const isEdge = i < 2 || i >= numCols - 2
      if (!isEdge && Math.random() > 0.35) continue
      const snippet = pickSnippet()
      columns.push({
        x: i * colWidth + Math.random() * 3 - 1,
        speed: 0.3 + Math.random() * 0.8,
        chars: snippet.split(''),
        y: Math.random() * h * 1.5 - h * 0.25,
        opacity: 0.18 + Math.random() * 0.25,
        fontSize: 11 + Math.floor(Math.random() * 3),
        lastCharTime: 0,
        charInterval: 40 + Math.random() * 80,
      })
    }
  }

  init()
  window.addEventListener('resize', init)

  let lastTime = performance.now()

  function draw() {
    const now = performance.now()
    const dt = now - lastTime
    lastTime = now

    const dark = isDarkMode()

    // Theme colors
    const bgFill = dark ? 'rgba(8, 14, 24, 1)' : 'rgba(248, 250, 252, 1)'
    const charR = dark ? 20 : 20
    const charGMin = dark ? 150 : 180
    const charGMax = dark ? 255 : 220
    const charB = dark ? 60 : 80
    const headR = dark ? 34 : 22
    const headG = dark ? 197 : 163
    const headB = dark ? 94 : 74
    const headGlowColor = dark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(22, 163, 74, 0.2)'
    const flashColor = dark ? 'rgba(34, 197, 94, 0.12)' : 'rgba(22, 163, 74, 0.06)'

    // Fade trail
    ctx2.fillStyle = bgFill
    ctx2.fillRect(0, 0, w, h)

    for (const col of columns) {
      col.y += col.speed * dt * 0.06

      // Reset when off screen
      if (col.y > h + 200) {
        col.y = -100 - Math.random() * 300
        const snippet = pickSnippet()
        col.chars = snippet.split('')
        col.opacity = 0.18 + Math.random() * 0.25
      }

      // Draw each character
      const totalHeight = col.chars.length * (col.fontSize + 2)
      for (let i = 0; i < col.chars.length; i++) {
        const charY = col.y - totalHeight + i * (col.fontSize + 2)
        if (charY < -20 || charY > h + 20) continue

        // Leading chars are brighter, trailing chars fade
        const distFromLead = (col.chars.length - 1 - i) / col.chars.length
        const alpha = col.opacity * (1 - distFromLead * 0.7)
        const char = col.chars[i]
        if (!char) continue

        // Head glow
        if (i === col.chars.length - 1) {
          ctx2.fillStyle = `rgba(${headR}, ${headG}, ${headB}, ${alpha * 3})`
          ctx2.font = `${col.fontSize}px "JetBrains Mono", "Fira Code", monospace`
          ctx2.fillText(char, col.x, charY)
          // Glow
          ctx2.shadowColor = headGlowColor
          ctx2.shadowBlur = 8
          ctx2.fillText(char, col.x, charY)
          ctx2.shadowBlur = 0
        } else {
          // Gradient from bright to dim
          const g = Math.floor(charGMin + (charGMax - charGMin) * (1 - distFromLead))
          ctx2.fillStyle = `rgba(${charR}, ${g}, ${charB}, ${alpha})`
          ctx2.font = `${col.fontSize}px "JetBrains Mono", "Fira Code", monospace`
          ctx2.fillText(char, col.x, charY)
        }
      }
    }

    // Occasional bright flash on a random column
    if (Math.random() < 0.003) {
      const flashCol = columns[Math.floor(Math.random() * columns.length)]
      if (flashCol) {
        const flashY = flashCol.y - 20
        ctx2.fillStyle = flashColor
        ctx2.fillRect(flashCol.x - 4, flashY - 30, colWidth + 8, 60)
      }
    }

    animId = requestAnimationFrame(draw)
  }

  // Initial clear
  ctx2.fillStyle = isDarkMode() ? 'rgba(8, 14, 24, 1)' : 'rgba(248, 250, 252, 1)'
  ctx2.fillRect(0, 0, w, h)

  draw()

  onUnmounted(() => {
    cancelAnimationFrame(animId)
    window.removeEventListener('resize', init)
  })
})
</script>

<template>
  <canvas ref="canvasRef" class="code-bg" />
</template>

<style scoped>
.code-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
</style>
