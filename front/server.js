// Simple HTTP server pour servir l'application DelivHub
// Lancer avec: node server.js

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

// Types MIME pour les différentes extensions de fichiers
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Parser l'URL et retirer les query strings
    let filePath = req.url.split('?')[0];

    // Route par défaut vers index.html
    if (filePath === '/' || filePath === '') {
        filePath = '/index.html';
    }

    // Construire le chemin complet du fichier
    let fullPath;

    if (filePath.startsWith('/backend/')) {
        // Fichiers backend (un niveau au-dessus)
        fullPath = path.join(__dirname, '..', filePath);
    } else if (filePath.startsWith('/front/')) {
        // Fichiers front avec chemin complet /front/...
        fullPath = path.join(__dirname, '..', filePath);
    } else if (filePath.startsWith('/fichiersXMLPickupDelivery/')) {
        // Fichiers XML (un niveau au-dessus)
        fullPath = path.join(__dirname, '..', filePath);
    } else {
        // Fichiers dans le dossier front (par défaut)
        fullPath = path.join(__dirname, filePath);
    }

    // Obtenir l'extension du fichier
    const extname = String(path.extname(fullPath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    // Lire et servir le fichier
    fs.readFile(fullPath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Fichier non trouvé
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end(`
                    <h1>404 - Fichier non trouvé</h1>
                    <p>Le fichier <code>${filePath}</code> n'existe pas.</p>
                    <p>Chemin complet: <code>${fullPath}</code></p>
                `, 'utf-8');
            } else {
                // Erreur serveur
                res.writeHead(500);
                res.end(`Erreur serveur: ${err.code}`, 'utf-8');
            }
        } else {
            // Succès
            res.writeHead(200, {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*' // Enable CORS
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`🚀 Serveur DelivHub démarré !`);
    console.log(`========================================`);
    console.log(`📍 URL: http://localhost:${PORT}/`);
    console.log(`📂 Dossier: ${__dirname}`);
    console.log(`\n👉 Ouvrez http://localhost:${PORT}/ dans votre navigateur`);
    console.log(`\nAppuyez sur Ctrl+C pour arrêter le serveur\n`);
});

