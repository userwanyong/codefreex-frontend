<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animId = 0

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const gl = canvas.getContext('webgl')
  if (!gl) return

  const vertSrc = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `

  const fragSrc = `
    precision highp float;
    uniform vec2 u_resolution;
    uniform float u_time;

    // Hash functions for pseudo-random
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float hash(float n) {
      return fract(sin(n) * 43758.5453);
    }

    // Smooth noise
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    // Code column: simulates falling characters as bright pulses
    float codeColumn(vec2 uv, float colX, float speed, float brightness) {
      // Vertical falling position
      float y = fract(uv.y + u_time * speed * 0.08);
      // Character-like segments
      float charSize = 0.04 + hash(vec2(colX * 7.0, 0.0)) * 0.02;
      float charY = floor(uv.y / charSize);
      float charOn = step(0.45, hash(vec2(colX * 13.0, charY + floor(u_time * speed * 2.0))));
      // Column glow width
      float colDist = abs(uv.x - colX);
      float colGlow = smoothstep(0.012, 0.0, colDist);
      // Vertical fade (brighter at bottom "leading edge")
      float leadEdge = smoothstep(0.0, 0.15, y) * smoothstep(1.0, 0.7, y);
      return colGlow * charOn * leadEdge * brightness;
    }

    // Grid pulse: subtle grid lines that breathe
    float gridPulse(vec2 uv) {
      float gridX = smoothstep(0.003, 0.0, abs(fract(uv.x * 60.0) - 0.5) - 0.48);
      float gridY = smoothstep(0.003, 0.0, abs(fract(uv.y * 40.0) - 0.5) - 0.48);
      float pulse = sin(u_time * 0.5) * 0.5 + 0.5;
      return (gridX + gridY) * 0.03 * pulse;
    }

    // Scanline sweep
    float scanline(vec2 uv) {
      float sweep = fract(u_time * 0.06);
      float dist = abs(uv.y - sweep);
      float line = smoothstep(0.008, 0.0, dist);
      return line * 0.15;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;
      vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
      vec2 p = uv * aspect;

      // Base dark color
      vec3 bg = vec3(0.015, 0.025, 0.04);

      // Green code rain columns
      float code = 0.0;
      float numCols = 40.0;
      for (float i = 0.0; i < 40.0; i++) {
        float colX = hash(vec2(i * 3.7, 1.0)) * aspect.x;
        float speed = 0.5 + hash(vec2(i * 2.3, 3.0)) * 1.5;
        float brightness = 0.3 + hash(vec2(i * 5.1, 7.0)) * 0.7;
        // Each column has slightly different timing
        float phase = hash(vec2(i * 1.1, 5.0)) * 6.28;
        float isActive = step(0.3, hash(vec2(i * 4.3, 2.0)));
        code += codeColumn(p, colX, speed, brightness) * isActive;
      }

      // Color palette
      vec3 greenBright = vec3(0.13, 0.95, 0.38);
      vec3 greenMid = vec3(0.05, 0.6, 0.2);
      vec3 greenDim = vec3(0.02, 0.25, 0.08);
      vec3 cyan = vec3(0.05, 0.5, 0.6);

      // Combine code rain
      vec3 col = bg;
      col += greenDim * code * 0.3;
      col += greenMid * pow(code, 1.5) * 0.5;
      col += greenBright * pow(code, 3.0) * 0.4;

      // Grid pulse
      float grid = gridPulse(uv);
      col += greenDim * grid;

      // Scanline sweep
      float scan = scanline(uv);
      col += cyan * scan;

      // Subtle horizontal rhythm bars
      float bars = 0.0;
      for (float i = 0.0; i < 6.0; i++) {
        float barY = hash(vec2(i * 7.0, 0.0));
        float barSpeed = 0.02 + hash(vec2(i * 3.0, 1.0)) * 0.03;
        float barPhase = u_time * barSpeed + i * 1.05;
        float barPulse = sin(barPhase) * 0.5 + 0.5;
        float barDist = abs(uv.y - barY);
        float bar = smoothstep(0.001, 0.0, barDist - 0.0005) * barPulse;
        bars += bar;
      }
      col += greenBright * bars * 0.08;

      // Vignette
      float vig = 1.0 - length((uv - 0.5) * 1.4);
      vig = smoothstep(-0.1, 0.6, vig);
      col *= vig * 0.85 + 0.15;

      // Subtle noise grain
      float grain = hash(uv * u_resolution + u_time) * 0.03;
      col += grain;

      gl_FragColor = vec4(col, 1.0);
    }
  `

  function createShader(type: number, source: string) {
    const shader = gl!.createShader(type)!
    gl!.shaderSource(shader, source)
    gl!.compileShader(shader)
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      console.error(gl!.getShaderInfoLog(shader))
      gl!.deleteShader(shader)
      return null
    }
    return shader
  }

  const vs = createShader(gl.VERTEX_SHADER, vertSrc)
  const fs = createShader(gl.FRAGMENT_SHADER, fragSrc)
  if (!vs || !fs) return

  const program = gl.createProgram()!
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program))
    return
  }

  gl.useProgram(program)

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)

  const aPos = gl.getAttribLocation(program, 'a_position')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  const uRes = gl.getUniformLocation(program, 'u_resolution')
  const uTime = gl.getUniformLocation(program, 'u_time')

  function resize() {
    const dpr = Math.min(window.devicePixelRatio, 2)
    canvas!.width = canvas!.clientWidth * dpr
    canvas!.height = canvas!.clientHeight * dpr
    gl!.viewport(0, 0, canvas!.width, canvas!.height)
  }

  resize()
  window.addEventListener('resize', resize)

  const start = performance.now()

  function draw() {
    const t = (performance.now() - start) / 1000
    gl!.uniform2f(uRes, canvas!.width, canvas!.height)
    gl!.uniform1f(uTime, t)
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)
    animId = requestAnimationFrame(draw)
  }

  draw()

  onUnmounted(() => {
    cancelAnimationFrame(animId)
    window.removeEventListener('resize', resize)
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
