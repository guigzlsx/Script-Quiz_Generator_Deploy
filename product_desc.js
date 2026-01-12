const copyDescription = () => {
  const output = document.getElementById('output');
  const copyBtn = document.getElementById('copyBtn');
  const text = output.textContent;
  if (text && text.trim()) {
    navigator.clipboard.writeText(text).then(() => {
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = '<svg height="16" width="16" viewBox="0 0 24 24" style="margin-right:6px; display:inline-block;"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" fill="currentColor"/></svg>Copié!';
      copyBtn.style.backgroundColor = 'rgba(100,255,100,0.2)';
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.style.backgroundColor = '';
      }, 2000);
    }).catch(err => {
      console.error('Erreur lors de la copie:', err);
      alert('Impossible de copier le texte');
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('doc');
  const extraInput = document.getElementById('extraInfo');
  const btn = document.getElementById('generate');
  const output = document.getElementById('output');
  const loading = document.getElementById('loading');
  const dropArea = document.getElementById('dropArea');
  const dropHint = document.getElementById('dropHint');
  const copyBtn = document.getElementById('copyBtn');

  // keep dropped file separately (safer than trying to set input.files)
  let droppedFile = null;

  const setSelectedFile = (file) => {
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
  ;['dragenter', 'dragover'].forEach(evt => {
    dropArea.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.add('drag-over');
    });
  });
  ;['dragleave', 'drop'].forEach(evt => {
    dropArea.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.remove('drag-over');
    });
  });

  dropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) {
      const file = dt.files[0];
      setSelectedFile(file);
    }
  });

  // When the hidden input changes (click->select), update hint
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) setSelectedFile(fileInput.files[0]);
  });

  btn.addEventListener('click', async () => {
    output.textContent = '';
    // prefer dropped file if present
    const file = droppedFile || (fileInput.files && fileInput.files[0]);
    if (!file) {
      output.textContent = 'Veuillez choisir un fichier.';
      return;
    }
    const fd = new FormData();
    fd.append('document', file);
    fd.append('extraInfo', extraInput.value || '');

    loading.style.display = 'block';
    btn.disabled = true;

    try {
      const res = await fetch('/generate-description', { method: 'POST', body: fd });
      if (!res.ok) {
        const txt = await res.text();
        output.textContent = `Erreur serveur: ${res.status} ${txt}`;
        return;
      }
      const j = await res.json();
      output.textContent = j.description || JSON.stringify(j, null, 2);
      copyBtn.style.display = 'inline-block';
    } catch (err) {
      output.textContent = 'Erreur réseau: ' + err.message;
    } finally {
      loading.style.display = 'none';
      btn.disabled = false;
    }
  });
});
