import { site } from '../../data/site-config.js';
import { esc, filled } from '../lib/dom.js';

export function resumePage() {
  const r = site.resume || {};
  const hasPdf = filled(r.pdfPath);

  const updated = filled(r.lastUpdated)
    ? `<span class="resume-updated">Updated ${esc(r.lastUpdated)}</span>`
    : '';

  const download = r.downloadName ? ` download="${esc(r.downloadName)}"` : '';

  // if no pdf say so
  const body = hasPdf
    ? `<div class="btn-row resume-actions">
         <a class="btn btn--primary" href="${esc(r.pdfPath)}" target="_blank" rel="noopener noreferrer">Open in new tab</a>
         <a class="btn" href="${esc(r.pdfPath)}"${download}>Download PDF</a>
       </div>
       <object class="resume-frame" data="${esc(r.pdfPath)}" type="application/pdf">
         <p class="lede">
           Your browser can't display the PDF inline.
           <a href="${esc(r.pdfPath)}" target="_blank" rel="noopener noreferrer">Open it in a new tab</a> instead.
         </p>
       </object>`
    : `<p class="lede">No resume uploaded yet.</p>`;

  return {
    title: 'Resume',
    html: `
    <section>
      <p class="eyebrow"><span class="idx">03</span> Resume ${updated}</p>
      <h1 class="section-title" style="margin-top:.9rem">Resume</h1>
      <div style="margin-top:1.5rem">
        ${body}
      </div>
    </section>`,
  };
}
