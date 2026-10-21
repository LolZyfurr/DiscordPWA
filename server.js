import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to set correct MIME types for JavaScript modules and JSX files
app.use((req, res, next) => {
    if (req.url.endsWith('.js') || req.url.endsWith('.jsx')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
    next();
});

// Serve all static files from the project root directory
app.use(express.static(__dirname));

// Fallback route to index.html for single-page application routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Local testing server running at: http://localhost:${PORT}`);
});