// =========================================================
// Construit la version en ligne du site (dossier _site/)
// = le dossier public/ + data/data.json, SANS la page admin.
// Utilisé automatiquement par GitHub à chaque publication.
// Test en local : node scripts/build-static.js
// =========================================================

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '_site');
const EXCLUDE = new Set(['admin.html', 'admin.js', 'admin.css']);

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'public'), OUT, {
  recursive: true,
  filter: src => !EXCLUDE.has(path.basename(src))
});
fs.copyFileSync(path.join(ROOT, 'data', 'data.json'), path.join(OUT, 'data.json'));
// Empêche GitHub Pages de traiter le site avec Jekyll (fichiers servis tels quels)
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

console.log('Site statique prêt dans _site/');
