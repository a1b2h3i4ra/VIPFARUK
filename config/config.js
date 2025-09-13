// VIP FARUK 999 - Secure Configuration

// The API URL is now the proxy, not Airtable directly.
const PROXY_URL = '/api/proxy';

// The real Airtable URL is now stored here to be sent to the proxy.
const AIRTABLE_BASE_URL = 'https://api.airtable.com/v0/appyns7Hg147GniSq/tbls64uNeAgvXrZge';


const CONFIG = {
    // API Configuration
    API: {
        PROXY_URL: PROXY_URL,
        BASE_URL: AIRTABLE_BASE_URL,
    },

    // Security Settings
    SECURITY: {
        SESSION_TIMEOUT: 3600000, // 1 hour
        MAX_LOGIN_ATTEMPTS: 3,
    },

    // Application Settings
    APP: {
        NAME: 'VIP FARUK 999',
        VERSION: '2.0.0',
    },

    // Account Hierarchy & Permissions
    HIERARCHY: {
        LEVELS: ['god', 'admin', 'seller', 'reseller', 'user'],
        PERMISSIONS: {
            god: ['create_all', 'view_all', 'delete_all', 'manage_system'],
            admin: ['create_seller', 'create_reseller', 'create_user', 'view_non_god'],
            seller: ['create_reseller', 'create_user', 'view_own'],
            reseller: ['create_user', 'view_own'],
            user: []
        }
    },

    // Credit System
    CREDITS: {
        PRICING: {
            '0.08333': 0.5,  // 5 minutes
            '1': 1,          // 1 hour
            '24': 2,         // 1 day
            '168': 5,        // 7 days
            '360': 10,       // 15 days
            '720': 20,       // 30 days
            '9999': 100      // Never
        },
        DEVICE_MULTIPLIER: {
            'single': 1,
            'double': 2,
            'unlimited': 3
        }
    }
};

// --- Helper Functions ---
// These functions remain the same as they don't handle secret keys.
function validateSession() {
    const session = localStorage.getItem('vip_session');
    if (!session) return false;
    try {
        const sessionData = JSON.parse(atob(session));
        const now = Date.now();
        if (now - sessionData.timestamp > CONFIG.SECURITY.SESSION_TIMEOUT) {
            localStorage.removeItem('vip_session');
            return false;
        }
        return sessionData;
    } catch (e) {
        localStorage.removeItem('vip_session');
        return false;
    }
}

function createSession(userData) {
    const sessionData = {
        user: userData,
        timestamp: Date.now(),
    };
    localStorage.setItem('vip_session', btoa(JSON.stringify(sessionData)));
}