/* Página /projetos: busca os repositórios do GitHub e renderiza cards no estilo dos posts.
   Config vem de _data/projetos.yml (injetado como JSON em #projetos-cfg). Cache de 6h em localStorage.
   Curadoria: exclude / pinned / overrides / extra. A busca do topbar, NESTA página, filtra os projetos. */
(function () {
  var cfgEl = document.getElementById('projetos-cfg');
  var listEl = document.getElementById('projetos-list');
  if (!cfgEl || !listEl) return;

  var cfg = {};
  try { cfg = JSON.parse(cfgEl.textContent) || {}; } catch (e) {}
  var USER = cfg.github_user || 'matheuslaidler';
  var EXCLUDE = (cfg.exclude || []).map(function (s) { return String(s).toLowerCase(); });
  var PINNED = (cfg.pinned || []).map(function (s) { return String(s).toLowerCase(); });
  var OVERRIDES = cfg.overrides || {};
  var EXTRA = cfg.extra || [];
  var FALLBACK = '/assets/img/default-cover.svg';
  var CACHE_KEY = 'projetos_repos_v1';
  var TTL = 6 * 3600 * 1000;
  var current = [];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  // capa branded por repo (estilo dos posts); se não existir, cai no default-cover (onerror)
  function cover(name) { return '/assets/img/covers/proj-' + name + '.png'; }

  function cardHTML(p) {
    var img = p.image || cover(p.name);
    return '' +
      '<article class="card-wrapper card">' +
        '<a href="' + esc(p.url) + '" target="_blank" rel="noopener" class="post-preview row g-0 flex-md-row-reverse">' +
          '<div class="col-md-5">' +
            '<img src="' + esc(img) + '" alt="' + esc(p.name) + '" loading="lazy" ' +
              'onerror="this.onerror=null;this.src=\'' + FALLBACK + '\'">' +
          '</div>' +
          '<div class="col-md-7"><div class="card-body d-flex flex-column">' +
            '<h1 class="card-title my-2 mt-md-0">' + esc(p.name) + '</h1>' +
            '<div class="card-text content mt-0 mb-3"><p>' + esc(p.description) + '</p></div>' +
            '<div class="post-meta flex-grow-1 d-flex align-items-end"><div class="me-auto">' +
              (p.language ? '<i class="fas fa-code fa-fw me-1"></i>' + esc(p.language) : '') +
              (p.stars > 0 ? '<i class="far fa-star fa-fw me-1 ms-3"></i>' + p.stars : '') +
            '</div>' +
            (p.pinned ? '<div class="pin ms-1"><i class="fas fa-thumbtack fa-fw"></i><span>Fixado</span></div>' : '') +
            '</div>' +
          '</div></div>' +
        '</a>' +
      '</article>';
  }

  function normalize(repos) {
    var items = repos
      .filter(function (r) {
        var n = r.name.toLowerCase();
        if (r.fork) return false;
        if (EXCLUDE.indexOf(n) !== -1) return false;
        return (r.description && r.description.trim()) || PINNED.indexOf(n) !== -1;
      })
      .map(function (r) {
        var ov = OVERRIDES[r.name] || {};
        return {
          name: r.name,
          description: ov.description || r.description || '',
          url: r.html_url,
          full_name: r.full_name,
          image: ov.image || null,
          language: r.language || '',
          stars: r.stargazers_count || 0,
          pinned: PINNED.indexOf(r.name.toLowerCase()) !== -1
        };
      });
    items.sort(function (a, b) {
      var ia = PINNED.indexOf(a.name.toLowerCase()), ib = PINNED.indexOf(b.name.toLowerCase());
      if (a.pinned && b.pinned) return ia - ib;
      if (a.pinned) return -1;
      if (b.pinned) return 1;
      return b.stars - a.stars;
    });
    var exPin = EXTRA.filter(function (e) { return e.pinned; });
    var exRest = EXTRA.filter(function (e) { return !e.pinned; });
    return exPin.concat(items, exRest);
  }

  function render(repos) {
    current = normalize(repos);
    if (!current.length) { listEl.innerHTML = '<p class="text-muted">Nada por aqui ainda.</p>'; return; }
    listEl.innerHTML = current.map(cardHTML).join('');
  }

  // ---- cache + fetch ----
  var cached = null;
  try {
    var c = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (c && (Date.now() - c.t) < TTL) cached = c.d;
  } catch (e) {}
  if (cached) render(cached);

  fetch('https://api.github.com/users/' + USER + '/repos?per_page=100&sort=updated')
    .then(function (r) { if (!r.ok) throw r.status; return r.json(); })
    .then(function (repos) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), d: repos })); } catch (e) {}
      render(repos);
    })
    .catch(function () {
      if (!cached) listEl.innerHTML = '<p class="text-muted">Não consegui carregar os repositórios agora (limite da API do GitHub?). ' +
        '<a href="https://github.com/' + USER + '?tab=repositories" target="_blank" rel="noopener">Ver no GitHub →</a></p>';
    });

  // ---- busca do topbar filtra PROJETOS (só nesta página) ----
  // Substitui o input pelo clone (remove os listeners do search do Chirpy) e liga o filtro local.
  window.addEventListener('load', function () {
    var inp = document.getElementById('search-input');
    if (!inp) return;
    var clone = inp.cloneNode(true);
    clone.setAttribute('placeholder', 'Buscar projetos...');
    inp.parentNode.replaceChild(clone, inp);
    clone.addEventListener('input', function () {
      var q = clone.value.trim().toLowerCase();
      var cards = listEl.querySelectorAll('.card-wrapper');
      for (var i = 0; i < cards.length; i++) {
        var p = current[i] || {};
        var hay = (p.name + ' ' + p.description + ' ' + (p.language || '')).toLowerCase();
        cards[i].style.display = (!q || hay.indexOf(q) !== -1) ? '' : 'none';
      }
    });
  });
})();
