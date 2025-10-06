document.addEventListener('DOMContentLoaded', () => {
  // PDF.js configuration
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.9.179/pdf.worker.min.js';
  }

  // burger menu on this page (id used in html)
  const burgerIcon = document.getElementById('burgerIcon');
  const menuItemsPage = document.querySelector('.menu-items');

  const dropArea = document.getElementById('dropArea');
  const input = document.getElementById('pdfFilesInput');
  const list = document.getElementById('pdfList');
  const btn = document.getElementById('convertMergeButton');
  const status = document.getElementById('pdfToolsStatus');
  const clearListButton = document.getElementById('clearListButton');
  const previewModal = document.getElementById('previewModal');
  const previewArea = document.getElementById('previewArea');
  const closePreview = document.getElementById('closePreview');

  // Internal array to track files and order
  const filesState = [];

  // Burger handlers (page-specific)
  if (burgerIcon && menuItemsPage) {
    burgerIcon.addEventListener('click', (ev) => {
      ev.stopPropagation();
      burgerIcon.classList.toggle('active');
      menuItemsPage.classList.toggle('active');
    });
    menuItemsPage.addEventListener('click', (ev) => ev.stopPropagation());
    document.addEventListener('click', (ev) => {
      if (!burgerIcon.contains(ev.target) && !menuItemsPage.contains(ev.target)) {
        burgerIcon.classList.remove('active');
        menuItemsPage.classList.remove('active');
      }
    });
  }

  // Initialize Sortable
  const sortable = new Sortable(list, {
    animation: 150,
    handle: '.handle',
    onEnd: () => {
      // reorder filesState according to DOM
      const ids = Array.from(list.children).map((c) => c.dataset.id);
      filesState.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    },
  });

  function addFiles(fileList) {
    for (const f of Array.from(fileList)) {
      // ignore >10MB
      if (f.size > 10 * 1024 * 1024) {
        alert(`${f.name} dépasse 10MB et a été ignoré.`);
        continue;
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const item = { id, file: f };
      filesState.push(item);
      renderItem(item);
    }
  }

  // Clear list handler
  if (clearListButton) {
    clearListButton.addEventListener('click', () => {
      filesState.length = 0;
      list.innerHTML = '';
      status.textContent = '';
    });
  }

  function renderItem(item) {
    const el = document.createElement('div');
    el.className = 'pdf-item';
    el.dataset.id = item.id;

    const handle = document.createElement('div');
    handle.className = 'handle';
    handle.title = 'Glisser pour réordonner';
    handle.textContent = '⋮';
    el.appendChild(handle);

    const thumb = document.createElement('div');
    thumb.className = 'thumbnail';
    el.appendChild(thumb);

  const meta = document.createElement('div');
  meta.className = 'meta';
  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = item.file.name;
  const sub = document.createElement('div');
  sub.className = 'sub';
  const sizeKb = Math.round(item.file.size / 1024);
  sub.textContent = `${sizeKb} KB`;
  meta.appendChild(title);
  meta.appendChild(sub);
  el.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'actions';
  const removeBtn = document.createElement('button');
  removeBtn.className = 'btn-small remove-btn';
  removeBtn.textContent = 'Supprimer';
  actions.appendChild(removeBtn);
  el.appendChild(actions);

    list.appendChild(el);

    // generate thumbnail
    if (item.file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = async function (e) {
        try {
          const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(e.target.result) }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 0.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: context, viewport }).promise;
          // Keep intrinsic ratio but make canvas responsive within thumbnail
          canvas.style.maxWidth = '100%';
          canvas.style.height = 'auto';
          canvas.style.display = 'block';
          thumb.appendChild(canvas);
        } catch (err) {
          thumb.textContent = 'Aperçu indisponible';
        }
      };
      reader.readAsArrayBuffer(item.file);
    } else {
      // non-pdf: show icon
      thumb.innerHTML = '<pre style="font-size:12px;">' + item.file.type.replace('/', '\n') + '</pre>';
    }

    // Open preview when clicking the thumbnail or the whole card
    thumb.style.cursor = 'pointer';
    thumb.addEventListener('click', () => openPreview(item));
    el.addEventListener('click', (ev) => {
      // avoid triggering when clicking the remove button
      if (ev.target === removeBtn) return;
      // if user clicked somewhere on the card (not the remove button), open preview
      if (!ev.target.closest('.remove-btn')) openPreview(item);
    });
    removeBtn.addEventListener('click', (ev) => { ev.stopPropagation(); removeItem(item.id); });
  }

  function removeItem(id) {
    const idx = filesState.findIndex((f) => f.id === id);
    if (idx === -1) return;
    filesState.splice(idx, 1);
    const el = list.querySelector(`[data-id="${id}"]`);
    if (el) el.remove();
  }

  function openPreview(item) {
    previewArea.innerHTML = '';
    previewModal.classList.add('active');
    // controls
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageIndicator = document.getElementById('pageIndicator');
    const zoomIn = document.getElementById('zoomIn');
    const zoomOut = document.getElementById('zoomOut');
    const zoomIndicator = document.getElementById('zoomIndicator');
    const fullScreenBtn = document.getElementById('fullScreen');

    if (item.file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(e.target.result) }).promise;
          let currentPage = 1;
          let scale = 1.2;
          let naturalViewport = null; // store original viewport for fullscreen calculations

          async function renderPage(pageNum) {
            previewArea.innerHTML = '';
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale });
            // store natural viewport (unscaled) for fullscreen fit calculations
            naturalViewport = page.getViewport({ scale: 1 });
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: ctx, viewport }).promise;
            // prevent stretching: make canvas responsive within modal
            canvas.style.maxWidth = '100%';
            canvas.style.height = 'auto';
            canvas.style.display = 'block';
            previewArea.appendChild(canvas);
            pageIndicator.textContent = `Page ${pageNum} / ${pdf.numPages}`;
            zoomIndicator.textContent = Math.round(scale * 100) + '%';
          }

          prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; renderPage(currentPage); } };
          nextBtn.onclick = () => { if (currentPage < pdf.numPages) { currentPage++; renderPage(currentPage); } };
          zoomIn.onclick = () => { scale = Math.min(4, scale + 0.25); renderPage(currentPage); };
          zoomOut.onclick = () => { scale = Math.max(0.2, scale - 0.25); renderPage(currentPage); };
          // allow clicking zoom indicator to enter manual percentage
          zoomIndicator.style.cursor = 'pointer';
          zoomIndicator.addEventListener('click', async () => {
            const currentPercent = Math.round(scale * 100);
            const input = prompt('Entrez le zoom en % (ex: 150 pour 150%) :', String(currentPercent));
            if (!input) return;
            const val = parseInt(input.replace(/[^0-9]/g, ''), 10);
            if (isNaN(val) || val <= 0) { alert('Pourcentage invalide'); return; }
            scale = Math.max(10, Math.min(400, val)) / 100;
            await renderPage(currentPage);
          });
          fullScreenBtn.onclick = async () => {
            const el = previewModal.querySelector('.modal-content');
            // If entering fullscreen, request it and then resize canvas to fit viewport
            if (document.fullscreenElement) {
              await document.exitFullscreen();
              // when exiting fullscreen, re-render to previous scale
              await renderPage(currentPage);
            } else {
              try {
                await el.requestFullscreen();
                // compute best-fit scale so the page fills most of the screen while keeping aspect ratio
                const cw = window.innerWidth * 0.94; // leave small margin
                const ch = window.innerHeight * 0.86; // account for toolbar
                if (naturalViewport) {
                  const scaleX = cw / naturalViewport.width;
                  const scaleY = ch / naturalViewport.height;
                  const fitScale = Math.min(scaleX, scaleY);
                  // apply a little padding so controls are visible
                  scale = Math.max(0.1, fitScale * 0.98);
                }
                await renderPage(currentPage);
              } catch (ex) {
                console.warn('Fullscreen failed', ex);
              }
            }
          };

          // initial render
          await renderPage(1);
        } catch (err) {
          previewArea.textContent = "Impossible d'afficher le PDF.";
        }
      };
      reader.readAsArrayBuffer(item.file);
    } else if (item.file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const pre = document.createElement('pre');
        pre.textContent = e.target.result;
        previewArea.appendChild(pre);
      };
      reader.readAsText(item.file);
    } else {
      previewArea.textContent = 'Aperçu non disponible pour ce type de fichier.';
    }
  }

  closePreview.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    previewModal.classList.remove('active');
    previewArea.innerHTML = '';
  });

  // Drag & drop
  ['dragenter', 'dragover'].forEach((ev) => {
    dropArea.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); dropArea.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach((ev) => {
    dropArea.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); dropArea.classList.remove('dragover'); });
  });
  dropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) addFiles(dt.files);
  });

  // Input file selection
  input.addEventListener('change', (e) => addFiles(e.target.files));

  // Merge & send to server using current files order
  btn.addEventListener('click', async () => {
    if (!filesState.length) { alert('Aucun fichier à fusionner.'); return; }
    status.textContent = 'Préparation...';
    const formData = new FormData();
    for (const f of filesState) formData.append('documents', f.file, f.file.name);
    try {
      status.textContent = 'Envoi au serveur...';
      const resp = await fetch('/merge', { method: 'POST', body: formData });
      if (!resp.ok) { const txt = await resp.text(); throw new Error(txt || resp.statusText); }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Topcoach-merged-${Date.now()}.pdf`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      status.textContent = 'Fusion terminée — téléchargement lancé.';
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la conversion/merge: ' + err.message);
      status.textContent = 'Erreur, voir console.';
    }
  });

});
