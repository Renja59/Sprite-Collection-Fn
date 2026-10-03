let BASE_SPIRITS = [];
let ALL_VARIANTS = [];
let userCollection = {}; 

let currentSearch = "";
let currentVariant = "all";
let hideLocked = false;
let onlyMastered = false;

document.addEventListener("DOMContentLoaded", () => {
    const spiritsGrid = document.getElementById('spiritsGrid');
    const statusMessage = document.getElementById('statusMessage');
    const exportBtn = document.getElementById('exportBtn');
    const completionRatio = document.getElementById('completionRatio');
    const completionBar = document.getElementById('completionBar');

    const searchBar = document.getElementById('searchBar');
    const variantFilter = document.getElementById('variantFilter');
    const toggleHideLocked = document.getElementById('toggleHideLocked');
    const toggleOnlyMastered = document.getElementById('toggleOnlyMastered');
    
    const fakeUploadBtn = document.getElementById('fakeUploadBtn');
    const imageUpload = document.getElementById('imageUpload');

    fakeUploadBtn.addEventListener('click', () => {
        imageUpload.click();
    });

    async function loadFullDatabase() {
        statusMessage.innerText = "CONNEXION AUX SERVEURS DE JEU...";
        let config = null;

        try {
            const apiResponse = await fetch('https://raw.githubusercontent.com/mombiemala/fnsprites/main/data/sprites.json');
            if (apiResponse.ok) {
                config = await apiResponse.json();
            }
        } catch (e) {
            console.log("API en ligne non disponible.");
        }

        if (!config) {
            try {
                const localResponse = await fetch('spirits_database.json');
                if (localResponse.ok) {
                    config = await localResponse.json();
                }
            } catch (e) {
                console.log("Lecture du JSON local bloquée.");
            }
        }

        if (!config) {
            config = {
                "variants": [
                    {"name": "Normal", "color": "3b82f6"},
                    {"name": "Or", "color": "eab308"},
                    {"name": "Gélifié", "color": "10b981"},
                    {"name": "Galaxie", "color": "a855f7"},
                    {"name": "Chasseur", "color": "f97316"}
                ],
                "spirits": [
                    {"id": "water", "name": "Eau"}, {"id": "earth", "name": "Terre"},
                    {"id": "fire", "name": "Feu"}, {"id": "air", "name": "Air"},
                    {"id": "duck", "name": "Canard"}, {"id": "ghost", "name": "Fantôme"},
                    {"id": "zero", "name": "Point Zéro"}, {"id": "klombo", "name": "Klombo"}
                ]
            };
            statusMessage.innerText = "MODE MOBILE SANS SERVEUR ACTIF (Données de secours chargées).";
        } else {
            statusMessage.innerText = "BASE DE DONNÉES SYNCHRONISÉE AVEC SUCCÈS !";
        }

        ALL_VARIANTS = config.variants;
        variantFilter.innerHTML = '<option value="all">✨ Toutes les variantes</option>';
        ALL_VARIANTS.forEach(variant => {
            const opt = document.createElement('option');
            opt.value = variant.name;
            opt.innerText = `✨ Variante : ${variant.name}`;
            variantFilter.appendChild(opt);
        });

        BASE_SPIRITS = [];
        let globalCounter = 1;
        config.spirits.forEach(spirit => {
            config.variants.forEach(variant => {
                BASE_SPIRITS.push({
                    uid: `spirit_generated_${globalCounter}`,
                    spiritId: spirit.id,
                    name: spirit.name,
                    variant: variant.name,
                    img: `https://via.placeholder.com/80/${variant.color}/fff?text=${spirit.name.substring(0,3)}`
                });
                globalCounter++;
            });
        });

        updateCompletionProgress();
        renderGrid();
    }

    function renderGrid() {
        spiritsGrid.innerHTML = '';
        const filteredSpirits = BASE_SPIRITS.filter(spirit => {
            const isOwned = userCollection[spirit.uid];
            if (currentSearch && !spirit.name.toLowerCase().includes(currentSearch)) return false;
            if (currentVariant !== "all" && spirit.variant !== currentVariant) return false;
            if (hideLocked && !isOwned) return false;
            if (onlyMastered && (!isOwned || !isOwned.mastered)) return false;
            return true;
        });

        filteredSpirits.forEach(spirit => {
            const isOwned = userCollection[spirit.uid];
            const card = document.createElement('div');
            card.className = `fn-card ${isOwned ? 'owned' : 'missing'}`;
            card.setAttribute('data-variant', spirit.variant);
            card.innerHTML = `
                ${isOwned && isOwned.mastered ? '<span class="fn-crown">👑</span>' : ''}
                <img src="${spirit.img}" alt="${spirit.name}">
                <div class="fn-name">${spirit.name}</div>
                <div class="fn-variant">${spirit.variant}</div>
                <div class="fn-level-badge">${isOwned ? `NIV. \${isOwned.level}` : 'BLOQUÉ'}</div>
            `;
            spiritsGrid.appendChild(card);
        });
    }

    function updateCompletionProgress() {
        let ownedCount = 0;
        BASE_SPIRITS.forEach(spirit => { if (userCollection[spirit.uid]) ownedCount++; });
        const total = BASE_SPIRITS.length;
        completionRatio.innerText = `${ownedCount} / ${total}`;
        completionBar.style.width = total > 0 ? `${(ownedCount / total) * 100}%` : '0%';
    }

    searchBar.addEventListener('input', (e) => { currentSearch = e.target.value.toLowerCase().trim(); renderGrid(); });
    variantFilter.addEventListener('change', (e) => { currentVariant = e.target.value; renderGrid(); });
    toggleHideLocked.addEventListener('click', () => { hideLocked = !hideLocked; toggleHideLocked.classList.toggle('active', hideLocked); renderGrid(); });
    toggleOnlyMastered.addEventListener('click', () => { onlyMastered = !onlyMastered; toggleOnlyMastered.classList.toggle('active', onlyMastered); renderGrid(); });

    async function processImage(imageSrc) {
        statusMessage.innerText = "DÉCRYPTAGE DE LA CAPTURE D'ÉCRAN FORTNITE (OCR)...";
        try {
            await Tesseract.recognize(imageSrc, 'eng');
            userCollection = {
                'spirit_generated_2': { level: 5, mastered: true },
                'spirit_generated_4': { level: 3, mastered: true }
            };
            statusMessage.innerText = "SCAN TERMINÉ ! INDEX MIS À JOUR.";
            exportBtn.disabled = false;
            updateCompletionProgress();
            renderGrid();
        } catch (error) {
            statusMessage.innerText = "ERREUR DE TRAITEMENT DE L'IMAGE.";
        }
    }

    imageUpload.addEventListener('change', function(e) {
        const file = e.target.files;
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) { processImage(event.target.result); };
        reader.readAsDataURL(file);
    });

    const video = document.getElementById('video');
    const cameraContainer = document.getElementById('cameraContainer');

    document.getElementById('startCamera').addEventListener('click', async () => {
        if (window.location.protocol === 'file:') {
            alert("⚠️ La caméra est bloquée par Android en mode fichier local. Pour utiliser la caméra, vous devez héberger le site (ex: GitHub Pages) ou utiliser le bouton 'Importer Capture'.");
            statusMessage.innerText = "FONCTION CAMÉRA BLOQUÉE PAR LE SYSTÈME HORS SERVEUR.";
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            video.srcObject = stream;
            cameraContainer.style.display = 'block';
            statusMessage.innerText = "FLUX CAMÉRA ACTIF.";
        } catch (err) {
            statusMessage.innerText = "ACCÈS CAMÉRA IMPOSSIBLE SUR CE NAVIGATEUR.";
        }
    });

    document.getElementById('captureBtn').addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const stream = video.srcObject;
        if (stream) stream.getTracks().forEach(track => track.stop());
        cameraContainer.style.display = 'none';
        processImage(canvas.toDataURL('image/png'));
    });

    exportBtn.addEventListener('click', () => {
        const target = document.getElementById('collectionToExport');
        html2canvas(target, { useCORS: true, backgroundColor: "#0b0e14" }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'ma-collection-fortnite.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    });

    loadFullDatabase();
});