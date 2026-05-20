// Page Logic - My Matches
const matchesPage = {
    currentFilter: 'all',

    async render() {
        const app = document.getElementById('app');
        utils.spin(true);
        
        try {
            const matches = await api.get('/matches/my');
            const currentUser = { id: localStorage.getItem('milaap_user_id') };

            // Group by user's own reports
            const groups = {};
            matches.forEach(m => {
                const myReport = m.lost_report.user_id === currentUser.id ? m.lost_report : m.found_report;
                if (!groups[myReport.id]) groups[myReport.id] = { report: myReport, matches: [] };
                groups[myReport.id].matches.push(m);
            });

            app.innerHTML = `
                <div class="space-y-8 animate-in fade-in duration-500">
                    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 class="text-4xl font-extrabold brand-font mb-2">My Matches</h1>
                            <p class="text-slate-400 font-medium">AI-powered reconciliations for your reported items.</p>
                        </div>
                        <div class="flex bg-slate-800 p-1 rounded-xl">
                            <button onclick="matchesPage.setFilter('pending')" class="filter-btn px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${this.currentFilter === 'pending' ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20' : 'text-slate-400 hover:text-white'}">Pending</button>
                            <button onclick="matchesPage.setFilter('verified')" class="filter-btn px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${this.currentFilter === 'verified' ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20' : 'text-slate-400 hover:text-white'}">Verified</button>
                            <button onclick="matchesPage.setFilter('all')" class="filter-btn px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${this.currentFilter === 'all' ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20' : 'text-slate-400 hover:text-white'}">All</button>
                        </div>
                    </div>

                    <div class="space-y-12">
                        ${this.renderMatchGroups(groups, currentUser)}
                    </div>
                </div>
            `;
            lucide.createIcons();
        } catch (err) {
            utils.toast(err.message, 'error');
        } finally {
            utils.spin(false);
        }
    },

    setFilter(filter) {
        this.currentFilter = filter;
        this.render();
    },

    renderMatchGroups(groups, currentUser) {
        const entries = Object.values(groups);
        if (entries.length === 0) {
            return '<div class="py-20 text-center"><p class="text-slate-500 italic">No matches found yet. AI is still scanning!</p></div>';
        }

        return entries.map(g => {
            const filteredMatches = this.currentFilter === 'all' 
                ? g.matches 
                : g.matches.filter(m => {
                    if (this.currentFilter === 'pending') return m.status === 'notified' || m.status === 'claimed';
                    if (this.currentFilter === 'verified') return m.status === 'verified' || m.status === 'connected';
                    return true;
                });

            if (filteredMatches.length === 0) return '';

            const isLost = g.report.report_type === 'lost' || g.report.report_type === 'person_missing';
            const typeText = isLost ? 'Your Lost Report' : 'Your Found Report';
            const typeColor = isLost ? 'text-rose-400' : 'text-teal-400';

            return `
                <div class="space-y-6">
                    <div class="flex items-center gap-3">
                        <div class="${typeColor}"><i data-lucide="${isLost ? 'alert-circle' : 'check-circle-2'}" class="w-5 h-5"></i></div>
                        <h2 class="text-xl font-bold brand-font">For ${typeText}: <span class="text-teal-400 font-extrabold underline underline-offset-4">${g.report.title}</span></h2>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        ${filteredMatches.map(m => components.matchCard(m, currentUser)).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }
};
