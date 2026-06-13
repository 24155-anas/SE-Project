// Page Logic - Map View
const mapPage = {
    map: null,
    hubs: [],
    selectedHubId: null,

    async render() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="h-full flex flex-col gap-6 animate-in fade-in duration-500">
                <header class="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 class="text-4xl font-extrabold brand-font mb-1">Milaap Interactive Map</h1>
                        <p class="text-slate-400 font-medium">Click on location hubs to see recent reports in that area.</p>
                    </div>
                </header>

                <div class="flex-1 min-h-[600px] flex flex-col lg:flex-row gap-8">
                    <div id="main-map" class="flex-1 card-glass border border-slate-800 shadow-2xl relative overflow-hidden">
                        <div class="absolute inset-0 flex items-center justify-center bg-slate-950 z-[1000] map-loader">
                            <div class="spinner"></div>
                        </div>
                    </div>
                    
                    <div class="w-full lg:w-96 flex flex-col gap-6">
                        <div class="card-glass p-6 rounded-3xl border border-slate-800 space-y-4">
                            <h3 class="font-bold text-lg flex items-center gap-2"><i data-lucide="map-pin" class="text-teal-400 w-5 h-5"></i> Location Hubs</h3>
                            <div class="space-y-2 max-h-48 overflow-y-auto pr-2" id="hub-list">
                                <p class="text-xs text-slate-500 italic">Loading hubs...</p>
                            </div>
                        </div>

                        <div class="flex-1 card-glass p-6 rounded-3xl border border-slate-800 flex flex-col gap-4 overflow-hidden">
                            <h3 class="font-bold text-lg flex items-center justify-between">
                                <span id="area-title">Reports in Area</span>
                                <span class="bg-slate-800 text-[10px] px-2 py-1 rounded text-teal-400" id="area-count">0</span>
                            </h3>
                            <div id="area-reports" class="flex-1 overflow-y-auto space-y-4 pr-2">
                                <div class="h-full flex flex-col items-center justify-center text-center opacity-40">
                                    <i data-lucide="info" class="w-10 h-10 mb-2"></i>
                                    <p class="text-sm font-bold">Select a pin on the map<br>to view reports</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        lucide.createIcons();
        this.initMap();
    },

    async initMap() {
        try {
            this.hubs = await api.get('/admin/hubs');
            const mapLoader = document.querySelector('.map-loader');
            
            this.map = L.map('main-map').setView([31.5204, 74.3587], 12);
            
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);

            const hubList = document.getElementById('hub-list');
            hubList.innerHTML = '';

            this.hubs.forEach(hub => {
                const marker = L.marker([hub.lat, hub.lng], {
                    icon: L.divIcon({
                        className: 'custom-div-icon',
                        html: `
                            <div class="flex flex-col items-center gap-1 scale-75 hover:scale-110 transition-transform duration-300" style="margin-top: -30px;">
                                <div class="w-10 h-10 rounded-full teal-gradient border-2 border-slate-900 shadow-xl flex items-center justify-center text-slate-950">
                                    <i data-lucide="map-pin" class="w-5 h-5"></i>
                                </div>
                                <div class="px-2.5 py-1 bg-slate-950/90 border border-teal-500/40 rounded-lg text-white font-black text-[9px] uppercase tracking-wider whitespace-nowrap shadow-lg backdrop-blur-md">
                                    ${hub.name}
                                </div>
                            </div>
                        `,
                        iconSize: [120, 70],
                        iconAnchor: [60, 35]
                    })
                }).addTo(this.map);

                marker.on('click', () => this.selectHub(hub));
                
                // Add to sidebar list
                const btn = document.createElement('button');
                btn.className = 'w-full text-left p-3 rounded-xl hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700 text-sm font-bold flex items-center gap-2 group';
                btn.innerHTML = `<i data-lucide="map-pin" class="w-4 h-4 text-slate-500 group-hover:text-teal-400"></i> ${hub.name}`;
                btn.onclick = () => {
                    this.map.flyTo([hub.lat, hub.lng], 15);
                    this.selectHub(hub);
                };
                hubList.appendChild(btn);
            });

            if (mapLoader) mapLoader.classList.add('hidden');
            lucide.createIcons();

        } catch (err) {
            utils.toast('Failed to initialize map: ' + err.message, 'error');
        }
    },

    async selectHub(hub) {
        this.selectedHubId = hub.id;
        document.getElementById('area-title').textContent = hub.name;
        const reportsContainer = document.getElementById('area-reports');
        const areaCount = document.getElementById('area-count');
        
        reportsContainer.innerHTML = '<div class="flex justify-center py-10"><div class="spinner"></div></div>';
        
        try {
            const reports = await api.get(`/reports?hub_id=${hub.id}`);
            areaCount.textContent = reports.length;
            
            if (reports.length === 0) {
                reportsContainer.innerHTML = '<div class="py-10 text-center text-slate-500 italic text-sm">No recent reports from this hub.</div>';
                return;
            }

            reportsContainer.innerHTML = reports.map(r => `
                <div class="card-glass p-4 rounded-2xl border border-slate-800 space-y-3 group cursor-pointer hover:border-teal-500/50 transition-all">
                    <div class="flex gap-4">
                        <img src="${r.image_url || 'https://placehold.co/100x100/1e293b/94a3b8?text=Image'}" class="w-16 h-16 rounded-xl object-cover">
                        <div class="flex-1">
                            <p class="text-[10px] font-black uppercase text-teal-400 mb-1">${r.report_type.replace('_', ' ')}</p>
                            <h4 class="font-bold text-sm leading-tight">${r.title}</h4>
                            <p class="text-[10px] text-slate-500 mt-1">${utils.formatDate(r.created_at)}</p>
                        </div>
                    </div>
                    <button onclick="reportDetailPage.setCurrentId('${r.id}'); router.navigate('report-detail');" class="w-full text-xs font-bold py-2 rounded-lg bg-slate-800 text-slate-400 group-hover:bg-teal-500/20 group-hover:text-teal-400 transition-colors">View Details →</button>
                </div>
            `).join('');
            
        } catch (err) {
            reportsContainer.innerHTML = `<div class="text-rose-500 text-xs p-4">${err.message}</div>`;
        }
    }
};
