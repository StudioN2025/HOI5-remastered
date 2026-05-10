/* loader.js - Экран загрузки игры */

export function showLoader() {
    const loader = document.createElement('div');
    loader.id = 'game-loader';
    loader.innerHTML = `
        <div class="loader-content">
            <div class="loader-spinner"></div>
            <h2 class="loader-title">ЗАГРУЗКА</h2>
            <p class="loader-status" id="loader-status-text">Инициализация...</p>
            <div class="loader-progress-bar">
                <div class="loader-progress-fill" id="loader-progress"></div>
            </div>
        </div>
    `;
    document.body.appendChild(loader);
    return loader;
}

export function updateLoaderStatus(text) {
    const statusEl = document.getElementById('loader-status-text');
    if (statusEl) {
        statusEl.textContent = text;
    }
}

export function updateLoaderProgress(percent) {
    const progressEl = document.getElementById('loader-progress');
    if (progressEl) {
        progressEl.style.width = Math.min(100, Math.max(0, percent)) + '%';
    }
}

export function hideLoader() {
    const loader = document.getElementById('game-loader');
    if (loader) {
        loader.classList.add('loader-hidden');
        setTimeout(() => {
            loader.remove();
        }, 500);
    }
}
