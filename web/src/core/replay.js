// src/replay.js
// Simple replay controller: injects target "event count" and "entropy U" values over time.
// It never edits state directly; it feeds virtual events and characters into InputSampler.

export class ReplayController {
  constructor(inputSampler, logger){
    this.input = inputSampler;
    this.logger = logger;
    this.running = false;
    this.t0 = 0;
    this.phase = 0;
    this._raf = null;

    // Three preset phases: chaotic (high U / low r) -> steady (low U / mid r) -> balanced (mid U / mid r)
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

    // Find the current phase
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
    // Slight jitter so it does not feel mechanical
    const jitterR = 0.03 * Math.sin(2*Math.PI*(0.3*localT));
    const jitterU = 0.05 * Math.sin(2*Math.PI*(0.2*localT + 0.37));

    const targetR = Math.max(0, Math.min(1, seg.targetR + jitterR)); // 0..1
    const targetU = Math.max(0, Math.min(1, seg.targetU + jitterU)); // 0..1

    // -- Inject virtual events to approach targetR --
    // InputSampler's rNorm ~= (events in recent window / 12) when windowMs = 6000,
    // so on average 12 * targetR events must be sustained within that window.
    // Here a probability decides whether to synthesise one key event this frame.
    const windowTargetEvents = 12 * targetR;
    // Roughly convert to "events needed per second"
    const eventsPerSec = windowTargetEvents / (this.input.windowMs / 1000);
    // Injection probability for this frame (dt ~= 1/60)
    const p = eventsPerSec / 60;
    if (Math.random() < p){
      this.input._pushEvent();
      // Generate a random character to make U more controllable;
      // use a wider character set when targetU is high
      const pool = targetU > 0.5 ? 'asdfghjklqwertyuiopzxcvbnm123456' : 'aaaaaeeeee     ';
      const ch = pool[Math.floor(Math.random() * pool.length)];
      this.input._pushChar(ch);
    }

    // -- Add a gentle bias to the entropy channel to approach targetU --
    // Done by pushing characters into charBuf (does not touch the U EMA, keeping the real signal path)
    if (Math.random() < 0.2){ // small chance per frame
      const pool2 = targetU > 0.6 ? 'xyzuvwbcmk012345' :
                    targetU < 0.25 ? '          aaaaa' : 'aeioubcdfg';
      this.input._pushChar(pool2[Math.floor(Math.random()*pool2.length)]);
    }

    // Give the logger a phase tag for later analysis
    if (this.logger && this.logger.annotate){
      this.logger.annotate(seg.tag);
    }

    this._raf = requestAnimationFrame(this._loop);
  }
}