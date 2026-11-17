// web/src/vis/folds.js
// Low-resolution height field (H): disturbed by U, flattened by (1-S); normal shading shows "folding" vs "flattening".

export class FoldsRenderer {
  constructor(canvas){
    this.setSize(canvas.width, canvas.height);
    // Parameters (tune the feel)
    this.alpha = 0.12;  // tension (pull toward neighbourhood average)
    this.beta  = 0.25;  // impulse strength (triggered by U)
    this.zeta  = 0.08;  // global swell/press (driven by S deviation)
    this.decay = 0.995; // slight energy decay
    this._seed = 0;
  }

  setSize(W, H){
    // Low-resolution grid, scaled up when drawn
    const w = Math.max(160, Math.floor(W/6));
    const h = Math.max( 90, Math.floor(H/6));
    this.w = w; this.h = h;
    this.H = new Float32Array(w*h).fill(0);
    this.tmp = new Float32Array(w*h).fill(0);
  }

  // Simple deterministic pseudo-random
  _rand2(i){
    this._seed = (1103515245 * (this._seed + i) + 12345) >>> 0;
    return (this._seed & 0xffff) / 0xffff; // 0..1
  }

  // Neighbourhood average (Laplacian blur)
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
        dst[i] = (c*4 + n + s + e + wv) / 8; // light smoothing
      }
    }
    // Keep the border at 0
    for (let x=0; x<w; x++){ dst[idx(x,0)]=0; dst[idx(x,h-1)]=0; }
    for (let y=0; y<h; y++){ dst[idx(0,y)]=0; dst[idx(w-1,y)]=0; }
  }

  // Apply impulses at random points (strength ∝ U, count ∝ rNorm)
  _inject(H, U, rNorm){
    const w=this.w, h=this.h;
    const count = Math.floor(2 + 12 * rNorm); // 2..14 points
    const amp   = 0.015 + 0.08 * U;           // impulse amplitude
    for (let k=0; k<count; k++){
      const x = 1 + Math.floor(this._rand2(k*7)* (w-2));
      const y = 1 + Math.floor(this._rand2(k*11)*(h-2));
      const i = y*w + x;
      H[i] += (this._rand2(k*13)*2-1) * amp; // positive/negative impulse
    }
  }

  update(dt, state, aux){
    const { S } = state;
    const U     = aux?.U ?? 0;
    const rNorm = aux?.rNorm ?? 0;

    // 1) Tension flattening
    this._smooth(this.H, this.tmp);

    // 2) Combine: H += α*(H_smooth - H)
    const a = this.alpha;
    for (let i=0; i<this.H.length; i++){
      this.H[i] += a * (this.tmp[i] - this.H[i]);
      this.H[i] *= this.decay; // slight decay
    }

    // 3) External impulses (U and r set count and strength)
    if (U > 0.02 || rNorm > 0.02) {
      this._inject(this.H, U, rNorm);
    }

    // 4) Global swell/press (S deviation from baseline -> overall rise/fall)
    const g = this.zeta * (S - 0.5);
    if (Math.abs(g) > 1e-4){
      for (let i=0; i<this.H.length; i++){
        this.H[i] -= g * this.H[i];
      }
    }
  }

  draw(ctx, canvas){
    const w=this.w, h=this.h;
    // Normal calculation + shading
    const img = ctx.createImageData(w, h);
    const data = img.data;

    const idx = (x,y)=>y*w+x;
    const clamp = (v,lo,hi)=>Math.min(hi,Math.max(lo,v));

    for (let y=1; y<h-1; y++){
      for (let x=1; x<w-1; x++){
        const i = idx(x,y);
        const hx = (this.H[idx(x+1,y)] - this.H[idx(x-1,y)]) * 0.5;
        const hy = (this.H[idx(x,y+1)] - this.H[idx(x,y-1)]) * 0.5;

        // Map pseudo-normal to lighting: n = (-hx, -hy, 1)
        const nx = -hx, ny = -hy, nz = 1.0;
        const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
        const lx=0.3, ly=-0.4, lz=0.86; // light direction
        const dot = (nx*lx + ny*ly + nz*lz)/len;

        // Height -> shadow / tint
        const hval = clamp(this.H[i]*10, -1, 1); // amplify slightly
        const shade = clamp(0.55 + 0.45*dot, 0, 1);
        const tint  = 0.5 + 0.5*hval; // -1..1 → 0..1

        // Deep blue base + gold-white highlights
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

    // Draw to canvas (stretched)
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