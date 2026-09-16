// Osu!

import { clamp, createParticles, lerp, mulberry32, rgba } from './util.js';

// Speed
const SPEED = 2.5;

// Sliders
export const OSU_CONTROLS = [
  { key: 'speed', label: 'Speed', min: 0.5, max: 3, step: 0.05, def: SPEED },
];

// Distance between consecutive objects, in hit-circle radii */
const JUMP_MIN = 4.4;
const JUMP_VAR = 4.2;

/* Possible rhythms */
const RHYTHMS = [1, 1, 0.5, 2]; 

/* timing based on speed. Changed by retune() whenever the speed
   slider changes */
let curSpeed = SPEED;
let BPM = 120 * SPEED;
let BEAT = 60 / BPM; // pattern rhythms are multiples of this
let APPROACH = 0.8 / SPEED; // approach rate in time 
let POP = 0.3 / SPEED; // pop effect time
let RIPPLE = 0.5 / SPEED; // ripple effect time

// Changes the timing values for speed slider changes
function retune(speed) {
  curSpeed = speed;
  BPM = 120 * speed;
  BEAT = 60 / BPM;
  APPROACH = 0.8 / speed;
  POP = 0.3 / speed;
  RIPPLE = 0.5 / speed;
}

const COMBO_COLORS = ['#7fdcff', '#ff9ad6', '#ffd166', '#9dffa8', '#b39cff'];
const CURSOR_COLOR = '#4fb6ff';

// Cursor easing
const smooth = (t) => {
  const p = clamp(t, 0, 1);
  return p * p * (3 - 2 * p);
};


export function createOsu() {
  let W = 0;
  let H = 0;
  let radius = 34;
  let time = 0;
  let nextHitTime = 0; // when the next queued object should be hit

  const rng = mulberry32(98765);
  const objects = [];
  const rings = [];
  const particles = createParticles(220);

  // "Pen" point used for deciding where each note goes
  let px = 0;
  let py = 0;
  let angle = rng() * Math.PI * 2;
  let combo = 0;
  let colorIndex = 0;

  //Cursor state
  let cursorX = 0;
  let cursorY = 0;
  let fromX = 0;
  let fromY = 0;
  let fromTime = 0;
  let cursorPop = 0;

  // Queue of positions and patterns
  const queue = [];

  // Restrict to not the edge of the screen
  function clampPoint(x, y) {
    const m = radius * 2.2;
    return {
      x: clamp(x, m, W - m),
      y: clamp(y, m, H - m),
    };
  }

  // Moves the pen 
  function step(dist) {
    angle += (rng() - 0.5) * 1.4; // extra drift so it doesn't look too straight
    px += Math.cos(angle) * dist;
    py += Math.sin(angle) * dist * 0.85;
    // Bounce back toward the centre if we'd leave the field.
    const m = radius * 2.4;
    if (px < m || px > W - m || py < m || py > H - m) {
      angle = Math.atan2(H / 2 - py, W / 2 - px) + (rng() - 0.5);
      px = clamp(px, m, W - m);
      py = clamp(py, m, H - m);
    }
    return clampPoint(px, py); // Where the pen is after moving
  }

  const beatGap = () => RHYTHMS[Math.floor(rng() * RHYTHMS.length)];

  // Putting a pattern into the queue
  // Randomized out of a jump stream, triangle, zig-zag
  function buildPattern() {
    const kind = Math.floor(rng() * 3); // 0 line, 1 triangle, 2 zig-zag
    const jump = radius * (JUMP_MIN + rng() * JUMP_VAR);

    // Fresh start point for this pattern.
    angle = rng() * Math.PI * 2;
    px += Math.cos(angle) * jump;
    py += Math.sin(angle) * jump;
    ({ x: px, y: py } = clampPoint(px, py));
    queue.push({ x: px, y: py, gap: beatGap() });

    if (kind === 0) {
      // 2–4 more notes roughly in a line
      const n = 2 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i += 1) {
        const p = step(jump * 0.8);
        queue.push({ x: p.x, y: p.y, gap: beatGap() });
      }
    } else if (kind === 1) {
      // Three corners around the start point
      const base = angle;
      for (let i = 1; i <= 2; i += 1) {
        const a = base + (i * 2 * Math.PI) / 3;
        const p = clampPoint(px + Math.cos(a) * jump, py + Math.sin(a) * jump);
        queue.push({ x: p.x, y: p.y, gap: beatGap() });
      }
    } else {
      // Zig-zag: alternate turning left/right for 3–4 notes.
      const n = 3 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i += 1) {
        angle += (i % 2 === 0 ? 1 : -1) * (0.9 + rng() * 0.5);
        px += Math.cos(angle) * jump * 0.9;
        py += Math.sin(angle) * jump * 0.9;
        ({ x: px, y: py } = clampPoint(px, py));
        queue.push({ x: px, y: py, gap: beatGap() });
      }
    }
  }

  // Hitting a note
  function hit(obj) {
    rings.push({ x: obj.x, y: obj.y, life: RIPPLE, max: RIPPLE, color: obj.color });

    // The cursor is now sitting on this object; the next leg starts here.
    fromX = obj.x;
    fromY = obj.y;
    fromTime = obj.hitTime;
    cursorPop = 1;

    const count = 10;
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2 + rng();
      const sp = 70 + rng() * 150;
      particles.spawn({
        x: obj.x,
        y: obj.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.3 + rng() * 0.35,
        max: 0.65,
        size: 1.1 + rng() * 2.1,
        color: obj.color,
      });
    }
  }

  // Reset for when canvas is resized or speed is changed
  function reset() {
    objects.length = 0; // clears hit circles
    rings.length = 0;  // etc
    queue.length = 0;
    particles.clear();

    nextHitTime = time + APPROACH + BEAT;
    px = W * 0.5;
    py = H * 0.5;
    cursorX = W * 0.5;
    cursorY = H * 0.5;
    fromX = cursorX;
    fromY = cursorY;
    fromTime = time;
    cursorPop = 0;
  }

  return {
    controls: OSU_CONTROLS,// slider
    setControl(key, value) {
      if (key === 'speed') retune(value); // Retuning if speed change
      if (W && H) reset(); // Reset after potential resize
    },

    resize(w, h) { // called when loading and when resizing for the calcs
      W = w;
      H = h;
      radius = clamp(Math.min(w, h) * 0.055, 22, 46);
      reset();
    },

    update(dt) { // animation updating each frame
      time += dt;
      while (nextHitTime - APPROACH <= time) {
        if (!queue.length) {
          // Start of a new pattern = new combo colour.
          combo = 0;
          colorIndex = (colorIndex + 1) % COMBO_COLORS.length;
          buildPattern();
        }

        const spot = queue.shift();
        combo += 1;
        objects.push({
          x: spot.x,
          y: spot.y,
          hitTime: nextHitTime,
          num: combo,
          color: COMBO_COLORS[colorIndex],
        });
        // Advance the clock by this note's rhythm (in beats).
        nextHitTime += spot.gap * BEAT;
      }

      for (let i = objects.length - 1; i >= 0; i -= 1) {
        const o = objects[i];
        if (!o.done && time >= o.hitTime) {
          o.done = true;
          hit(o);
        }
        if (time > o.hitTime + POP) objects.splice(i, 1);
      }

      // Cursor go to target and lands upon pop/click
      const target = objects.find((o) => !o.done);
      if (target) {
        const span = target.hitTime - fromTime;
        const p = span > 0 ? smooth((time - fromTime) / span) : 1;
        cursorX = lerp(fromX, target.x, p);
        cursorY = lerp(fromY, target.y, p);
      } else {
        cursorX = fromX;
        cursorY = fromY;
      }

      cursorPop = Math.max(0, cursorPop - dt * 3.2 * curSpeed);

      for (let i = rings.length - 1; i >= 0; i -= 1) {
        rings[i].life -= dt;
        if (rings[i].life <= 0) rings.splice(i, 1);
      }

      particles.update(dt, 0);
    },

    draw(ctx) {
      // Line connecting notes
      const upcoming = objects.filter((o) => !o.done);
      if (upcoming.length > 1) {
        ctx.save();
        ctx.setLineDash([3, 6]);
        ctx.strokeStyle = 'rgba(255,255,255,0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        upcoming.forEach((o, i) => {
          if (i === 0) ctx.moveTo(o.x, o.y);
          else ctx.lineTo(o.x, o.y);
        });
        ctx.stroke();
        ctx.restore();
      }

      ctx.globalCompositeOperation = 'lighter'; // Combine layered colours 

      objects.forEach((o) => {
        const remain = o.hitTime - time;

        if (!o.done) {
          const inLife = clamp((APPROACH - remain) / (APPROACH * 0.35), 0, 1);
          const alpha = inLife;

          // Hit circle body
          const body = ctx.createRadialGradient(
            o.x,
            o.y - radius * 0.25,
            radius * 0.1,
            o.x,
            o.y,
            radius
          );
          body.addColorStop(0, rgba(o.color, 0.3 * alpha));
          body.addColorStop(1, rgba(o.color, 0.1 * alpha));
          ctx.fillStyle = body;
          ctx.beginPath();
          ctx.arc(o.x, o.y, radius, 0, Math.PI * 2);
          ctx.fill();

          // Border
          ctx.strokeStyle = rgba(o.color, 0.95 * alpha);
          ctx.lineWidth = 2.4;
          ctx.shadowColor = rgba(o.color, 0.9);
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(o.x, o.y, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Approach ring: closes from ~3.2r down to r
          const ar = radius * (1 + 2.2 * clamp(remain / APPROACH, 0, 1));
          ctx.strokeStyle = rgba(o.color, 0.8 * alpha);
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(o.x, o.y, ar, 0, Math.PI * 2);
          ctx.stroke();

          // Combo number
          ctx.fillStyle = rgba('#ffffff', 0.5 * alpha);
          ctx.font = `600 ${Math.round(radius * 0.72)}px ui-monospace, monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(o.num), o.x, o.y + 1);
        } else {
          // Circle pop and fade
          const t = clamp((time - o.hitTime) / POP, 0, 1);
          ctx.strokeStyle = rgba(o.color, 0.7 * (1 - t));
          ctx.lineWidth = 2.4 * (1 - t);
          ctx.beginPath();
          ctx.arc(o.x, o.y, radius * (1 + t * 0.35), 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // ripples
      rings.forEach((r) => {
        const t = 1 - r.life / r.max;
        ctx.strokeStyle = rgba(r.color, 0.6 * (1 - t));
        ctx.lineWidth = 2.2 * (1 - t) + 0.4;
        ctx.beginPath();
        ctx.arc(r.x, r.y, radius * (1 + t * 1.6), 0, Math.PI * 2);
        ctx.stroke();
      });

      particles.list.forEach((p) => {
        const a = clamp(p.life / p.max, 0, 1);
        ctx.fillStyle = rgba(p.color, a * 0.85);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
        ctx.fill();
      });

      /* cursor section */
      const cr = radius * 0.2 * (1 + cursorPop * 0.5);

      // Glow
      const halo = ctx.createRadialGradient(
        cursorX,
        cursorY,
        0,
        cursorX,
        cursorY,
        cr * 3.4
      );
      halo.addColorStop(0, rgba(CURSOR_COLOR, 0.5));
      halo.addColorStop(1, rgba(CURSOR_COLOR, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cursorX, cursorY, cr * 3.4, 0, Math.PI * 2);
      ctx.fill();

      // Actual circle
      ctx.shadowColor = rgba(CURSOR_COLOR, 0.95);
      ctx.shadowBlur = 16;
      ctx.fillStyle = rgba('#dcf2ff', 0.95);
      ctx.beginPath();
      ctx.arc(cursorX, cursorY, cr, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.globalCompositeOperation = 'source-over';
    },
  };
}
