{\rtf1\ansi\ansicpg1252\cocoartf2865
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fnil\fcharset0 .AppleSystemUIFontMonospaced-Regular;}
{\colortbl;\red255\green255\blue255;\red155\green162\blue177;}
{\*\expandedcolortbl;;\cssrgb\c67059\c69804\c74902;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx560\tx1120\tx1680\tx2240\tx2800\tx3360\tx3920\tx4480\tx5040\tx5600\tx6160\tx6720\pardirnatural\partightenfactor0

\f0\fs26 \cf2 import \{ InputSampler \} from './core/input.js';\
import \{ SystemState \} from './core/state.js';\
import \{ Logger \} from './core/logger.js';\
\
const canvas = document.getElementById('stage');\
const ctx = canvas.getContext('2d');\
const hud = document.getElementById('hud');\
const ta = document.getElementById('fuzzy');\
const btnDemo = document.getElementById('btn-demo');\
const btnDl = document.getElementById('btn-download');\
const btnClear = document.getElementById('btn-clear');\
\
resize(); window.addEventListener('resize', resize);\
\
const input = new InputSampler(); input.attach(ta);\
const sys = new SystemState(); const log = new Logger();\
\
let demo = null;\
btnDemo.onclick = () => \{\
  demo = [\
    \{ dur: 3000, r: 0.05, U: 0.8 \},\
    \{ dur: 6000, r: 0.60, U: 0.3 \},\
    \{ dur: 6000, r: 0.40, U: 0.4 \},\
  ]; demo.t = 0;\
\};\
btnDl.onclick = () => log.download();\
btnClear.onclick = () => log.clear();\
\
let last = performance.now();\
requestAnimationFrame(tick);\
\
function tick(now)\{\
  const dt = now - last; last = now;\
  let \{ rNorm \} = input.sampleRate();\
  let U = input.sampleUncertainty();\
\
  if (demo && demo.length)\{\
    demo.t += dt;\
    if (demo.t > demo[0].dur)\{ demo.shift(); demo.t = 0; \}\
    if (demo.length)\{ rNorm = demo[0].r; U = demo[0].U; \} else demo = null;\
  \}\
\
  const \{ S, T \} = sys.step(rNorm, U);\
  log.push(\{ Rnorm:rNorm, U, S, T \});\
  drawDebug(\{ S, T \});\
  hud.textContent = `R=$\{rNorm.toFixed(2)\}  U=$\{U.toFixed(2)\}  S=$\{S.toFixed(2)\}  T=$\{T.toFixed(2)\}  (type & click to perturb)`;\
  requestAnimationFrame(tick);\
\}\
\
function drawDebug(\{ S, T \})\{\
  const w=canvas.width, h=canvas.height;\
  ctx.clearRect(0,0,w,h);\
  ctx.fillStyle='#0b0f16'; ctx.fillRect(0,0,w,h);\
  const t = performance.now()/1000;\
  const base = Math.min(w,h)*0.2;\
  const amp  = base*0.2;\
  const r = base + amp * Math.sin(2*Math.PI*T*t);\
  ctx.beginPath(); ctx.arc(w/2,h/2,r,0,Math.PI*2);\
  const alpha = 0.25 + 0.6*(1 - S);\
  ctx.fillStyle = `rgba(180,220,255,$\{alpha.toFixed(3)\})`; ctx.fill();\
  const hue = Math.round(220 - 120*(1 - S));\
  ctx.strokeStyle = `hsl($\{hue\} 90% 70%)`; ctx.lineWidth=2; ctx.stroke();\
\}\
\
function resize()\{\
  const dpr = Math.min(2, window.devicePixelRatio || 1);\
  canvas.width = Math.floor(window.innerWidth * dpr);\
  canvas.height= Math.floor(window.innerHeight* dpr);\
  canvas.style.width = `$\{window.innerWidth\}px`;\
  canvas.style.height= `$\{window.innerHeight\}px`;\
  ctx.setTransform(dpr,0,0,dpr,0,0);\
\}}