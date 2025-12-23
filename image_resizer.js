document.addEventListener('DOMContentLoaded', function() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const originalImage = document.getElementById('originalImage');
    const resizedCanvas = document.getElementById('resizedCanvas');
    const originalInfo = document.getElementById('originalInfo');
    const resizedInfo = document.getElementById('resizedInfo');
    const downloadBtn = document.getElementById('downloadBtn');
    const resetBtn = document.getElementById('resetBtn');
    const formatBtns = document.querySelectorAll('.format-btn');
    const editControls = document.getElementById('editControls');
    const zoomSlider = document.getElementById('zoomSlider');
    const zoomValue = document.getElementById('zoomValue');
    const rotateSlider = document.getElementById('rotateSlider');
    const rotateValue = document.getElementById('rotateValue');
    const modeBtns = document.querySelectorAll('.mode-btn');

    let currentImage = null;
    let targetWidth = 1000;
    let targetHeight = 1000;
    let zoom = 1;
    let rotation = 0;
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let mode = 'fill';

    // Gestion des boutons de mode
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mode = btn.dataset.mode;
            
            if (mode === 'fill') {
                editControls.classList.add('active');
                resetTransform();
            } else {
                editControls.classList.remove('active');
            }
            
            if (currentImage) {
                resizeImage(currentImage);
            }
        });
    });

    // Gestion des boutons de format
    formatBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            formatBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            targetWidth = parseInt(btn.dataset.width);
            targetHeight = parseInt(btn.dataset.height);
            downloadBtn.textContent = `💾 Télécharger (${targetWidth}x${targetHeight})`;
            
            if (currentImage) {
                resetTransform();
                resizeImage(currentImage);
            }
        });
    });

    // Contrôle du zoom
    zoomSlider.addEventListener('input', (e) => {
        zoom = e.target.value / 100;
        zoomValue.textContent = `${e.target.value}%`;
        if (currentImage) {
            resizeImage(currentImage);
        }
    });

    // Contrôle de la rotation
    rotateSlider.addEventListener('input', (e) => {
        rotation = parseInt(e.target.value);
        rotateValue.textContent = `${e.target.value}°`;
        if (currentImage) {
            resizeImage(currentImage);
        }
    });

    // Gestion du drag sur le canvas
    resizedCanvas.addEventListener('mousedown', (e) => {
        if (mode === 'fill') {
            isDragging = true;
            startX = e.clientX - offsetX;
            startY = e.clientY - offsetY;
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            offsetX = e.clientX - startX;
            offsetY = e.clientY - startY;
            if (currentImage) {
                resizeImage(currentImage);
            }
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    function resetTransform() {
        zoom = 1;
        rotation = 0;
        offsetX = 0;
        offsetY = 0;
        zoomSlider.value = 100;
        zoomValue.textContent = '100%';
        rotateSlider.value = 0;
        rotateValue.textContent = '0°';
    }

    // Click sur la zone de drop
    uploadZone.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    // Sélection de fichier
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            handleFile(file);
        }
    });

    // Drag & Drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragging');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragging');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragging');
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleFile(file);
        }
    });

    // Traitement du fichier
    function handleFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                currentImage = img;
                displayOriginal(img, file);
                resetTransform();
                resizeImage(img);
                previewContainer.classList.add('active');
                if (mode === 'fill') {
                    editControls.classList.add('active');
                }
            };
            img.src = e.target.result;
        };
        
        reader.readAsDataURL(file);
    }

    // Affichage de l'image originale
    function displayOriginal(img, file) {
        originalImage.src = img.src;
        originalInfo.innerHTML = `
            <strong>${img.width} × ${img.height} px</strong><br>
            ${(file.size / 1024).toFixed(1)} KB
        `;
    }

    // Redimensionnement de l'image
    function resizeImage(img) {
        const canvas = resizedCanvas;
        const ctx = canvas.getContext('2d');
        
        // Définir la taille du canvas
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        // Fond blanc
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        
        if (mode === 'fit') {
            // Mode ajuster : conserve le ratio avec bords blancs
            const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            const x = (targetWidth - scaledWidth) / 2;
            const y = (targetHeight - scaledHeight) / 2;
            
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
        } else {
            // Mode remplir : remplit tout le canvas avec contrôles
            ctx.save();
            
            // Centre de rotation et translation
            ctx.translate(targetWidth / 2, targetHeight / 2);
            
            // Rotation
            ctx.rotate(rotation * Math.PI / 180);
            
            // Calculer l'échelle pour remplir tout le canvas
            const baseScale = Math.max(targetWidth / img.width, targetHeight / img.height);
            const finalScale = baseScale * zoom;
            
            const scaledWidth = img.width * finalScale;
            const scaledHeight = img.height * finalScale;
            
            // Appliquer l'offset utilisateur
            const x = -scaledWidth / 2 + offsetX;
            const y = -scaledHeight / 2 + offsetY;
            
            // Dessiner l'image
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
            
            ctx.restore();
        }
        
        // Afficher les infos
        resizedInfo.innerHTML = `
            <strong>${targetWidth} × ${targetHeight} px</strong><br>
            ${mode === 'fill' ? 'Mode manuel' : 'Mode ajusté'}
        `;
    }

    // Téléchargement
    downloadBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = `image_${targetWidth}x${targetHeight}_${Date.now()}.png`;
        link.href = resizedCanvas.toDataURL('image/png');
        link.click();
    });

    // Reset
    resetBtn.addEventListener('click', () => {
        previewContainer.classList.remove('active');
        editControls.classList.remove('active');
        fileInput.value = '';
        currentImage = null;
        originalImage.src = '';
        originalInfo.innerHTML = '';
        resizedInfo.innerHTML = '';
        resetTransform();
    });
});
