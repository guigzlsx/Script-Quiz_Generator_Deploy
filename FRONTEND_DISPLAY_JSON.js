// ✅ FRONTEND: Affichage Storyboard JSON (sans images)
// À remplacer dans storyboard_generator.js - displayStoryboardWithImages()

function displayStoryboardWithImages(scenes) {
    storyboardContainer.innerHTML = '';
    
    console.log('[displayStoryboard] Scènes reçues:', scenes);
    
    if (!Array.isArray(scenes) || scenes.length === 0) {
        storyboardContainer.innerHTML = '<p style="color: red;">Aucune scène à afficher</p>';
        return;
    }

    scenes.forEach((scene, idx) => {
        const sceneCard = document.createElement('div');
        sceneCard.style.cssText = `
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            border: 1px solid rgba(255,255,255,0.1);
            display: grid;
            grid-template-columns: 120px 1fr;
            gap: 20px;
            align-items: start;
        `;

        // Numéro scène + shot_type (mini carte de visite)
        const sceneHeader = document.createElement('div');
        sceneHeader.style.cssText = `
            background: linear-gradient(135deg, var(--accent), var(--accent-light));
            border-radius: 6px;
            padding: 15px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            color: white;
            font-weight: bold;
            min-height: 100px;
        `;
        sceneHeader.innerHTML = `
            <div style="font-size: 28px; font-weight: bold;">SCÈNE ${scene.scene || idx + 1}</div>
            <div style="font-size: 12px; margin-top: 8px; opacity: 0.9; text-transform: uppercase;">${scene.shot_type || 'Medium'}</div>
            <div style="font-size: 11px; margin-top: 4px; opacity: 0.8;">${scene.camera_move || 'Static'}</div>
        `;
        sceneCard.appendChild(sceneHeader);

        // Contenu textuel scène
        const sceneContent = document.createElement('div');
        sceneContent.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 12px;
            color: var(--text);
            line-height: 1.6;
        `;

        // Action
        const actionDiv = document.createElement('div');
        actionDiv.style.cssText = `
            background: rgba(100, 200, 255, 0.1);
            border-left: 3px solid var(--accent);
            padding: 12px;
            border-radius: 4px;
        `;
        actionDiv.innerHTML = `<strong>Action:</strong> ${scene.action || 'N/A'}`;
        sceneContent.appendChild(actionDiv);

        // Focus + Emotion
        const focusDiv = document.createElement('div');
        focusDiv.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        `;
        focusDiv.innerHTML = `
            <div style="background: rgba(150, 200, 100, 0.1); padding: 10px; border-radius: 4px; border-left: 3px solid #9ac864;">
                <strong>Focus:</strong><br>${scene.focus || 'N/A'}
            </div>
            <div style="background: rgba(200, 150, 100, 0.1); padding: 10px; border-radius: 4px; border-left: 3px solid #c89664;">
                <strong>Émotion:</strong><br>${scene.emotion || 'N/A'}
            </div>
        `;
        sceneContent.appendChild(focusDiv);

        // Screen display
        if (scene.screen && scene.screen !== 'N/A') {
            const screenDiv = document.createElement('div');
            screenDiv.style.cssText = `
                background: rgba(50, 50, 50, 0.3);
                border-radius: 4px;
                padding: 12px;
                border-left: 3px solid #666;
                font-style: italic;
                font-size: 13px;
            `;
            screenDiv.innerHTML = `<strong>Écran:</strong> ${scene.screen}`;
            sceneContent.appendChild(screenDiv);
        }

        // Storyboard focus
        const focusStoryDiv = document.createElement('div');
        focusStoryDiv.style.cssText = `
            background: rgba(200, 100, 150, 0.1);
            padding: 12px;
            border-radius: 4px;
            border-left: 3px solid #c86496;
            font-weight: 500;
        `;
        focusStoryDiv.innerHTML = `<strong>📌 Idée clé:</strong> ${scene.storyboard_focus || 'N/A'}`;
        sceneContent.appendChild(focusStoryDiv);

        // Notes
        if (scene.notes && scene.notes !== 'N/A') {
            const notesDiv = document.createElement('div');
            notesDiv.style.cssText = `
                background: rgba(100, 100, 100, 0.15);
                padding: 12px;
                border-radius: 4px;
                border-left: 3px solid #999;
                font-size: 13px;
            `;
            notesDiv.innerHTML = `<strong>📝 Notes tech:</strong> ${scene.notes}`;
            sceneContent.appendChild(notesDiv);
        }

        sceneCard.appendChild(sceneContent);
        storyboardContainer.appendChild(sceneCard);
    });

    console.log('[displayStoryboard] Rendu terminé');
}
