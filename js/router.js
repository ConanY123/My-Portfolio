// Router. Hashtags for github

// Finds current path from URL
export function currentPath() {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw || raw === '/') return '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

// break the path up ex. "/a/b" -> ["a", "b"]
export function segments(path = currentPath()) {
  return path.split('/').filter(Boolean);
}

// starts the router: 
// resolve picks the page for a path
// HTML goes in outlet
// onRender runs each when a page loads
export function startRouter({ resolve, outlet, onRender }) {
  let lastPath = null;

  function render() {
    const path = currentPath();
    const view = resolve(path, segments(path));

    outlet.innerHTML = view.html;
    outlet.classList.remove('route-enter');
    // Fade in animation each time
    
    void outlet.offsetWidth;
    outlet.classList.add('route-enter');

    if (view.title) document.title = view.title;

    // scroll up when switching pages
    if (lastPath !== null && lastPath !== path) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    lastPath = path;

    if (onRender) onRender(view);
  }

  // re-render whenever the hash changes
  window.addEventListener('hashchange', render);

  // if the URL has no hash yet, set it to "#/" so there's always a route
  if (!window.location.hash) {
    window.location.replace(`${window.location.pathname}#/`);
  }

  render();
  return { render };
}
