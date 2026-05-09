<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animId = 0

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const gl = canvas.getContext('webgl')
  if (!gl) return

  // Shaders
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

    // Simplex-style noise
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289v2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                          -0.577350269189626, 0.024390243902439);
      vec2 i = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289v2(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                       + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                              dot(x12.zw, x12.zw)), 0.0);
      m = m * m;
      m = m * m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    // Fractal Brownian Motion
    float fbm(vec2 p) {
      float f = 0.0;
      float w = 0.5;
      for (int i = 0; i < 5; i++) {
        f += w * snoise(p);
        p *= 2.0;
        w *= 0.5;
      }
      return f;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;
      vec2 p = uv * 3.0;

      float t = u_time * 0.15;

      // Layered flow
      float n1 = fbm(p + vec2(t * 0.3, t * 0.2));
      float n2 = fbm(p * 1.5 + vec2(-t * 0.2, t * 0.4) + n1 * 0.5);
      float n3 = fbm(p * 0.8 + vec2(t * 0.1, -t * 0.15) + n2 * 0.3);

      // Domain warping for liquid feel
      float warp = fbm(p + fbm(p + fbm(p + vec2(t * 0.1))));

      // Combine
      float flow = n1 * 0.3 + n2 * 0.4 + n3 * 0.3;
      flow = flow * 0.5 + 0.5; // normalize to 0-1
      flow = smoothstep(0.3, 0.7, flow);

      // Warp intensity
      float warpFlow = smoothstep(0.35, 0.65, warp * 0.5 + 0.5);

      // Mix flow and warp
      float final = mix(flow, warpFlow, 0.5);

      // Dark base
      vec3 bg = vec3(0.02, 0.04, 0.08);

      // Green glow
      vec3 green1 = vec3(0.05, 0.45, 0.15);
      vec3 green2 = vec3(0.02, 0.25, 0.08);
      vec3 cyan = vec3(0.02, 0.3, 0.35);

      // Color mixing
      vec3 col = bg;
      col = mix(col, green2, final * 0.4);
      col = mix(col, green1, pow(final, 2.0) * 0.3);
      col = mix(col, cyan, pow(warpFlow, 3.0) * 0.15);

      // Vignette
      float vig = 1.0 - length((uv - 0.5) * 1.2);
      vig = smoothstep(0.0, 0.7, vig);
      col *= vig * 0.8 + 0.2;

      // Subtle scanlines
      float scan = sin(gl_FragCoord.y * 1.5) * 0.02 + 1.0;
      col *= scan;

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

  // Fullscreen quad
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
  <canvas ref="canvasRef" class="flow-bg" />
</template>

<style scoped>
.flow-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
</style>
