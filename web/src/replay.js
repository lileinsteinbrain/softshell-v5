// src/replay.js
// 简单回放：按时间注入目标 R/U；只经由 InputSampler 的 setVirtual/clearVirtual 影响系统。
export class ReplayController {
  constructor(inputSampler, logger=null){
    this.input  = inputSampler;
    this.logger = logger;

    this.running = false;
    this.t0      = 0;
    this._raf    = null;

    // 三段脚本：乱(高U/低r) → 稳(低U/中r) → 平衡(中U/中r)
    this.script = [
      { dur: 10.0, targetR: 0.15, targetU: 0.75, tag: 'replay:chaos'     },
      { dur: 12.0, targetR: 0.45, targetU: 0.20, tag: 'replay:stabilize' },
      { dur: 12.0, targetR: 0.30, targetU: 0.35, tag: 'replay:balance'   },
    ];
  }

  start(){
    if (this.running) return;         // 防重入
    this.running = true;
    this.t0 = performance.now();
    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
  }

  stop(){
    if (!this.running) return;
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    // 关键：彻底关闭虚拟输入 + 清空缓存，避免残留推动 S/T
    this.input.clearVirtual();
    this.input.resetBuffers();
  }

  _loop(now){
    if (!this.running) return;
    const t = (now - this.t0) / 1000;

    // 找当前阶段
    let acc = 0, seg = null, idx = 0;
    for (let i=0; i<this.script.length; i++){
      const s = this.script[i];
      if (t < acc + s.dur){ seg = s; idx = i; break; }
      acc += s.dur;
    }
    if (!seg){ this.stop(); return; }

    const localT = t - acc;

    // 轻微 jitter，避免机械
    const jR = 0.03 * Math.sin(2*Math.PI*(0.30*localT));
    const jU = 0.05 * Math.sin(2*Math.PI*(0.24*localT) + 0.37);

    const targetR = Math.max(0, Math.min(1, seg.targetR + jR));
    const targetU = Math.max(0, Math.min(1, seg.targetU + jU));

    // 只通过虚拟输入注入
    this.input.setVirtual(targetR, targetU);

    // 可选：每段开始时打个日志 tag（不会很频繁）
    if (this.logger && Math.abs(localT) < 0.016){
      this.logger.push({
        t: performance.now(),
        dt: 0,
        rNorm: targetR, U: targetU,
        S: -1, T: -1,
        events_dt: 0,
        tag: seg.tag
      });
    }

    this._raf = requestAnimationFrame(this._loop);
  }
}