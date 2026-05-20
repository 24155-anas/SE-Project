// Notifications Panel — in-app notification system
const notificationsPanel = {
    isOpen: false,

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    open() {
        this.isOpen = true;
        document.getElementById('notif-panel').classList.add('open');
        document.getElementById('notif-overlay').classList.add('open');
        this.load();
    },

    close() {
        this.isOpen = false;
        document.getElementById('notif-panel').classList.remove('open');
        document.getElementById('notif-overlay').classList.remove('open');
    },

    async load() {
        const body = document.getElementById('notif-body');
        body.innerHTML = '<div class="flex justify-center py-12"><div class="spinner"></div></div>';

        try {
            const notifications = await api.get('/notifications/my');

            if (notifications.length === 0) {
                body.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-64 text-center px-6">
                        <div class="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                            <i data-lucide="bell-off" class="w-8 h-8 text-slate-600"></i>
                        </div>
                        <p class="font-bold text-slate-400">All caught up!</p>
                        <p class="text-sm text-slate-600 mt-1">No notifications yet.</p>
                    </div>
                `;
                lucide.createIcons();
                return;
            }

            body.innerHTML = notifications.map(n => this.renderItem(n)).join('');
            lucide.createIcons();
        } catch (err) {
            body.innerHTML = `<div class="text-rose-500 text-sm p-6">${err.message}</div>`;
        }
    },

    renderItem(n) {
        const icons = {
            match_found: 'zap',
            person_match: 'user-search',
            claim_verified: 'check-circle-2'
        };
        const colors = {
            match_found: 'text-teal-400',
            person_match: 'text-orange-400',
            claim_verified: 'text-emerald-400'
        };
        const icon = icons[n.type] || 'bell';
        const color = colors[n.type] || 'text-slate-400';
        const timeStr = utils.formatDate(n.created_at);

        return `
            <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="notificationsPanel.handleClick('${n.id}', '${n.related_match_id || ''}', '${n.related_report_id || ''}', '${n.type}')">
                <div class="flex gap-3">
                    <div class="mt-1 ${color} flex-shrink-0">
                        <i data-lucide="${icon}" class="w-5 h-5"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between gap-2">
                            <p class="text-sm font-bold leading-tight ${n.is_read ? 'text-slate-300' : 'text-white'}">${n.title}</p>
                            ${!n.is_read ? '<div class="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0 mt-1"></div>' : ''}
                        </div>
                        <p class="text-xs text-slate-400 mt-1 leading-relaxed">${n.message}</p>
                        <p class="text-[10px] text-slate-600 mt-2 font-medium">${timeStr}</p>
                    </div>
                </div>
            </div>
        `;
    },

    async handleClick(id, matchId, reportId, type) {
        await this.markRead(id);
        this.close();

        if (type === 'claim_verified' || type === 'match_found') {
            router.navigate('my-matches');
        } else if (type === 'person_match') {
            router.navigate('my-matches');
        } else if (reportId) {
            reportDetailPage.setCurrentId(reportId);
            router.navigate('report-detail');
        }
    },

    async markRead(id) {
        try {
            await api.patch(`/notifications/${id}/read`);
            await this.loadCount();
        } catch (err) {
            console.error('Failed to mark notification read:', err);
        }
    },

    async markAllRead() {
        try {
            await api.patch('/notifications/read-all');
            await this.loadCount();
            await this.load();
        } catch (err) {
            utils.toast('Failed to mark all as read', 'error');
        }
    },

    async loadCount() {
        if (!api.isAuthenticated()) return;
        try {
            const data = await api.get('/notifications/my/count');
            const badge = document.getElementById('notif-badge');
            if (!badge) return;
            if (data.unread > 0) {
                badge.textContent = data.unread > 99 ? '99+' : data.unread;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        } catch (err) {
            // Silently fail — badge just won't show
        }
    }
};
