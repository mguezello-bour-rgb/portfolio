// =========================================================
// Crée un zip du portfolio, à envoyer (prof, recruteur…).
// Il s'ouvre par double-clic sur « Ouvrir le portfolio.html » :
// pas de Node, pas de serveur, rien à installer.
//
//   npm run zip      → Portfolio-Mateo-GUEZELLO-BOUR.zip
// =========================================================

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { build, ROOT } = require('./build-static');

const NAME = 'Portfolio-Mateo-GUEZELLO-BOUR';
const STAGING = path.join(ROOT, '_zip');
const FOLDER = path.join(STAGING, NAME);
const ZIP = path.join(ROOT, `${NAME}.zip`);

fs.rmSync(STAGING, { recursive: true, force: true });
const { missing } = build(FOLDER);

// Nom explicite pour la page à ouvrir
fs.renameSync(path.join(FOLDER, 'index.html'), path.join(FOLDER, 'Ouvrir le portfolio.html'));
fs.rmSync(path.join(FOLDER, '.nojekyll'), { force: true });
fs.rmSync(path.join(FOLDER, 'data.json'), { force: true }); // inutile hors-ligne (data.js suffit)

fs.writeFileSync(path.join(FOLDER, 'LISEZ-MOI.txt'), [
  'Portfolio — Mateo GUEZELLO-BOUR',
  'BUT Réseaux & Télécommunications',
  '',
  'Pour consulter le portfolio :',
  '  1. Extraire le dossier du zip (clic droit > Extraire tout…).',
  '  2. Double-cliquer sur « Ouvrir le portfolio.html ».',
  '',
  'Le site s’ouvre dans le navigateur, sans installation.',
  'Les rapports PDF et les images sont inclus dans le dossier.',
  ''
].join('\r\n'));

fs.rmSync(ZIP, { force: true });
execFileSync('powershell', [
  '-NoProfile', '-Command',
  `Compress-Archive -Path '${FOLDER}' -DestinationPath '${ZIP}' -CompressionLevel Optimal`
], { stdio: 'inherit' });
fs.rmSync(STAGING, { recursive: true, force: true });

const mo = (fs.statSync(ZIP).size / 1024 / 1024).toFixed(1);
if (missing.length) console.log(`(${missing.length} image(s)/PDF référencés mais absents du disque : ignorés.)`);
console.log(`Zip créé : ${ZIP} (${mo} Mo)`);
if (mo > 25) console.log('Attention : plus de 25 Mo, trop lourd pour un e-mail Gmail/Outlook. Utilise Google Drive ou WeTransfer.');
