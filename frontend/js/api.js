// API Service Wrapper
const api = {
    baseUrl: (window.location.port === '8000' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? window.location.origin
        : 'http://127.0.0.1:8000',
    
    getToken: () => localStorage.getItem('milaap_token'),
    setToken: (token) => localStorage.setItem('milaap_token', token),
    removeToken: () => localStorage.removeItem('milaap_token'),
    isAuthenticated: () => !!localStorage.getItem('milaap_token'),

    async request(endpoint, method = 'GET', body = null, isMultipart = false) {
        const headers = {};
        if (!isMultipart) headers['Content-Type'] = 'application/json';
        
        const token = this.getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const options = { method, headers };
        if (body) options.body = isMultipart ? body : JSON.stringify(body);

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, options);
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Something went wrong');
            return data;
        } catch (err) {
            console.error(`API Error [${method} ${endpoint}]:`, err);
            throw err;
        }
    },

    get(endpoint) { return this.request(endpoint, 'GET'); },
    post(endpoint, body, isMultipart = false) { return this.request(endpoint, 'POST', body, isMultipart); },
    patch(endpoint, body) { return this.request(endpoint, 'PATCH', body); },
    delete(endpoint) { return this.request(endpoint, 'DELETE'); }
};
