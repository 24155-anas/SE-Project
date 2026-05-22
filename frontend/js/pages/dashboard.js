// Page Logic - Dashboard
const dashboardPage = {
    dashMap: null,

    async render() {
        const app = document.getElementById('app');
        utils.spin(true);

        try {
            const data = await api.get('/users/me/dashboard');
            localStorage.setItem('milaap_user_name', data.user.name);
            if (data.user.id) localStorage.setItem('milaap_user_id', data.user.id);
            navbar.render();

            app.innerHTML = `
                <div class="space-y-10 animate-in fade-in duration-500">
                    <header class="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div class="space-y-2">
                            <h1 class="text-4xl font-extrabold brand-font">Welcome back, ${data.user.name}! 👋</h1>
                            <p class="text-slate-400 font-medium">AI is actively searching for your belongings across the city.</p>
                        </div>
                        <div class="flex gap-4">
                            <button onclick="ui.openReportModal('lost')" class="card-glass hover:bg-slate-800 p-4 rounded-2xl flex items-center gap-3 transition-all border-l-4 border-l-rose-500 group">
                                <div class="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform"><i data-lucide="package-search"></i></div>
                                <div class="text-left"><p class="text-xs font-bold text-slate-500 uppercase tracking-tighter">I lost</p><p class="font-bold text-sm">An Item</p></div>
                            </button>
                            <button onclick="ui.openReportModal('found')" class="card-glass hover:bg-slate-800 p-4 rounded-2xl flex items-center gap-3 transition-all border-l-4 border-l-teal-500 group">
                                <div class="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-500 group-hover:scale-110 transition-transform"><i data-lucide="box"></i></div>
                                <div class="text-left"><p class="text-xs font-bold text-slate-500 uppercase tracking-tighter">I found</p><p class="font-bold text-sm">Something</p></div>
                            </button>
                            <button onclick="router.navigate('persons')" class="card-glass hover:bg-slate-800 p-4 rounded-2xl flex items-center gap-3 transition-all border-l-4 border-l-orange-500 group">
                                <div class="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform"><i data-lucide="users"></i></div>
                                <div class="text-left"><p class="text-xs font-bold text-slate-500 uppercase tracking-tighter">Person</p><p class="font-bold text-sm">Report</p></div>
                            </button>
                        </div>
                    </header>

                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        ${this.renderStatCard('Lost Reports', data.stats.lost_reports, 'alert-circle', 'text-rose-500')}
                        ${this.renderStatCard('Found Reports', data.stats.found_reports, 'check-circle-2', 'text-teal-500')}
                        ${this.renderStatCard('Pending Matches', data.stats.pending_matches, 'sparkles', 'text-cyan-400', 'AI Matching')}
                        ${this.renderStatCard('Resolved Matches', data.stats.resolved_matches, 'award', 'text-slate-400', 'Total')}
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div class="lg:col-span-2 space-y-6">
                            <div class="flex items-center justify-between">
                                <h2 class="text-2xl font-bold brand-font">Active AI Insights</h2>
                                <button onclick="router.navigate('my-matches')" class="text-sm font-bold text-teal-400 hover:underline">View All Matches</button>
                            </div>
                            <div id="insights-container" class="space-y-4">
                                <div class="flex justify-center py-12"><div class="spinner"></div></div>
                            </div>
                        </div>
                        <div class="space-y-6">
                            <h2 class="text-2xl font-bold brand-font">Recent Activity</h2>
                            <div class="bg-slate-900/50 rounded-3xl border border-slate-800 divide-y divide-slate-800 overflow-hidden">
                                ${data.recent_activity.length > 0
                    ? data.recent_activity.map(a => this.renderActivityItem(a)).join('')
                    : '<div class="p-8 text-center text-slate-500">No recent activity</div>'}
                            </div>
                            <div class="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 flex items-start gap-4">
                                <div class="bg-teal-500/10 p-2 rounded-lg text-teal-400"><i data-lucide="lightbulb" class="w-5 h-5"></i></div>
                                <div>
                                    <p class="text-sm font-bold text-teal-400 mb-1">AI PRO TIP</p>
                                    <p class="text-xs text-slate-400 leading-relaxed">Adding a clear photo of the item's distinctive features increases matching accuracy by 45%.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Live Map Section -->
                    <div class="space-y-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <h2 class="text-2xl font-bold brand-font flex items-center gap-3">
                                    <i data-lucide="map" class="w-6 h-6 text-teal-400"></i> Live Map — Reports Near You
                                </h2>
                                <p class="text-slate-400 text-sm mt-1">Click a hub marker to see recent reports in that area.</p>
                            </div>
                        </div>
                        <div class="flex flex-col lg:flex-row gap-6">
                            <div class="flex-1 relative">
                                <div id="dashboard-map" class="card-glass border border-slate-800 shadow-2xl">
                                    <div class="absolute inset-0 flex items-center justify-center bg-slate-950 z-[1000] rounded-[20px]" id="dash-map-loader">
                                        <div class="spinner"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="w-full lg:w-80 flex flex-col gap-4">
                                <div class="card-glass p-5 rounded-3xl border border-slate-800 flex flex-col gap-3 flex-1 overflow-hidden">
                                    <h3 class="font-bold flex items-center gap-2 text-sm">
                                        <i data-lucide="list" class="w-4 h-4 text-teal-400"></i>
                                        <span id="dash-area-title">Select a Hub</span>
                                        <span class="ml-auto bg-slate-800 text-[10px] px-2 py-0.5 rounded text-teal-400" id="dash-area-count">0</span>
                                    </h3>
                                    <div id="dash-area-reports" class="flex-1 overflow-y-auto space-y-3 pr-1">
                                        <div class="flex flex-col items-center justify-center text-center opacity-40 py-8">
                                            <i data-lucide="map-pin" class="w-8 h-8 mb-2"></i>
                                            <p class="text-sm font-bold">Click a pin on the map<br>to see reports</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            lucide.createIcons();
            this.loadDashboardInsights();
            this.initDashboardMap();
        } catch (err) {
            utils.toast(err.message, 'error');
        } finally {
            utils.spin(false);
        }
    },

    renderStatCard(label, val, icon, color, badge = 'Active') {
        return `
            <div class="card-glass p-6 rounded-3xl border border-slate-800 flex flex-col gap-4 relative overflow-hidden group">
                <div class="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                    <i data-lucide="${icon}" class="w-24 h-24"></i>
                </div>
                <div class="flex items-center justify-between">
                    <div class="p-2 rounded-xl bg-slate-800 ${color}"><i data-lucide="${icon}" class="w-5 h-5"></i></div>
                    <span class="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-slate-800 rounded-full text-slate-400">${badge}</span>
                </div>
                <div>
                    <p class="text-4xl font-black mb-1">${val}</p>
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">${label}</p>
                </div>
            </div>
        `;
    },

    renderActivityItem(a) {
        const timeStr = utils.formatDate(a.timestamp);
        const icon = a.type === 'match' ? 'sparkles' : 'file-plus';
        const color = a.type === 'match' ? 'text-teal-400' : 'text-slate-400';
        const clickable = a.type === 'report' && a.id
            ? `onclick="reportDetailPage.setCurrentId('${a.id}'); router.navigate('report-detail');" class="p-4 flex gap-4 hover:bg-slate-800/50 transition-colors cursor-pointer"`
            : `class="p-4 flex gap-4 hover:bg-slate-800/50 transition-colors"`;
        return `
            <div ${clickable}>
                <div class="mt-1 ${color}"><i data-lucide="${icon}" class="w-5 h-5"></i></div>
                <div>
                    <p class="text-sm font-bold">${a.title}</p>
                    <p class="text-xs text-slate-500">${timeStr}</p>
                </div>
            </div>
        `;
    },

    async initDashboardMap() {
        try {
            const hubs = await api.get('/admin/hubs');
            const loader = document.getElementById('dash-map-loader');

            if (this.dashMap) {
                this.dashMap.remove();
                this.dashMap = null;
            }

            this.dashMap = L.map('dashboard-map').setView([31.5204, 74.3587], 12);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.dashMap);

            hubs.forEach(hub => {
                const marker = L.marker([hub.lat, hub.lng], {
                    icon: L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 border-2 border-slate-900 shadow-xl flex items-center justify-center font-black text-slate-950 text-xs hover:scale-110 transition-transform cursor-pointer">📍</div>`,
                        iconSize: [40, 40],
                        iconAnchor: [20, 40]
                    })
                }).addTo(this.dashMap);

                marker.on('click', () => this.selectDashHub(hub));
            });

            if (loader) loader.classList.add('hidden');
            lucide.createIcons();
        } catch (err) {
            console.error('Dashboard map error:', err);
        }
    },

    async selectDashHub(hub) {
        const titleEl = document.getElementById('dash-area-title');
        const countEl = document.getElementById('dash-area-count');
        const reportsEl = document.getElementById('dash-area-reports');
        if (!titleEl) return;

        titleEl.textContent = hub.name;
        reportsEl.innerHTML = '<div class="flex justify-center py-6"><div class="spinner"></div></div>';

        try {
            const reports = await api.get(`/reports?hub_id=${hub.id}`);
            countEl.textContent = reports.length;

            if (reports.length === 0) {
                reportsEl.innerHTML = '<div class="py-8 text-center text-slate-500 italic text-sm">No active reports from this hub.</div>';
                return;
            }

            reportsEl.innerHTML = reports.map(r => `
                <div class="card-glass p-3 rounded-xl border border-slate-800 group cursor-pointer hover:border-teal-500/40 transition-all"
                     onclick="reportDetailPage.setCurrentId('${r.id}'); router.navigate('report-detail');">
                    <div class="flex gap-3">
                        <img src="${r.image_url || 'https://placehold.co/60x60/1e293b/94a3b8?text=Img'}" class="w-12 h-12 rounded-lg object-cover flex-shrink-0">
                        <div class="flex-1 min-w-0">
                            <p class="text-[10px] font-black uppercase text-teal-400 mb-0.5">${r.report_type.replace('_', ' ')}</p>
                            <h4 class="font-bold text-xs truncate">${r.title}</h4>
                            <p class="text-[10px] text-slate-500 mt-0.5">${utils.formatDate(r.created_at)}</p>
                        </div>
                        <i data-lucide="arrow-right" class="w-4 h-4 text-slate-600 group-hover:text-teal-400 transition-colors flex-shrink-0 mt-3"></i>
                    </div>
                </div>
            `).join('');
            lucide.createIcons();
        } catch (err) {
            reportsEl.innerHTML = `<div class="text-rose-500 text-xs p-3">${err.message}</div>`;
        }
    },

    async loadDashboardInsights() {
        try {
            const matches = await api.get('/matches/my');
            const container = document.getElementById('insights-container');
            if (!container) return;
            const pending = matches.filter(m => m.status === 'notified' || m.status === 'claimed').slice(0, 3);

            if (pending.length === 0) {
                container.innerHTML = `
                    <div class="p-12 text-center card-glass rounded-3xl border-dashed border-2 border-slate-800 animate-in zoom-in duration-300">
                        <i data-lucide="search" class="w-8 h-8 text-slate-700 mx-auto mb-4"></i>
                        <p class="text-slate-500 font-medium">Scanning Lahore for similarities...</p>
                        <p class="text-xs text-slate-600 mt-1">We'll notify you here as soon as a potential match appears.</p>
                    </div>
                `;
                lucide.createIcons();
                return;
            }

            const uid = localStorage.getItem('milaap_user_id');
            container.innerHTML = pending.map(m => {
                const r = m.found_report.user_id !== uid ? m.found_report : m.lost_report;
                return `
                    <div class="card-glass p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row gap-6 group hover:border-teal-500/50 transition-all animate-in slide-in-from-left duration-500">
                        <img src="${r.image_url || 'https://placehold.co/128x128/1e293b/94a3b8?text=Img'}" class="w-full md:w-32 h-32 rounded-2xl object-cover shadow-lg aspect-square">
                        <div class="flex-1 space-y-4">
                            <div>
                                <div class="flex items-center gap-3 mb-2">
                                    <span class="bg-teal-500/20 text-teal-400 text-[10px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-1">
                                        <i data-lucide="zap" class="w-3 h-3"></i> ${Math.round(m.similarity_score * 100)}% Match
                                    </span>
                                    <span class="text-xs text-slate-500">• ${utils.formatDate(m.created_at)}</span>
                                </div>
                                <h3 class="text-xl font-bold">${r.title} — Potential Match</h3>
                                <p class="text-sm text-slate-400 line-clamp-1">Reported at ${r.location_name || 'Lahore'}. Matches your description.</p>
                            </div>
                            <div class="flex gap-4">
                                <button onclick="router.navigate('my-matches')" class="flex-1 md:flex-none bg-teal-500 hover:bg-teal-400 text-slate-950 px-6 py-2 rounded-xl font-bold text-sm transition-colors">Action Required</button>
                                <button onclick="router.navigate('my-matches')" class="text-sm font-bold text-slate-500 hover:text-white transition-colors underline underline-offset-4">View Match Details</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            lucide.createIcons();
        } catch (err) {
            console.error(err);
        }
    }
};
