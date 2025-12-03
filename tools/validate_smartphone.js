#!/usr/bin/env node
// Simple validator/normalizer for smartphone extraction JSON
// Usage: node tools/validate_smartphone.js extracted.json [output.json]

const fs = require('fs');
const path = require('path');

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(p,'utf8'));
}

function saveJSON(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
}

function parseBooleanRaw(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (['oui','yes','true','1','y','o'].includes(s)) return true;
  if (['non','no','false','0','n'].includes(s)) return false;
  return null;
}

function parseNumberWithUnitRaw(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/\u00A0/g,' ').trim();
  // common patterns: 16 cm, 6.3\" , 2622 x 1206, 48 MP, 1.78
  const reNum = /([-+]?[0-9]*\.?[0-9]+)/g;
  // if value contains 'x' resolution, return null here (handled elsewhere)
  if (/[x×]/.test(s) && /\d/.test(s)) return null;
  const match = s.match(reNum);
  if (!match) return null;
  // take first number
  const n = parseFloat(match[0]);
  // unit conversions
  if (/cm/.test(s)) return n * 10; // cm -> mm
  if (/mm/.test(s)) return n; // mm
  if (/in|\"|inch/.test(s)) return Math.round(n * 25.4); // inches -> mm
  if (/kg/.test(s)) return n * 1000; // kg -> g
  if (/g\b/.test(s)) return n; // g
  if (/mAh/.test(s)) return n; // battery capacity
  if (/mp|megapixel/i.test(s) && n>0) return n; // MP
  if (/ghz/i.test(s)) return n; // GHz
  if (/hz/i.test(s) && !/ghz/i.test(s)) return n; // Hz
  return n; // fallback
}

function parseResolutionRaw(v) {
  if (!v) return null;
  const s = String(v).replace(/\s+/g,' ');
  const re = /([0-9]{2,5})\s*[x×]\s*([0-9]{2,5})/;
  const m = s.match(re);
  if (!m) return null;
  return { width: parseInt(m[1],10), height: parseInt(m[2],10), raw: s };
}

function ensureArrayFromString(v) {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return v;
  const s = String(v);
  const parts = s.split(/[;,\n]+/).map(p=>p.trim()).filter(Boolean);
  return parts.length ? parts : [s.trim()];
}

function normalizeAgainstTemplate(templateNode, inputNode) {
  // Recursively walk template structure and build normalized object
  if (!templateNode) return null;
  const result = {};
  for (const key of Object.keys(templateNode)) {
    const tmpl = templateNode[key];
    const inputVal = inputNode && Object.prototype.hasOwnProperty.call(inputNode,key) ? inputNode[key] : null;
    if (tmpl && tmpl.type && ['string','number','boolean','array','object'].includes(tmpl.type)) {
      let normalized = null;
      let confidence = null;
      if (tmpl.type === 'boolean') {
        const b = parseBooleanRaw(inputVal);
        normalized = b;
        confidence = b === null ? 0 : 0.8;
      } else if (tmpl.type === 'number') {
        const n = parseNumberWithUnitRaw(inputVal);
        normalized = n;
        confidence = n === null ? 0 : 0.8;
      } else if (tmpl.type === 'array') {
        const arr = ensureArrayFromString(inputVal);
        normalized = arr;
        confidence = arr ? 0.7 : 0;
      } else if (tmpl.type === 'object') {
        normalized = inputVal || null;
        confidence = normalized ? 0.6 : 0;
      } else { // string
        normalized = inputVal === undefined ? null : (inputVal === null ? null : String(inputVal));
        confidence = normalized ? 0.6 : 0;
      }
      result[key] = { value: normalized, raw: inputVal === undefined ? null : inputVal, confidence };
    } else {
      // nested object (template node with object children)
      const child = normalizeAgainstTemplate(tmpl, inputVal || {});
      result[key] = child;
    }
  }
  return result;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node tools/validate_smartphone.js extracted.json [output.json]');
    process.exit(2);
  }
  const extractedPath = path.resolve(args[0]);
  const outPath = args[1] ? path.resolve(args[1]) : path.resolve('normalized_output.json');
  const templatePath = path.resolve(__dirname, '..', 'templates', 'smartphone_template.json');

  if (!fs.existsSync(extractedPath)) {
    console.error('Extracted JSON not found:', extractedPath);
    process.exit(3);
  }
  const extracted = loadJSON(extractedPath);
  const template = loadJSON(templatePath);

  const normalized = normalizeAgainstTemplate(template, extracted);

  saveJSON(outPath, { normalized, meta: { generated_at: new Date().toISOString(), source: extractedPath } });
  console.log('Normalized saved to', outPath);
}

if (require.main === module) main();
