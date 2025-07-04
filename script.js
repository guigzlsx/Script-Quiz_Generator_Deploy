document
  .getElementById("uploadButton")
  .addEventListener("click", envoyerRequete);

document
  .getElementById("darkModeToggle")
  .addEventListener("click", toggleDarkMode);

document
  .getElementById("clearScriptButton")
  .addEventListener("click", clearScript);

async function envoyerRequete() {
  const fileInput = document.getElementById("fileInput");
  const loader = document.getElementById("loader");
  const scriptOutput = document.getElementById("scriptOutput");
  const quizOutput = document.getElementById("quizOutput");
  const resultDiv = document.getElementById("result");

  // Vérifier si un fichier a été sélectionné
  if (fileInput.files.length === 0) {
    alert("Veuillez sélectionner un fichier.");
    return;
  }

  loader.style.display = "block"; // Afficher le loader
  resultDiv.style.display = "none"; // Masquer le résultat

  const formData = new FormData();
  formData.append("document", fileInput.files[0]);
  formData.append(
    "inEnglish",
    document.getElementById("englishOption").checked
  );

  try {
    const response = await fetch("/upload", {
      method: "POST",
      body: formData,
    });

    // Vérifier si la réponse est OK
    if (!response.ok) {
      throw new Error(
        "Erreur lors du chargement du fichier : " + response.statusText
      );
    }

    const data = await response.json();

    // Vérifier si les données contiennent un script et un quiz
    if (data.script) {
      scriptOutput.textContent = data.script; // Afficher le script
      saveScriptToLocalStorage(data.script); // Sauvegarder le script dans le stockage local
    } else {
      scriptOutput.textContent = "Aucun script généré.";
    }

    resultDiv.style.display = "block"; // Afficher le résultat

    // Scroll automatique vers le résultat
    resultDiv.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error("Erreur:", error);
    alert("Une erreur s'est produite : " + error.message); // Afficher un message d'erreur à l'utilisateur
  } finally {
    loader.style.display = "none"; // Masquer le loader
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const burgerIcon = document.querySelector(".burger-icon");
  const menuItems = document.querySelector(".menu-items");

  burgerIcon.addEventListener("click", function () {
    burgerIcon.classList.toggle("active");
    menuItems.classList.toggle("active");
  });

  // Fermer le menu si on clique en dehors
  document.addEventListener("click", function (event) {
    if (
      !burgerIcon.contains(event.target) &&
      !menuItems.contains(event.target)
    ) {
      burgerIcon.classList.remove("active");
      menuItems.classList.remove("active");
    }
  });

  // Support du mode sombre existant
  const darkModeToggle = document.getElementById("darkModeToggle");
  darkModeToggle.addEventListener("click", function () {
    document.body.classList.toggle("dark-mode");
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const dropZone = document.querySelector(".file-upload-container");
  const fileInput = document.getElementById("fileInput");

  // Empêche le comportement par défaut du navigateur lors du glisser-déposer
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Ajoute visuellement que le drag est sur la zone
  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, highlight, false);
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, unhighlight, false);
  });

  function highlight() {
    dropZone.classList.add("dragover");
  }

  function unhighlight() {
    dropZone.classList.remove("dragover");
  }

  // Gestion du drop
  dropZone.addEventListener("drop", handleDrop, false);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    fileInput.files = files;

    // Mise à jour du texte du label avec le nom du fichier
    const fileName = files[0] ? files[0].name : "Choisir un fichier";
    const label = document.querySelector(".custom-file-upload");
    label.textContent = fileName;
  }
});

document.getElementById("fileInput").addEventListener("change", function () {
  const fileName = this.files[0] ? this.files[0].name : "Choisir un fichier";
  const label = document.querySelector(".custom-file-upload");
  label.textContent = fileName; // Remplace le texte du label par le nom du fichier
});

function toggleDarkMode() {
  const body = document.body;
  const darkModeToggle = document.getElementById("darkModeToggle");

  body.classList.toggle("dark-mode");

  const isDarkMode = body.classList.contains("dark-mode");
  saveDarkModeToLocalStorage(isDarkMode);

  darkModeToggle.textContent = isDarkMode ? "Light mode" : "Dark mode";
}

function saveDarkModeToLocalStorage(isDarkMode) {
  localStorage.setItem("darkMode", isDarkMode ? "enabled" : "disabled");
}

function loadDarkModeFromLocalStorage() {
  return localStorage.getItem("darkMode") === "enabled";
}

function saveScriptToLocalStorage(script) {
  localStorage.setItem("generatedScript", script);
}

function loadScriptFromLocalStorage() {
  return localStorage.getItem("generatedScript");
}

function clearScript() {
  localStorage.removeItem("generatedScript");
  const scriptOutput = document.getElementById("scriptOutput");
  const resultDiv = document.getElementById("result");
  scriptOutput.textContent = "";
  resultDiv.style.display = "none";
}

window.addEventListener("load", function () {
  const savedScript = loadScriptFromLocalStorage();
  if (savedScript) {
    const scriptOutput = document.getElementById("scriptOutput");
    const resultDiv = document.getElementById("result");
    scriptOutput.textContent = savedScript;
    resultDiv.style.display = "block";
  }

  // Charger l'état du mode sombre
  const isDarkMode = loadDarkModeFromLocalStorage();
  if (isDarkMode) {
    document.body.classList.add("dark-mode");
    document.getElementById("darkModeToggle").textContent = "Light mode";
  }
});
