// VIP FARUK 999 - Secure Configuration
const PROXY_URL = '/api/proxy';
const AIRTABLE_BASE_URL = 'https://api.airtable.com/v0/appyns7Hg147GniSq/tbls64uNeAgvXrZge';

const CONFIG = {
    API: { PROXY_URL, BASE_URL: AIRTABLE_BASE_URL },
    SECURITY: { SESSION_TIMEOUT: 3600000 },
    HIERARCHY: {
        PERMISSIONS: {
            god: ['create_all', 'create_admin', 'create_seller', 'create_reseller', 'create_user'],
            admin: ['create_seller', 'create_reseller', 'create_user'],
            seller: ['create_reseller', 'create_user'],
            reseller: ['create_user']
        }
    },
    CREDITS: {
        PRICING: { '0.08333': 0.5, '1': 1, '24': 2, '168': 5, '360': 10, '720': 20, '9999': 100 },
        DEVICE_MULTIPLIER: { 'single': 1, 'double': 2, 'unlimited': 3 }
    }
};

function validateSession() {
    const session = localStorage.getItem('vip_session');
    if (!session) return null;
    try {
        const data = JSON.parse(atob(session));
        if (Date.now() - data.timestamp > CONFIG.SECURITY.SESSION_TIMEOUT) {
            localStorage.removeItem('vip_session'); return null;
        }
        return data;
    } catch (e) { localStorage.removeItem('vip_session'); return null; }
}

function createSession(userData) {
    localStorage.setItem('vip_session', btoa(JSON.stringify({ user: userData, timestamp: Date.now() })));
}
