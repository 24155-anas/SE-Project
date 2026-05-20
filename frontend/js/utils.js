// UI Utilities
const utils = {
    toast(msg, type = 'success') {
        const t = document.getElementById('toast');
        const m = document.getElementById('toast-message');
        const i = document.getElementById('toast-icon');
        
        if (!t) return;
        
        t.className = `toast show toast-${type}`;
        m.textContent = msg;
        i.innerHTML = type === 'success' ? '<i data-lucide="check-circle-2"></i>' : '<i data-lucide="alert-triangle"></i>';
        
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => t.classList.remove('show'), 4000);
    },

    spin(show = true) {
        const loader = document.getElementById('loading-view');
        if (loader) loader.classList.toggle('hidden', !show);
    },

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    },

    truncate(str, length = 100) {
        if (!str || str.length <= length) return str;
        return str.substring(0, length) + '...';
    }
};
