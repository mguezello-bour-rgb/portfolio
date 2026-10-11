const loginScreen = document.getElementById('login-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const adminApp = document.getElementById('admin-app');

const adminGrid = document.getElementById('admin-grid');
const addBtn = document.getElementById('add-btn');

const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');
const editTitle = document.getElementById('edit-title');
const editError = document.getElementById('edit-error');
const editClose = document.getElementById('edit-close');
const deleteBtn = document.getElementById('delete-btn');
const currentImageLabel = document.getElementById('current-image');
const currentPdfLabel = document.getElementById('current-pdf');

const adminCount = document.getElementById('admin-count');
const toastEl = document.getElementById('toast');

let allData = {};
let currentCategory = 'reseaux';
let editingIndex = null; // null = ajout, sinon index de l'élément modifié

const CATEGORY_LABELS = {
  reseaux: 'Réseaux', telecoms: 'Télécoms', dev: 'Développement', projets: 'Projets', perso: 'Projets perso',
  experiences: 'Expériences'
};

const isXp = () => currentCategory === 'experiences';
const lines = v => v.split('\n').map(s => s.trim()).filter(Boolean);
const commas = v => v.split(',').map(s => s.trim()).filter(Boolean);
const itemName = item => (item && (item.titre || item.entreprise)) || 'élément';

const stdFields = document.getElementById('std-fields');
const xpFields = document.getElementById('xp-fields');

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let toastTimer;
function toast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.classList.toggle('error', isError);
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
}

// Appel à l'API admin : gère la session expirée (serveur relancé, cookie perdu…)
async function api(url, options) {
  const res = await fetch(url, options);
  const result = await res.json().catch(() => ({}));
  if (res.status === 401) {
    closeEditModal();
    loginScreen.hidden = false;
    adminApp.hidden = true;
    loginError.textContent = 'Session expirée : reconnecte-toi puis recommence.';
    throw new Error('Session expirée');
  }
  if (!res.ok) throw new Error(result.error || 'Erreur serveur');
  return result;
}

// ===============================
// Connexion / session
// ===============================

async function checkStatus() {
  const res = await fetch('/api/admin/status');
  const { isAdmin } = await res.json();
  if (isAdmin) {
    loginScreen.hidden = true;
    adminApp.hidden = false;
    await loadData();
    renderCurrentCategory();
  } else {
    loginScreen.hidden = false;
    adminApp.hidden = true;
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  const password = document.getElementById('login-password').value;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Connexion...';

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (res.ok) {
      await checkStatus();
    } else {
      const result = await res.json().catch(() => ({}));
      loginError.textContent = result.error || 'Mot de passe incorrect.';
    }
  } catch (err) {
    console.error('Erreur de connexion admin :', err);
    loginError.textContent = 'Impossible de contacter le serveur. Vérifie que node server.js tourne bien dans le terminal.';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Se connecter';
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  checkStatus();
});

// ===============================
// Chargement des données
// ===============================

async function loadData() {
  const res = await fetch('/api/data');
  allData = await res.json();
}

// ===============================
// Onglets catégories
// ===============================

document.querySelectorAll('.admin-tabs .nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-tabs .nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.cat;
    renderCurrentCategory();
  });
});

function renderCurrentCategory() {
  addBtn.hidden = currentCategory === 'cv';

  if (currentCategory === 'cv') {
    adminCount.textContent = '';
    renderCvPanel();
    return;
  }

  const items = allData[currentCategory] || [];
  adminCount.textContent = `${items.length} élément${items.length > 1 ? 's' : ''} dans « ${CATEGORY_LABELS[currentCategory]} »`;

  if (items.length === 0) {
    adminGrid.innerHTML = '<p class="empty-state">Aucun élément dans cette catégorie pour le moment. Clique sur « + Ajouter un élément ».</p>';
    return;
  }

  adminGrid.innerHTML = items.map((item, index) => `
    <div class="project-card">
      ${item.image
        ? `<img src="${esc(item.image)}" class="project-image" alt="" onerror="this.outerHTML='<div class=&quot;no-image&quot;>Image introuvable</div>'">`
        : '<div class="no-image">Pas d’image</div>'}
      <h3 class="project-title">${esc(itemName(item))}</h3>
      <p class="project-description">${esc(isXp() ? [item.poste, item.dates].filter(Boolean).join(' · ') : item.description)}</p>
      <div class="card-meta">
        ${isXp()
          ? `${item.type ? `<span>${esc(item.type)}</span>` : ''}${item.statut ? `<span${/cours/i.test(item.statut) ? ' class="ok"' : ''}>${esc(item.statut)}</span>` : ''}`
          : (item.resultat ? `<span>${esc(item.resultat)}</span>` : '')}
        ${item.pdf ? '<span class="ok">PDF</span>' : '<span>Sans PDF</span>'}
      </div>
      <div class="admin-card-actions">
        <button class="admin-edit-btn" data-action="edit" data-index="${index}">Modifier</button>
        <button class="admin-delete-btn" data-action="delete" data-index="${index}">Supprimer</button>
      </div>
    </div>
  `).join('');
}

function renderCvPanel() {
  const cv = allData.cv || { pdf: '' };

  adminGrid.innerHTML = `
    <div class="project-card cv-panel">
      <h3 class="project-title">CV (PDF)</h3>
      <p class="project-description">
        ${cv.pdf
          ? `CV actuel : <a href="${cv.pdf}" target="_blank" rel="noopener">${cv.pdf}</a>`
          : 'Aucun CV en ligne pour le moment.'}
      </p>
      <form id="cv-form" class="edit-form">
        <label>${cv.pdf ? 'Remplacer le CV' : 'Ajouter le CV'} (fichier PDF)
          <input type="file" id="cv-file" accept="application/pdf" required />
        </label>
        <div class="edit-form-actions">
          <button type="submit" class="pdf-btn">Enregistrer</button>
        </div>
        <p id="cv-error" class="login-error"></p>
      </form>
    </div>
  `;

  document.getElementById('cv-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const cvError = document.getElementById('cv-error');
    cvError.textContent = '';
    const file = document.getElementById('cv-file').files[0];

    if (!file) return;

    try {
      const path = await uploadFile(file, 'cv');
      const result = await api('/api/admin/cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdf: path })
      });

      allData.cv = result.cv;
      renderCvPanel();
      toast('CV enregistré ✓');
    } catch (err) {
      cvError.textContent = err.message;
    }
  });
}

adminGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const index = Number(btn.dataset.index);

  if (btn.dataset.action === 'edit') openEditModal(index);
  if (btn.dataset.action === 'delete') deleteItem(index);
});

// ===============================
// Modale ajout / édition
// ===============================

addBtn.addEventListener('click', () => openEditModal(null));
editClose.addEventListener('click', closeEditModal);
editModal.querySelector('.modal-overlay').addEventListener('click', closeEditModal);

function openEditModal(index) {
  editingIndex = index;
  editError.textContent = '';
  editForm.reset();
  currentImageLabel.textContent = '';
  currentPdfLabel.textContent = '';

  // Les champs affichés dépendent de la catégorie (un fieldset désactivé n'est pas validé)
  stdFields.hidden = stdFields.disabled = isXp();
  xpFields.hidden = xpFields.disabled = !isXp();
  document.getElementById('image-label').textContent = isXp() ? 'Logo ou photo (jpg, png, webp, gif)' : 'Photo (jpg, png, webp, gif)';
  document.getElementById('pdf-label').textContent = isXp() ? 'Document PDF (attestation, rapport de stage…)' : 'Fichier PDF';

  const item = index === null ? {} : allData[currentCategory][index];
  document.getElementById('remove-image-wrap').hidden = !item.image;
  document.getElementById('remove-pdf-wrap').hidden = !item.pdf;

  if (index === null) {
    editTitle.textContent = `Ajouter un élément — ${CATEGORY_LABELS[currentCategory]}`;
    deleteBtn.hidden = true;
  } else {
    editTitle.textContent = `Modifier — ${itemName(item)}`;
    deleteBtn.hidden = false;

    if (isXp()) {
      editForm.type.value = item.type || 'Alternance';
      editForm.statut.value = item.statut || 'En cours';
      editForm.entreprise.value = item.entreprise || '';
      editForm.poste.value = item.poste || '';
      editForm.dates.value = item.dates || '';
      editForm.lieu.value = item.lieu || '';
      editForm.missions.value = (item.missions || []).join('\n');
      editForm.outils.value = (item.outils || []).join(', ');
    } else {
      editForm.titre.value = item.titre || '';
      editForm.description.value = item.description || '';
      editForm.technologies.value = (item.technologies || []).join(', ');
      editForm.details.value = (item.details || []).join('\n');
      editForm.resultat.value = item.resultat || '';
    }

    if (item.image) currentImageLabel.textContent = `Actuel : ${item.image}`;
    if (item.pdf) currentPdfLabel.textContent = `Actuel : ${item.pdf}`;
  }

  editModal.classList.add('active');
  document.body.classList.add('locked');
  setTimeout(() => (isXp() ? editForm.entreprise : editForm.titre).focus(), 50);
}

function closeEditModal() {
  editModal.classList.remove('active');
  document.body.classList.remove('locked');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeEditModal();
});

async function uploadFile(file, category) {
  const formData = new FormData();
  formData.append('category', category);
  formData.append('file', file);

  const result = await api('/api/admin/upload', { method: 'POST', body: formData });
  return result.path;
}

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  editError.textContent = '';
  const saveBtn = editForm.querySelector('button[type="submit"]');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Enregistrement…';

  try {
    const existing = editingIndex !== null ? allData[currentCategory][editingIndex] : {};

    const imageFile = editForm.imageFile.files[0];
    const pdfFile = editForm.pdfFile.files[0];

    const keepImage = editForm.removeImage.checked ? '' : (existing.image || '');
    const keepPdf = editForm.removePdf.checked ? '' : (existing.pdf || '');
    const image = imageFile ? await uploadFile(imageFile, currentCategory) : keepImage;
    const pdf = pdfFile ? await uploadFile(pdfFile, currentCategory) : keepPdf;

    const item = isXp()
      ? {
          type: editForm.type.value,
          statut: editForm.statut.value,
          entreprise: editForm.entreprise.value.trim(),
          poste: editForm.poste.value.trim(),
          dates: editForm.dates.value.trim(),
          lieu: editForm.lieu.value.trim(),
          missions: lines(editForm.missions.value),
          outils: commas(editForm.outils.value),
          image,
          pdf
        }
      : {
          ...existing, // conserve les champs non gérés par le formulaire (ex. icône)
          titre: editForm.titre.value.trim(),
          description: editForm.description.value.trim(),
          technologies: commas(editForm.technologies.value),
          details: lines(editForm.details.value),
          resultat: editForm.resultat.value.trim(),
          image,
          pdf
        };

    const url = editingIndex === null
      ? `/api/admin/items/${currentCategory}`
      : `/api/admin/items/${currentCategory}/${editingIndex}`;
    const method = editingIndex === null ? 'POST' : 'PUT';

    const result = await api(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });

    allData[currentCategory] = result.items;
    renderCurrentCategory();
    closeEditModal();
    toast(editingIndex === null ? 'Élément ajouté ✓' : 'Modifications enregistrées ✓');
  } catch (err) {
    editError.textContent = err.message;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Enregistrer';
  }
});

deleteBtn.addEventListener('click', () => {
  if (editingIndex !== null) deleteItem(editingIndex);
  closeEditModal();
});

async function deleteItem(index) {
  const titre = itemName(allData[currentCategory]?.[index]);
  if (!confirm(`Supprimer « ${titre} » ?`)) return;

  try {
    const result = await api(`/api/admin/items/${currentCategory}/${index}`, { method: 'DELETE' });
    allData[currentCategory] = result.items;
    renderCurrentCategory();
    toast('Élément supprimé ✓');
  } catch (err) {
    toast(err.message, true);
  }
}

// ===============================
// Init
// ===============================

checkStatus();
