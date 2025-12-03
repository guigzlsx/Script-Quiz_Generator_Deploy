Templates for product extraction

Files:
- `smartphone_template.json` : canonical schema for smartphone product data (types and null defaults).
- `smartphone_prompt.txt` : LLM prompt instructing strict JSON extraction according to the schema.

Tools:
- `tools/validate_smartphone.js` : Node.js validator/normalizer. Usage:

  node tools/validate_smartphone.js path/to/extracted.json [out.json]

- `extracted.json` is expected to be a plain object with keys matching the schema or with heuristic keys extracted by OCR/parse stage. The script will try to coerce types and produce `normalized_output.json` by default.

Next steps:
- Integrate the prompt into your existing backend call to the LLM when you need a strict JSON extraction.
- Use `tools/validate_smartphone.js` as a post-processing step to normalize and produce per-field confidence for UI review.
