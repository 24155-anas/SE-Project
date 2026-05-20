// Page Logic - Missing Persons
const personsPage = {
    currentFilter: 'person_missing',

    async render() {
        const app = document.getElementById('app');
        utils.spin(true);
        try {
            const reports = await api.get('/reports?type=person_missing&status_filter=active');
            app.innerHTML = `
                <div class="space-y-8 animate-in fade-in duration-500">
                    <header class="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div class="space-y-2">
                            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-black uppercase tracking-widest">
                                <i data-lucide="users" class="w-3 h-3"></i> Missing Persons Hub
                            </div>
                            <h1 class="text-4xl font-extrabold brand-font">Missing Persons</h1>
                            <p class="text-slate-400 font-medium">Help reunite families. Report a missing person or someone you've found.</p>
                        </div>
                        <div class="flex gap-3 flex-wrap">
                            <button onclick="personsPage.openPersonModal('person_missing')" class="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-orange-500 hover:bg-orange-400 text-white transition-all shadow-lg shadow-orange-500/20">
                                <i data-lucide="user-x" class="w-4 h-4"></i> Report Missing Person
                            </button>
                            <button onclick="personsPage.openPersonModal('person_found')" class="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all shadow-lg shadow-teal-500/20">
                                <i data-lucide="user-check" class="w-4 h-4"></i> I Found Someone
                            </button>
                        </div>
                    </header>

                    <div class="flex gap-3">
                        <button onclick="personsPage.setFilter('person_missing')" class="px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${this.currentFilter === 'person_missing' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}">Missing</button>
                        <button onclick="personsPage.setFilter('person_found')" class="px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${this.currentFilter === 'person_found' ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'}">Found Persons</button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="persons-grid">
                        ${this.renderPersons(reports)}
                    </div>
                </div>

                <!-- Person Report Modal -->
                <div id="person-modal" class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-lg hidden">
                    <div class="modal-content card-glass p-8 rounded-[2.5rem] border border-slate-800 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto relative">
                        <button onclick="personsPage.closePersonModal()" class="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><i data-lucide="x"></i></button>
                        <header class="mb-8 text-center">
                            <h2 id="person-modal-title" class="text-3xl font-black brand-font mb-2">Report Missing Person</h2>
                            <p class="text-slate-400 text-sm font-medium">Our AI will immediately scan for potential matches.</p>
                        </header>
                        <form id="person-form" onsubmit="personsPage.handleSubmit(event)" class="space-y-5">
                            <input type="hidden" name="report_type" id="person-report-type" value="person_missing">
                            <input type="hidden" name="category" value="person">
                            <div class="space-y-2">
                                <label class="text-xs font-black uppercase text-slate-500">Person's Name / Description</label>
                                <input type="text" name="title" required placeholder="e.g. Ahmad Raza, 35yrs, black jacket" class="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all">
                            </div>
                            <div class="space-y-2">
                                <label class="text-xs font-black uppercase text-slate-500">Last Seen Location / Found At</label>
                                <input type="text" name="location_name" required placeholder="e.g. Packages Mall, Lahore" class="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all">
                            </div>
                            <div class="space-y-2">
                                <label class="text-xs font-black uppercase text-slate-500">Location Hub</label>
                                <select name="location_hub_id" id="person-hub-select" class="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all">
                                    <option value="">Loading hubs...</option>
                                </select>
                            </div>
                            <div class="space-y-2">
                                <label class="text-xs font-black uppercase text-slate-500">Additional Details</label>
                                <textarea name="description" rows="3" placeholder="Age, clothing, physical features, circumstances..." class="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-none"></textarea>
                            </div>
                            <div class="space-y-2">
                                <label class="text-xs font-black uppercase text-slate-500">Photo (Required)</label>
                                <div class="image-preview-container" id="person-img-container" onclick="document.getElementById('person-img-input').click()">
                                    <input type="file" id="person-img-input" name="image" required accept="image/*" class="hidden" onchange="personsPage.previewImage(event)">
                                    <div class="image-preview-placeholder" id="person-img-placeholder">
                                        <i data-lucide="upload-cloud" class="w-10 h-10"></i>
                                        <p class="text-xs font-bold">Click to upload photo</p>
                                    </div>
                                    <img id="person-img-preview" class="hidden w-full h-full object-cover">
                                </div>
                            </div>
                            <div class="flex gap-4 pt-2">
                                <button type="button" onclick="personsPage.closePersonModal()" class="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl transition-all">Cancel</button>
                                <button type="submit" class="flex-[2] bg-orange-500 hover:bg-orange-400 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-orange-500/20">Submit Report</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            lucide.createIcons();
            this.loadHubs();
        } catch (err) {
            utils.toast(err.message, 'error');
        } finally {
            utils.spin(false);
        }
    },

    renderPersons(reports) {
        const filtered = reports.filter(r => r.report_type === this.currentFilter);
        if (filtered.length === 0) {
            return `
                <div class="col-span-full py-20 text-center card-glass rounded-3xl border-dashed border-2 border-slate-800">
                    <i data-lucide="${this.currentFilter === 'person_missing' ? 'user-x' : 'user-check'}" class="w-12 h-12 text-slate-700 mx-auto mb-4"></i>
                    <p class="text-slate-500 font-bold text-lg">No ${this.currentFilter === 'person_missing' ? 'missing persons' : 'found persons'} reported.</p>
                    <p class="text-slate-600 text-sm mt-1">Use the button above to submit a report.</p>
                </div>
            `;
        }
        return filtered.map(r => components.personCard(r)).join('');
    },

    async setFilter(type) {
        this.currentFilter = type;
        const grid = document.getElementById('persons-grid');
        if (!grid) { this.render(); return; }
        grid.innerHTML = '<div class="col-span-full flex justify-center py-10"><div class="spinner"></div></div>';
        try {
            const reports = await api.get(`/reports?type=${type}&status_filter=active`);
            grid.innerHTML = this.renderPersons(reports);
            lucide.createIcons();
        } catch (err) {
            grid.innerHTML = `<div class="col-span-full text-rose-500 text-sm p-4">${err.message}</div>`;
        }
        document.querySelectorAll('[onclick*="setFilter"]').forEach(btn => {
            const t = btn.getAttribute('onclick').match(/'([^']+)'/)?.[1];
            if (t === type) { btn.className = btn.className.replace('bg-slate-800 text-slate-400 hover:text-white', t === 'person_missing' ? 'bg-orange-500 text-white' : 'bg-teal-500 text-slate-950'); }
            else { btn.className = btn.className.replace('bg-orange-500 text-white', 'bg-slate-800 text-slate-400 hover:text-white').replace('bg-teal-500 text-slate-950', 'bg-slate-800 text-slate-400 hover:text-white'); }
        });
    },

    async loadHubs() {
        try {
            const hubs = await api.get('/admin/hubs');
            const sel = document.getElementById('person-hub-select');
            if (sel) sel.innerHTML = '<option value="">Select a Location Hub...</option>' + hubs.map(h => `<option value="${h.id}">${h.name}</option>`).join('');
        } catch (err) { console.error('Failed to load hubs', err); }
    },

    openPersonModal(type) {
        const modal = document.getElementById('person-modal');
        const title = document.getElementById('person-modal-title');
        const typeInput = document.getElementById('person-report-type');
        const form = document.getElementById('person-form');
        if (!modal) { this.render().then(() => setTimeout(() => this.openPersonModal(type), 300)); return; }
        form.reset();
        typeInput.value = type;
        title.textContent = type === 'person_missing' ? 'Report Missing Person' : 'I Found Someone';
        document.getElementById('person-img-preview').classList.add('hidden');
        document.getElementById('person-img-placeholder').classList.remove('hidden');
        modal.classList.remove('hidden');
    },

    closePersonModal() {
        const modal = document.getElementById('person-modal');
        if (modal) modal.classList.add('hidden');
    },

    previewImage(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const preview = document.getElementById('person-img-preview');
            const placeholder = document.getElementById('person-img-placeholder');
            preview.src = ev.target.result;
            preview.classList.remove('hidden');
            placeholder.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    },

    async handleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        if (!formData.get('image') || !formData.get('image').name) {
            utils.toast('Please upload a photo.', 'error');
            return;
        }
        utils.spin(true);
        try {
            const res = await api.post('/reports', formData, true);
            utils.toast('Report submitted! AI is scanning for matches...');
            this.closePersonModal();
            if (res.matches && res.matches.length > 0) {
                utils.toast(`Found ${res.matches.length} potential match(es)! Check My Matches.`, 'success');
            }
            notificationsPanel.loadCount();
            this.render();
        } catch (err) {
            utils.toast(err.message, 'error');
        } finally {
            utils.spin(false);
        }
    }
};
