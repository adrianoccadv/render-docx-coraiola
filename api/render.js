// Vercel Function — Render .docx via docxtemplater
// POST /api/render
// Body: { templateBase64: string, data: object }
// Resposta: { ok: true, docxBase64: string, fileName?: string }

const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

module.exports = async (req, res) => {
  // CORS para chamadas do n8n
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // Bearer token simples (defina via env var na Vercel)
    const expected = process.env.RENDER_API_TOKEN;
    if (expected) {
      const auth = req.headers['authorization'] || '';
      const token = auth.replace(/^Bearer\s+/i, '').trim();
      if (token !== expected) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }
    }

    const { templateBase64, data, fileName } = req.body || {};
    if (!templateBase64 || typeof templateBase64 !== 'string') {
      return res.status(400).json({ ok: false, error: 'templateBase64 obrigatório' });
    }
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ ok: false, error: 'data obrigatório' });
    }

    const buf = Buffer.from(templateBase64, 'base64');
    const zip = new PizZip(buf);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    doc.render(data);

    const out = doc.getZip().generate({ type: 'nodebuffer' });
    return res.status(200).json({
      ok: true,
      docxBase64: out.toString('base64'),
      fileName: fileName || 'rendered.docx',
      size: out.length
    });
  } catch (err) {
    const detail = err && err.properties && err.properties.errors
      ? err.properties.errors.map(e => ({
          id: e.properties && e.properties.id,
          explanation: e.properties && e.properties.explanation,
          file: e.properties && e.properties.file
        }))
      : null;
    return res.status(500).json({ ok: false, error: err.message, detail });
  }
};
