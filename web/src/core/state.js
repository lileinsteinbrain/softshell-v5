// src/core/state.js
function clamp01(x){ return Math.max(0, Math.min(1, x)); }
function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }
function lerp(a, b, t){ return a + (b - a) * t; }

export class SystemState {
  constructor(){
    // ---- 可调参数（更“温和”）----
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

    // —— idle floor：无输入时给一点“内源节律” ——
    // 条件：输入很少且熵也很低时，注入极轻微波动（0.06~0.10）
    let Ueff = U;
    if (rNorm < 0.02 && U < 0.02) {
      const idle = 0.06 + 0.04 * Math.sin(0.7 * this.t + this._idleSeed);
      Ueff = Math.max(U, idle);
    }

    const r = clamp01(rNorm);

    // —— S 动力学：dS/dt = k_in*Ueff - k_out*r - k_relax*(S - S0) ——
    const dS = this.k_in * Ueff - this.k_out * r - this.k_relax * (this.S - this.S0);
    this.S = clamp01(this.S + dt * dS);

    // —— 目标频率：S 越高（越乱），可选择更快或更慢的映射 —— 
    // 这里保持“秩序高→更慢、平和”：target = lerp(Tmin, Tmax, 1 - S)
    const targetT = lerp(this.Tmin, this.Tmax, 1 - this.S);

    // —— 频率惯性：按帧率尺度让跟随更稳 —— 
    this.T += this.gamma * (targetT - this.T) * dt * 60;
    this.T = clamp(this.T, this.Tmin, this.Tmax);

    // —— 相位推进 —— 
    this.phase += 2 * Math.PI * this.T * dt;
    if (this.phase > Math.PI * 2) this.phase -= Math.PI * 2;
  }
}