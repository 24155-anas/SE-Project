// UI Components - Cards
const components = {
    reportCard(r, showActions = true) {
        const isLost = r.report_type === 'lost' || r.report_type === 'person_missing';
        const typeColor = isLost ? 'rose-500' : 'teal-400';
        const statusColors = {
            active: 'bg-teal-400 text-slate-950',
            claimed: 'bg-amber-500 text-white',
            expired: 'bg-slate-600 text-slate-300'
        };
        const statusClass = statusColors[r.status] || statusColors.active;

        return `
            <div class="card-glass rounded-3xl overflow-hidden border border-slate-800 group hover:border-teal-500/30 transition-all flex flex-col h-full report-card cursor-pointer"
                 onclick="reportDetailPage.setCurrentId('${r.id}'); router.navigate('report-detail');">
                <div class="relative h-48 overflow-hidden">
                    <img src="${r.image_url || 'https://placehold.co/400x225/1e293b/94a3b8?text=Milaap+AI'}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute top-4 right-4 ${statusClass} text-[10px] font-black uppercase px-2 py-1 rounded-lg">
                        ${r.status}
                    </div>
                    <div class="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-black uppercase text-${typeColor}">
                        ${r.report_type.replace('_', ' ')}
                    </div>
                </div>
                <div class="p-6 space-y-4 flex-1 flex flex-col">
                    <div>
                        <h3 class="text-xl font-bold mb-1 truncate">${r.title}</h3>
                        <p class="text-xs text-slate-400 flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i> ${r.location_name || 'Lahore'}</p>
                        <p class="text-[10px] text-slate-500 font-bold uppercase mt-2">Posted: ${utils.formatDate(r.created_at)}</p>
                    </div>
                    <div class="flex-1">
                        <p class="text-sm text-slate-400 line-clamp-2">${r.description || 'No description provided.'}</p>
                    </div>
                    ${showActions ? `
                    <div class="space-y-2">
                        <div class="w-full bg-teal-500/10 border border-teal-500/20 hover:bg-teal-500/20 text-teal-400 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
                            View Details <i data-lucide="arrow-right" class="w-4 h-4"></i>
                        </div>
                    </div>` : ''}
                </div>
            </div>
        `;
    },

    personCard(r) {
        const isMissing = r.report_type === 'person_missing';
        const badge = isMissing
            ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
            : 'bg-teal-500/20 text-teal-400 border-teal-500/30';
        const label = isMissing ? 'Missing' : 'Found';

        return `
            <div class="person-card" onclick="reportDetailPage.setCurrentId('${r.id}'); router.navigate('report-detail');">
                <div class="relative h-56 overflow-hidden">
                    <img src="${r.image_url || 'https://placehold.co/400x280/1e293b/94a3b8?text=Person'}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                    <span class="absolute top-4 left-4 ${badge} text-[10px] font-black uppercase px-3 py-1 rounded-full border">${label}</span>
                    <span class="absolute top-4 right-4 bg-slate-950/80 text-[10px] font-bold uppercase px-3 py-1 rounded-full text-slate-300">${r.status}</span>
                </div>
                <div class="p-5 space-y-3">
                    <h3 class="font-bold text-lg leading-tight truncate">${r.title}</h3>
                    <div class="flex items-center gap-2 text-slate-400 text-xs">
                        <i data-lucide="map-pin" class="w-3 h-3 text-orange-400"></i>
                        <span>${r.location_name || 'Lahore'}</span>
                    </div>
                    ${r.description ? `<p class="text-sm text-slate-400 line-clamp-2">${r.description}</p>` : ''}
                    <div class="flex items-center justify-between pt-1">
                        <p class="text-[10px] text-slate-600 font-medium">${utils.formatDate(r.created_at)}</p>
                        <span class="text-xs font-bold text-teal-400 flex items-center gap-1">View Details <i data-lucide="arrow-right" class="w-3 h-3"></i></span>
                    </div>
                </div>
            </div>
        `;
    },

    notificationCard(n) {
        const icons = { match_found: 'zap', person_match: 'users', claim_verified: 'check-circle-2' };
        const colors = { match_found: 'text-teal-400', person_match: 'text-orange-400', claim_verified: 'text-emerald-400' };
        const icon = icons[n.type] || 'bell';
        const color = colors[n.type] || 'text-slate-400';

        return `
            <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="notificationsPanel.handleClick('${n.id}', '${n.related_match_id || ''}', '${n.related_report_id || ''}', '${n.type}')">
                <div class="flex gap-3">
                    <div class="mt-0.5 ${color} flex-shrink-0"><i data-lucide="${icon}" class="w-5 h-5"></i></div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between gap-2">
                            <p class="text-sm font-bold leading-tight ${n.is_read ? 'text-slate-300' : 'text-white'}">${n.title}</p>
                            ${!n.is_read ? '<div class="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0 mt-1.5"></div>' : ''}
                        </div>
                        <p class="text-xs text-slate-400 mt-1 leading-relaxed">${n.message}</p>
                        <p class="text-[10px] text-slate-600 mt-2 font-medium">${utils.formatDate(n.created_at)}</p>
                    </div>
                </div>
            </div>
        `;
    },

    matchCard(m, currentUser) {
        const isMyLostReport = m.lost_report.user_id === currentUser.id;
        const otherReport = isMyLostReport ? m.found_report : m.lost_report;
        const pct = Math.round(m.similarity_score * 100);

        let actionArea = '';
        if (m.status === 'notified' || m.status === 'claimed') {
            if (isMyLostReport) {
                const btnText = m.status === 'claimed' ? 'Verify Ownership' : 'Yes, Claim This!';
                const onClick = m.status === 'claimed' 
                    ? `ui.openVerifyModal('${m.id}', '${m.lost_report.secret_question}', ${m.max_attempts - m.verification_attempts})`
                    : `ui.claimMatch('${m.id}')`;

                actionArea = `
                    <div class="space-y-4 pt-4 border-t border-slate-800">
                        <p class="text-xs font-bold text-teal-400 flex items-center gap-2">💡 This looks like yours?</p>
                        <div class="flex gap-4">
                            <button onclick="${onClick}" class="flex-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-3 rounded-xl transition-all">${btnText}</button>
                            <button onclick="ui.rejectMatch('${m.id}')" class="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all border border-slate-700">Not Mine</button>
                        </div>
                    </div>
                `;
            } else {
                actionArea = `
                    <div class="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 flex items-start gap-4">
                        <div class="text-amber-500 mt-1"><i data-lucide="hourglass" class="w-5 h-5"></i></div>
                        <div>
                            <p class="text-sm font-bold text-amber-500 mb-1">Status: ${m.status === 'claimed' ? 'Owner is verifying...' : 'Waiting for owner...'}</p>
                            <p class="text-xs text-slate-500">${m.status === 'claimed' ? 'Waiting for them to verify ownership through the secret question.' : 'Waiting for them to start the claim process.'}</p>
                        </div>
                    </div>
                `;
            }
        } else if (m.status === 'verified' || m.status === 'connected') {
            actionArea = `
                <div class="p-4 bg-teal-500/10 rounded-2xl border border-teal-500/30 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="text-teal-400"><i data-lucide="check-circle-2" class="w-6 h-6"></i></div>
                        <div>
                            <p class="text-sm font-bold text-teal-400">Match Verified! ✅</p>
                            <p class="text-xs text-slate-400">You can now coordinate collection.</p>
                        </div>
                    </div>
                    <button onclick="ui.resolveMatch('${m.id}')" class="text-xs font-black uppercase bg-teal-500 text-slate-950 px-4 py-2 rounded-lg hover:scale-105 transition-transform">Resolve</button>
                </div>
            `;
        }

        return `
            <div class="card-glass rounded-3xl overflow-hidden border border-slate-800 flex flex-col group hover:border-teal-500/30 transition-all">
                <div class="p-2">
                    <div class="relative h-64 overflow-hidden rounded-2xl">
                        <img src="${otherReport.image_url || 'https://placehold.co/400x256/1e293b/94a3b8?text=No+Image'}" class="w-full h-full object-cover">
                        <div class="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase text-teal-400">${otherReport.report_type.replace('_', ' ')}</div>
                        <div class="absolute top-4 right-4 bg-teal-500 text-slate-950 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1"><i data-lucide="zap" class="w-3 h-3"></i> ${pct}% Similarity</div>
                    </div>
                </div>
                <div class="p-6 space-y-6 flex-1 flex flex-col">
                    <div class="space-y-4">
                        <h3 class="text-2xl font-bold">${otherReport.title}</h3>
                        <div class="space-y-2">
                            <div class="flex items-center gap-3 text-slate-400 text-sm"><i data-lucide="map-pin" class="w-4 h-4"></i> <span>${otherReport.location_name || 'Lahore'}</span></div>
                            <div class="flex items-center gap-3 text-slate-400 text-sm"><i data-lucide="calendar" class="w-4 h-4"></i> <span>Reported: ${utils.formatDate(otherReport.created_at)}</span></div>
                        </div>
                    </div>
                    <div class="flex-1"></div>
                    ${actionArea}
                </div>
            </div>
        `;
    }
};
