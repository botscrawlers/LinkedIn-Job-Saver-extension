async function extractJobData() {

    function getAcercaDelEmpleo(container) {
        if (!container) return "";
        return Array.from(container.querySelectorAll("p, li"))
            .map(n => n.textContent.trim())
            .filter(t => t)
            .map(t => t.replace(/\s*\n\s*/g, "\n").trim())
            .join("\n");
    }

    function searchPage(){
        let jobUrl = '';
        let jobTitle = '';
        let companyName = '';
        let companyHref = '';
        let acercaDelEmpleo = '';
        let contratanteLink = '';
        let contratanteNombre = '';

        const container = document.querySelector(".job-details-jobs-unified-top-card__job-title");
        if (container) {
            const link = container.querySelector('a');
            const heading = container.querySelector('h1');
            if (link) {
                jobTitle = link.innerText.trim();
                const match = link.href.match(/\/jobs\/view\/(\d+)/);
                jobUrl = match ? `https://www.linkedin.com/jobs/view/${match[1]}/` : '';
            } else if (heading) {
                jobTitle = heading.innerText.trim();
            }
        }

        const companyWrapper = document.querySelector(".job-details-jobs-unified-top-card__company-name a");
        companyName = companyWrapper?.innerText.trim() || '';
        companyHref = companyWrapper?.href || '';

        const details = document.querySelector('#job-details .mt4');
        acercaDelEmpleo = getAcercaDelEmpleo(details);

        const hirerDiv = document.querySelector(".hirer-card__hirer-information a");
        contratanteLink = hirerDiv?.href || '';
        contratanteNombre = hirerDiv?.querySelector("strong")?.innerText.trim() || '';

        return { jobUrl, jobTitle, companyName, companyHref, acercaDelEmpleo, contratanteLink, contratanteNombre  }
    }

    function searchPage2(){
        let jobUrl = '';
        let jobTitle = '';
        let companyName = '';
        let companyHref = '';
        let acercaDelEmpleo = '';
        let contratanteLink = '';
        let contratanteNombre = '';

        const match = window.location.href.match(/\/jobs\/view\/(\d+)/);
        jobUrl = match ? `https://www.linkedin.com/jobs/view/${match[1]}/` : '';

        const caja = document.querySelector('[data-testid="expandable-text-box"]');
        acercaDelEmpleo = getAcercaDelEmpleo(caja);

        const contenedor = document.querySelector('[data-sdui-screen="com.linkedin.sdui.flagshipnav.jobs.JobDetails"]');
        if (contenedor) {
            const empresaLink = contenedor.querySelector('a');
            companyHref = empresaLink?.href || '';
            const parrafos = contenedor.querySelectorAll('p');
            jobTitle = parrafos[0]?.textContent.trim() || '';
            companyName = parrafos[1]?.textContent.trim() || '';
        }

        const contratanteCont = document.querySelector('[data-sdui-component="com.linkedin.sdui.generated.jobseeker.dsl.impl.peopleWhoCanHelp"]');
        if (contratanteCont) {
            const primerEnlace = Array.from(contratanteCont.querySelectorAll('a'))
                .find(a => a.href.includes('linkedin.com/in/'));
            if (primerEnlace) {
                contratanteLink = primerEnlace.href;
                contratanteNombre = primerEnlace.querySelector('p')?.textContent.trim()
                    || primerEnlace.nextElementSibling?.textContent.trim()
                    || '';
            }
        }

        return { jobUrl, jobTitle, companyName, companyHref, acercaDelEmpleo, contratanteLink, contratanteNombre  }
    }


    function pick(primary, fallback) {
        const result = {};
        for (const key in primary) {
            result[key] = primary[key] || fallback[key] || '';
        }
        return result;
    }

    const { href } = window.location;
    const isViewPage = href.includes('/jobs/view/');
    const isSearchPage =
        href.includes('/jobs/search/') ||
        href.includes('/jobs/collections/') ||
        href.includes('/preload/');

    let jobUrl = '', jobTitle = '', companyName = '', companyHref = '', acercaDelEmpleo = '', contratanteLink = '', contratanteNombre = '';

    if (isSearchPage) {
        ({
            jobUrl,
            jobTitle,
            companyName,
            companyHref,
            acercaDelEmpleo,
            contratanteLink,
            contratanteNombre
        } = searchPage());
    }

    if (isViewPage) {
        const data = pick(searchPage2(), searchPage());
        ({
            jobUrl,
            jobTitle,
            companyName,
            companyHref,
            acercaDelEmpleo,
            contratanteLink,
            contratanteNombre
        } = data);
        
    }

    return { jobUrl, jobTitle, companyName, companyHref, acercaDelEmpleo, contratanteLink, contratanteNombre };
}

document.addEventListener('DOMContentLoaded', async () => {
    const saveBtn = document.getElementById('save');
    const spinner = document.getElementById('spinner');
    const status = document.getElementById('status');
    const openSheetBtn = document.getElementById('openSheet');
    const dataPreview = document.getElementById('dataPreview');
    const dataTableBody = document.getElementById('dataTableBody');

    if (!saveBtn || !spinner || !status || !openSheetBtn || !dataPreview || !dataTableBody) {
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
            showSuccess('✅ Postulación guardada.');

            const match = text.match(/https:\/\/docs\.google\.com\/spreadsheets\/[^\s"]+/);
            if (match) {
                openSheetBtn.classList.remove('d-none');
                openSheetBtn.onclick = () => window.open(match[0], '_blank');
            }
        } catch (err) {
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
