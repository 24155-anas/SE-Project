// Page Logic - My Reports
const reportsPage = {
    currentFilter: 'all',

    async render() {
        const app = document.getElementById('app');
        utils.spin(true);

        try {
            const reports = await api.get('/reports/my');

            app.innerHTML = `
                <div class="space-y-8 animate-in fade-in duration-500">
                    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 class="text-4xl font-extrabold brand-font mb-4">My Reports</h1>
                            <div class="flex flex-wrap gap-2" id="report-filters">
                                <button onclick="reportsPage.setFilter('all')" class="filter-btn px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${this.currentFilter === 'all' ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20' : 'bg-slate-800 text-slate-400 hover:text-white'}">All</button>
                                <button onclick="reportsPage.setFilter('lost')" class="filter-btn px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${this.currentFilter === 'lost' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-800 text-slate-400 hover:text-white'}">Lost</button>
                                <button onclick="reportsPage.setFilter('found')" class="filter-btn px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${this.currentFilter === 'found' ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20' : 'bg-slate-800 text-slate-400 hover:text-white'}">Found</button>
                                <button onclick="reportsPage.setFilter('person_missing')" class="filter-btn px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${this.currentFilter === 'person_missing' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-800 text-slate-400 hover:text-white'}">Missing Person</button>
                                <button onclick="reportsPage.setFilter('person_found')" class="filter-btn px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${this.currentFilter === 'person_found' ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20' : 'bg-slate-800 text-slate-400 hover:text-white'}">Found Person</button>
                            </div>
                        </div>
                        <button onclick="ui.openReportModal()" class="bg-teal-500 hover:bg-teal-400 text-slate-950 px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 shadow-xl shadow-teal-500/10 flex-shrink-0">
                            <i data-lucide="plus" class="w-5 h-5"></i> New Report
                        </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" id="reports-grid">
                        ${this.renderReportsList(reports)}
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

    setFilter(type) {
        this.currentFilter = type;
        this.render();
    },

    renderReportsList(reports) {
        const filtered = this.currentFilter === 'all'
            ? reports
            : reports.filter(r => r.report_type === this.currentFilter);

        if (filtered.length === 0) {
            const labels = { lost: 'lost items', found: 'found items', person_missing: 'missing person reports', person_found: 'found person reports', all: 'reports' };
            return `
                <div class="col-span-full py-20 text-center card-glass rounded-3xl border-dashed border-2 border-slate-800">
                    <i data-lucide="inbox" class="w-12 h-12 text-slate-700 mx-auto mb-4"></i>
                    <p class="text-slate-500 font-bold text-lg">No ${labels[this.currentFilter] || 'reports'} yet.</p>
                    <p class="text-slate-600 text-sm mt-1">Submit a new report to get started.</p>
                </div>
            `;
        }

        return filtered.map(r => components.reportCard(r)).join('');
    }
};
