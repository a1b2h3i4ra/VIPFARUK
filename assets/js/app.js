// VIP FARUK 999 - Secure Application Logic (v2 - With Improved Error Handling)

async function secureFetch(url, options = {}) {
    const headers = { ...options.headers, 'Content-Type': 'application/json', 'x-airtable-url': url };
    return fetch(CONFIG.API.PROXY_URL, { ...options, headers, body: options.body ? JSON.stringify(options.body) : null });
}

class VIPAdminPanel {
    constructor() { this.currentUser = null; this.allUsers = []; this.config = CONFIG; this.init(); }
    init() { this.setupEventListeners(); this.checkExistingSession(); }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('loginUsername').value.trim();
                const password = document.getElementById('loginPassword').value;
                if (!username || !password) { this.showError(document.getElementById('loginError'), 'Please enter both username and password'); return; }
                
                const loginButton = loginForm.querySelector('button');
                loginButton.disabled = true; loginButton.textContent = 'Authenticating...';

                try {
                    const result = await this.authenticateUser(username, password);
                    if (result.success) {
                        createSession(result.user); this.currentUser = result.user;
                        document.getElementById('loginError').style.display = 'none';
                        document.getElementById('loginSection').style.display = 'none';
                        document.getElementById('dashboardSection').style.display = 'block';
                        this.setupPermissions(); await this.loadUsers();
                        this.showNotification('Login successful', 'success');
                    } else { this.showError(document.getElementById('loginError'), result.message); }
                } catch (error) { this.showError(document.getElementById('loginError'), 'A network error occurred. Please check your connection.'); } 
                finally { loginButton.disabled = false; loginButton.textContent = 'Enter VIP Panel'; }
            });
        }
        const createUserForm = document.getElementById('createUserForm');
        if (createUserForm) { createUserForm.addEventListener('submit', (e) => this.handleCreateUser(e)); }
        document.getElementById('accountType')?.addEventListener('change', () => this.updateFormVisibility());
        document.getElementById('expiryPeriod')?.addEventListener('change', () => this.updateCreateButtonText());
        document.getElementById('deviceType')?.addEventListener('change', () => this.updateCreateButtonText());
        document.getElementById('creditsToGive')?.addEventListener('input', () => this.updateCreateButtonText());
    }

    checkExistingSession() {
        const session = validateSession();
        if (session && session.user) {
            this.currentUser = session.user;
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('dashboardSection').style.display = 'block';
            this.setupPermissions(); this.loadUsers();
        }
    }

    async authenticateUser(username, password) {
        try {
            const url = `${this.config.API.BASE_URL}?filterByFormula={Username}='${encodeURIComponent(username)}'`;
            const response = await secureFetch(url);
            const data = await response.json();

            if (!response.ok) {
                console.error("Login Error from server:", data);
                if (data.error && data.error.includes("API Token is not configured")) return { success: false, message: data.error };
                if (response.status === 404) return { success: false, message: 'Database Error. Check your Base ID and Table ID in config.js.' };
                return { success: false, message: `Server Error: ${data.error?.message || response.statusText}` };
            }
            if (!data.records || data.records.length === 0) { return { success: false, message: 'Invalid access key or username not found.' }; }
            const user = data.records[0].fields;
            if (user.Password !== password) { return { success: false, message: 'Invalid password.' }; }
            const allowedTypes = ['god', 'admin', 'seller', 'reseller'];
            if (!allowedTypes.includes(user.AccountType)) { return { success: false, message: 'Access Denied. Your account type cannot log into the panel.' }; }
            return { success: true, user: { username: user.Username, accountType: user.AccountType, credits: user.Credits || 0, recordId: data.records[0].id } };
        } catch (error) { console.error('Authentication process error:', error); return { success: false, message: 'A network error occurred. Could not connect to the server.' }; }
    }
    
    setupPermissions() {
        if (!this.currentUser) return;
        const userType = this.currentUser.accountType; const permissions = this.config.HIERARCHY.PERMISSIONS[userType] || [];
        document.getElementById('userTypeBadge').textContent = userType.toUpperCase();
        document.getElementById('welcomeUser').textContent = `Welcome, ${userType} ${this.currentUser.username}`;
        if (userType === 'god' || userType === 'admin') { document.getElementById('creditsBadge').style.display = 'none'; } 
        else { document.getElementById('creditsBadge').style.display = 'block'; document.getElementById('userCredits').textContent = this.currentUser.credits; }
        const deviceTypeEl = document.getElementById('deviceType');
        if (permissions.includes('create_all')) { deviceTypeEl.innerHTML = `<option value="single">Single Device</option><option value="double">Double Device</option><option value="unlimited">Unlimited Devices</option>`; } 
        else { deviceTypeEl.innerHTML = `<option value="single">Single Device</option><option value="double">Double Device</option>`; }
        const accountTypeEl = document.getElementById('accountType'); let options = '<option value="user">User</option>';
        if (permissions.includes('create_reseller')) options += '<option value="reseller">Reseller</option>';
        if (permissions.includes('create_seller')) options += '<option value="seller">Seller</option>';
        if (permissions.includes('create_all')) options += '<option value="admin">Admin</option>';
        accountTypeEl.innerHTML = options; this.updateFormVisibility(); this.updateCreateButtonText();
    }

    updateFormVisibility() {
        if (!this.currentUser) return;
        const accountType = document.getElementById('accountType').value;
        const creditsGroup = document.getElementById('creditsGroup');
        const showCredits = (accountType === 'reseller' || accountType === 'seller') && (this.currentUser.accountType !== 'user' && this.currentUser.accountType !== 'reseller');
        creditsGroup.style.display = showCredits ? 'block' : 'none';
    }

    updateCreateButtonText() {
        const createBtn = document.getElementById('createUserBtn'); if (!createBtn || !this.currentUser) return;
        const accountType = document.getElementById('accountType').value;
        if (this.currentUser.accountType === 'god' || this.currentUser.accountType === 'admin') { createBtn.textContent = `Create ${accountType}`; return; }
        if (accountType === 'reseller' || accountType === 'seller') { const creditsToGive = document.getElementById('creditsToGive').value || '0'; createBtn.textContent = `Create ${accountType} (-${creditsToGive} Credits)`; } 
        else { const expiryPeriod = document.getElementById('expiryPeriod').value; const deviceType = document.getElementById('deviceType').value; const cost = this.calculateCreditCost(expiryPeriod, deviceType); createBtn.textContent = `Create User (-${cost} Credits)`; }
    }

    calculateCreditCost(expiryPeriod, deviceType) {
        if (this.currentUser.accountType === 'god' || this.currentUser.accountType === 'admin') return 0;
        const baseCost = this.config.CREDITS.PRICING[expiryPeriod] || 0;
        const multiplier = this.config.CREDITS.DEVICE_MULTIPLIER[deviceType] || 1; return baseCost * multiplier;
    }

    async handleCreateUser(e) {
        e.preventDefault(); const userData = { username: document.getElementById('newUsername').value.trim(), password: document.getElementById('newPassword').value, expiryPeriod: document.getElementById('expiryPeriod').value, deviceType: document.getElementById('deviceType').value, accountType: document.getElementById('accountType').value, creditsToGive: parseInt(document.getElementById('creditsToGive').value) || 0, };
        if (!userData.username || !userData.password) { this.showNotification('Username and password are required', 'error'); return; }
        try { await this.createUser(userData); document.getElementById('createUserForm').reset(); await this.loadUsers(); this.showNotification('User created successfully', 'success'); this.updateCreateButtonText(); } 
        catch (error) { this.showNotification(`Failed to create user: ${error.message}`, 'error'); }
    }

    async createUser(userData) {
        let creditCost = 0;
        if (this.currentUser.accountType !== 'god' && this.currentUser.accountType !== 'admin') {
            creditCost = (userData.accountType === 'reseller' || userData.accountType === 'seller') ? userData.creditsToGive : this.calculateCreditCost(userData.expiryPeriod, userData.deviceType);
            if (this.currentUser.credits < creditCost) { throw new Error('Insufficient credits.'); }
        }
        let expiryTimestamp; const period = parseFloat(userData.expiryPeriod);
        if (period === 9999) { expiryTimestamp = '9999'; } else { const seconds = Math.floor(period * 3600); expiryTimestamp = Math.floor(Date.now() / 1000) + seconds; }
        const newUser = { records: [{ fields: { AccountType: userData.accountType, Username: userData.username, Password: userData.password, Expiry: expiryTimestamp.toString(), Device: userData.deviceType, Credits: (userData.accountType === 'reseller' || userData.accountType === 'seller') ? userData.creditsToGive : 0, CreatedBy: this.currentUser.username, } }] };
        const response = await secureFetch(this.config.API.BASE_URL, { method: 'POST', body: newUser });
        if (!response.ok) throw new Error('Failed to save new user to database.');
        if (creditCost > 0) { const newCreditTotal = this.currentUser.credits - creditCost; await this.updateUserCredits(this.currentUser.recordId, newCreditTotal); this.currentUser.credits = newCreditTotal; document.getElementById('userCredits').textContent = newCreditTotal; }
    }

    async loadUsers() {
        document.getElementById('loadingUsers').style.display = 'block';
        try { let url = this.config.API.BASE_URL;
            if (this.currentUser.accountType === 'admin') { url += `?filterByFormula=NOT({AccountType}='god')`; } 
            else if (this.currentUser.accountType !== 'god') { url += `?filterByFormula={CreatedBy}='${this.currentUser.username}'`; }
            const response = await secureFetch(url); if (!response.ok) throw new Error('Could not fetch user list.');
            const data = await response.json(); this.allUsers = data.records || []; this.renderUsersTable(); this.updateStats();
        } catch (error) { this.showNotification('Failed to load users: ' + error.message, 'error'); } 
        finally { document.getElementById('loadingUsers').style.display = 'none'; }
    }

    renderUsersTable() {
        const tbody = document.getElementById('usersTableBody'); tbody.innerHTML = '';
        this.allUsers.forEach(record => {
            const user = record.fields; const isExpired = user.Expiry !== '9999' && parseInt(user.Expiry) < Math.floor(Date.now() / 1000);
            const row = document.createElement('tr');
            row.innerHTML = `<td>${user.Username || ''}</td><td>${user.Password || ''}</td><td>${user.AccountType || 'user'}</td><td>${(user.AccountType === 'seller' || user.AccountType === 'reseller') ? user.Credits || 0 : '-'}</td><td>${user.Expiry === '9999' ? 'Never' : new Date(parseInt(user.Expiry) * 1000).toLocaleDateString()}</td><td>${user.Device || 'Single'}</td><td>${user.CreatedBy || ''}</td><td><span class="status-badge ${isExpired ? 'status-expired' : 'status-active'}">${isExpired ? 'Expired' : 'Active'}</span></td><td class="action-buttons"><button onclick="app.deleteUser('${record.id}', '${user.Username}')" class="action-btn btn-danger">Delete</button></td>`;
            tbody.appendChild(row);
        });
    }

    async deleteUser(recordId, username) {
        if (!confirm(`Delete user: ${username}?`)) return;
        try { const response = await secureFetch(`${this.config.API.BASE_URL}/${recordId}`, { method: 'DELETE' }); if (!response.ok) throw new Error('Server rejected the delete request.'); this.showNotification(`User ${username} deleted`, 'success'); await this.loadUsers(); } 
        catch (error) { this.showNotification('Failed to delete user: ' + error.message, 'error'); }
    }

    async updateUserCredits(recordId, newCredits) {
        const patchData = { records: [{ id: recordId, fields: { Credits: newCredits } }] };
        const response = await secureFetch(this.config.API.BASE_URL, { method: 'PATCH', body: patchData });
        if (!response.ok) throw new Error('Could not update user credits.');
    }
    
    updateStats() {
        const total = this.allUsers.length;
        const active = this.allUsers.filter(r => r.fields.Expiry === '9999' || parseInt(r.fields.Expiry) > Math.floor(Date.now() / 1000)).length;
        document.getElementById('totalUsers').textContent = total; document.getElementById('activeUsers').textContent = active;
        document.getElementById('expiredUsers').textContent = total - active; document.getElementById('resellerCount').textContent = this.allUsers.filter(r => r.fields.AccountType === 'reseller').length;
    }
    
    logout() { localStorage.removeItem('vip_session'); window.location.reload(); }
    showError(element, message) { element.textContent = message; element.style.display = 'block'; }
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification'); notification.textContent = message;
        notification.className = `notification ${type}`; notification.classList.add('show');
        setTimeout(() => notification.classList.remove('show'), 4000);
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => { app = new VIPAdminPanel(); });
function logout() { app.logout(); }
function refreshStats() { app.loadUsers(); }
