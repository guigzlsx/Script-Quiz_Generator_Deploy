// ✅ BACKEND: Génération JSON Storyboard pur (sans images)
// À remplacer dans server.js à partir de app.post('/generate-storyboard')

// Endpoint : Génération de storyboard JSON à partir d'un script vidéo
app.post('/generate-storyboard', upload.single('document'), async (req, res) => {
  const filePath = req.file && req.file.path;
  try {
    if (!filePath) return res.status(400).send('Aucun fichier fourni');

    let scriptData = '';
    
    // Lecture du fichier script (DOCX uniquement)
    if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log('[/generate-storyboard] Extraction DOCX');
      scriptData = await readDOCX(filePath);
    } else {
      return res.status(400).send('Format non supporté. Veuillez soumettre un fichier .docx');
    }

    const extraInfoRaw = req.body && req.body.extraInfo ? String(req.body.extraInfo) : '';
    const extraInfo = extraInfoRaw.trim().slice(0, 1000);
    if (extraInfo) console.log('[/generate-storyboard] Extra info:', extraInfo);

    // Troncature raisonnable
    const maxWords = 16000;
    const words = scriptData.split(/\s+/);
    let truncated = scriptData;
    if (words.length > maxWords) truncated = words.slice(0, maxWords).join(' ');

    const extraPriority = extraInfo ? `\n\n=== INFORMATIONS SUPPLÉMENTAIRES ===\n${extraInfo}\n=== FIN ===\n\n` : '';

    const prompt = `${extraPriority}Tu es un assistant de storyboard professionnel.
Ton objectif : générer des scènes cohérentes, visuelles, et prêtes pour Storyboarder.ai.
Ne génère PAS d'images. Chaque sortie doit être un JSON strictement formaté.

SCRIPT VIDÉO:
${truncated}

=== TÂCHES ===
1. Extrait le nom du PRODUIT
2. Identifie les 5-7 POINTS CLÉS du script
3. Génère 8-10 scènes cohérentes, une par point clé + intro/conclusion
4. Chaque scène = 1 shot seulement (pas 2-3 plans)
5. Focus sur l'action et l'utilisation du produit

=== FORMAT JSON STRICTE (UN SEUL JSON ARRAY) ===
[
  {
    "scene": 1,
    "shot_type": "medium",
    "camera_move": "static",
    "action": "L'utilisateur ouvre le téléphone avec une main",
    "focus": "Design compact et pliable",
    "screen": "Écran d'accueil visible",
    "emotion": "Facilité d'utilisation",
    "storyboard_focus": "Montre l'ouverture du téléphone",
    "notes": "Main au centre, cadrage simple, traits clairs"
  },
  {
    "scene": 2,
    "shot_type": "close-up",
    "camera_move": "static",
    "action": "Affichage de l'écran externe avec notifications",
    "focus": "Écran externe Super AMOLED 3.4 pouces",
    "screen": "Notifications et contrôles de musique affichés",
    "emotion": "Praticité, commodité",
    "storyboard_focus": "L'écran externe permet des actions rapides",
    "notes": "Gros plan sur écran, main tactile visible"
  }
]

=== RÈGLES ESSENTIELLES ===
- Générer UNIQUEMENT un JSON array, pas de texte avant ou après
- Chaque scène doit être cohérente avec la précédente
- shot_type: "wide" | "medium" | "close-up"
- camera_move: "static" | "pan" | "tilt" | "zoom"
- screen: décrire ce qu'on voit sur l'écran, ou "N/A" si pas d'écran
- emotion: 1-2 mots décrivant l'émotion/sensation
- storyboard_focus: l'idée clé à transmettre visuellement
- notes: suggestions pour l'illustrateur (composition, style, éléments clés)
- TOUJOURS 8-10 scènes (pas moins, pas plus)
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
      console.log('[/generate-storyboard] Réponse GPT (premiers 200 chars):', raw.substring(0, 200));

      let scenes;
      try {
        scenes = JSON.parse(raw);
      } catch (e) {
        // Essayer d'extraire le JSON s'il y a du texte autour
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          scenes = JSON.parse(jsonMatch[0]);
        } else {
          console.error('[/generate-storyboard] JSON parse error:', e.message, 'Raw:', raw);
          return res.status(500).json({ 
            error: 'JSON storyboard invalide',
            details: e.message,
            raw: raw.substring(0, 500)
          });
        }
      }

      if (!Array.isArray(scenes) || scenes.length === 0) {
        return res.status(500).json({ 
          error: 'Aucune scène générée',
          received: typeof scenes,
          length: Array.isArray(scenes) ? scenes.length : 'N/A'
        });
      }

      console.log(`[/generate-storyboard] ✅ ${scenes.length} scènes générées`);
      console.log('[/generate-storyboard] Structure:', JSON.stringify(scenes[0], null, 2));

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
