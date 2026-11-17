// src/main.js
import { InputSampler } from './core/input.js';
import { SystemState } from './core/state.js';
import { Logger } from './core/logger.js';
import { WavesRenderer } from './vis/waves.js';
import { FoldsRenderer } from './vis/folds.js';
import { ReplayController } from './replay.js';

let waves = null;
let folds = null;

const canvas = document.getElementById('stage');
const ctx    = canvas.getContext('2d');
const ta     = document.getElementById('fuzzy');

// Logger + 按钮
const log = new Logger();
// 若 Logger 没有 annotate，就补个简易实现
if (typeof log.annotate !== 'function') {
  log._tag = 'live';
  log.annotate = (t) => { log._tag = t || 'live'; };
}
const btnDl    = document.getElementById('btn-download');
const btnClear = document.getElementById('btn-clear');
if (btnDl)    btnDl.onclick    = () => log.download();
if (btnClear) btnClear.onclick = () => log.clear();

resize();
window.addEventListener('resize', resize);

const input = new InputSampler();
input.attach(ta);

const sys = new SystemState();

// Replay 控制器与按钮
const replay    = new ReplayController(input, log);
const btnReplay = document.getElementById('btn-replay');
const btnStop   = document.getElementById('btn-stop');
if (btnReplay) btnReplay.onclick = () => {
  if (ta) ta.disabled = true;     // 回放时禁用手输，避免混杂
  log.annotate('replay:start');
  replay.start();
};
if (btnStop) btnStop.onclick = () => {
  replay.stop();
  if (ta) ta.disabled = false;
  log.annotate('live');
};

// —— 一键录屏（30s）+ 同步回放 —— //
const btnRec     = document.getElementById('btn-record');
const btnStopRec = document.getElementById('btn-stoprec');

let mediaRecorder = null;
let recChunks = [];
let recTimer  = null;

function startRecording(seconds = 30){
  try {
    const stream = canvas.captureStream(60);
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
  } catch (e) {
    console.error('MediaRecorder init failed:', e);
    return;
  }

  recChunks = [];
  mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size) recChunks.push(e.data); };
  mediaRecorder.onstop = () => {
    const blob = new Blob(recChunks, { type: 'video/webm' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g,'-');
    a.href = url;
    a.download = `softshell-demo-${ts}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 开始录制 + 开始回放 + 打标签
  mediaRecorder.start();
  if (ta) ta.disabled = true;
  log.annotate('record:start');
  replay.start();

  // 到点自动停止
  recTimer = setTimeout(stopRecording, seconds * 1000);
}

function stopRecording(){
  if (recTimer){ clearTimeout(recTimer); recTimer = null; }
  try {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  } catch(e) {
    console.warn('stop mediaRecorder error:', e);
  }

  // 停回放，恢复手输，回到 live 标签
  replay.stop();
  if (ta) ta.disabled = false;
  log.annotate('live');

  // 顺手导出 CSV（可注释掉）
  if (btnDl) btnDl.click();
}

if (btnRec)     btnRec.onclick     = () => startRecording(30);
if (btnStopRec) btnStopRec.onclick = () => stopRecording();

// —— 主循环 —— //
let last   = performance.now();
let paused = false;

// 日志节流（~100ms一行）
let accLog = 0;

document.addEventListener('visibilitychange', () => {
  paused = document.hidden;
  last = performance.now();
});

requestAnimationFrame(tick);

function tick(now){
  if (paused) return requestAnimationFrame(tick);

  // 限制单帧 dt（防卡顿后大步跳）
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;

  const { rNorm, U, events_dt = 0 } = input.sample();

  sys.update(dt, rNorm, U);
  
  render(ctx, sys, U, rNorm);


  drawHud({ R: rNorm, U, S: sys.S, T: sys.T });

  
  accLog += dt;
  if (accLog >= 0.10) {
    log.push({
      t: performance.now(),           // t_ms
      dt: accLog * 1000,              // dt_ms
      rNorm, U, S: sys.S, T: sys.T,
      events_dt,
      tag: (log._tag || 'live')
    });
    accLog = 0;
  }

  requestAnimationFrame(tick);
}

function render(ctx, sys, U, rNorm){
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  // 背景
  ctx.fillStyle = '#0b0f16';
  ctx.fillRect(0, 0, width, height);

  // 底层：折叠面
  if (folds) {
    folds.update(1/60, sys, { U, rNorm });
    folds.draw(ctx, canvas);
  }
  // 叠加：干涉场
  if (waves) {
    waves.draw(ctx, canvas, sys, { U, rNorm });
  }

  // 顶层：呼吸圈
  const cx = width * 0.5;
  const cy = height * 0.5;
  const baseR  = Math.min(width, height) * 0.28;
  const breath = 0.08 * baseR * Math.sin(sys.phase);
  const radius = baseR + breath;

  const grd = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
  const a = 0.30 + 0.25 * sys.S;
  grd.addColorStop(0.0, `rgba(220,223,226,${a})`);
  grd.addColorStop(1.0, `rgba(20,25,30,0.0)`);

  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

// HUD
function hudText(state){
  return `R=${state.R.toFixed(2)}  U=${state.U.toFixed(2)}  S=${state.S.toFixed(2)}  T=${state.T.toFixed(2)}Hz`;
}
function drawHud(state){
  const hud = document.getElementById('hud');
  if (hud) hud.textContent = hudText(state);
}

function resize(){
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  if (!waves)  waves = new WavesRenderer(canvas);
  else         waves.setSize(canvas.width, canvas.height);
  if (!folds)  folds = new FoldsRenderer(canvas);
  else         folds.setSize(canvas.width, canvas.height);
}