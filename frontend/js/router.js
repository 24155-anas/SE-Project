// SPA Router
const router = {
    currentPage: 'landing',

    routes: {
        'landing': () => typeof landingPage !== 'undefined' ? landingPage.render() : window.location.reload(),
        'dashboard': () => dashboardPage.render(),
        'my-reports': () => reportsPage.render(),
        'my-matches': () => matchesPage.render(),
        'map': () => mapPage.render(),
        'admin': () => adminPage.render(),
        'persons': () => personsPage.render(),
        'report-detail': () => reportDetailPage.render(reportDetailPage.currentId),
        'login': () => auth.showLogin(),
        'register': () => auth.showRegister()
    },

    navigate(page) {
        // Auth check for protected pages
        const publicPages = ['landing', 'login', 'register'];
        if (!publicPages.includes(page) && !api.isAuthenticated()) {
            this.navigate('login');
            return;
        }

        this.currentPage = page;
        window.location.hash = page;
        window.scrollTo(0, 0);

        // Close notifications panel on navigation
        if (typeof notificationsPanel !== 'undefined') {
            notificationsPanel.close();
        }

        // Hide modals on navigation
        const modals = ['report-modal', 'verify-modal', 'auth-modal', 'person-modal'];
        modals.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });

        if (this.routes[page]) {
            this.routes[page]();
            navbar.render();
        } else {
            console.error('Route not found:', page);
            this.navigate('landing');
        }
    }
};

// Listen for hash changes (back/forward buttons)
window.addEventListener('hashchange', () => {
    const page = window.location.hash.replace('#', '') || 'landing';
    if (page !== router.currentPage) {
        router.navigate(page);
    }
});
