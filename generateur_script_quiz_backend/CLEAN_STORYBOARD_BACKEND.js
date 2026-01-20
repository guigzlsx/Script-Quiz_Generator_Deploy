// ✅ BACKEND CLEAN: Storyboard JSON pur (sans images)

// Endpoint : Génération de storyboard JSON à partir d'un script vidéo
app.post('/generate-storyboard', upload.single('document'), async (req, res) => {
  const filePath = req.file && req.file.path;
  try {
    if (!filePath) return res.status(400).send('Aucun fichier fourni');

    let scriptData = '';
    
    // Lecture du fichier script
    if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log('[/generate-storyboard] Extraction DOCX');
      scriptData = await readDOCX(filePath);
    } else {
      return res.status(400).send('Format non supporté. Veuillez soumettre un fichier .docx');
    }

    const extraInfoRaw = req.body && req.body.extraInfo ? String(req.body.extraInfo) : '';
    const extraInfo = extraInfoRaw.trim().slice(0, 1000);
    if (extraInfo) console.log('[/generate-storyboard] Extra info:', extraInfo);

    // Troncature
    const maxWords = 16000;
    const words = scriptData.split(/\s+/);
    let truncated = scriptData;
    if (words.length > maxWords) truncated = words.slice(0, maxWords).join(' ');

    const extraPriority = extraInfo ? `\n\n=== INFORMATIONS SUPPLÉMENTAIRES ===\n${extraInfo}\n=== FIN ===\n\n` : '';

    const prompt = `${extraPriority}Tu es un assistant de storyboard professionnel.
Ton objectif : générer un storyboard structuré et cohérent.

SCRIPT VIDÉO:
${truncated}

=== TÂCHES ===
1. Extrait le nom du PRODUIT
2. Identifie les 5-7 POINTS CLÉS du script
3. Génère 8-10 scènes cohérentes, une par point clé + intro/conclusion
4. Chaque scène = 1 seul plan/shot
5. Focus sur l'action et l'utilisation du produit

=== FORMAT JSON STRICTE (ARRAY SEULEMENT) ===
[
  {
    "scene": 1,
    "title": "Titre de la scène",
    "shot_type": "wide|medium|close-up",
    "camera_move": "static|pan|tilt|zoom",
    "action": "L'utilisateur ouvre le téléphone avec une main",
    "focus": "Design compact et pliable",
    "screen": "Écran d'accueil visible ou N/A",
    "emotion": "Facilité d'utilisation",
    "storyboard_focus": "Montre l'ouverture du téléphone",
    "notes": "Main au centre, cadrage simple, traits clairs"
  }
]

=== RÈGLES STRICTES ===
- Retourner UNIQUEMENT un JSON array, pas de texte avant ou après
- Chaque scène doit être cohérente avec la précédente
- shot_type: "wide" (plan large) | "medium" (plan moyen) | "close-up" (gros plan)
- camera_move: "static" (fixe) | "pan" (panoramique) | "tilt" (vertical) | "zoom"
- screen: décrire ce qu'affiche l'écran, ou "N/A" si pas d'écran
- emotion: 1-2 mots (ex: "joie", "concentration", "surprise")
- storyboard_focus: l'idée CLÉ à montrer visuellement
- notes: suggestions de composition et style (ex: "gros plan sur l'écran", "mouvement rapide")
- EXACTEMENT 8-10 scènes (pas moins, pas plus)
- JSON VALIDE ET PARSEABLE
`;

    try {
      console.log('[/generate-storyboard] Appel GPT-5 pour générer storyboard JSON...');
      
      const analysis = await openai.chat.completions.create({
        model: 'gpt-5',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      });

      const raw = analysis.choices?.[0]?.message?.content || '[]';
      console.log('[/generate-storyboard] Réponse reçue, longueur:', raw.length);

      let scenes;
      try {
        scenes = JSON.parse(raw);
      } catch (e) {
        // Essayer d'extraire le JSON s'il y a du texte autour
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          scenes = JSON.parse(jsonMatch[0]);
        } else {
          console.error('[/generate-storyboard] JSON parse error:', e.message);
          console.error('[/generate-storyboard] Raw response (first 500 chars):', raw.substring(0, 500));
          return res.status(500).json({ 
            error: 'JSON storyboard invalide',
            details: e.message
          });
        }
      }

      if (!Array.isArray(scenes) || scenes.length === 0) {
        return res.status(500).json({ 
          error: 'Aucune scène générée',
          received_type: typeof scenes,
          length: Array.isArray(scenes) ? scenes.length : 'N/A'
        });
      }

      console.log(`[/generate-storyboard] ✅ ${scenes.length} scènes générées`);

      return res.json({
        product_name: scriptData.split('\n')[0] || 'Product',
        scenes: scenes,
        total_scenes: scenes.length
      });

    } catch (err) {
      console.error('[/generate-storyboard] OpenAI error:', err.message);
      return res.status(500).json({ 
        error: 'Erreur lors de la génération du storyboard',
        details: err.message
      });
    }
  } catch (err) {
    console.error('[/generate-storyboard] Error:', err.message);
    return res.status(500).send('Erreur lors du traitement du fichier');
  } finally {
    if (filePath) fs.unlink(filePath, () => {});
  }
});
