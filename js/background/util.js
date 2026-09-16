// Math helper methods for the backgrounds to use

// keep a number between lo and hi
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Linear interpolation (lerp) from a to b by t (%)
export const lerp = (a, b, t) => a + (b - a) * t;

// Seed rng
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// grab a random item out of an array
export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

// turn a hex colour + alpha into an rgba() string
export function rgba(hex, alpha) {
  let h = hex.replace('#', '');
  // expand shorthand like abc into aabbcc
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// particles pool
export function createParticles(max = 320) {
  const pool = [];
  return {
    list: pool,
    spawn(p) {
      if (pool.length >= max) pool.shift();
      pool.push(p);
    },
    update(dt, gravity = 0) {
      for (let i = pool.length - 1; i >= 0; i -= 1) {
        const p = pool[i];
        p.life -= dt;
        if (p.life <= 0) {
          pool.splice(i, 1);
          continue;
        }
        p.vy += gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    },
    clear() {
      pool.length = 0;
    },
  };
}
