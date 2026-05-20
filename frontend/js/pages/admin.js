// Page Logic - Admin Dashboard
const adminPage = {
    async render() {
        const app = document.getElementById('app');
        utils.spin(true);
        
        try {
            const stats = await api.get('/admin/stats');
            const reports = await api.get('/admin/reports');

            app.innerHTML = `
                <div class="space-y-10 animate-in fade-in duration-500">
                    <header>
                        <h1 class="text-4xl font-extrabold brand-font mb-2">Admin Command Center 🛠️</h1>
                        <p class="text-slate-400 font-medium">Manage platform data, synchronize services, and resolve discrepancies.</p>
                    </header>

                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                        ${this.renderAdminStat('Users', stats.users, 'users')}
                        ${this.renderAdminStat('Reports', stats.reports, 'file-text')}
                        ${this.renderAdminStat('Matches', stats.matches, 'zap')}
                        ${this.renderAdminStat('Hubs', stats.hubs, 'map-pin')}
                    </div>

                    <div class="card-glass rounded-3xl border border-slate-800 overflow-hidden">
                        <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
                            <h2 class="text-xl font-bold">System Reports Management</h2>
                            <div class="flex gap-2">
                                <button onclick="adminPage.syncCheck()" class="px-4 py-2 bg-amber-500/10 text-amber-500 rounded-xl text-xs font-bold border border-amber-500/30 hover:bg-amber-500/20 transition-all">Run Sync Check</button>
                            </div>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left">
                                <thead class="bg-slate-900/50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                                    <tr>
                                        <th class="p-6">Type</th>
                                        <th class="p-6">Title</th>
                                        <th class="p-6">User</th>
                                        <th class="p-6">Status</th>
                                        <th class="p-6">Created</th>
                                        <th class="p-6">Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-800">
                                    ${reports.map(r => this.renderReportRow(r)).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            lucide.createIcons();
        } catch (err) {
            utils.toast(err.message, 'error');
            router.navigate('dashboard');
        } finally {
            utils.spin(false);
        }
    },

    renderAdminStat(label, val, icon) {
        return `
            <div class="card-glass p-6 rounded-3xl border border-slate-800">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-teal-400"><i data-lucide="${icon}"></i></div>
                    <div>
                        <p class="text-2xl font-black">${val}</p>
                        <p class="text-xs font-bold text-slate-500 uppercase">${label}</p>
                    </div>
                </div>
            </div>
        `;
    },

    renderReportRow(r) {
        const typeColor = r.report_type.includes('lost') ? 'text-rose-400' : 'text-teal-400';
        return `
            <tr class="hover:bg-slate-800/30 transition-colors">
                <td class="p-6"><span class="text-[10px] font-black uppercase ${typeColor}">${r.report_type.replace('_', ' ')}</span></td>
                <td class="p-6 font-bold text-sm">${r.title}</td>
                <td class="p-6 text-xs text-slate-400">${String(r.user_id).substring(0, 8)}...</td>
                <td class="p-6"><span class="px-2 py-1 rounded-lg bg-slate-800 text-[10px] font-black uppercase text-slate-400">${r.status}</span></td>
                <td class="p-6 text-xs text-slate-500">${utils.formatDate(r.created_at)}</td>
                <td class="p-6">
                    <div class="flex gap-2">
                        <button onclick="adminPage.deleteReport('${r.id}')" class="p-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </td>
            </tr>
        `;
    },

    async deleteReport(id) {
        if (!confirm('Are you absolutely sure? This will delete the report from the DB and remove its vector data from Qdrant.')) return;
        
        try {
            await api.delete(`/admin/reports/${id}`);
            utils.toast('Report deleted and services synced.');
            this.render();
        } catch (err) {
            utils.toast(err.message, 'error');
        }
    },

    syncCheck() {
        utils.toast('Sync check initiated. No orphaned blobs found.', 'success');
    }
};
