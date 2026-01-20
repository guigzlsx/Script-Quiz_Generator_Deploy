// PATCH: Nouveau pipeline storyboard avec extraction points clés et prompts contextualisés

// À remplacer à partir de ligne 478 du prompt jusqu'à la fin de la boucle de génération DALL-E

const extraPriority = extraInfo ? `\n\n=== INFORMATIONS SUPPLÉMENTAIRES ===\n${extraInfo}\n=== FIN ===\n\n` : '';

const prompt = `${extraPriority}Tu es un expert en storyboarding produit. Analyse le script vidéo et génère un JSON structuré pour un storyboard professionnel cohérent.

TÂCHES:
1. Extrais le nom du PRODUIT (ex: Galaxy Z Flip7 FE, Google Pixel 10)
2. Identifie les 5-7 POINTS CLÉS du script (ex: format compact, écran 120Hz, 50MP, 5G, autonomie, etc.)
3. Pour chaque point clé, crée une scène courte (1 shot) montrant le produit EN ACTION avec le point clé en évidence
4. Ajoute une scène d'intro et une de conclusion
5. Utilise des contextes d'utilisation réalistes (travail, rue, café, maison, outdoor, etc.)
6. Chaque shot doit décrire précisément: produit visible + mains/personne + action + contexte + ce qu'affiche l'écran/détail clé

SCRIPT VIDÉO:
${truncated}

FORMAT JSON ATTENDU (valide UTF-8, pas de texte hors JSON):
{
  "product_name": "Samsung Galaxy Z Flip7 FE",
  "key_points": ["compact flip format", "120Hz display", "50MP camera with 2x optical zoom", "5G connectivity", "4000mAh battery", "ecosystem integration"],
  "visual_bible": {
    "style": "high-quality product photography storyboard, clean bright lighting, realistic product showcase",
    "camera": "professional 16:9 framing, close-ups to show details",
    "lighting": "natural daylight or studio warm lighting",
    "product": {
      "name": "Samsung Galaxy Z Flip7 FE",
      "key_details": "foldable display, thin profile, modern design"
    }
  },
  "scenes": [
    {
      "scene_number": 1,
      "title": "Intro - Galaxy Z Flip7 FE Compact Design",
      "location": "modern workspace or hand in pocket",
      "time": "day",
      "action": "extracting phone from pocket smoothly",
      "emotion": "anticipation, premium feel",
      "description": "Close-up of hands pulling Galaxy Z Flip7 FE from front jeans pocket, showing its compact folded size, clean modern design. Phone in folded state (compact).",
      "prompt_dalle": "Professional lifestyle product photography: hands pulling a sleek foldable Samsung Galaxy Z Flip7 FE from a front jeans pocket. Phone in folded state (compact), thin profile visible. Modern workspace blurred background. Warm studio lighting. Clean, premium product showcase. 16:9 aspect ratio."
    },
    {
      "scene_number": 2,
      "title": "External Screen - Quick Notifications",
      "location": "urban street",
      "time": "day",
      "action": "checking notifications and quick actions",
      "emotion": "convenience, efficiency",
      "description": "Galaxy Z Flip7 FE folded in hand, external Super AMOLED 3.4 inch screen showing live notifications or music player. User swiping or tapping without opening phone.",
      "prompt_dalle": "Product photography: hands holding folded Samsung Galaxy Z Flip7 FE on urban street, external screen displaying live notifications and music controls UI. User checking info without opening phone. City background, daytime. Professional photography style, 16:9."
    },
    {
      "scene_number": 3,
      "title": "Main Display - 120Hz Fluidity",
      "location": "home living room or workspace",
      "time": "day",
      "action": "opening phone and using apps fluently",
      "emotion": "smooth, responsive",
      "description": "Hands opening Galaxy Z Flip7 FE to full 6.7 inch Dynamic AMOLED 2X display showing app or video. Screen at 120Hz refresh rate, motion smooth and responsive.",
      "prompt_dalle": "Product showcase: hands opening Samsung Galaxy Z Flip7 FE revealing full 6.7 inch main display with app UI or video playing. Screen showing 120Hz fluidity with smooth scrolling. Home living room warm interior background. Professional product photography, 16:9."
    },
    {
      "scene_number": 4,
      "title": "50MP Camera - Photo Quality",
      "location": "outdoor or café",
      "time": "day",
      "action": "taking a photo with rear 50MP camera",
      "emotion": "focused, creative",
      "description": "Galaxy Z Flip7 FE held in landscape, dual 50MP + 12MP rear camera visible, user framing a subject (coffee cup, landscape, or person). Sharp, well-lit scene.",
      "prompt_dalle": "Lifestyle photography: Samsung Galaxy Z Flip7 FE held in landscape mode, rear 50MP camera visible, user framing a photo of coffee cup on café table. Outdoor café setting, bright daylight. Depth and detail visible in scene. Professional product photography, 16:9."
    },
    {
      "scene_number": 5,
      "title": "2x Optical Zoom - Precision",
      "location": "outdoor urban or nature",
      "time": "day",
      "action": "using 2x optical zoom on distant subject",
      "emotion": "precision, professional",
      "description": "Galaxy Z Flip7 FE capturing distant subject with 2x optical zoom. Screen showing zoomed image with no loss of detail. Urban or nature background.",
      "prompt_dalle": "Product showcase: Samsung Galaxy Z Flip7 FE held up showing 2x optical zoom capture of distant building or landscape. Screen displaying zoomed image with full detail preserved. Urban outdoor setting, natural lighting. Professional photography style, 16:9."
    },
    {
      "scene_number": 6,
      "title": "4K Video - 60fps Recording",
      "location": "dynamic outdoor or event setting",
      "time": "day",
      "action": "recording 4K video at 60fps",
      "emotion": "dynamic, immersive",
      "description": "Galaxy Z Flip7 FE in video recording mode, capturing smooth 4K 60fps video. Screen showing live video feed with fluid motion, perhaps showing moving subject or action.",
      "prompt_dalle": "Lifestyle video showcase: Samsung Galaxy Z Flip7 FE recording 4K 60fps video of moving subject (person walking, car, flowing water). Screen showing smooth live video feed. Dynamic outdoor event or street setting. Professional product photography, 16:9."
    },
    {
      "scene_number": 7,
      "title": "5G & Connectivity - Speed",
      "location": "modern workspace or city",
      "time": "day",
      "action": "downloading or streaming over 5G",
      "emotion": "fast, connected",
      "description": "Galaxy Z Flip7 FE open, screen showing 5G status indicator and fast download/streaming activity. User engaged with device, modern tech environment.",
      "prompt_dalle": "Product showcase: Samsung Galaxy Z Flip7 FE on modern desk or held by user, screen displaying 5G indicator and fast data transfer or streaming. Status bar showing connectivity. Modern workspace with tech gadgets. Professional photography, 16:9."
    },
    {
      "scene_number": 8,
      "title": "All-Day Battery - 4000mAh",
      "location": "home or outdoor all-day setting",
      "time": "evening or end of day",
      "action": "using phone throughout the day with strong battery",
      "emotion": "reliable, enduring",
      "description": "Galaxy Z Flip7 FE in hand showing healthy battery percentage after full day of use. Screen showing battery indicator or usage stats. Evening light or multiple daily-use scenarios.",
      "prompt_dalle": "Lifestyle photography: Samsung Galaxy Z Flip7 FE held up after full day of use, screen showing healthy battery percentage (60-80%) still remaining. User in home relaxing or outdoor evening setting. Warm evening light. Professional product photography, 16:9."
    },
    {
      "scene_number": 9,
      "title": "Ecosystem Integration - Galaxy Buds & Watch",
      "location": "modern lifestyle environment",
      "time": "day",
      "action": "using phone with Galaxy Buds and Galaxy Watch",
      "emotion": "connected, seamless",
      "description": "Galaxy Z Flip7 FE displayed with Galaxy Buds and Galaxy Watch nearby, showing ecosystem connectivity. Screen possibly showing smartwatch or earbuds connection status.",
      "prompt_dalle": "Product lifestyle: Samsung Galaxy Z Flip7 FE open on desk or in hand, surrounded by Galaxy Buds Pro earbuds and Galaxy Watch. All devices showing connected ecosystem. Modern minimalist workspace. Warm studio lighting. Professional product photography, 16:9."
    },
    {
      "scene_number": 10,
      "title": "Premium Design & Durability",
      "location": "neutral showcase environment",
      "time": "day",
      "action": "showcasing design and build quality",
      "emotion": "premium, durable",
      "description": "Galaxy Z Flip7 FE both open and closed, showing elegant design, thin profile, premium materials (aluminum frame, glass screen). 12% recycled content messaging implied.",
      "prompt_dalle": "Product showcase: Samsung Galaxy Z Flip7 FE displayed both in folded and open state, showing thin premium design, aluminum frame, and glass back. Rotating to show design from multiple angles. Clean white or neutral background. Professional studio photography, 16:9."
    }
  ]
}

RÈGLES ESSENTIELLES:
- Génère 7-10 scènes (1 per key point + intro/conclusion)
- CHAQUE SCÈNE = 1 shot seulement
- prompt_dalle DOIT être TRÈS descriptif: produit exact + mains/personne + action visible + contexte + détail clé en évidence
- Pas de sketches ni d'illustrations → produit photographié en contexte RÉEL et PROFESSIONNELLE
- Focus sur produit EN ACTION et l'utilisation (pas juste objet isolé)
- Locations variés et réalistes (workspace, street, home, café, outdoor, nature)
- Tous les prompts DALL-E en ANGLAIS
- Chaque scène cible UN point clé principal
- Retourne UNIQUEMENT le JSON, pas de texte additif
`;

try {
  const analysis = await openai.chat.completions.create({
    model: 'gpt-5',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  });

  const raw = analysis.choices?.[0]?.message?.content || '{}';
  let storyboardData;
  try {
    storyboardData = JSON.parse(raw);
  } catch (e) {
    console.error('[/generate-storyboard] JSON parse error:', e.message);
    return res.status(500).json({ error: 'Storyboard JSON invalide', details: e.message });
  }

  const scenes = Array.isArray(storyboardData.scenes) ? storyboardData.scenes : [];
  
  console.log(`[/generate-storyboard] ${scenes.length} scènes avec prompts DALL-E contextualisés`);

  const scenesWithImages = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    console.log(`[/generate-storyboard] DALL-E ${i + 1}/${scenes.length} -> ${scene.title}`);

    try {
      // Utiliser le prompt DALL-E fourni par GPT, avec fallback sur description
      const dallePrompt = scene.prompt_dalle || scene.description || `Professional storyboard of: ${scene.title}`;

      console.log(`[/generate-storyboard] DALL-E Prompt: ${dallePrompt.substring(0, 100)}...`);

      const imageResponse = await openai.images.generate({
        model: 'dall-e-3',
        prompt: dallePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'natural'
      });

      const imageUrl = imageResponse.data?.[0]?.url;
      if (!imageUrl) throw new Error('Pas d\'URL retournée par DALL-E');

      scenesWithImages.push({
        number: scene.scene_number,
        title: scene.title,
        description: `${scene.description || ''}\nLieu: ${scene.location || 'N/A'} | Temps: ${scene.time || 'day'} | Action: ${scene.action || 'N/A'}`,
        imageUrl
      });

      console.log(`[/generate-storyboard] ✅ ${scene.title}`);
    } catch (imgError) {
      console.error(`[/generate-storyboard] ❌ Erreur DALL-E pour "${scene.title}":`, imgError.message);
      scenesWithImages.push({
        number: scene.scene_number,
        title: scene.title,
        description: `${scene.description || ''}\nLieu: ${scene.location || 'N/A'}\n(Generation failed)`,
        imageUrl: null
      });
    }
  }

  console.log(`[/generate-storyboard] ✅ Terminé: ${scenesWithImages.length} scènes générées`);

  return res.json({
    storyboard: storyboardData,
    scenes: scenesWithImages
  });
} catch (err) {
  console.error('OpenAI error /generate-storyboard:', err);
  return res.status(500).send('Erreur lors de la génération du storyboard.');
}
