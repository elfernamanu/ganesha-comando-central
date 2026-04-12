import { readFileSync } from 'fs';
import { join } from 'path';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const htmlPath = join(process.cwd(), 'public', 'index.html');
    const html = readFileSync(htmlPath, 'utf-8');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    res.status(404).json({ error: 'Not found' });
  }
}
