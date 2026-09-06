import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve static files from dashboard directory
app.use(express.static(path.join(__dirname, 'dashboard')));

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard/login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard/index.html'));
});

app.get('/pricing', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard/pricing.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎨 Dashboard running at http://localhost:${PORT}`);
});


