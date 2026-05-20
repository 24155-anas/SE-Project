// UI Components - Navbar
const navbar = {
    render() {
        const nav = document.getElementById('navbar');
        if (!nav) return;

        if (!api.isAuthenticated()) {
            nav.classList.add('hidden');
            return;
        }

        const userInitial = localStorage.getItem('milaap_user_name') ? localStorage.getItem('milaap_user_name')[0].toUpperCase() : 'U';
        const isAdmin = localStorage.getItem('milaap_is_admin') === 'true';

        nav.classList.remove('hidden');
        nav.innerHTML = `
            <div class="flex items-center gap-8">
                <span class="brand-font text-2xl font-extrabold text-teal-400 cursor-pointer" onclick="router.navigate('landing')">Milaap</span>
                <div class="hidden md:flex gap-6">
                    <button onclick="router.navigate('dashboard')" class="nav-link text-sm font-medium hover:text-teal-400 transition-colors" data-page="dashboard">Dashboard</button>
                    <button onclick="router.navigate('my-reports')" class="nav-link text-sm font-medium hover:text-teal-400 transition-colors" data-page="my-reports">My Reports</button>
                    <button onclick="router.navigate('my-matches')" class="nav-link text-sm font-medium hover:text-teal-400 transition-colors" data-page="my-matches">My Matches</button>
                    <button onclick="router.navigate('persons')" class="nav-link text-sm font-medium hover:text-teal-400 transition-colors" data-page="persons">People</button>
                    ${isAdmin ? `<button onclick="router.navigate('admin')" class="nav-link text-sm font-medium text-rose-400 hover:text-rose-300 transition-colors" data-page="admin">Admin</button>` : ''}
                </div>
            </div>
            <div class="flex items-center gap-4">
                <button onclick="ui.openReportModal()" class="bg-teal-500 hover:bg-teal-400 text-slate-950 px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2">
                    <i data-lucide="plus-circle" class="w-4 h-4"></i> Report Item
                </button>
                <!-- Notification Bell -->
                <button onclick="notificationsPanel.toggle()" class="relative p-2 rounded-lg hover:bg-slate-800 transition-colors" title="Notifications" id="notif-bell-btn">
                    <i data-lucide="bell" class="w-5 h-5 text-slate-400 hover:text-white transition-colors"></i>
                    <span id="notif-badge" class="notif-badge hidden">0</span>
                </button>
                <div class="flex items-center gap-2 border-l border-slate-700 pl-4 ml-2">
                    <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-teal-400 overflow-hidden" id="nav-avatar">
                        ${userInitial}
                    </div>
                    <button onclick="auth.logout()" class="text-slate-400 hover:text-white transition-colors" title="Logout">
                        <i data-lucide="log-out" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>
        `;

        // Update active link
        document.querySelectorAll('.nav-link').forEach(l => {
            l.classList.toggle('active', l.dataset.page === router.currentPage);
        });

        if (window.lucide) window.lucide.createIcons();

        // Load notification count after render
        setTimeout(() => notificationsPanel.loadCount(), 100);
    }
};
