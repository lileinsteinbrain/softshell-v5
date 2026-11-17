// src/core/input.js

// —— 文本信息熵（0..1 归一化）——
function shannonEntropy(str) {
  if (!str || !str.length) return 0;
  const freq = new Map();
  for (const ch of str) freq.set(ch, (freq.get(ch) || 0) + 1);
  const n = str.length;
  let H = 0;
  for (const c of freq.values()) {
    const p = c / n;
    H -= p * Math.log2(p);
  }
  // 经验上 6bit 覆盖常见键入分布，截断到 [0,1]
  return Math.min(1, H / 6);
}

export class InputSampler {
  constructor(){
    this.windowMs = 6000;
    this.buf = [];
    this.charBuf = [];
    this.charBufMax = 200;

    this.alphaR = 0.28;
    this.alphaU = 0.22;

    this._rEMA = 0;
    this._uEMA = 0;

    this.ta = null;

    // —— 虚拟通道（Replay 专用）——
    this._virtual = null; // { r:0..1, u:0..1 } or null

    // 全局键盘事件（无论焦点在哪都能采到）
    window.addEventListener('keydown', (e) => {
      this._pushEvent();
      if (e.key && e.key.length === 1) this._pushChar(e.key);
    }, { passive: true });
  }

  attach(textarea){
    this.ta = textarea || null;
    if (this.ta){
      this.ta.addEventListener('input', () => {
        this._pushEvent();
        const v = this.ta.value;
        const ch = v.slice(-1);
        if (ch) this._pushChar(ch);
      }, { passive: true });
    }
  }

  // ====== 虚拟输入口（Replay 调用）======
  setVirtual(r01, u01){
    this._virtual = { r: Math.max(0, Math.min(1, r01)), u: Math.max(0, Math.min(1, u01)) };
  }
  clearVirtual(){
    this._virtual = null;
  }
  resetBuffers(){
    this.buf.length = 0;
    this.charBuf.length = 0;
  }
  // ====================================

  _pushEvent(){
    const t = performance.now();
    this.buf.push(t);
    const cutoff = t - this.windowMs;
    while (this.buf.length && this.buf[0] < cutoff) this.buf.shift();
  }
  _pushChar(ch){
    this.charBuf.push(ch);
    if (this.charBuf.length > this.charBufMax) this.charBuf.shift();
  }

  sample(){
    // 若有虚拟输入，直接走虚拟通道（仍通过 EMA，避免突变）
    if (this._virtual){
      this._rEMA = this._rEMA + (this._virtual.r - this._rEMA) * this.alphaR;
      this._uEMA = this._uEMA + (this._virtual.u - this._uEMA) * this.alphaU;
      return { rNorm: this._rEMA, U: this._uEMA, events_dt: 0 };
    }

    const now = performance.now();
    const cutoff = now - this.windowMs;
    while (this.buf.length && this.buf[0] < cutoff) this.buf.shift();

    // 6s 窗口内事件数 → 归一化 0..1（12 次≈满刻度）
    const perWindow = this.buf.length;
    const rNormRaw = Math.min(1, perWindow / 12);

    // 文本熵：优先用近期字符缓存；没有则用 textarea 尾段
    let txt = '';
    if (this.charBuf.length) txt = this.charBuf.join('');
    else if (this.ta && this.ta.value) txt = this.ta.value.slice(-200);
    const Uraw = shannonEntropy(txt);

    // EMA 平滑
    this._rEMA = this._rEMA + (rNormRaw - this._rEMA) * this.alphaR;
    this._uEMA = this._uEMA + (Uraw     - this._uEMA) * this.alphaU;

    return { rNorm: this._rEMA, U: this._uEMA, events_dt: perWindow };
  }
}