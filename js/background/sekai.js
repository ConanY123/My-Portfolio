// Project Sekai

import { clamp, createParticles, lerp, mulberry32, rgba } from './util.js';

// Speed
const SPEED = 1.5;
// adjustable by the slider

/* Slider details*/
export const SEKAI_CONTROLS = [
  { key: 'speed', label: 'Speed', min: 0.5, max: 3, step: 0.05, def: SPEED },
];

const PATTERN_STEPS = 96;

// speed starts at default
let curSpeed = SPEED;
let BPM = 126 * SPEED;
let STEP = 60 / BPM / 4; // one 16th note
let TRAVEL = 1.8 / SPEED; // seconds from note spawn to the judgment line

// fix timing when speed slider moves
function retune(speed) {
curSpeed = speed;
BPM = 126 * speed;
  STEP = 60 / BPM / 4;
  TRAVEL = 1.8 / speed;
}

// max notes in a hoirz row
const MAX_PER_ROW = 6;

// note colour
const NOTE = { a: '#5cc8ff', b: '#c4efff', glow: '#5cc8ff' };

// Looping note charting
function buildPattern() {
  const rng = mulberry32(20260913);
  const steps = Array.from({ length: PATTERN_STEPS }, () => []);

  const add = (s, lane) => {
    if (s < 0 || s >= PATTERN_STEPS) return;
    if (steps[s].length >= MAX_PER_ROW) return;
    steps[s].push({ lane: clamp(lane, 0, 1) });
  };

  for (let s = 0; s < PATTERN_STEPS; s += 1) {
    const onQuarter = s % 4 === 0;
    const onBar = s % 16 === 0;

    if (onBar) {
      // start of a bar always has a  pair spread out to the sides
      const spread = 0.14 + rng() * 0.12;
      add(s, spread);
      add(s, 1 - spread);
    } else if (onQuarter && rng() < 0.5) {
      add(s, 0.18 + rng() * 0.64);
    } else if (s % 8 === 6 && rng() < 0.3) {
      add(s, 0.15 + rng() * 0.7);
    }
  }
  return steps;
}

const PATTERN = buildPattern();

export function createSekai() {
  let W = 0;
  let H = 0;
  let lanes = 12;
  let cx = 0;
  let topW = 0;
  let botW = 0;
  let topY = 0;
  let judgeY = 0;

  let time = 0;
  let nextStep = 0;
  const notes = [];
  const flashes = [];
  const particles = createParticles(200);

  const ease = (p) => Math.pow(clamp(p, 0, 1), 2.15);

  function geom(p) {
    const f = ease(p);
    const width = lerp(topW, botW, f);
    return { f, width, laneW: width / lanes, y: lerp(topY, judgeY, f) };
  }

  function laneCenter(lane, g) {
    return cx - g.width / 2 + (lane + 0.5) * g.laneW;
  }

  // when note is hit the lane flashes and creates particles
  function burst(lane) {
    const g = geom(1);
    const x = laneCenter(lane, g);
    flashes[lane] = 1;
    for (let i = 0; i < 10; i += 1) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.5;
      const sp = 60 + Math.random() * 190;
      particles.spawn({
        x: x + (Math.random() - 0.5) * g.laneW * 0.5,
        y: judgeY,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 0.32 + Math.random() * 0.4,
        max: 0.72,
        size: 1.2 + Math.random() * 2.4,
      });
    }
  }

  return {
    controls: SEKAI_CONTROLS,
    setControl(key, value) {
      if (key === 'speed') retune(value);
      // restart the note schedule for the new speed, but keep lane layout
      notes.length = 0;
      particles.clear();
      nextStep = Math.ceil((time + TRAVEL) / STEP);
    },

    // Adjust for resize
    resize(w, h) {
      W = w;
      H = h;
      lanes = w < 620 ? 7 : w < 1000 ? 9 : 12;
      cx = w / 2;
      botW = Math.min(w * 0.94, 1180);
      topW = botW * 0.34;
      topY = -h * 0.06;
      judgeY = h * 0.845;
      flashes.length = lanes;
      flashes.fill(0);
      notes.length = 0;
      particles.clear();
      nextStep = Math.ceil((time + TRAVEL) / STEP);
    },

    update(dt) {
      time += dt;

      // spawn steps whose hit time has entered the travel window
      let guard = 0;
      while (nextStep * STEP - TRAVEL <= time && guard < 64) {
        const events = PATTERN[nextStep % PATTERN_STEPS];
        const hitTime = nextStep * STEP;

        // one row has one hit timing
        const taken = new Set();
        events.forEach((ev) => {
          if (taken.size >= MAX_PER_ROW) return;
          const lane = clamp(
            Math.round(ev.lane * (lanes - 1)),
            0,
            lanes - 1
          );
          if (taken.has(lane)) return;
          taken.add(lane);
          notes.push({ lane, hitTime, done: false });
        });

        nextStep += 1;
        guard += 1;
      }

      for (let i = notes.length - 1; i >= 0; i -= 1) {
        const n = notes[i];
        if (!n.done && time >= n.hitTime) {
          n.done = true;
          burst(n.lane);
        }
        if (time > n.hitTime + 0.25) notes.splice(i, 1);
      }

      for (let i = 0; i < flashes.length; i += 1) {
        flashes[i] = Math.max(0, flashes[i] - dt * 2.6);
      }

      particles.update(dt, 620);
    },

    draw(ctx) {
      const gTop = geom(0);
      const gBot = geom(1);

      // vertical lines between lanes
      ctx.lineWidth = 1;
      for (let i = 0; i <= lanes; i += 1) {
        const x0 = cx - gTop.width / 2 + i * gTop.laneW;
        const x1 = cx - gBot.width / 2 + i * gBot.laneW;
        const grad = ctx.createLinearGradient(0, topY, 0, judgeY);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(1, 'rgba(255,255,255,0.10)');
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x0, topY);
        ctx.lineTo(x1, judgeY);
        ctx.stroke();
      }

      ctx.globalCompositeOperation = 'lighter';

      // glow beam flash when note is hit
      const gMid = geom(0.62);
      for (let i = 0; i < lanes; i += 1) {
        const f = flashes[i];
        if (f <= 0.01) continue;
        const xT = laneCenter(i, gMid);
        const wT = gMid.laneW * 0.34;
        const xB = laneCenter(i, gBot);
        const wB = gBot.laneW * 0.46;
        const beam = ctx.createLinearGradient(0, gMid.y, 0, judgeY);
        beam.addColorStop(0, rgba(NOTE.glow, 0));
        beam.addColorStop(1, rgba(NOTE.glow, 0.3 * f));
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(xT - wT, gMid.y);
        ctx.lineTo(xT + wT, gMid.y);
        ctx.lineTo(xB + wB, judgeY);
        ctx.lineTo(xB - wB, judgeY);
        ctx.closePath();
        ctx.fill();
      }

      // the falling notes
      notes.forEach((n) => {
        const p = 1 - (n.hitTime - time) / TRAVEL;
        if (p < 0 || p > 1.02) return;
        const g = geom(p);
        const x = laneCenter(n.lane, g);
        const nw = g.laneW * 0.86;
        const nh = lerp(3.5, 17, g.f);
        const alpha = clamp(p / 0.08, 0, 1) * (n.done ? 0.35 : 1);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = rgba(NOTE.glow, 0.85);
        ctx.shadowBlur = lerp(4, 20, g.f);

        const grad = ctx.createLinearGradient(0, g.y - nh / 2, 0, g.y + nh / 2);
        grad.addColorStop(0, NOTE.b);
        grad.addColorStop(0.45, NOTE.a);
        grad.addColorStop(1, rgba(NOTE.a, 0.65));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x - nw / 2, g.y - nh / 2, nw, nh, Math.min(2.5, nh / 3));
        ctx.fill();

        // Bright strip along the front of the note
        ctx.shadowBlur = 0;
        ctx.fillStyle = rgba('#ffffff', 0.75);
        ctx.fillRect(x - nw / 2 + 1, g.y - nh / 2, nw - 2, Math.max(1, nh * 0.14));
        ctx.restore();
      });

      // Judgement line
      const jx0 = cx - gBot.width / 2;
      const jx1 = cx + gBot.width / 2;
      const jGrad = ctx.createLinearGradient(jx0, 0, jx1, 0);
      jGrad.addColorStop(0, 'rgba(180,225,255,0)');
      jGrad.addColorStop(0.15, 'rgba(200,235,255,0.75)');
      jGrad.addColorStop(0.85, 'rgba(200,235,255,0.75)');
      jGrad.addColorStop(1, 'rgba(180,225,255,0)');
      ctx.strokeStyle = jGrad;
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(150,215,255,0.9)';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(jx0, judgeY);
      ctx.lineTo(jx1, judgeY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Tick marks on judgement line
      ctx.strokeStyle = 'rgba(210,240,255,0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= lanes; i += 1) {
        const x = cx - gBot.width / 2 + i * gBot.laneW;
        ctx.beginPath();
        ctx.moveTo(x, judgeY - 6);
        ctx.lineTo(x, judgeY + 6);
        ctx.stroke();
      }

      // hit particles
      particles.list.forEach((p) => {
        const a = clamp(p.life / p.max, 0, 1);
        ctx.fillStyle = rgba(NOTE.glow, a * 0.9);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalCompositeOperation = 'source-over';
    },
  };
}
