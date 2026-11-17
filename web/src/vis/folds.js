// web/src/vis/folds.js
// 低分辨率高度场（H），受 U 注入扰动、由 (1-S) 拉平；法线着色表现“褶皱/趋平”。

export class FoldsRenderer {
  constructor(canvas){
    this.setSize(canvas.width, canvas.height);
    // 参数（可调手感）
    this.alpha = 0.12;  // 张力（趋向邻域平均）
    this.beta  = 0.25;  // 外力注入幅度（由 U 触发）
    this.zeta  = 0.08;  // 全局压/鼓（由 S 偏离驱动）
    this.decay = 0.995; // 轻微能量衰减
    this._seed = 0;
  }

  setSize(W, H){
    // 低分辨率网格，再放大绘制
    const w = Math.max(160, Math.floor(W/6));
    const h = Math.max( 90, Math.floor(H/6));
    this.w = w; this.h = h;
    this.H = new Float32Array(w*h).fill(0);
    this.tmp = new Float32Array(w*h).fill(0);
  }

  // 简单伪随机（确定性）
  _rand2(i){
    this._seed = (1103515245 * (this._seed + i) + 12345) >>> 0;
    return (this._seed & 0xffff) / 0xffff; // 0..1
  }

  // 邻域平均（Laplacian blur）
  _smooth(src, dst){
    const w = this.w, h = this.h;
    const idx = (x,y)=>y*w+x;
    for (let y=1; y<h-1; y++){
      for (let x=1; x<w-1; x++){
        const i = idx(x,y);
        const c = src[i];
        const n = src[idx(x,y-1)];
        const s = src[idx(x,y+1)];
        const e = src[idx(x+1,y)];
        const wv= src[idx(x-1,y)];
        dst[i] = (c*4 + n + s + e + wv) / 8; // 轻平滑
      }
    }
    // 边界保持为 0
    for (let x=0; x<w; x++){ dst[idx(x,0)]=0; dst[idx(x,h-1)]=0; }
    for (let y=0; y<h; y++){ dst[idx(0,y)]=0; dst[idx(w-1,y)]=0; }
  }

  // 在若干随机点施加脉冲（强度 ∝ U，数量 ∝ rNorm）
  _inject(H, U, rNorm){
    const w=this.w, h=this.h;
    const count = Math.floor(2 + 12 * rNorm); // 2..14 个点
    const amp   = 0.015 + 0.08 * U;           // 脉冲幅度
    for (let k=0; k<count; k++){
      const x = 1 + Math.floor(this._rand2(k*7)* (w-2));
      const y = 1 + Math.floor(this._rand2(k*11)*(h-2));
      const i = y*w + x;
      H[i] += (this._rand2(k*13)*2-1) * amp; // 正负脉冲
    }
  }

  update(dt, state, aux){
    const { S } = state;
    const U     = aux?.U ?? 0;
    const rNorm = aux?.rNorm ?? 0;

    // 1) 张力趋平
    this._smooth(this.H, this.tmp);

    // 2) 合成：H += α*(H_smooth - H)
    const a = this.alpha;
    for (let i=0; i<this.H.length; i++){
      this.H[i] += a * (this.tmp[i] - this.H[i]);
      this.H[i] *= this.decay; // 轻微衰减
    }

    // 3) 外力注入（U、r 决定数量与强度）
    if (U > 0.02 || rNorm > 0.02) {
      this._inject(this.H, U, rNorm);
    }

    // 4) 全局压/鼓（S 偏离基线→整体起伏）
    const g = this.zeta * (S - 0.5);
    if (Math.abs(g) > 1e-4){
      for (let i=0; i<this.H.length; i++){
        this.H[i] -= g * this.H[i];
      }
    }
  }

  draw(ctx, canvas){
    const w=this.w, h=this.h;
    // 法线计算 + 着色
    const img = ctx.createImageData(w, h);
    const data = img.data;

    const idx = (x,y)=>y*w+x;
    const clamp = (v,lo,hi)=>Math.min(hi,Math.max(lo,v));

    for (let y=1; y<h-1; y++){
      for (let x=1; x<w-1; x++){
        const i = idx(x,y);
        const hx = (this.H[idx(x+1,y)] - this.H[idx(x-1,y)]) * 0.5;
        const hy = (this.H[idx(x,y+1)] - this.H[idx(x,y-1)]) * 0.5;

        // 伪法线映射到光照：n=( -hx, -hy, 1 )
        const nx = -hx, ny = -hy, nz = 1.0;
        const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
        const lx=0.3, ly=-0.4, lz=0.86; // 光方向
        const dot = (nx*lx + ny*ly + nz*lz)/len;

        // 高度→阴影/色调
        const hval = clamp(this.H[i]*10, -1, 1); // 放大一点
        const shade = clamp(0.55 + 0.45*dot, 0, 1);
        const tint  = 0.5 + 0.5*hval; // -1..1 → 0..1

        // 深蓝基底 + 金白高光
        const R = 22 + Math.floor(90*tint + 40*shade);
        const G = 28 + Math.floor(80*tint + 55*shade);
        const B = 38 + Math.floor(60*tint + 65*shade);

        const j = i<<2;
        data[j  ] = R;
        data[j+1] = G;
        data[j+2] = B;
        data[j+3] = 230;
      }
    }

    // 画到画布（拉伸）
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const octx = off.getContext('2d');
    octx.putImageData(img, 0, 0);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}