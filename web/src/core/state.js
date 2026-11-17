// src/core/state.js
function clamp01(x){ return Math.max(0, Math.min(1, x)); }
function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }
function lerp(a, b, t){ return a + (b - a) * t; }

export class SystemState {
  constructor(){
    // ---- Tunable parameters (gentle settings) ----
    this.S0     = 0.45;  
    this.k_in   = 0.90;  
    this.k_out  = 0.45;  
    this.k_relax= 0.18;  

    this.Tmin   = 0.6;   
    this.Tmax   = 2.0;   
    this.gamma  = 0.15;  

    
    this.S = this.S0;    
    this.T = 1.0;        
    this.phase = 0;      
    this.t = 0;          

    this._idleSeed = Math.random() * 1000;
  }

  update(dt, rNorm, U){
    this.t += dt;

    // -- Idle floor: add a faint inner rhythm when there is no input --
    // Condition: when input and entropy are both very low, inject a tiny fluctuation (0.06-0.10)
    let Ueff = U;
    if (rNorm < 0.02 && U < 0.02) {
      const idle = 0.06 + 0.04 * Math.sin(0.7 * this.t + this._idleSeed);
      Ueff = Math.max(U, idle);
    }

    const r = clamp01(rNorm);

    // -- S dynamics: dS/dt = k_in*Ueff - k_out*r - k_relax*(S - S0) --
    const dS = this.k_in * Ueff - this.k_out * r - this.k_relax * (this.S - this.S0);
    this.S = clamp01(this.S + dt * dS);

    // -- Target tempo: higher S (more disorder) could map to faster or slower --
    // Here, more order -> slower and calmer: target = lerp(Tmin, Tmax, 1 - S)
    const targetT = lerp(this.Tmin, this.Tmax, 1 - this.S);

    // -- Tempo inertia: scaled by frame rate for steadier following --
    this.T += this.gamma * (targetT - this.T) * dt * 60;
    this.T = clamp(this.T, this.Tmin, this.Tmax);

    // -- Phase advance --
    this.phase += 2 * Math.PI * this.T * dt;
    if (this.phase > Math.PI * 2) this.phase -= Math.PI * 2;
  }
}