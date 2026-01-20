document.addEventListener('DOMContentLoaded', function() {
    console.log('[storyboard_generator.js] DOMContentLoaded déclenché');
    
    const fileInput = document.getElementById('fileInput');
    const extraInfo = document.getElementById('extraInfo');
    const generateButton = document.getElementById('generateButton');
    const loader = document.getElementById('loader');
    const result = document.getElementById('result');
    const storyboardContainer = document.getElementById('storyboardContainer');
    const exportStoryboardDocx = document.getElementById('exportStoryboardDocx');
    const clearStoryboardButton = document.getElementById('clearStoryboardButton');
    const dropArea = document.getElementById('dropArea');
    const dropHint = document.getElementById('dropHint');
    const progressBar = document.getElementById('progressBar');

    console.log('[storyboard_generator.js] Éléments trouvés:');
    console.log('  fileInput:', fileInput);
    console.log('  dropArea:', dropArea);
    console.log('  dropHint:', dropHint);
    console.log('  generateButton:', generateButton);

    if (!dropArea) {
        console.error('[storyboard_generator.js] ERREUR: dropArea non trouvé!');
        return;
    }

    let droppedFile = null;
    let generatedStoryboard = '';
    let storyboardData = null;

    // Gestion du Drag & Drop
    const setSelectedFile = (file) => {
        console.log('[setSelectedFile] Fichier reçu:', file ? file.name : 'null');
        droppedFile = file || null;
        if (file) {
            dropHint.textContent = `${file.name} (${Math.round(file.size/1024)} KB)`;
        } else if (fileInput.files && fileInput.files[0]) {
            const f = fileInput.files[0];
            dropHint.textContent = `${f.name} (${Math.round(f.size/1024)} KB)`;
        } else {
            dropHint.textContent = 'Aucun fichier sélectionné';
        }
    };

    // Drag & drop handlers
    console.log('[drag-drop] Attachement des écouteurs');
    ;['dragenter', 'dragover'].forEach(evt => {
        dropArea.addEventListener(evt, (e) => {
            console.log('[drag-drop] Event:', evt);
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            dropArea.classList.add('dragover');
        });
    });
    ;['dragleave', 'drop'].forEach(evt => {
        dropArea.addEventListener(evt, (e) => {
            console.log('[drag-drop] Event:', evt);
            e.preventDefault();
            e.stopPropagation();
            dropArea.classList.remove('dragover');
        });
    });

    dropArea.addEventListener('drop', (e) => {
        console.log('[drag-drop] DROP event!');
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length) {
            const file = dt.files[0];
            console.log('[drag-drop] Fichier dropé:', file.name);
            setSelectedFile(file);
        }
    });

    // When the hidden input changes (click->select), update hint
    fileInput.addEventListener('change', () => {
        console.log('[input-change] Fichier sélectionné');
        if (fileInput.files && fileInput.files[0]) setSelectedFile(fileInput.files[0]);
    });

    // Animation de la barre de progression
    function animateProgressBar() {
        let width = 0;
        const interval = setInterval(() => {
            if (width >= 90) {
                clearInterval(interval);
            } else {
                width += Math.random() * 10;
                if (width > 90) width = 90;
                progressBar.style.width = width + '%';
            }
        }, 500);
        return interval;
    }

    // Gestion du menu burger
    const burgerIcon = document.querySelector('.burger-icon');
    const menuItems = document.querySelector('.menu-items');
    
    if (burgerIcon && menuItems) {
        burgerIcon.addEventListener('click', function() {
            menuItems.classList.toggle('active');
        });
    }

    // Génération du storyboard
    generateButton.addEventListener('click', async function() {
        const file = droppedFile || (fileInput.files && fileInput.files[0]);
        
        if (!file) {
            alert('Veuillez sélectionner un fichier');
            return;
        }

        generateButton.disabled = true;
        loader.style.display = 'block';
        result.style.display = 'none';
        progressBar.style.width = '10%';

        const formData = new FormData();
        formData.append('document', file);
        if (extraInfo && extraInfo.value) {
            formData.append('extraInfo', extraInfo.value);
        }

        const progressInterval = animateProgressBar();

        try {
            const response = await fetch('http://localhost:3000/generate-storyboard', {
                method: 'POST',
                body: formData
            });

            clearInterval(progressInterval);
            progressBar.style.width = '100%';

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erreur serveur: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('Réponse du serveur:', data);
            console.log('Scènes reçues:', data.scenes ? data.scenes.length : 'aucune');
            
            storyboardData = data;
            generatedStoryboard = data.storyboard || '';

            if (storyboardData && storyboardData.scenes && storyboardData.scenes.length > 0) {
                // Afficher le storyboard avec les images intégrées
                displayStoryboardWithImages(storyboardData.scenes);
                result.style.display = 'block';
            } else {
                throw new Error('Le storyboard généré est incomplet ou sans scènes');
            }

        } catch (error) {
            console.error('Erreur lors de la génération:', error);
            alert('Erreur lors de la génération du storyboard: ' + error.message);
        } finally {
            loader.style.display = 'none';
            generateButton.disabled = false;
        }
    });

    // Afficher le storyboard JSON (texte pur)
    function displayStoryboardWithImages(scenes) {
        storyboardContainer.innerHTML = '';
        
        scenes.forEach((scene, index) => {
            const sceneCard = document.createElement('div');
            sceneCard.style.cssText = `
                background: rgba(255,255,255,0.05);
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 30px;
                border: 1px solid rgba(255,255,255,0.1);
            `;

            // Numéro de scène
            const sceneNum = document.createElement('div');
            sceneNum.style.cssText = `
                font-size: 12px;
                color: var(--muted);
                margin-bottom: 10px;
                text-transform: uppercase;
            `;
            sceneNum.textContent = `Scène ${scene.scene || index + 1}`;
            sceneCard.appendChild(sceneNum);

            // Titre de la scène
            const title = document.createElement('h3');
            title.style.cssText = `
                margin: 0 0 15px 0;
                font-size: 18px;
                color: var(--accent);
                font-weight: 600;
            `;
            title.textContent = scene.title || 'Sans titre';
            sceneCard.appendChild(title);

            // Référence script (si présente)
            if (scene.script_reference) {
                const scriptRef = document.createElement('div');
                scriptRef.style.cssText = `
                    font-size: 11px;
                    color: var(--muted);
                    margin-bottom: 12px;
                    padding: 8px;
                    background: rgba(46, 144, 228, 0.1);
                    border-left: 3px solid var(--accent);
                    border-radius: 2px;
                `;
                scriptRef.innerHTML = `<strong>📍 Script:</strong> ${scene.script_reference}`;
                sceneCard.appendChild(scriptRef);
            }

            // Grille de propriétés
            const grid = document.createElement('div');
            grid.style.cssText = `
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin-bottom: 15px;
            `;

            // Fonction pour créer une propriété
            const addProp = (label, value, fullWidth = false) => {
                if (!value) return;
                const prop = document.createElement('div');
                prop.style.cssText = `
                    ${fullWidth ? 'grid-column: 1 / -1;' : ''}
                    padding: 10px;
                    background: rgba(255,255,255,0.03);
                    border-radius: 4px;
                    border-left: 3px solid var(--accent);
                `;
                prop.innerHTML = `
                    <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; margin-bottom: 4px;">${label}</div>
                    <div style="color: var(--text); font-size: 14px;">${value}</div>
                `;
                grid.appendChild(prop);
            };

            // Ajouter les propriétés disponibles
            addProp('Cadre', scene.cadre);
            addProp('Type de plan', scene.shot_type);
            addProp('Mouvement caméra', scene.camera_move);
            addProp('Position', scene.position, true);
            addProp('Action', scene.action, true);
            addProp('Focus', scene.focus, true);
            addProp('Émotion', scene.emotion);
            addProp('Transition', scene.transition);
            addProp('Focus storyboard', scene.storyboard_focus, true);
            if (scene.voix_off_extrait) addProp('Voix off', scene.voix_off_extrait, true);
            addProp('Notes', scene.notes, true);

            sceneCard.appendChild(grid);
            storyboardContainer.appendChild(sceneCard);
        });
    }

    // Export en DOCX
    exportStoryboardDocx.addEventListener('click', async function() {
        console.log('[Export DOCX] storyboardData:', storyboardData);

        let scenesToExport = [];
        if (!storyboardData) {
            alert('Aucun storyboard à exporter');
            return;
        }

        // Récupérer les scènes
        if (Array.isArray(storyboardData)) {
            scenesToExport = storyboardData;
        } else if (storyboardData.scenes && Array.isArray(storyboardData.scenes)) {
            scenesToExport = storyboardData.scenes;
        } else {
            console.error('[Export DOCX] Impossible de trouver les scènes:', storyboardData);
            alert('Structure du storyboard invalide');
            return;
        }

        if (scenesToExport.length === 0) {
            alert('Aucune scène à exporter');
            return;
        }

        try {
            if (!window.docx) {
                alert("La bibliothèque docx n'est pas chargée correctement. Vérifiez la connexion internet.");
                console.error("docx library not loaded: window.docx =", window.docx);
                return;
            }
            
            const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, Table, TableCell, TableRow, BorderStyle, VerticalAlign, UnderlineType } = window.docx;

            console.log('Début export DOCX avec', scenesToExport.length, 'scènes');

            const children = [];

            // Titre principal
            children.push(
                new Paragraph({
                    text: "STORYBOARD - PRODUCTION VIDÉO",
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200, before: 0 }
                })
            );

            // Ligne vide
            children.push(new Paragraph({ text: "" }));

            // Ajouter chaque scène
            for (let sceneIdx = 0; sceneIdx < scenesToExport.length; sceneIdx++) {
                const scene = scenesToExport[sceneIdx];

                // Titre de la scène avec numéro - fond bleu
                children.push(
                    new Table({
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [
                                            new Paragraph({
                                                children: [
                                                    new TextRun({
                                                        text: `Scène ${scene.scene || sceneIdx + 1} - ${scene.title || 'Sans titre'}`,
                                                        bold: true,
                                                        size: 32,
                                                        color: "FFFFFF"
                                                    })
                                                ],
                                                alignment: AlignmentType.LEFT,
                                                spacing: { before: 100, after: 100 }
                                            })
                                        ],
                                        shading: { fill: "2E90E4" },
                                        margins: { top: 80, bottom: 80, left: 100, right: 100 }
                                    })
                                ]
                            })
                        ],
                        width: { size: 100, type: "percent" }
                    })
                );

                // Référence script si présente
                if (scene.script_reference) {
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `📍 ${scene.script_reference}`,
                                    italic: true,
                                    color: "666666",
                                    size: 22
                                })
                            ],
                            spacing: { before: 100, after: 150 }
                        })
                    );
                }

                // Tableau avec les propriétés (2 colonnes)
                const rows = [];
                
                // Fonction pour ajouter une ligne au tableau
                const addRow = (label, value) => {
                    if (!value) return;
                    rows.push(
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [
                                        new Paragraph({
                                            children: [
                                                new TextRun({
                                                    text: label,
                                                    bold: true,
                                                    color: "2E90E4"
                                                })
                                            ]
                                        })
                                    ],
                                    width: { size: 25, type: "percent" },
                                    shading: { fill: "F0F5FF" },
                                    margins: { top: 60, bottom: 60, left: 80, right: 80 }
                                }),
                                new TableCell({
                                    children: [
                                        new Paragraph({
                                            children: [
                                                new TextRun({
                                                    text: String(value),
                                                    size: 22
                                                })
                                            ]
                                        })
                                    ],
                                    margins: { top: 60, bottom: 60, left: 80, right: 80 }
                                })
                            ]
                        })
                    );
                };

                addRow('Cadre', scene.cadre);
                addRow('Type de plan', scene.shot_type);
                addRow('Mouvement caméra', scene.camera_move);
                addRow('Position', scene.position);
                addRow('Action', scene.action);
                addRow('Focus', scene.focus);
                addRow('Émotion', scene.emotion);
                addRow('Transition', scene.transition);
                addRow('Focus storyboard', scene.storyboard_focus);
                if (scene.voix_off_extrait) addRow('Voix off', scene.voix_off_extrait);
                addRow('Notes', scene.notes);

                if (rows.length > 0) {
                    children.push(
                        new Table({
                            rows: rows,
                            width: { size: 100, type: "percent" }
                        })
                    );
                }

                // Espace entre les scènes
                children.push(new Paragraph({ text: "" }));
                children.push(new Paragraph({ text: "" }));
            }

            // Créer le document
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: children
                }]
            });

            console.log('Export DOCX: ajout de', children.length, 'éléments');

            // Générer et télécharger le fichier
            const blob = await Packer.toBlob(doc);
            const productName = storyboardData.product_name || 'Storyboard';
            const fileName = `${productName}_${new Date().getTime()}.docx`;
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('Export DOCX terminé avec succès');

        } catch (error) {
            console.error('Erreur lors de l\'export DOCX:', error);
            console.error('Stack:', error.stack);
            alert('Erreur lors de l\'export du storyboard: ' + error.message);
        }
    });

    // Effacer le storyboard
    clearStoryboardButton.addEventListener('click', function() {
        if (confirm('Voulez-vous vraiment effacer le storyboard généré ?')) {
            generatedStoryboard = '';
            storyboardData = null;
            storyboardContainer.innerHTML = '';
            result.style.display = 'none';
            dropHint.textContent = 'Aucun fichier sélectionné';
            fileInput.value = '';
            droppedFile = null;
        }
    });
});
