
import { site } from '../../data/site-config.js';
import { clamp } from './util.js';
import { createSekai } from './sekai.js';
import { createOsu } from './osu.js';
import { createGd } from './gd.js';

const DPR_CAP = 1.5; // pixel cap to prevent laptop

export const MODES = [
  { id: 'sekai', label: 'Sekai'},
  { id: 'osu', label: 'Osu!'},
  { id: 'gd', label: 'GD'},
  { id: 'off', label: 'Off'},
];

// Mapping the modes id's to the function creating them
const FACTORIES = {
  sekai: createSekai,
  osu: createOsu,
  gd: createGd,
};

// Rounding corners for sekai checks if the method is missing for old browser
function ensureRoundRect() {
  const proto = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (!proto || proto.roundRect) return;
  proto.roundRect = function roundRect(x, y, w, h, r) {
    const rr = Math.min(typeof r === 'number' ? r : 0, w / 2, h / 2);
    this.moveTo(x + rr, y);
    this.lineTo(x + w - rr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + rr);
    this.lineTo(x + w, y + h - rr);
    this.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    this.lineTo(x + rr, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - rr);
    this.lineTo(x, y + rr);
    this.quadraticCurveTo(x, y, x + rr, y);
    return this;
  };
}

export function initBackground({ canvas, switchHost, sliderHost }) {
  ensureRoundRect();

  const ctx = canvas.getContext('2d', { alpha: true });
  const cfg = site.background || {};
  const frameMs = 1000 / clamp(cfg.fpsCap || 40, 20, 60);

  let width = 0;
  let height = 0;
  let scene = null;
  let mode = 'off';
  let raf = 0;
  let last = 0;

  const initial = cfg.defaultMode || 'sekai';

  // how see-through the background canvas is
  function applyOpacity() {
    canvas.style.setProperty('--bg-opacity', String(cfg.opacityDark ?? 0.42));
  }


  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (Math.abs(w - width) < 2 && Math.abs(h - height) < 2) return false;
    width = w;
    height = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }

  // Updates scenes. Runs once per frame and checks time
  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (!scene) return;
    if (!last) last = now;
    const elapsed = now - last;
    if (elapsed < frameMs - 1) return;
    last = now;

    // cap dt(delta time) so things dont jump around as if it were running on fr
    const dt = Math.min(elapsed, 90) / 1000;
    scene.update(dt);
    ctx.clearRect(0, 0, width, height);
    scene.draw(ctx, width, height);
  }

  function start() {
    if (raf || !scene) return;
    last = 0;
    raf = requestAnimationFrame(tick);
  }

  function setMode(next) {
    mode = MODES.some((m) => m.id === next) ? next : 'off';

    stop();
    document.body.classList.toggle('bg-off', mode === 'off');

    if (mode === 'off') {
      scene = null;
      canvas.classList.remove('is-live');
      ctx.clearRect(0, 0, width, height);
    } else {
      scene = FACTORIES[mode]();
      sizeCanvas();
      scene.resize(width, height);
      canvas.classList.add('is-live');
      start();
    }

    syncSwitch();
    buildSliders();
  }

  let buttons = [];

  function syncSwitch() {
    buttons.forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    });
  }

  function buildSwitch() {
    if (!switchHost) return;
    switchHost.innerHTML = MODES.map(
      (m) => `<button class="bg-opt" type="button" data-mode="${m.id}"
        aria-pressed="false" title="${m.title}">${m.label}</button>`
    ).join('');
    buttons = [...switchHost.querySelectorAll('.bg-opt')];
    switchHost.addEventListener('click', (event) => {
      const btn = event.target.closest('.bg-opt');
      if (btn) setMode(btn.dataset.mode);
    });
  }

  // makes a slider for each control the current scene has. scenes with none
  // show nothing.
  function buildSliders() {
    if (!sliderHost) return;
    const controls = (scene && scene.controls) || [];

    if (!controls.length) {
      sliderHost.innerHTML = '';
      sliderHost.hidden = true;
      return;
    }

    sliderHost.hidden = false;
    sliderHost.innerHTML = controls
      .map(
        (c) => `<label class="bg-slider">
          <span class="bg-slider-label">${c.label}</span>
          <input type="range" data-key="${c.key}"
            min="${c.min}" max="${c.max}" step="${c.step}" value="${c.def}" />
        </label>`
      )
      .join('');

    sliderHost.querySelectorAll('input[type="range"]').forEach((input) => {
      input.addEventListener('input', () => {
        const value = Number(input.value);
        if (scene && scene.setControl) scene.setControl(input.dataset.key, value);
      });
    });
  }

  // set everything up
  buildSwitch();
  applyOpacity();
  sizeCanvas();
  setMode(initial);

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (sizeCanvas() && scene) scene.resize(width, height);
    }, 140);
  });

}
