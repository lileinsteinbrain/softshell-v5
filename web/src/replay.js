// src/replay.js
// Simple replay: injects target R/U over time, affecting the system only via InputSampler.setVirtual/clearVirtual.
export class ReplayController {
  constructor(inputSampler, logger=null){
    this.input  = inputSampler;
    this.logger = logger;

    this.running = false;
    this.t0      = 0;
    this._raf    = null;

    // Three-phase script: chaotic (high U / low r) -> steady (low U / mid r) -> balanced (mid U / mid r)
    this.script = [
      { dur: 10.0, targetR: 0.15, targetU: 0.75, tag: 'replay:chaos'     },
      { dur: 12.0, targetR: 0.45, targetU: 0.20, tag: 'replay:stabilize' },
      { dur: 12.0, targetR: 0.30, targetU: 0.35, tag: 'replay:balance'   },
    ];
  }

  start(){
    if (this.running) return;         // prevent re-entry
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
    // Important: fully disable virtual input and clear buffers so nothing keeps pushing S/T
    this.input.clearVirtual();
    this.input.resetBuffers();
  }

  _loop(now){
    if (!this.running) return;
    const t = (now - this.t0) / 1000;

    // Find the current phase
    let acc = 0, seg = null, idx = 0;
    for (let i=0; i<this.script.length; i++){
      const s = this.script[i];
      if (t < acc + s.dur){ seg = s; idx = i; break; }
      acc += s.dur;
    }
    if (!seg){ this.stop(); return; }

    const localT = t - acc;

    // Slight jitter so it does not feel mechanical
    const jR = 0.03 * Math.sin(2*Math.PI*(0.30*localT));
    const jU = 0.05 * Math.sin(2*Math.PI*(0.24*localT) + 0.37);

    const targetR = Math.max(0, Math.min(1, seg.targetR + jR));
    const targetU = Math.max(0, Math.min(1, seg.targetU + jU));

    // Inject only through virtual input
    this.input.setVirtual(targetR, targetU);

    // Optional: add a log tag at the start of each phase (infrequent)
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