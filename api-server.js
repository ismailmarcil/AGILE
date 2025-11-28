// API Server pour gérer les opérations backend (chargement de demandes)
// Run with: node api-server.js

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Import backend classes
const Demand = require('./backend/demand.js');
const System = require('./backend/system.js');

const system = new System();

const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    console.log(`${req.method} ${req.url}`);

    // API Endpoint: Load demands from XML file path
    if (req.url.startsWith('/api/load-demands?file=') && req.method === 'GET') {
        try {
            const urlParams = new URL(req.url, `http://localhost:${PORT}`);
            const fileName = urlParams.searchParams.get('file');

            if (!fileName) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Nom de fichier manquant' }));
                return;
            }

            const filePath = path.join(__dirname, 'fichiersXMLPickupDelivery', fileName);

            if (!fs.existsSync(filePath)) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Fichier non trouvé' }));
                return;
            }

            await system.loadDemandsFromXML(filePath);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                demands: system.demandsList,
                count: system.demandsList.length
            }));
        } catch (error) {
            console.error('Error loading demands:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Erreur lors du chargement des demandes: ' + error.message
            }));
        }
    }
    // API Endpoint: Load demands from XML content
    else if (req.url === '/api/load-demands' && req.method === 'POST') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const xmlContent = data.xmlContent;

                if (!xmlContent) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Contenu XML manquant' }));
                    return;
                }

                // Create temp file
                const tempDir = path.join(__dirname, 'temp');
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir);
                }

                const tempFile = path.join(tempDir, `temp-${Date.now()}.xml`);
                fs.writeFileSync(tempFile, xmlContent);

                await system.loadDemandsFromXML(tempFile);

                // Clean up temp file
                fs.unlinkSync(tempFile);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    demands: system.demandsList,
                    count: system.demandsList.length
                }));
            } catch (error) {
                console.error('Error loading demands:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: 'Erreur lors du chargement des demandes: ' + error.message
                }));
            }
        });
    }
    // API Endpoint: Get current demands list
    else if (req.url === '/api/demands' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            demands: system.demandsList,
            count: system.demandsList.length
        }));
    }
    else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found' }));
    }
});

server.listen(PORT, () => {
    console.log(`API Server running at http://localhost:${PORT}/`);
    console.log('Available endpoints:');
    console.log('  POST /api/load-demands - Upload and load demands XML file');
    console.log('  GET  /api/demands      - Get current demands list');
});

