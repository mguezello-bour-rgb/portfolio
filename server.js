const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================================
// Mot de passe administrateur
// Change cette valeur puis relance le serveur.
// ==============================================
const ADMIN_PASSWORD = 'change-moi-123';

const DATA_FILE = path.join(__dirname, 'data', 'data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Dossiers autorisés pour les uploads, par catégorie de contenu
const CATEGORY_FOLDERS = {
  reseaux: 'competences',
  telecoms: 'competences',
  dev: 'competences',
  projets: 'projets',
  perso: 'perso',
  experiences: 'experiences',
  cv: 'cv'
};

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

app.use(express.json());
app.use(session({
  secret: 'portfolio-admin-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 jours
}));

// Servir les fichiers statiques du dossier public (site visiteur)
app.use(express.static(PUBLIC_DIR));

// ==============================================
// Middleware : protège les routes admin
// ==============================================
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Non authentifié' });
}

// ==============================================
// Upload de fichiers (images / PDF)
// ==============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.body.category;
    const folder = CATEGORY_FOLDERS[category];
    if (!folder) return cb(new Error('Catégorie invalide'));

    const isPdf = file.mimetype === 'application/pdf';
    const subdir = isPdf ? 'pdf' : 'images';
    const dest = path.join(PUBLIC_DIR, subdir, folder);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .slice(0, 40);
    cb(null, `${base}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 Mo
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Type de fichier non autorisé'));
    cb(null, true);
  }
});

// ==============================================
// Routes publiques
// ==============================================

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

// Données du portfolio, lecture seule pour tout le monde
app.get('/api/data', (req, res) => {
  res.json(readData());
});

// ==============================================
// Routes d'authentification admin
// ==============================================

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'Mot de passe incorrect' });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/admin/status', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// ==============================================
// Routes admin protégées : gestion du contenu
// ==============================================

app.post('/api/admin/upload', requireAdmin, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });

    const folder = CATEGORY_FOLDERS[req.body.category];
    const subdir = req.file.mimetype === 'application/pdf' ? 'pdf' : 'images';
    const relativePath = `${subdir}/${folder}/${req.file.filename}`.replace(/\\/g, '/');
    res.json({ path: relativePath });
  });
});

app.post('/api/admin/items/:category', requireAdmin, (req, res) => {
  const { category } = req.params;
  if (!CATEGORY_FOLDERS[category]) return res.status(400).json({ error: 'Catégorie invalide' });

  const data = readData();
  if (!Array.isArray(data[category])) data[category] = [];
  data[category].push(req.body);
  writeData(data);
  res.json({ ok: true, items: data[category] });
});

app.put('/api/admin/items/:category/:index', requireAdmin, (req, res) => {
  const { category, index } = req.params;
  if (!CATEGORY_FOLDERS[category]) return res.status(400).json({ error: 'Catégorie invalide' });

  const data = readData();
  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 0 || idx >= (data[category] || []).length) {
    return res.status(404).json({ error: 'Élément introuvable' });
  }
  data[category][idx] = req.body;
  writeData(data);
  res.json({ ok: true, items: data[category] });
});

app.delete('/api/admin/items/:category/:index', requireAdmin, (req, res) => {
  const { category, index } = req.params;
  if (!CATEGORY_FOLDERS[category]) return res.status(400).json({ error: 'Catégorie invalide' });

  const data = readData();
  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 0 || idx >= (data[category] || []).length) {
    return res.status(404).json({ error: 'Élément introuvable' });
  }
  data[category].splice(idx, 1);
  writeData(data);
  res.json({ ok: true, items: data[category] });
});

// Enregistre le PDF du CV (chemin obtenu via /api/admin/upload avec category=cv)
app.post('/api/admin/cv', requireAdmin, (req, res) => {
  const { pdf } = req.body || {};
  if (!pdf) return res.status(400).json({ error: 'Chemin du PDF manquant' });

  const data = readData();
  data.cv = { pdf };
  writeData(data);
  res.json({ ok: true, cv: data.cv });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
  console.log(`Admin : http://localhost:${PORT}/admin`);
});
