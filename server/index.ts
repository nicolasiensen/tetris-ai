import express from 'express';
import path from 'node:path';
import apiRouter from './routes.ts';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());
app.use('/api', apiRouter);

// Serve Vite build output as static files in production
const distPath = path.join(import.meta.dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback — serve index.html for non-API routes
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
