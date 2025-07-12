document.addEventListener('DOMContentLoaded', () => {
  const macroInput = document.getElementById('macroId');
  const status = document.getElementById('status');

  chrome.storage.local.get(['macroId'], ({ macroId }) => {
    if (macroId) macroInput.value = macroId;
  });

  document.getElementById('save').addEventListener('click', () => {
    const macroId = macroInput.value.trim();

    status.innerHTML = '';
    if (!/^AKfycb[\w-]{20,}$/.test(macroId)) {
      status.innerHTML = `<div class="alert alert-danger">El ID del macro parece inválido.</div>`;
      return;
    }

    chrome.storage.local.set({ macroId }, () => {
      status.innerHTML = `<div class="alert alert-success">✅ Guardado correctamente.</div>`;
      setTimeout(() => status.innerHTML = '', 3000);
    });
  });
});
