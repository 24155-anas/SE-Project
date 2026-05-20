// Page Logic - Report Detail
const reportDetailPage = {
    currentId: null,

    setCurrentId(id) {
        this.currentId = id;
    },

    async render(reportId) {
        const id = reportId || this.currentId;
        if (!id) { router.navigate('my-reports'); return; }
        this.currentId = id;
        const app = document.getElementById('app');
        utils.spin(true);
        try {
            const [report, matches] = await Promise.all([
                api.get(`/reports/${id}`),
                api.get(`/matches/report/${id}`).catch(() => [])
            ]);
            const isLost = report.report_type === 'lost' || report.report_type === 'person_missing';
            const typeColor = isLost ? 'rose' : 'teal';
            const statusClass = { active: 'bg-teal-500/20 text-teal-400 border-teal-500/30', claimed: 'bg-amber-500/20 text-amber-400 border-amber-500/30', expired: 'bg-slate-700 text-slate-400 border-slate-600' }[report.status] || 'bg-teal-500/20 text-teal-400';

            app.innerHTML = `
                <div class="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
                    <button onclick="history.back()" class="flex items-center gap-2 text-slate-400 hover:text-teal-400 transition-colors font-bold text-sm group">
                        <i data-lucide="arrow-left" class="w-4 h-4 group-hover:-translate-x-1 transition-transform"></i> Back
                    </button>
                    <div class="relative overflow-hidden rounded-3xl">
                        <img src="${report.image_url || 'https://placehold.co/900x400/1e293b/94a3b8?text=No+Image'}" class="report-detail-hero w-full shadow-2xl" alt="${report.title}">
                        <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                        <div class="absolute bottom-6 left-6 flex items-center gap-3">
                            <span class="bg-slate-950/80 backdrop-blur-md text-${typeColor}-400 text-xs font-black uppercase px-3 py-1.5 rounded-full border border-${typeColor}-500/30">${report.report_type.replace('_', ' ')}</span>
                            <span class="${statusClass} text-xs font-black uppercase px-3 py-1.5 rounded-full border">${report.status}</span>
                        </div>
                    </div>
                    <div class="card-glass rounded-3xl border border-slate-800 p-8 space-y-6">
                        <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div class="space-y-2">
                                <h1 class="text-4xl font-black brand-font leading-tight">${report.title}</h1>
                                ${report.category ? `<span class="inline-block text-xs font-bold uppercase text-slate-500 bg-slate-800 px-3 py-1 rounded-full">${report.category}</span>` : ''}
                            </div>
                            <button onclick="router.navigate('my-matches')" class="bg-teal-500 hover:bg-teal-400 text-slate-950 px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 flex-shrink-0">
                                <i data-lucide="sparkles" class="w-4 h-4"></i> View Matches
                            </button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="bg-slate-900/50 rounded-2xl p-4 border border-slate-800 flex items-center gap-3">
                                <i data-lucide="map-pin" class="w-5 h-5 text-teal-400 flex-shrink-0"></i>
                                <div><p class="text-[10px] font-bold uppercase text-slate-500">Location</p><p class="text-sm font-bold">${report.location_name || 'Not specified'}</p></div>
                            </div>
                            <div class="bg-slate-900/50 rounded-2xl p-4 border border-slate-800 flex items-center gap-3">
                                <i data-lucide="calendar" class="w-5 h-5 text-teal-400 flex-shrink-0"></i>
                                <div><p class="text-[10px] font-bold uppercase text-slate-500">Reported</p><p class="text-sm font-bold">${utils.formatDate(report.created_at)}</p></div>
                            </div>
                            <div class="bg-slate-900/50 rounded-2xl p-4 border border-slate-800 flex items-center gap-3">
                                <i data-lucide="clock" class="w-5 h-5 text-teal-400 flex-shrink-0"></i>
                                <div><p class="text-[10px] font-bold uppercase text-slate-500">Expires</p><p class="text-sm font-bold">${report.expires_at ? utils.formatDate(report.expires_at) : 'N/A'}</p></div>
                            </div>
                        </div>
                        ${report.description ? `<div class="space-y-2"><h3 class="text-xs font-black uppercase text-slate-500 flex items-center gap-2"><i data-lucide="file-text" class="w-4 h-4"></i> Description</h3><p class="text-slate-300 leading-relaxed bg-slate-900/50 p-4 rounded-2xl border border-slate-800">${report.description}</p></div>` : ''}
                        ${report.secret_question ? `<div class="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3"><i data-lucide="shield-check" class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"></i><div><p class="text-xs font-bold text-amber-500 uppercase mb-1">Ownership Verification Required</p><p class="text-sm text-slate-400">This report has a secret question to verify ownership before revealing contact details.</p></div></div>` : ''}
                    </div>
                    ${this.renderMatchesSection(matches)}
                </div>
            `;
            lucide.createIcons();
        } catch (err) {
            app.innerHTML = `<div class="flex flex-col items-center justify-center py-32 text-center"><i data-lucide="alert-circle" class="w-16 h-16 text-rose-500 mb-4"></i><h2 class="text-2xl font-bold mb-2">Report not found</h2><p class="text-slate-500 mb-6">${err.message}</p><button onclick="router.navigate('my-reports')" class="bg-teal-500 text-slate-950 px-6 py-3 rounded-xl font-bold">Back to My Reports</button></div>`;
            lucide.createIcons();
        } finally {
            utils.spin(false);
        }
    },

    renderMatchesSection(matches) {
        if (!matches || matches.length === 0) {
            return `<div class="card-glass rounded-3xl border border-slate-800 p-8 text-center"><i data-lucide="search" class="w-10 h-10 text-slate-700 mx-auto mb-3"></i><h3 class="text-lg font-bold brand-font mb-2">No Matches Yet</h3><p class="text-sm text-slate-500">AI is actively scanning. You'll be notified when a match is found.</p></div>`;
        }
        return `
            <div class="space-y-4">
                <h2 class="text-2xl font-bold brand-font flex items-center gap-2"><i data-lucide="sparkles" class="w-6 h-6 text-teal-400"></i> AI Matches (${matches.length})</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${matches.map(m => {
                        const pct = Math.round(m.similarity_score * 100);
                        const uid = localStorage.getItem('milaap_user_id');
                        const other = m.lost_report.user_id === uid ? m.found_report : m.lost_report;
                        return `<div class="card-glass rounded-2xl border border-slate-800 p-4 flex gap-4 hover:border-teal-500/40 transition-all cursor-pointer" onclick="router.navigate('my-matches')">
                            <img src="${other.image_url || 'https://placehold.co/80x80/1e293b/94a3b8?text=Img'}" class="w-20 h-20 rounded-xl object-cover flex-shrink-0">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="bg-teal-500/20 text-teal-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">${pct}% match</span>
                                    <span class="text-[10px] text-slate-500 font-bold uppercase">${m.status}</span>
                                </div>
                                <h4 class="font-bold text-sm truncate">${other.title}</h4>
                                <p class="text-xs text-slate-500 truncate mt-0.5">${other.location_name || 'Lahore'}</p>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        `;
    }
};
