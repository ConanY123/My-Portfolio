import { site } from '../../data/site-config.js';
import { esc, isPlaceholder, txt } from '../lib/dom.js';

// Makes a line for the spec list
function specRow(key, value) {
  if (typeof value !== 'string' || value.trim() === '') return '';
  return `<div><span class="k">${esc(key)}</span><span class="v">${txt(
    value
  )}</span></div>`;
}

// Rows for the projects
function projectRow(project, index) {
  const num = String(index + 1).padStart(2, "0");
  const name = txt(project.name);
  const url = project.url;

  if (typeof url !== 'string' || url.trim() === '' || isPlaceholder(url)) {
    return `<li class="project-row is-empty">
      <span class="project-num" aria-hidden="true">${num}</span>
      <span class="project-name">${name}</span>
    </li>`;
  }

  return `<li class="project-row">
    <a class="project-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">
      <span class="project-num" aria-hidden="true">${num}</span>
      <span class="project-name">${name}</span>
      <span class="arw" aria-hidden="true">↗</span>
    </a>
  </li>`;
}

// Home page build
export function homePage() {
  const p = site.person;
  const copy = site.copy.home;
  const projects = site.projects || [];

  // object with 2 properties + a big HTML string of data
  return {
    title: '',
    html: `
    <section class="hero">
      <div>
        <p class="eyebrow"><span class="idx">01</span> Home</p>
        <h1 class="hero-name">${txt(p.name)}</h1>
        <p class="hero-tagline">${txt(p.tagline)}</p>
        <p class="hero-bio">${txt(p.bio)}</p>

        <!-- TODO: bring back the projects button here once the list settles -->
        <div class="btn-row hero-actions">
          <a class="btn btn--primary" href="#/resume">${esc(copy.secondaryCta)}</a>
        </div>

        <div class="spec-list">
          ${specRow('Contact', p.email)}
        </div>
      </div>
    </section>

    ${
      projects.length
        ? `<section class="section">
            <p class="eyebrow"><span class="idx">02</span> Selected Projects</p>
            <h2 class="section-title">${esc(
              copy.projectsLabel
            )}</h2>
            <ul class="project-list">
              ${projects.map((proj, i) => projectRow(proj, i)).join('')}
            </ul>
          </section>`
        : ''
    }
    `,
  };
}
