// Pre-extract the reference legal PDFs into a single JSON corpus
// served as a static asset for the AI Legal Chat.
//
// Output: public/legal-corpus.json
//
// Run with:   node scripts/build-legal-corpus.mjs
//
import fs from 'fs';
import path from 'path';

const SOURCES = [
  {
    id: 'apcs-act-1964',
    label: 'APCS Act 1964',
    path: 'G:/Other computers/My Computer/GEETHIKA/Desktop/Act & Rules/1964AP7.pdf',
  },
  {
    id: 'apcs-rules-1964',
    label: 'APCS Rules 1964',
    path: 'G:/Other computers/My Computer/GEETHIKA/Desktop/Act & Rules/Andhra Pradesh Cooperative Societies Rules 1964.pdf',
  },
  {
    id: 'audit-manual-pacs',
    label: 'Audit Manual for PACS',
    path: 'G:/Other computers/My Computer/GEETHIKA/Desktop/Act & Rules/Audit Manual for PACS.pdf',
  },
  {
    id: 'handbook-statutory',
    label: 'Handbook on Statutory Functions',
    path: 'G:/Other computers/My Computer/GEETHIKA/Desktop/Act & Rules/HAND BOOKLET ON STATUROTY FUNCTIONS.pdf',
  },
  {
    id: 'handbook-coop-laws',
    label: 'Handbook on Cooperative Laws',
    path: 'G:/Other computers/My Computer/GEETHIKA/Desktop/Act & Rules/Handbook on Cooperative Laws.pdf',
  },
];

const PDFJS = await import('pdfjs-dist/legacy/build/pdf.mjs');

// Chunk into ~700-word windows, with ~120-word overlap between consecutive
// chunks so a section heading isn't lost at a boundary.
function chunkText(text, source, page) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  const WINDOW = 700;
  const OVERLAP = 120;
  for (let i = 0; i < words.length; i += WINDOW - OVERLAP) {
    const slice = words.slice(i, i + WINDOW);
    if (slice.length < 30) continue; // skip tiny tail chunks
    chunks.push({
      source,
      page,
      text: slice.join(' '),
    });
    if (i + WINDOW >= words.length) break;
  }
  return chunks;
}

const corpus = [];

for (const src of SOURCES) {
  if (!fs.existsSync(src.path)) {
    console.warn('Skipping (not found):', src.path);
    continue;
  }
  const data = new Uint8Array(fs.readFileSync(src.path));
  const doc = await PDFJS.getDocument({ data }).promise;
  console.log(`Reading ${src.label} (${doc.numPages} pages)…`);
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const text = tc.items
      .map((it) => it.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length < 30) continue;
    chunkText(text, src.label, p).forEach((c) => corpus.push(c));
  }
}

const outDir = path.resolve('public');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'legal-corpus.json');

fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      version: 1,
      builtAt: new Date().toISOString(),
      sources: SOURCES.map((s) => ({ id: s.id, label: s.label })),
      chunks: corpus,
    },
    null,
    0
  )
);

const sizeKB = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(
  `\nWrote ${corpus.length} chunks → ${outPath} (${sizeKB} KB)`
);
