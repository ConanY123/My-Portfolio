// Startup file reads data + fills header/footer. Also starts the
// router and background animation.

import { site } from '../data/site-config.js';
import { esc, filled, txt } from './lib/dom.js';
import { startRouter } from './router.js';
import { initBackground } from './background/index.js';
import { homePage } from './pages/home.js';
import { resumePage } from './pages/resume.js';

// Header + Footer

const plainName = filled(site.person.name)
  ? site.person.name
  : String(site.person.name || '').replace(/[[\]]/g, '');

const baseTitle = (site.meta.titleTemplate || '{name}').replace(
  '{name}',
  plainName
);

function paintChrome() {
  document.querySelector('[data-bind="brand-name"]').innerHTML = txt(
    site.person.name
  );
  document.querySelector('[data-bind="brand-tag"]').textContent =
    site.meta.brandTag || '';

  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', site.meta.description || '');

  document.getElementById('nav-list').innerHTML = site.nav
    .map(
      (item) =>
        `<li><a class="nav-link" href="#${esc(item.path)}" data-path="${esc(
          item.path
        )}">${esc(item.label)}</a></li>`
    )
    .join('');

  document.querySelector('[data-bind="footer-note"]').innerHTML = txt(
    (site.meta.footerNote || '').replace('{year}', String(new Date().getFullYear()))
  );

  const links = [
    [site.person.githubUrl, 'GitHub'],
    [site.person.linkedinUrl, 'LinkedIn'],
    [
      filled(site.person.email) ? `mailto:${site.person.email}` : site.person.email,
      'Email',
    ],
  ]
    .filter(([url]) => typeof url === 'string' && url.trim() !== '')
    .map(([url, label]) =>
      filled(url)
        ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`
        : `<span>${label}</span>`
    )
    .join('');
  document.querySelector('[data-bind="footer-links"]').innerHTML = links;
}

// Url to page

function resolve(path, segs) {
  if (path === '/' || segs.length === 0) {
    return { ...homePage(), tab: '/' };
  }

  if (segs[0] === 'resume') {
    return { ...resumePage(), tab: '/resume' };
  }

  return {
    title: 'Not found',
    tab: '',
    html: `
    <section>
      <p class="eyebrow"><span class="idx">--</span> Not found</p>
      <h1 class="section-title" style="margin-top:.9rem">Not found</h1>
      <p class="lede" style="margin-top:.75rem">
        No page matches that address. <a href="#/">Back home</a>.
      </p>
    </section>`,
  };
}

// Boot up

function boot() {
  paintChrome();

  initBackground({
    canvas: document.getElementById('bg-canvas'),
    switchHost: document.getElementById('bg-switch-options'),
    sliderHost: document.getElementById('bg-sliders'),
  });

  const outlet = document.getElementById('main');
  const nav = document.getElementById('primary-nav');
  const navToggle = document.getElementById('nav-toggle');

  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });

  startRouter({
    outlet,
    resolve,
    onRender(view) {
      document.title = view.title ? `${view.title} · ${baseTitle}` : baseTitle;

      document.querySelectorAll('.nav-link').forEach((link) => {
        if (link.dataset.path === view.tab) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      });

      nav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');

      if (typeof view.mount === 'function') view.mount(outlet);
    },
  });
}

boot();
