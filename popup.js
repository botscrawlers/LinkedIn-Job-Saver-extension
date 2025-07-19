
function extractJobData() {
    
    const jobTitleElement = document.querySelector(".job-details-jobs-unified-top-card__job-title a");
    const jobTitle = jobTitleElement?.innerText.trim() || '';
    const jobUrl = jobTitleElement ? jobTitleElement.href : '';
    const companyWrapper = document.querySelector(".job-details-jobs-unified-top-card__company-name a");
    const companyName = companyWrapper?.innerText.trim() || '';
    const companyHref = companyWrapper?.href || '';
    const acercaDelEmpleo = document.querySelector("#job-details > div")?.textContent.trim() || '';
    const hirerDiv = document.querySelector(".hirer-card__hirer-information a");
    const contratanteLink = hirerDiv?.href || '';
    const contratanteNombre = hirerDiv?.querySelector("strong")?.innerText.trim() || '';

    return {
        jobTitle,
        jobUrl, 
        companyName,
        companyHref,
        acercaDelEmpleo,
        contratanteLink,
        contratanteNombre
    };
}


document.addEventListener('DOMContentLoaded', async () => {
    const saveBtn = document.getElementById('save');
    const spinner = document.getElementById('spinner');
    const status = document.getElementById('status');
    const openSheetBtn = document.getElementById('openSheet');
    const dataPreview = document.getElementById('dataPreview');
    const dataTableBody = document.getElementById('dataTableBody');

    if (!saveBtn || !spinner || !status || !openSheetBtn || !dataPreview || !dataTableBody) {
        console.error("⛔ Error: elementos del DOM no encontrados.");
        return;
    }

    let postData = null;
    resetUI();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || 
        tab.url.startsWith('chrome://') || 
        tab.url.startsWith('chrome-extension://') || 
        !tab.url.includes('linkedin.com/jobs')) {

        showWarning("⚠️ Esta extensión solo funciona en ofertas de empleo de LinkedIn.");
        return;
    }

    const { macroId } = await chrome.storage.local.get(['macroId']);

    try {
        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: extractJobData
        });

        postData = result;

        if (!postData || Object.values(postData).every(v => !v)) {
            saveBtn.setAttribute('disabled', 'true');
            showWarning("⚠️ No se encontraron datos para mostrar.");
        } else {
            renderPreview(postData);
            saveBtn.removeAttribute('disabled');
        }
    } catch (err) {
        console.error("❌ Error al extraer datos:", err);
        showError("❌ No se pudo acceder al contenido de la página.");
    }

    saveBtn.addEventListener('click', async () => {
        if (!macroId) {
            showWarning('⚠️ No configuraste el macroId.');
            return;
        }

        if (!postData || Object.values(postData).every(v => !v || v.trim?.() === '')) {
            showError('❌ No hay datos válidos para guardar.');
            return;
        }

        resetAlerts();
        spinner.classList.remove('d-none');

        try {
            const macroUrl = `https://script.google.com/macros/s/${macroId}/exec`;
            const res = await fetch(macroUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(postData)
            });

            const text = await res.text();
            console.log("✅ Respuesta del macro:", text);
            showSuccess('✅ Postulación guardada.');

            const match = text.match(/https:\/\/docs\.google\.com\/spreadsheets\/[^\s"]+/);
            if (match) {
                openSheetBtn.classList.remove('d-none');
                openSheetBtn.onclick = () => window.open(match[0], '_blank');
            }
        } catch (err) {
            console.error("❌ Error al guardar:", err);
            showError('❌ Error al guardar los datos.');
        } finally {
            spinner.classList.add('d-none');
        }
    });

    function resetUI() {
        spinner.classList.add('d-none');
        openSheetBtn.classList.add('d-none');
        status.innerHTML = '';
        dataTableBody.innerHTML = '';
        dataPreview.classList.add('d-none');
    }

    function resetAlerts() {
        status.innerHTML = '';
    }

    function showError(msg) {
        status.innerHTML = `<div class="alert alert-danger">${msg}</div>`;
    }

    function showWarning(msg) {
        status.innerHTML = `<div class="alert alert-warning">${msg}</div>`;
    }

    function showSuccess(msg) {
        status.innerHTML = `<div class="alert alert-success">${msg}</div>`;
    }

    function renderPreview(data) {
        const orderedKeys = [
            ['jobTitle', 'Titulo'],
            ['jobUrl', 'Publicacion Link'],
            ['contratanteNombre', 'Contratante'],
            ['contratanteLink', 'Contratante Link'],
            ['companyName', 'Compañía'],
            ['companyHref', 'Compañía Link'],
            ['acercaDelEmpleo', 'Acerca del Empleo']
        ];

        dataTableBody.innerHTML = '';
        for (const [key, label] of orderedKeys) {
            const value = data[key] || '<em>(vacío)</em>';
            const row = document.createElement('tr');
            row.innerHTML = `<td><strong>${label}</strong></td><td>${value}</td>`;
            dataTableBody.appendChild(row);
        }
        dataPreview.classList.remove('d-none');
    }
});
