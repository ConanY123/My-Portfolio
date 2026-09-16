// Geometry Dash

import { clamp, createParticles } from './util.js';

// jump height relative to cube height
const APEX_CUBES = 2;
// speed
const SPEED = 1.35;
// Both of the above are adjustable by the slider

/* Slider details -> variables above */
export const GD_CONTROLS = [
  { key: 'speed', label: 'Speed', min: 0.5, max: 3, step: 0.05, def: SPEED },
  { key: 'jump', label: 'Jump', min: 1, max: 5, step: 0.1, def: APEX_CUBES },
];

// Looping level obstacles
const RECIPES = [
  { kind: 'spikes', n: 1, gap: 7 },
  { kind: 'spikes', n: 2, gap: 8 },
  { kind: 'block', wCells: 2, gap: 7 },
  { kind: 'spikes', n: 1, gap: 6 },
  { kind: 'spikes', n: 2, gap: 9 },
  { kind: 'block', wCells: 3, gap: 8 },
  { kind: 'spikes', n: 1, gap: 6 },
  { kind: 'spikes', n: 2, gap: 7 },
  { kind: 'block', wCells: 3, gap: 9 },
];

const hsl = (h, s, l, a) => `hsla(${h % 360},${s}%,${l}%,${a})`;

export function createGd() {
  let W = 0;
  let H = 0;
  let cell = 32;
  let groundY = 0;
  let cubeScreenX = 0;
  let size = 28;
  let speed = 0;
  let gravity = 0;

  // slider-adjustable settings start at the defaults
  let curSpeed = SPEED;
  let curApexCubes = APEX_CUBES;

  // Jump
  let apex = 0;
  let tApex = 0; // time it takes from jumping to get to a peak
  let jumpV0 = 0; // jump velocity
  let lead = 0; // how far before the object it needs to jump

  let time = 0;
  let cubeWorldX = 0;
  let cubeY = 0;
  let vy = 0;
  let onGround = true;

  /* Airborne state. Before when it was done
  frame by frame it became inaccurate and would phase through blocks. */
  let airT0 = 0; // time the cube left the surface
  let airY0 = 0; // surface height it left from (cube bottom)
  let airV0 = 0; // launch speed (0 when it just walks off a ledge)
  let angle = 0;
  let shake = 0;
  let pulse = 0;
  let trailTimer = 0;

  const groups = [];
  const particles = createParticles(240);
  let spawnX = 0;
  let recipeIndex = 0;

  function tune() {
    // Makes it so that changing speed does not change the shape of the jump
    speed = 7.2 * cell * curSpeed;
    gravity = 52.5 * cell * curSpeed * curSpeed;

    // Max jump height. curApexCubes is how many of itself the cube jumps.
    apex = size * curApexCubes;
    tApex = Math.sqrt((2 * apex) / gravity); // Use kinematics equation h = vt - 1/2(gt^2) -> Solved for time
    jumpV0 = gravity * tApex;
    lead = speed * tApex;
  }

  /**
   * d is the required horizontal distance(in pixels) the cube
   * must travel before reaching its apex. heightAt(d) converts
   * the pixles to time, then calculates the current height with 1/2 at^2
   */
  function heightAt(d) {
    const t = d / speed;
    return apex - 0.5 * gravity * t * t;
  }

  /** Apex for landing */
  function planJump(g) {
    // Calculates g.aimX, the point where the cube's launch should reach its apex
    // Its in the middle of the spikes but a little over for blocks
    g.aimX = g.kind === 'spikes' ? g.x + g.w / 2 : g.x + cell * 0.3;
  }

  // Places obstacles
  function addGroup() {
    // r is an object that has recipes for the next group to put in
    const r = RECIPES[recipeIndex % RECIPES.length];
    recipeIndex += 1;

    const g = { kind: r.kind, x: spawnX, parts: [], triggered: false };

    if (r.kind === 'spikes') {
      const spikeW = cell * 0.92;
      g.w = spikeW * r.n;

      // Making a gap so the cube wont hit the edges when starting a jump
      const edge = g.w / 2 + cell * 0.3;
      const ceiling = heightAt(edge) - cell * 0.22;
      g.parts.push(
        ...Array.from({ length: r.n }, (_, i) => ({
          type: 'spike',
          x: spawnX + i * spikeW,
          w: spikeW,
          h: clamp(cell * 0.8, cell * 0.3, ceiling),
        }))
      );
    } else {
      // A block has to be low enough to land on for the apex
      g.w = cell * r.wCells;
      g.h = clamp(cell, cell * 0.4, apex - cell * 0.5);
      g.parts.push({ type: 'block', x: spawnX, w: g.w, h: g.h });
    }

    planJump(g);
    groups.push(g);
    spawnX += g.w + r.gap * cell;
  }

  /** Every surface the cube could be standing on right now. */
  // So that it doesn't fall through blocks
  function surfacesUnderCube() {
    // Cube's foot
    const left = cubeWorldX - size * 0.34;
    const right = cubeWorldX + size * 0.34;
    // groundY is floor height
    const out = [groundY];
    groups.forEach((g) => {
      if (g.kind === 'spikes') return; // Cant land on spikes
      g.parts.forEach((p) => {
        if (right > p.x && left < p.x + p.w) out.push(groundY - p.h);
      });
    });
    return out; // Returns the list of y-piexl heights
  }

  // Makes some particles when contacting the ground
  function spawnDust(x, y, n, back = 0.25) {
    for (let i = 0; i < n; i += 1) {
      particles.spawn({
        x: x + (Math.random() - 0.5) * size * 0.6,
        y,
        vx: -speed * back - Math.random() * speed * 0.25,
        vy: -Math.random() * 130,
        life: 0.35 + Math.random() * 0.45,
        max: 0.8,
        size: 2 + Math.random() * 3,
      });
    }
  }

  // Leaving the ground. v0 = jumpV0 for a jump, 0 when walking off a ledge. 
  function launch(v0) {
    airT0 = time;
    airY0 = cubeY + size;
    airV0 = v0;
    vy = -v0;
    onGround = false;
  }

  function jump() {
    launch(jumpV0); // always the same jump speed, so always the same apex
    spawnDust(cubeWorldX, cubeY + size, 14);
  }

  // Recompute derived values and rebuild the level from scratch. Called on
  // resize and whenever a slider changes speed/jump, so the placed obstacles
  // always match the current physics.
  function reset() {
    tune();
    groups.length = 0;
    particles.clear();
    recipeIndex = 0;
    cubeWorldX = 0;
    spawnX = W * 0.85;
    cubeY = groundY - size;
    vy = 0;
    onGround = true;
    angle = 0;
    shake = 0;
    pulse = 0;
  }

  return {
    resize(w, h) {
      W = w;
      H = h;
      cell = clamp(Math.min(w / 26, h / 15), 20, 46);
      size = cell * 0.92;
      groundY = Math.round(h * 0.78);
      cubeScreenX = w * 0.24;
      reset();
    },

    // Slider control
    controls: GD_CONTROLS,
    setControl(key, value) {
      if (key === 'speed') curSpeed = value;
      else if (key === 'jump') curApexCubes = value;
      if (W && H) reset();
    },

    update(dt) {
      time += dt;
      cubeWorldX += speed * dt;
      const scroll = cubeWorldX - cubeScreenX;

      // Extend and trim the level so it loops forever without a seam.
      let guard = 0;
      while (spawnX < scroll + W + cell * 8 && guard < 12) {
        addGroup();
        guard += 1;
      }
      while (groups.length && groups[0].x + groups[0].w < scroll - cell * 4) {
        groups.shift();
      }

      // Launch point for the next obstacle.
      if (onGround) {
        for (let i = 0; i < groups.length; i += 1) {
          const g = groups[i];
          if (g.triggered) continue;
          if (g.x + g.w <= cubeWorldX) continue;
          if (g.aimX - cubeWorldX <= lead) {
            g.triggered = true;
            jump();
          }
          break;
        }
      }

      // Vertical motion and landing. Closed form, so the apex is exactly
      // `apex` on every hop no matter what the frame rate is doing.
      const prevBottom = cubeY + size;
      if (!onGround) {
        const t = time - airT0;
        cubeY = airY0 - (airV0 * t - 0.5 * gravity * t * t) - size;
        vy = -airV0 + gravity * t;
      }
      const surfaces = surfacesUnderCube();
      const bottom = cubeY + size;

      if (!onGround) {
        if (vy >= 0) {
          let landY = null;
          surfaces.forEach((y) => {
            if (prevBottom <= y + 1.5 && bottom >= y) {
              if (landY === null || y < landY) landY = y;
            }
          });
          if (landY !== null) {
            cubeY = landY - size;
            vy = 0;
            onGround = true;
            pulse = Math.max(pulse, 0.5);
            spawnDust(cubeWorldX, landY, 12, 0.3);
          }
        }
      } else {
        const support = Math.min(...surfaces);
        if (support < bottom - 2) {
          // Safety net: never let the cube end up inside a block.
          cubeY = support - size;
          pulse = 1;
        } else if (support > bottom + 2) {
          launch(0); // ran off the edge of a block: a plain fall
        } else {
          cubeY = support - size;
        }
      }

      // Spins in the air and snaps flat if it lands
      // Scales by speed
      if (!onGround) {
        angle += ((Math.PI * 2) / 1.05) * curSpeed * dt;
      } else {
        const target = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);
        angle += (target - angle) * Math.min(1, dt * 18);
      }

      // Near-miss flavour: the closer it shaves a spike, the harder the kick.
      groups.forEach((g) => {
        if (g.kind !== 'spikes' || g.grazed) return;
        g.parts.forEach((p) => {
          const over =
            cubeWorldX + size * 0.25 > p.x &&
            cubeWorldX - size * 0.25 < p.x + p.w;
          if (!over) return;
          const clearance = groundY - p.h - (cubeY + size);
          const strength = clamp(1 - clearance / (cell * 1.6), 0, 1);
          if (strength > 0.08) {
            g.grazed = true;
            shake = Math.min(1, shake + 0.45 * strength);
            pulse = Math.max(pulse, 0.35 + 0.6 * strength);
          }
        });
      });

      if (onGround) {
        trailTimer -= dt;
        if (trailTimer <= 0) {
          trailTimer = 0.05;
          spawnDust(cubeWorldX - size * 0.45, cubeY + size, 2, 0.18);
        }
      }

      shake = Math.max(0, shake - dt * 3.4);
      pulse = Math.max(0, pulse - dt * 2.1);
      particles.update(dt, 900);
    },

    draw(ctx) {
      const scroll = cubeWorldX - cubeScreenX;
      const hueA = (time * 9) % 360;
      const hueB = (hueA + 150) % 360;

      ctx.save();
      if (shake > 0.01) {
        ctx.translate((Math.random() - 0.5) * shake * 7, (Math.random() - 0.5) * shake * 7);
      }

      // Floor slab
      const floorGrad = ctx.createLinearGradient(0, groundY, 0, H);
      floorGrad.addColorStop(0, hsl(hueA, 60, 18, 0.34));
      floorGrad.addColorStop(1, hsl(hueA, 55, 6, 0.1));
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, groundY, W, H - groundY);

      ctx.globalCompositeOperation = 'lighter';

      // Bright floor edge
      ctx.strokeStyle = hsl(hueA, 95, 72, 0.55 + pulse * 0.35);
      ctx.lineWidth = 2;
      ctx.shadowColor = hsl(hueA, 95, 66, 0.9);
      ctx.shadowBlur = 10 + pulse * 20;
      ctx.beginPath();
      ctx.moveTo(0, groundY + 0.5);
      ctx.lineTo(W, groundY + 0.5);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Obstacles
      groups.forEach((g) => {
        g.parts.forEach((p) => {
          const x = p.x - scroll;
          if (x > W + cell * 2 || x + p.w < -cell * 2) return;

          ctx.lineWidth = 2;
          ctx.strokeStyle = hsl(hueB, 95, 74, 0.85);
          ctx.fillStyle = hsl(hueB, 80, 18, 0.45);
          ctx.shadowColor = hsl(hueB, 95, 66, 0.75);
          ctx.shadowBlur = 9;

          if (p.type === 'spike') {
            ctx.beginPath();
            ctx.moveTo(x, groundY);
            ctx.lineTo(x + p.w / 2, groundY - p.h);
            ctx.lineTo(x + p.w, groundY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
          } else {
            const top = groundY - p.h;
            ctx.beginPath();
            ctx.rect(x, top, p.w, p.h);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = hsl(hueB, 90, 72, 0.22);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.rect(x + 4, top + 4, p.w - 8, p.h - 8);
            ctx.stroke();
          }
        });
      });

      // Particles
      particles.list.forEach((p) => {
        const a = clamp(p.life / p.max, 0, 1);
        ctx.fillStyle = hsl(hueA, 95, 75, a * 0.95);
        ctx.shadowColor = hsl(hueA, 95, 70, a * 0.9);
        ctx.shadowBlur = 8;
        const s = p.size * (0.4 + a * 0.6);
        ctx.fillRect(p.x - scroll - s / 2, p.y - s / 2, s, s);
      });
      ctx.shadowBlur = 0;

      // Cube
      ctx.save();
      ctx.translate(cubeWorldX - scroll, cubeY + size / 2);
      ctx.rotate(angle);
      ctx.shadowColor = hsl(hueA, 95, 70, 0.95);
      ctx.shadowBlur = 13 + pulse * 20;
      ctx.fillStyle = hsl(hueA, 85, 22, 0.7);
      ctx.strokeStyle = hsl(hueA, 100, 78, 0.95);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.rect(-size / 2, -size / 2, size, size);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = hsl(hueA, 100, 82, 0.45);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(-size * 0.21, -size * 0.21, size * 0.42, size * 0.42);
      ctx.stroke();
      ctx.restore();

      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    },
  };
}
