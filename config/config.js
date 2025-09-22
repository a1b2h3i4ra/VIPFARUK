// ARMODS - Secure Configuration (v11 - Final with New Credits)
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
        // UPDATED PRICING TO MATCH YOUR REQUIREMENTS
        PRICING: {
            '168': 0.5,      // 7 days (single)
            '360': 1,        // 15 days (single)
            '720': 2,        // 30 days (single)
            // Admin/God only options
            '0.08333': 0.5,
            '1': 1,
            '24': 2,
            '9999': 100
        },
        DEVICE_MULTIPLIER: {
            'single': 1,
            'double': 2,
            'unlimited': 4 
        }
    }
};

function validateSession() {
    const session = localStorage.getItem('armods_session');
    if (!session) return null;
    try {
        const data = JSON.parse(atob(session));
        if (Date.now() - data.timestamp > CONFIG.SECURITY.SESSION_TIMEOUT) {
            localStorage.removeItem('armods_session'); return null;
        }
        return data;
    } catch (e) { localStorage.removeItem('armods_session'); return null; }
}

function createSession(userData) {
    localStorage.setItem('armods_session', btoa(JSON.stringify({ user: userData, timestamp: Date.now() })));
}
