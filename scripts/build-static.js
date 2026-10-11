// =========================================================
// Construit la version statique du site (sans serveur Node)
// = le dossier public/ + les données, SANS la page admin.
//
//   node scripts/build-static.js        → dossier _site/ (utilisé par GitHub Pages)
//   node scripts/build-zip.js           → zip à envoyer (voir ce fichier)
// =========================================================

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXCLUDE = new Set(['admin.html', 'admin.js', 'admin.css']);

function build(outDir) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.cpSync(path.join(ROOT, 'public'), outDir, {
    recursive: true,
    filter: src => !EXCLUDE.has(path.basename(src))
  });

  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'data.json'), 'utf-8'));

  // Retire les images / PDF qui n'existent pas sur le disque (évite les liens cassés)
  const missing = [];
  const check = obj => {
    for (const key of ['image', 'pdf']) {
      if (obj && obj[key] && !fs.existsSync(path.join(outDir, obj[key]))) {
        missing.push(obj[key]);
        obj[key] = '';
      }
    }
  };
  Object.values(data).forEach(v => (Array.isArray(v) ? v.forEach(check) : check(v)));

  fs.writeFileSync(path.join(outDir, 'data.json'), JSON.stringify(data, null, 2));
  // data.js : permet d'ouvrir index.html par double-clic (le navigateur bloque data.json hors serveur)
  fs.writeFileSync(path.join(outDir, 'data.js'), `window.PORTFOLIO_DATA = ${JSON.stringify(data)};\n`);

  const indexPath = path.join(outDir, 'index.html');
  const html = fs.readFileSync(indexPath, 'utf-8')
    .replace('<script src="script.js"></script>', '<script src="data.js"></script>\n  <script src="script.js"></script>');
  fs.writeFileSync(indexPath, html);

  // Empêche GitHub Pages de traiter le site avec Jekyll (fichiers servis tels quels)
  fs.writeFileSync(path.join(outDir, '.nojekyll'), '');

  return { missing };
}

module.exports = { build, ROOT };

if (require.main === module) {
  const { missing } = build(path.join(ROOT, '_site'));
  if (missing.length) console.log(`${missing.length} fichier(s) introuvable(s) ignoré(s).`);
  console.log('Site statique prêt dans _site/');
}
