// Main App Logic & Auth
const auth = {
    showLogin() { this.openModal('login'); },
    showRegister() { this.openModal('register'); },
    openModal(view) {
        const modal = document.getElementById('auth-modal');
        document.getElementById('login-view').classList.toggle('hidden', view !== 'login');
        document.getElementById('register-view').classList.toggle('hidden', view !== 'register');
        modal.classList.remove('hidden');
    },
    closeModal() { document.getElementById('auth-modal').classList.add('hidden'); },
    async login(e) {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;
        utils.spin(true);
        try {
            const data = await api.post('/auth/login', { email, password });
            api.setToken(data.access_token);
            const user = await api.get('/users/me/dashboard');
            localStorage.setItem('milaap_user_id', user.user.id);
            localStorage.setItem('milaap_user_name', user.user.name);
            localStorage.setItem('milaap_is_admin', user.user.is_admin);
            this.closeModal();
            if (user.user.is_admin) { router.navigate('admin'); } else { router.navigate('dashboard'); }
            utils.toast(`Welcome back, ${user.user.name}!`);
            notificationsPanel.loadCount();
        } catch (err) { utils.toast(err.message, 'error'); } finally { utils.spin(false); }
    },
    async register(e) {
        e.preventDefault();
        const body = { email: e.target.email.value, password: e.target.password.value, name: e.target.name.value, phone: e.target.phone.value };
        utils.spin(true);
        try {
            await api.post('/auth/register', body);
            utils.toast('Account created! Please login.');
            this.showLogin();
        } catch (err) { utils.toast(err.message, 'error'); } finally { utils.spin(false); }
    },
    logout() {
        api.removeToken();
        localStorage.clear();
        router.navigate('landing');
        utils.toast('Logged out successfully');
    }
};

const ui = {
    currentStep: 1,
    selectedType: 'lost',

    async openReportModal(type = null) {
        const modal = document.getElementById('report-modal');
        this.selectedType = type || 'lost';

        // Show the modal and render content FIRST (instant response)
        if (type) {
            this.renderStep2(type);
        } else {
            this.renderStep1();
        }
        modal.classList.remove('hidden');

        // Then load hubs in background (non-blocking)
        if (type) {
            this._loadHubs();
        }
    },

    async _loadHubs() {
        try {
            const hubs = await api.get('/admin/hubs');
            const hubSelect = document.getElementById('hub-select');
            if (hubSelect) {
                hubSelect.innerHTML = '<option value="">Select a Location Hub...</option>' +
                    hubs.map(h => `<option value="${h.id}">${h.name}</option>`).join('');
            }
        } catch (err) { console.error('Failed to load hubs', err); }
    },

    selectType(type) {
        this.selectedType = type;
        this.renderStep2(type);
        this._loadHubs();
    },

    renderStep1() {
        const body = document.getElementById('report-modal-body');
        body.innerHTML = `
            <div class="text-center mb-8">
                <h2 class="text-3xl font-black brand-font mb-2">New Report</h2>
                <p class="text-slate-400 text-sm">What would you like to report?</p>
                <div class="step-indicator mt-6 max-w-xs mx-auto">
                    <div class="step-dot active">1</div>
                    <div class="step-line"></div>
                    <div class="step-dot inactive">2</div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="report-type-card" onclick="ui.selectType('lost')">
                    <div class="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto mb-3 text-2xl">🔍</div>
                    <p class="font-black text-sm uppercase text-rose-400 mb-1">I Lost</p>
                    <p class="text-xs text-slate-400 font-medium">An Item</p>
                    <p class="text-[10px] text-slate-600 mt-2">Report a lost wallet, phone, keys, etc.</p>
                </div>
                <div class="report-type-card" onclick="ui.selectType('found')">
                    <div class="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-500 mx-auto mb-3 text-2xl">📦</div>
                    <p class="font-black text-sm uppercase text-teal-400 mb-1">I Found</p>
                    <p class="text-xs text-slate-400 font-medium">Something</p>
                    <p class="text-[10px] text-slate-600 mt-2">Report an item you found and want to return.</p>
                </div>
                <div class="report-type-card" onclick="ui.selectType('person_missing')">
                    <div class="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 mx-auto mb-3 text-2xl">👤</div>
                    <p class="font-black text-sm uppercase text-orange-400 mb-1">Missing</p>
                    <p class="text-xs text-slate-400 font-medium">Person</p>
                    <p class="text-[10px] text-slate-600 mt-2">Report a missing family member or friend.</p>
                </div>
                <div class="report-type-card" onclick="ui.selectType('person_found')">
                    <div class="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 mx-auto mb-3 text-2xl">🤝</div>
                    <p class="font-black text-sm uppercase text-purple-400 mb-1">Found</p>
                    <p class="text-xs text-slate-400 font-medium">Someone</p>
                    <p class="text-[10px] text-slate-600 mt-2">Report a person you found who needs help.</p>
                </div>
            </div>
            <button onclick="ui.closeReportModal()" class="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-3 rounded-2xl transition-all">Cancel</button>
        `;
        lucide.createIcons();
    },

    selectType(type) {
        this.selectedType = type;
        this.currentStep = 2;
        this.renderStep2(type);
        // Reload hubs for step 2
        this.openReportModal(type);
    },

    renderStep2(type) {
        const labels = { lost: 'Lost Item', found: 'Found Item', person_missing: 'Missing Person', person_found: 'Found Someone' };
        const colors = { lost: 'rose', found: 'teal', person_missing: 'orange', person_found: 'purple' };
        const color = colors[type] || 'teal';
        const isItem = type === 'lost' || type === 'found';
        const showSecret = type === 'lost';
        const body = document.getElementById('report-modal-body');

        body.innerHTML = `
            <div class="mb-8">
                <div class="flex items-center gap-3 mb-4">
                    <button onclick="ui.renderStep1()" class="text-slate-400 hover:text-white transition-colors p-1">
                        <i data-lucide="arrow-left" class="w-5 h-5"></i>
                    </button>
                    <div>
                        <h2 class="text-3xl font-black brand-font">${labels[type]}</h2>
                        <p class="text-slate-400 text-sm font-medium">Fill in the details — AI will scan for matches.</p>
                    </div>
                </div>
                <div class="step-indicator max-w-xs">
                    <div class="step-dot inactive">1</div>
                    <div class="step-line done"></div>
                    <div class="step-dot active">2</div>
                </div>
            </div>

            <form id="report-form" onsubmit="ui.handleReportSubmit(event)" class="space-y-6">
                <input type="hidden" name="report_type" value="${type}">

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-5">
                        <div class="space-y-2">
                            <label class="text-xs font-black uppercase text-slate-500 ml-1">${isItem ? 'Item Title' : "Person's Name / Description"}</label>
                            <input type="text" name="title" required placeholder="${isItem ? 'e.g. Black Leather Wallet' : 'e.g. Ahmad Raza, 35yrs, black jacket'}" class="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl focus:ring-2 focus:ring-${color}-500 outline-none transition-all">
                        </div>

                        ${isItem ? `
                        <div class="space-y-2">
                            <label class="text-xs font-black uppercase text-slate-500 ml-1">Category</label>
                            <select name="category" required class="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl focus:ring-2 focus:ring-${color}-500 outline-none transition-all">
                                <option value="wallet">Wallet / Purse</option>
                                <option value="phone">Smartphone / Tablet</option>
                                <option value="keys">Keys</option>
                                <option value="bag">Bag / Backpack</option>
                                <option value="documents">ID / Documents</option>
                                <option value="other">Other Item</option>
                            </select>
                        </div>
                        ` : `<input type="hidden" name="category" value="person">`}

                        <div class="space-y-2">
                            <label class="text-xs font-black uppercase text-slate-500 ml-1">Location Hub</label>
                            <select name="location_hub_id" id="hub-select" required class="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl focus:ring-2 focus:ring-${color}-500 outline-none transition-all">
                                <option value="">Loading hubs...</option>
                            </select>
                        </div>

                        <div class="space-y-2">
                            <label class="text-xs font-black uppercase text-slate-500 ml-1">${isItem ? 'Sub-Location' : 'Last Seen / Found At'}</label>
                            <input type="text" name="location_name" placeholder="e.g. Near Cafeteria, Gate 2" class="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl focus:ring-2 focus:ring-${color}-500 outline-none transition-all">
                        </div>
                    </div>

                    <div class="space-y-5">
                        <div class="space-y-2">
                            <label class="text-xs font-black uppercase text-slate-500 ml-1">Photo Upload</label>
                            <div class="image-preview-container" id="report-img-container" onclick="document.getElementById('report-img-input').click()">
                                <input type="file" id="report-img-input" name="image" required accept="image/*" class="hidden" onchange="ui.previewImage(event)">
                                <div class="image-preview-placeholder" id="report-img-placeholder">
                                    <i data-lucide="upload-cloud" class="w-10 h-10"></i>
                                    <p class="text-xs font-bold">Click or drag to upload</p>
                                    <p class="text-[10px] text-slate-600">JPEG / PNG, max 10MB</p>
                                </div>
                                <img id="report-img-preview" class="hidden w-full h-full object-cover" alt="Preview">
                                <div id="report-img-change" class="hidden absolute bottom-2 right-2 bg-slate-950/80 text-xs font-bold px-2 py-1 rounded-lg text-teal-400 cursor-pointer">Change</div>
                            </div>
                        </div>

                        <div class="space-y-2">
                            <label class="text-xs font-black uppercase text-slate-500 ml-1">Description</label>
                            <textarea name="description" placeholder="${isItem ? 'Color, brand, unique marks...' : 'Age, clothing, circumstances...'}" rows="4" class="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl focus:ring-2 focus:ring-${color}-500 outline-none transition-all resize-none"></textarea>
                        </div>
                    </div>
                </div>

                ${showSecret ? `
                <div class="pt-4 border-t border-slate-800 space-y-4">
                    <div class="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/20 flex items-start gap-3">
                        <i data-lucide="shield-check" class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"></i>
                        <div>
                            <p class="text-xs font-bold text-amber-500 uppercase mb-0.5">Ownership Verification</p>
                            <p class="text-[10px] text-slate-400">Founders must answer this to prove they have your item.</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <label class="text-xs font-black uppercase text-slate-500 ml-1">Secret Question</label>
                            <input type="text" name="secret_question" required placeholder="e.g. What is written inside?" class="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all">
                        </div>
                        <div class="space-y-2">
                            <label class="text-xs font-black uppercase text-slate-500 ml-1">Secret Answer</label>
                            <input type="text" name="secret_answer" required placeholder="e.g. My name 'Ali'" class="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all">
                        </div>
                    </div>
                </div>
                ` : ''}

                <div class="flex gap-4">
                    <button type="button" onclick="ui.renderStep1()" class="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl transition-all">← Back</button>
                    <button type="submit" class="flex-[2] bg-gradient-to-r from-${color}-500 to-${color === 'teal' ? 'cyan' : color}-400 text-${color === 'lost' ? 'white' : 'slate-950'} font-black py-4 rounded-2xl shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all">
                        Submit to AI →
                    </button>
                </div>
            </form>
        `;
        lucide.createIcons();
    },

    previewImage(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const preview = document.getElementById('report-img-preview');
            const placeholder = document.getElementById('report-img-placeholder');
            const change = document.getElementById('report-img-change');
            if (preview) {
                preview.src = ev.target.result;
                preview.classList.remove('hidden');
                if (placeholder) placeholder.classList.add('hidden');
                if (change) change.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    },

    closeReportModal() {
        document.getElementById('report-modal').classList.add('hidden');
    },

    async handleReportSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const imageFile = formData.get('image');
        if (!imageFile || !imageFile.name) {
            utils.toast('Please upload an image.', 'error');
            return;
        }
        utils.spin(true);
        try {
            const res = await api.post('/reports', formData, true);
            utils.toast('Report submitted! AI is scanning...');
            this.closeReportModal();
            if (res.matches && res.matches.length > 0) {
                utils.toast(`Found ${res.matches.length} potential match(es)! Check My Matches.`, 'success');
            }
            notificationsPanel.loadCount();
            router.navigate('my-reports');
        } catch (err) { utils.toast(err.message, 'error'); } finally { utils.spin(false); }
    },

    async claimMatch(matchId) {
        utils.spin(true);
        try {
            const res = await api.post(`/matches/${matchId}/claim`);
            this.openVerifyModal(matchId, res.secret_question, res.attempts_remaining);
        } catch (err) {
            utils.toast(err.message, 'error');
        } finally {
            utils.spin(false);
        }
    },

    openVerifyModal(matchId, question, remaining) {
        const modal = document.getElementById('verify-modal');
        document.getElementById('verify-match-id').value = matchId;
        document.getElementById('verify-question').textContent = question || 'No question set';
        document.getElementById('verify-remaining').textContent = remaining;
        modal.classList.remove('hidden');
    },

    closeVerifyModal() { document.getElementById('verify-modal').classList.add('hidden'); },

    async handleVerifySubmit(e) {
        e.preventDefault();
        const matchId = e.target.match_id.value;
        const answer = e.target.answer.value;
        utils.spin(true);
        try {
            const res = await api.post(`/matches/${matchId}/verify`, { answer });
            if (res.success) {
                utils.toast('Verification successful! Check your notifications for contact info.', 'success');
                this.closeVerifyModal();
                notificationsPanel.loadCount();
                router.navigate('my-matches');
            } else {
                utils.toast(res.message, 'error');
                document.getElementById('verify-remaining').textContent = res.attempts_remaining;
            }
        } catch (err) { utils.toast(err.message, 'error'); } finally { utils.spin(false); }
    },

    async resolveMatch(matchId) {
        if (!confirm('Mark this match as resolved? Both reports will be closed.')) return;
        utils.spin(true);
        try {
            await api.patch(`/matches/${matchId}/resolve`);
            utils.toast('Item successfully returned! Case resolved.');
            router.navigate('dashboard');
        } catch (err) { utils.toast(err.message, 'error'); } finally { utils.spin(false); }
    },

    async rejectMatch(matchId) {
        if (!confirm('Are you sure you want to discard this match? It will be permanently removed from your view.')) return;
        utils.spin(true);
        try {
            await api.patch(`/matches/${matchId}/reject`);
            utils.toast('Match discarded.', 'success');
            matchesPage.render();
        } catch (err) {
            utils.toast(err.message, 'error');
        } finally {
            utils.spin(false);
        }
    },

    async notifyPersonMatch(matchId) {
        if (!confirm('Are you sure you want to accept this match? Your contact information will be shared with the other party.')) return;
        utils.spin(true);
        try {
            await api.post(`/matches/${matchId}/notify_person`);
            utils.toast('Match accepted! Check notifications for contact info.', 'success');
            matchesPage.render();
            notificationsPanel.loadCount();
        } catch (err) {
            utils.toast(err.message, 'error');
        } finally {
            utils.spin(false);
        }
    }
};

const landingPage = {
    render() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-12 animate-in fade-in zoom-in duration-700">
                <div class="space-y-6 max-w-4xl">
                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-black uppercase tracking-widest mb-4">
                        <i data-lucide="zap" class="w-4 h-4"></i> AI-Powered Reconnection
                    </div>
                    <h1 class="text-6xl md:text-8xl font-black brand-font tracking-tight leading-tight">
                        Lahore's Smartest <br/>
                        <span class="text-teal-400 italic">Lost & Found</span>
                    </h1>
                    <p class="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        Milaap uses advanced computer vision to match lost belongings and missing persons instantly. No more scrolling — just finding.
                    </p>
                </div>
                <div class="flex flex-col sm:flex-row gap-6 w-full max-w-md">
                    <button onclick="auth.showRegister()" class="flex-1 teal-gradient text-slate-950 font-black py-5 rounded-2xl text-lg shadow-2xl shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all">Get Started</button>
                    <button onclick="auth.showLogin()" class="flex-1 bg-slate-800 text-white font-black py-5 rounded-2xl text-lg border border-slate-700 hover:bg-slate-700 transition-all">Login</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl pt-12">
                    ${this.renderFeature('Visual AI Search', 'CLIP AI matches images based on visual features, not just keywords.', 'camera')}
                    ${this.renderFeature('Lahore Hubs', 'Pinpointed locations at ITU, FAST, LUMS and more.', 'map-pin')}
                    ${this.renderFeature('Secure Claim', 'Secret Q&A verification ensures items return to real owners.', 'shield-check')}
                </div>
            </div>
        `;
        lucide.createIcons();
    },
    renderFeature(title, desc, icon) {
        return `
            <div class="p-8 card-glass rounded-3xl border border-slate-800 text-left space-y-4 group hover:border-teal-500/30 transition-all">
                <div class="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform"><i data-lucide="${icon}"></i></div>
                <h3 class="text-xl font-bold">${title}</h3>
                <p class="text-sm text-slate-400 leading-relaxed">${desc}</p>
            </div>
        `;
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const hashPage = window.location.hash.replace('#', '');

    if (api.isAuthenticated()) {
        try {
            // Proactively sync user profile into localStorage to avoid stale cache issues
            const data = await api.get('/users/me/dashboard');
            if (data && data.user) {
                if (data.user.id) localStorage.setItem('milaap_user_id', data.user.id);
                localStorage.setItem('milaap_user_name', data.user.name);
                localStorage.setItem('milaap_is_admin', data.user.is_admin);
            }
        } catch (err) {
            console.error('Failed to sync profile on load', err);
        }

        const isAdmin = localStorage.getItem('milaap_is_admin') === 'true';
        if (hashPage && router.routes[hashPage]) {
            router.navigate(hashPage);
        } else {
            router.navigate(isAdmin ? 'admin' : 'dashboard');
        }
        notificationsPanel.loadCount();
    } else {
        if (hashPage === 'register') { router.navigate('register'); }
        else { router.navigate('landing'); }
    }
});
