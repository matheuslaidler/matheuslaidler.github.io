/* Página /projetos: cards no estilo dos posts, com capa branded e dados do GitHub ao vivo.
   Config em _data/projetos.yml (injetada em #projetos-cfg):
     - include: []  -> se preenchido, mostra SÓ esses repos, nesta ordem (curadoria). Vazio = todos com descrição.
     - exclude: []  -> repos a esconder.
     - pinned:  []  -> fixados no topo (com pino), nesta ordem.
     - overrides: { repo: {description, image, tags:[], language} } -> sobrescreve dados.
     - extra:   []  -> itens manuais (não-GitHub / GitHub Projects): {name, description, url, image, language, tags, pinned}
   A busca do topbar, NESTA página, filtra os projetos (desktop e mobile). */
(function () {
  var cfgEl = document.getElementById('projetos-cfg');
  var listEl = document.getElementById('projetos-list');
  if (!cfgEl || !listEl) return;

  var cfg = {};
  try { cfg = JSON.parse(cfgEl.textContent) || {}; } catch (e) {}
  var USER = cfg.github_user || 'matheuslaidler';
  var INCLUDE = (cfg.include || []).map(function (s) { return String(s).toLowerCase(); });
  var EXCLUDE = (cfg.exclude || []).map(function (s) { return String(s).toLowerCase(); });
  var PINNED = (cfg.pinned || []).map(function (s) { return String(s).toLowerCase(); });
  var OVERRIDES = cfg.overrides || {};
  var EXTRA = cfg.extra || [];
  var FALLBACK = '/assets/img/default-cover.svg';
  var CACHE_KEY = 'projetos_repos_v2';
  var TTL = 6 * 3600 * 1000;
  var current = [];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function cover(name) { return '/assets/img/covers/proj-' + name + '.png'; }

  function tagsHTML(tags) {
    if (!tags || !tags.length) return '';
    return '<span class="proj-tags">' + tags.slice(0, 4).map(function (t) {
      return '<span class="proj-tag">' + esc(t) + '</span>';
    }).join('') + '</span>';
  }

  function cardHTML(p) {
    var img = p.image || cover(p.name);
    return '' +
      '<article class="card-wrapper card proj-card">' +
        '<a href="' + esc(p.url) + '" target="_blank" rel="noopener" class="post-preview row g-0 flex-md-row-reverse">' +
          '<div class="col-md-5 proj-thumb">' +
            '<img src="' + esc(img) + '" alt="' + esc(p.name) + '" loading="lazy" ' +
              'onerror="this.onerror=null;this.src=\'' + FALLBACK + '\'">' +
          '</div>' +
          '<div class="col-md-7"><div class="card-body d-flex flex-column">' +
            '<h2 class="card-title my-2 mt-md-0">' + esc(p.name) + (p.pinned ? ' <i class="fas fa-thumbtack fa-fw proj-pin" title="Fixado"></i>' : '') + '</h2>' +
            '<div class="card-text content mt-0 mb-2"><p>' + esc(p.description) + '</p></div>' +
            '<div class="post-meta proj-meta flex-grow-1 d-flex flex-wrap align-items-end">' +
              (p.language ? '<span class="me-3"><i class="fas fa-code fa-fw me-1"></i>' + esc(p.language) + '</span>' : '') +
              (p.stars > 0 ? '<span class="me-3"><i class="far fa-star fa-fw me-1"></i>' + p.stars + '</span>' : '') +
              tagsHTML(p.tags) +
            '</div>' +
          '</div></div>' +
        '</a>' +
      '</article>';
  }

  function build(r) {
    var ov = OVERRIDES[r.name] || {};
    return {
      name: r.name,
      description: ov.description || r.description || '',
      url: r.html_url,
      image: ov.image || null,
      language: ov.language || r.language || '',
      stars: r.stargazers_count || 0,
      tags: ov.tags || r.topics || [],
      pinned: PINNED.indexOf(r.name.toLowerCase()) !== -1
    };
  }

  function normalize(repos) {
    var items;
    if (INCLUDE.length) {
      // curadoria: só os listados em include, NA ORDEM do include
      var byName = {};
      repos.forEach(function (r) { byName[r.name.toLowerCase()] = r; });
      items = INCLUDE.map(function (n) { return byName[n] ? build(byName[n]) : null; }).filter(Boolean);
    } else {
      items = repos
        .filter(function (r) { return !r.fork && EXCLUDE.indexOf(r.name.toLowerCase()) === -1 && (r.description && r.description.trim()); })
        .map(build);
      items.sort(function (a, b) {
        if (a.pinned && !b.pinned) return -1;
        if (b.pinned && !a.pinned) return 1;
        if (a.pinned && b.pinned) return PINNED.indexOf(a.name.toLowerCase()) - PINNED.indexOf(b.name.toLowerCase());
        return b.stars - a.stars;
      });
    }
    var exPin = EXTRA.filter(function (e) { return e.pinned; });
    var exRest = EXTRA.filter(function (e) { return !e.pinned; });
    return exPin.concat(items, exRest);
  }

  function render(repos) {
    current = normalize(repos);
    listEl.innerHTML = current.length ? current.map(cardHTML).join('') : '<p class="text-muted">Nada por aqui ainda.</p>';
  }

  var cached = null;
  try { var c = JSON.parse(localStorage.getItem(CACHE_KEY)); if (c && (Date.now() - c.t) < TTL) cached = c.d; } catch (e) {}
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

  // filtro PRÓPRIO da página (funciona desktop + mobile; não briga com o search de posts do Chirpy)
  function wireFilter() {
    var inp = document.getElementById('projetos-filter');
    if (!inp) return;
    inp.addEventListener('input', function () {
      var q = inp.value.trim().toLowerCase();
      var cards = listEl.querySelectorAll('.card-wrapper');
      for (var i = 0; i < cards.length; i++) {
        var p = current[i] || {};
        var hay = (p.name + ' ' + p.description + ' ' + (p.language || '') + ' ' + (p.tags || []).join(' ')).toLowerCase();
        cards[i].style.display = (!q || hay.indexOf(q) !== -1) ? '' : 'none';
      }
    });
  }
  window.addEventListener('load', function () {
    wireFilter();
    // botão de tema do topbar reaproveita o toggle do Chirpy (existente na sidebar)
    var mt = document.getElementById('projetos-mode-toggle');
    if (mt) mt.addEventListener('click', function () {
      var real = document.querySelector('#sidebar .mode-toggle') || document.querySelector('.mode-toggle');
      if (real) { real.click(); }
    });
  });
})();
