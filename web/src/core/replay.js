// src/replay.js
// 简单回放控制器：按时间片注入“事件数”和“熵U”的目标值。
// 原理：不直接改 state，而是往 InputSampler 注入“虚拟事件”和“虚拟字符”。

export class ReplayController {
  constructor(inputSampler, logger){
    this.input = inputSampler;
    this.logger = logger;
    this.running = false;
    this.t0 = 0;
    this.phase = 0;
    this._raf = null;

    // 预设3段：乱(高U/低r) → 稳(低U/中r) → 平衡(中U/中r)
    this.script = [
      { dur: 10.0, targetR: 0.15, targetU: 0.75, tag: 'replay:chaos' },
      { dur: 12.0, targetR: 0.45, targetU: 0.20, tag: 'replay:stabilize' },
      { dur: 12.0, targetR: 0.30, targetU: 0.35, tag: 'replay:balance' },
    ];
  }

  start(){
    if (this.running) return;
    this.running = true;
    this.t0 = performance.now();
    this.phase = 0;
    this._loop();
  }

  stop(){
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  _loop = () => {
    if (!this.running) return;
    const now = performance.now();
    const t = (now - this.t0) / 1000;

    // 计算当前段
    let acc = 0, seg = null, idx = 0;
    for (let i = 0; i < this.script.length; i++){
      const s = this.script[i];
      if (t < acc + s.dur){ seg = s; idx = i; break; }
      acc += s.dur;
    }
    if (!seg){
      this.stop();
      return;
    }

    const localT = t - acc;
    // 轻微抖动，避免过于机械
    const jitterR = 0.03 * Math.sin(2*Math.PI*(0.3*localT));
    const jitterU = 0.05 * Math.sin(2*Math.PI*(0.2*localT + 0.37));

    const targetR = Math.max(0, Math.min(1, seg.targetR + jitterR)); // 0..1
    const targetU = Math.max(0, Math.min(1, seg.targetU + jitterU)); // 0..1

    // —— 注入“虚拟事件”以逼近 targetR ——
    // 你的 InputSampler 的 rNorm ≈ (最近窗口事件数 / 12)（当 windowMs=6000）
    // 所以需要在这个时间窗内平均维持 12*targetR 个事件。
    // 这里用一个概率在本帧“合成一次按键事件”。
    const windowTargetEvents = 12 * targetR;
    // 大致换成“每秒需要多少事件”
    const eventsPerSec = windowTargetEvents / (this.input.windowMs / 1000);
    // 本帧注入概率（dt≈1/60）
    const p = eventsPerSec / 60;
    if (Math.random() < p){
      this.input._pushEvent();
      // 造一个随机字符，提升 U 的可控性
      // 当 targetU 高时用更分散的字符集
      const pool = targetU > 0.5 ? 'asdfghjklqwertyuiopzxcvbnm123456' : 'aaaaaeeeee     ';
      const ch = pool[Math.floor(Math.random() * pool.length)];
      this.input._pushChar(ch);
    }

    // —— 额外往熵通道加点“温和偏置”，更接近 targetU —— 
    // 通过往 charBuf 塞字符实现（不会直接改 U EMA，保持真实路径）
    if (Math.random() < 0.2){ // 每帧小概率
      const pool2 = targetU > 0.6 ? 'xyzuvwbcmk012345' :
                    targetU < 0.25 ? '          aaaaa' : 'aeioubcdfg';
      this.input._pushChar(pool2[Math.floor(Math.random()*pool2.length)]);
    }

    // 给 logger 一个段落标签，方便后续分析
    if (this.logger && this.logger.annotate){
      this.logger.annotate(seg.tag);
    }

    this._raf = requestAnimationFrame(this._loop);
  }
}