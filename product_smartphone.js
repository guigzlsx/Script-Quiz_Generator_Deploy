(function(){
  const fileInput = document.getElementById('fileInput');
  const dropArea = document.getElementById('dropArea');
  const fileHint = document.getElementById('fileHint');
  const generateBtn = document.getElementById('generateBtn');
  const loading = document.getElementById('loading');
  const outputJson = document.getElementById('outputJson');
  const downloadBtn = document.getElementById('downloadBtn');
  const extraInfo = document.getElementById('extraInfo');

  let lastResult = null;

  // drag & drop
  ['dragenter','dragover','dragleave','drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false)
  });
  function preventDefaults(e){ e.preventDefault(); e.stopPropagation(); }

  ['dragenter','dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, ()=> dropArea.classList.add('is-dragover'))
  })
  ['dragleave','drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, ()=> dropArea.classList.remove('is-dragover'))
  })

  dropArea.addEventListener('drop', handleDrop, false);
  function handleDrop(e){
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length) {
      fileInput.files = files;
      fileHint.textContent = files[0].name + ' (' + Math.round(files[0].size/1024) + ' KB)';
    }
  }

  fileInput.addEventListener('change', ()=>{
    if (fileInput.files && fileInput.files.length) {
      const f = fileInput.files[0];
      fileHint.textContent = f.name + ' (' + Math.round(f.size/1024) + ' KB)';
    } else {
      fileHint.textContent = 'Aucun fichier sélectionné';
    }
  });

  generateBtn.addEventListener('click', async ()=>{
    // prepare
    if ((!fileInput.files || !fileInput.files.length) && !confirm('Aucun fichier sélectionné — voulez-vous envoyer le champ texte uniquement ?')) return;
    const fd = new FormData();
    if (fileInput.files && fileInput.files.length) fd.append('file', fileInput.files[0]);
    const extra = extraInfo && extraInfo.value ? extraInfo.value.trim().slice(0,1000) : '';
    if (extra) fd.append('extraInfo', extra);

    try {
      loading.style.display = 'block';
      generateBtn.disabled = true;
      outputJson.textContent = 'Envoi en cours...';

      const resp = await fetch('/extract-smartphone', { method: 'POST', body: fd });
      const data = await resp.json();
      loading.style.display = 'none';
      generateBtn.disabled = false;

      if (!resp.ok) {
        outputJson.textContent = 'Erreur: ' + (data && data.error ? data.error : resp.statusText);
        return;
      }

      if (data && data.ok && data.normalized) {
        lastResult = data.normalized;
        outputJson.textContent = JSON.stringify(lastResult, null, 2);
        downloadBtn.style.display = 'inline-block';
      } else if (data && data.raw) {
        lastResult = { raw: data.raw };
        outputJson.textContent = JSON.stringify(lastResult, null, 2);
        downloadBtn.style.display = 'inline-block';
      } else {
        outputJson.textContent = JSON.stringify(data, null, 2);
        downloadBtn.style.display = 'inline-block';
      }

    } catch (err) {
      loading.style.display = 'none';
      generateBtn.disabled = false;
      outputJson.textContent = 'Erreur réseau: ' + String(err);
    }
  });

  downloadBtn.addEventListener('click', ()=>{
    if (!lastResult) return;
    const blob = new Blob([JSON.stringify(lastResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smartphone_extraction.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

})();
