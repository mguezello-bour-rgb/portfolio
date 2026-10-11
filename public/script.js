// =========================================================
// Portfolio — logique du site public
// Les données viennent de /api/data (lecture seule).
// Toute modification se fait via /admin.
// =========================================================

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const CATEGORIES = {
  projets: { label: 'Projet BUT', code: 'PRJ' },
  perso: { label: 'Projet personnel', code: 'PER' },
  reseaux: { label: 'Réseaux', code: 'RES' },
  telecoms: { label: 'Télécommunications', code: 'TEL' },
  dev: { label: 'Développement & automatisation', code: 'DEV' }
};

// Tous les éléments affichés, indexés pour la fenêtre de détail
const registry = [];

// ===============================
// 1) OUTILS
// ===============================

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function text(v, fallback = '') {
  return (typeof v === 'string' && v.trim()) ? v.trim() : fallback;
}

function arr(v) {
  return Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()) : [];
}

// Pour les listes : retire un tiret ou une puce tapé en début de ligne (le site ajoute déjà le sien)
function points(v) {
  return arr(v).map(s => s.replace(/^\s*[-–—•*]+\s*/, '')).filter(Boolean);
}

// Extrait un pourcentage de "acquis à 80%" → 80
function percent(resultat) {
  const m = /(\d{1,3})\s*%/.exec(resultat || '');
  return m ? Math.min(100, Number(m[1])) : null;
}

function ref(category, i) {
  return `${CATEGORIES[category].code}-${String(i + 1).padStart(2, '0')}`;
}

// Vérifie qu'un fichier existe (PDF) — résultat mis en cache
const assetCache = new Map();
function assetExists(url) {
  if (!url) return Promise.resolve(false);
  if (!assetCache.has(url)) {
    assetCache.set(url, fetch(url, { method: 'HEAD' }).then(r => r.ok).catch(() => false));
  }
  return assetCache.get(url);
}

function register(item, category, i) {
  registry.push({ item, category, ref: ref(category, i) });
  return registry.length - 1;
}

// ===============================
// 2) RENDU
// ===============================

function projectCard(item, category, i) {
  const id = register(item, category, i);
  const title = text(item.titre, 'Sans titre');
  const techs = arr(item.technologies);
  const pct = percent(item.resultat);
  const placeholder = `<div class="card-placeholder">${ref(category, i)}</div>`;

  return `
    <article class="card reveal" tabindex="0" data-id="${id}">
      <div class="card-media">
        ${placeholder}
        ${text(item.image) ? `<img src="${esc(item.image)}" alt="${esc(title)}" loading="lazy" onerror="this.remove()">` : ''}
      </div>
      <div class="card-body">
        <p class="card-ref">${ref(category, i)}</p>
        <h3 class="card-title">${esc(title)}</h3>
        <p class="card-desc">${esc(text(item.description))}</p>
        <div class="tags">${techs.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        ${pct !== null ? `
          <div class="card-progress">
            <header><span>Niveau d’acquisition</span><b>${pct} %</b></header>
            <div class="bar"><i data-width="${pct}"></i></div>
          </div>` : ''}
        <div class="card-foot">
          <span class="pdf-flag" data-pdf="${esc(text(item.pdf))}"></span>
          <span class="open">Voir la fiche →</span>
        </div>
      </div>
    </article>`;
}

function renderProjects(targetId, items, category) {
  const el = document.getElementById(targetId);
  if (el) el.innerHTML = items.map((it, i) => projectCard(it, category, i)).join('');
}

// Icônes au trait (choisies selon le sujet de la compétence)
const ICONS = {
  route: '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M7 6h10M6.2 7.8l4.8 8.4M17.8 7.8L13 16.2"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  gauge: '<path d="M4 18a8 8 0 1116 0"/><path d="M12 18l4-6"/>',
  cycle: '<path d="M20 11a8 8 0 00-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0014.3 4.9L20 16M20 20v-4h-4"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z"/>',
  fiber: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/>',
  antenna: '<path d="M12 10v11M8 21h8"/><circle cx="12" cy="8" r="2"/><path d="M7.5 3.5a7 7 0 000 9M16.5 3.5a7 7 0 010 9"/>',
  wave: '<path d="M2 9c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1"/><path d="M2 16c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
  code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
  box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
  chart: '<path d="M4 20V11M10 20V5M16 20v-6M2 20h20"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>',
  db: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>'
};

const ICON_RULES = [
  [/vlan|802\.1q/, 'layers'], [/vpn|ipsec/, 'lock'], [/qos|quality/, 'gauge'],
  [/disponibilit|hsrp|vrrp/, 'cycle'], [/voip|sip|t[ée]l[ée]phon/, 'phone'], [/fibre|ftth|gpon/, 'fiber'],
  [/mobile|5g|lte/, 'antenna'], [/sdh|wdm|transmission/, 'wave'], [/s[ée]curit|firewall/, 'shield'],
  [/docker|conteneur/, 'box'], [/ansible|as code/, 'file'], [/monitoring|zabbix|grafana/, 'chart'],
  [/web|javascript/, 'globe'], [/donn[ée]es|sql/, 'db'], [/python|automatisation/, 'code'],
  [/bgp|ospf|routage|mpls/, 'route']
];
const DEFAULT_ICON = { reseaux: 'route', telecoms: 'antenna', dev: 'code' };

function iconFor(item, cat) {
  const hay = `${item.titre} ${arr(item.technologies).join(' ')}`.toLowerCase();
  const rule = ICON_RULES.find(([re]) => re.test(hay));
  const name = rule ? rule[1] : DEFAULT_ICON[cat];
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

const DOMAIN_INTRO = {
  reseaux: 'Conception et configuration de réseaux d’entreprise : commutation, routage, sécurisation des flux et haute disponibilité.',
  telecoms: 'Infrastructures de transport et de communication : fibre optique, téléphonie IP, réseaux mobiles et transmission.',
  dev: 'Scripts et outils pour automatiser, superviser et documenter les infrastructures.'
};

function renderSkills(data) {
  document.getElementById('skills-grid').innerHTML = ['reseaux', 'telecoms', 'dev'].map(cat => {
    const items = data[cat] || [];
    return `
      <div class="skill-col reveal">
        <header>
          <h3>${CATEGORIES[cat].label}</h3>
          <span>${String(items.length).padStart(2, '0')}</span>
          <p>${DOMAIN_INTRO[cat]}</p>
        </header>
        ${items.map((item, i) => {
          const id = register(item, cat, i);
          return `
            <article class="skill" tabindex="0" data-id="${id}">
              <div class="skill-line">
                <span class="skill-icon">${iconFor(item, cat)}</span>
                <h4 class="skill-name">${esc(text(item.titre, 'Sans titre'))}</h4>
                <span class="skill-code">${ref(cat, i)}</span>
              </div>
              <p class="skill-desc">${esc(text(item.description))}</p>
              <div class="tags">${arr(item.technologies).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
            </article>`;
        }).join('')}
      </div>`;
  }).join('');
}

// Indique "Rapport PDF" seulement si le fichier existe vraiment
async function markPdfFlags() {
  const flags = [...document.querySelectorAll('.pdf-flag[data-pdf]')];
  const results = await Promise.all(flags.map(async el => {
    const ok = await assetExists(el.dataset.pdf);
    if (ok) el.textContent = 'Rapport PDF disponible';
    return ok;
  }));
  const n = results.filter(Boolean).length;
  document.getElementById('sheet-reports').textContent = n ? `${n} rapport${n > 1 ? 's' : ''} PDF` : '—';
}

function renderStats(data) {
  const skills = ['reseaux', 'telecoms', 'dev'].flatMap(c => data[c] || []);
  const projects = [...(data.projets || []), ...(data.perso || [])];

  const techs = new Set();
  [...skills, ...projects].forEach(it => arr(it.technologies).forEach(t => techs.add(t.trim().toLowerCase())));

  const pcts = (data.projets || []).map(p => percent(p.resultat)).filter(p => p !== null);
  const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;

  document.getElementById('stat-projets').dataset.count = projects.length;
  document.getElementById('stat-comp').dataset.count = skills.length;
  document.getElementById('stat-tech').dataset.count = techs.size;
  document.getElementById('stat-acquis').dataset.count = avg;

  const nb = (data.projets || []).length;
  document.getElementById('sheet-projects').textContent = `${nb} projet${nb > 1 ? 's' : ''} BUT · ${(data.perso || []).length} personnel${(data.perso || []).length > 1 ? 's' : ''}`;
  document.getElementById('projets-count').textContent = `(${nb})`;
  document.getElementById('perso-count').textContent = `(${(data.perso || []).length})`;

  const domains = [
    ['Projets BUT', nb],
    ['Réseaux', (data.reseaux || []).length],
    ['Télécommunications', (data.telecoms || []).length],
    ['Développement & automatisation', (data.dev || []).length],
    ['Projets personnels', (data.perso || []).length]
  ];
  const max = Math.max(1, ...domains.map(d => d[1]));
  document.getElementById('domain-bars').innerHTML = domains.map(([label, n]) => `
    <div class="domain-bar">
      <header>${label}<span>${n} fiche${n > 1 ? 's' : ''}</span></header>
      <div class="bar"><i data-width="${(n / max) * 100}"></i></div>
    </div>`).join('');
}

// ===============================
// EXPÉRIENCES (alternance, stage…) — modifiables dans /admin
// ===============================

function statusClass(statut) {
  const s = (statut || '').toLowerCase();
  if (s.includes('cours')) return 'xp-status';
  if (s.includes('venir')) return 'xp-status xp-status-next';
  return 'xp-status xp-status-done';
}

function renderExperiences(list) {
  const grid = document.getElementById('xp-grid');
  const section = document.getElementById('experiences');
  if (!list.length) {
    grid.innerHTML = '<p class="muted">Aucune expérience renseignée pour le moment.</p>';
    return;
  }
  section.hidden = false;
  grid.innerHTML = list.map(xp => {
    const missions = points(xp.missions);
    const outils = arr(xp.outils);
    const pdf = text(xp.pdf);
    return `
      <article class="xp reveal">
        ${text(xp.image) ? `<div class="xp-media"><img src="${esc(xp.image)}" alt="${esc(xp.entreprise)}" loading="lazy" onerror="this.parentElement.remove()"></div>` : ''}
        <header class="xp-head">
          <span class="xp-type mono">${esc(text(xp.type, 'Expérience'))}</span>
          ${text(xp.statut) ? `<span class="${statusClass(xp.statut)}">${esc(xp.statut)}</span>` : ''}
        </header>
        <h3 class="xp-company">${esc(text(xp.entreprise, 'Entreprise'))}</h3>
        ${text(xp.poste) ? `<p class="xp-role">${esc(xp.poste)}</p>` : ''}
        ${text(xp.dates) || text(xp.lieu) ? `
          <p class="xp-meta mono">
            ${text(xp.dates) ? `<span>${esc(xp.dates)}</span>` : ''}
            ${text(xp.lieu) ? `<span>${esc(xp.lieu)}</span>` : ''}
          </p>` : ''}
        ${missions.length ? `
          <h4 class="xp-label mono">Missions</h4>
          <ul class="xp-list">${missions.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
        ${outils.length ? `<div class="tags">${outils.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
        ${pdf ? `<a class="btn btn-line xp-doc" data-pdf-link="${esc(pdf)}" href="${esc(pdf)}" target="_blank" rel="noopener" hidden>Voir le document (PDF)</a>` : ''}
      </article>`;
  }).join('');

  // Bouton PDF seulement si le fichier existe
  grid.querySelectorAll('[data-pdf-link]').forEach(async a => {
    if (await assetExists(a.dataset.pdfLink)) a.hidden = false;
  });

  // Badge « Actuellement … » et ligne « Situation » : première expérience en cours
  const current = list.find(xp => (xp.statut || '').toLowerCase().includes('cours'));
  if (current && text(current.entreprise)) {
    const type = (current.type || '').toLowerCase();
    const who = type.includes('altern') ? 'Alternant' : type.includes('stage') ? 'Stagiaire' : 'En poste';
    document.getElementById('status-text').innerHTML = `Actuellement ${who.toLowerCase()} chez <strong>${esc(current.entreprise)}</strong>`;
    document.getElementById('status-badge').hidden = false;
    document.getElementById('sheet-situation').textContent = `${who} chez ${current.entreprise}`;
    document.getElementById('sheet-situation-row').hidden = false;
  }
}

function renderCv(cv) {
  const pdf = cv && text(cv.pdf);
  if (!pdf) return;
  document.getElementById('cv-link').href = pdf;
  document.getElementById('hero-cv').href = pdf;
  document.getElementById('cv-card').hidden = false;
  document.getElementById('hero-cv').hidden = false;
}

function animateCount(el) {
  const target = Number(el.dataset.count) || 0;
  const suffix = el.dataset.suffix || '';
  if (REDUCED_MOTION) { el.textContent = target + suffix; return; }
  const start = performance.now();
  (function step(now) {
    const t = Math.min(1, (now - start) / 1200);
    el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))) + suffix;
    if (t < 1) requestAnimationFrame(step);
  })(start);
}

// ===============================
// 3) FENÊTRE DE DÉTAIL
// ===============================

const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
let lastFocus = null;

function openModal(id) {
  const entry = registry[id];
  if (!entry) return;
  const { item, category } = entry;
  const title = text(item.titre, 'Sans titre');
  const details = points(item.details);
  const techs = arr(item.technologies);
  const pct = percent(item.resultat);

  modalBody.innerHTML = `
    ${text(item.image) ? `<div class="modal-media"><img src="${esc(item.image)}" alt="${esc(title)}" onerror="this.parentElement.remove()"></div>` : ''}
    <div class="modal-content">
      <p class="modal-kicker">${entry.ref} · ${CATEGORIES[category].label}</p>
      <h2 class="modal-title" id="modal-title">${esc(title)}</h2>
      <p class="modal-desc">${esc(text(item.description))}</p>

      <div class="modal-grid">
        <div>
          ${details.length ? `
            <h3 class="modal-label">Travail réalisé</h3>
            <ul class="checklist">${details.map(d => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
        </div>
        <aside>
          ${text(item.resultat) ? `
            <div class="side">
              <h3 class="modal-label">Résultat</h3>
              ${pct !== null ? `
                <p class="result-pct">${pct} %</p>
                <div class="bar"><i data-width="${pct}"></i></div>
                <p class="result-note">${esc(item.resultat)}</p>` : `<p>${esc(item.resultat)}</p>`}
            </div>` : ''}
          ${techs.length ? `
            <div class="side">
              <h3 class="modal-label">Outils et technologies</h3>
              <div class="tags">${techs.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
            </div>` : ''}
        </aside>
      </div>
      <div class="modal-actions" id="modal-actions"></div>
    </div>`;

  // Bouton PDF seulement si le fichier existe
  const pdf = text(item.pdf);
  assetExists(pdf).then(ok => {
    const actions = document.getElementById('modal-actions');
    if (ok && actions) actions.innerHTML = `<a class="btn btn-solid" href="${esc(pdf)}" target="_blank" rel="noopener">Ouvrir le rapport PDF</a>`;
  });

  lastFocus = document.activeElement;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('locked');
  modalBody.scrollTop = 0;
  modal.querySelector('.modal-close').focus({ preventScroll: true });
  setTimeout(() => modalBody.querySelectorAll('.bar i').forEach(b => b.style.width = b.dataset.width + '%'), 150);
}

function closeModal() {
  if (!modal.classList.contains('open')) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('locked');
  lastFocus?.focus?.({ preventScroll: true });
}

document.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) return closeModal();
  const el = e.target.closest('[data-id]');
  if (el) openModal(Number(el.dataset.id));
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && e.target.matches?.('article[data-id]')) openModal(Number(e.target.dataset.id));
});

// ===============================
// 4) NAVIGATION
// ===============================

const topbar = document.getElementById('topbar');
const nav = document.getElementById('nav');
const burger = document.getElementById('burger');

burger.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  burger.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', open);
});
nav.addEventListener('click', e => {
  if (!e.target.closest('a')) return;
  nav.classList.remove('open');
  burger.classList.remove('open');
  burger.setAttribute('aria-expanded', 'false');
});

window.addEventListener('scroll', () => topbar.classList.toggle('scrolled', scrollY > 10), { passive: true });

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    document.querySelectorAll('.nav-link').forEach(l =>
      l.classList.toggle('active', l.getAttribute('href') === '#' + entry.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('main > section[id]').forEach(s => sectionObserver.observe(s));

// ===============================
// 5) APPARITION AU SCROLL
// ===============================

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    el.classList.add('in');
    el.querySelectorAll('[data-count]').forEach(animateCount);
    el.querySelectorAll('.bar i[data-width]').forEach(b => b.style.width = b.dataset.width + '%');
    revealObserver.unobserve(el);
  });
}, { threshold: 0.1 });

// ===============================
// 6) INITIALISATION
// ===============================

document.getElementById('year').textContent = new Date().getFullYear();
document.getElementById('sheet-date').textContent =
  new Date().toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' });

async function init() {
  let data = {};
  try {
    // En local : l'API du serveur Node. En ligne (site statique) : le fichier data.json publié à côté.
    let res = await fetch('/api/data').catch(() => null);
    if (!res || !res.ok || !(res.headers.get('content-type') || '').includes('json')) res = await fetch('data.json');
    data = await res.json();
  } catch (err) {
    console.error('Impossible de charger les données du portfolio :', err);
  }

  renderStats(data);
  renderCv(data.cv);
  renderExperiences(Array.isArray(data.experiences) ? data.experiences : []);
  renderProjects('projets-grid', data.projets || [], 'projets');
  renderProjects('perso-grid', data.perso || [], 'perso');
  renderSkills(data);
  markPdfFlags();

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

init();
