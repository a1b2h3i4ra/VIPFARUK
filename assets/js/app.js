// VIP FARUK 999 - Secure Application Logic (v11 - Final with all features)
class VIPAdminPanel {
    constructor() {
        this.currentUser = null;
        this.allUsers = [];
        this.config = CONFIG;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingSession();
    }

    async secureFetch(url, options = {}) {
        const fetchOptions = {
            method: options.method || 'GET',
            headers: { 'Content-Type': 'application/json', 'x-airtable-url': url },
        };
        if (options.body) { fetchOptions.body = JSON.stringify(options.body); }
        const response = await fetch(this.config.API.PROXY_URL, fetchOptions);
        const data = await response.json().catch(() => ({ error: { message: `Server returned status ${response.status}` } }));
        if (!response.ok) { throw new Error(data.error?.message || `An unknown server error occurred.`); }
        return data;
    }

    setupEventListeners() {
        document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = e.target.loginUsername.value.trim();
            const password = e.target.loginPassword.value;
            const btn = e.target.querySelector('button');
            if (!username || !password) return this.showError('Please enter both username and password');
            btn.disabled = true; btn.querySelector('span').textContent = 'Authenticating...';
            try {
                const { success, user, message } = await this.authenticateUser(username, password);
                if (success) {
                    this.currentUser = user;
                    createSession(this.currentUser);
                    document.getElementById('loginSection').style.display = 'none';
                    document.getElementById('dashboardSection').style.display = 'block';
                    await this.setupPermissions();
                    await this.loadUsers();
                    this.showNotification('Login successful', 'success');
                } else { this.showError(message); }
            } catch (error) { this.showError(`Login failed: ${error.message}`); }
            finally { btn.disabled = false; btn.querySelector('span').textContent = 'Enter VIP Panel'; }
        });
        document.getElementById('createUserForm')?.addEventListener('submit', (e) => this.handleCreateUser(e));
        document.getElementById('accountType')?.addEventListener('change', () => { this.updateFormVisibility(); this.updateCreateButtonText(); });
        ['expiryPeriod', 'deviceType', 'creditsToGive'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.updateCreateButtonText());
        });
    }

    checkExistingSession() {
        const session = validateSession();
        if (session) {
            this.currentUser = session.user;
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('dashboardSection').style.display = 'block';
            this.setupPermissions();
            this.loadUsers();
        }
    }

    async authenticateUser(username, password) {
        try {
            const url = `${this.config.API.BASE_URL}?filterByFormula={Username}='${encodeURIComponent(username)}'`;
            const data = await this.secureFetch(url);
            if (!data.records || data.records.length === 0) return { success: false, message: 'Invalid access key or username not found.' };
            const user = data.records[0].fields;
            if (user.Password !== password) return { success: false, message: 'Invalid password.' };
            const allowed = ['god', 'admin', 'seller', 'reseller'];
            if (!allowed.includes(user.AccountType)) return { success: false, message: 'Access Denied. Your account type cannot log in.' };
            return { success: true, user: { ...user, recordId: data.records[0].id } };
        } catch (error) { return { success: false, message: error.message }; }
    }

    async setupPermissions() {
        const { AccountType, Username, Credits } = this.currentUser;
        const perms = this.config.HIERARCHY.PERMISSIONS[AccountType] || [];
        document.getElementById('userTypeBadge').textContent = AccountType.toUpperCase();
        document.getElementById('welcomeUser').textContent = `Welcome, ${Username}`;
        const creditsBadge = document.getElementById('creditsBadge');
        if (AccountType === 'god' || AccountType === 'admin') { creditsBadge.style.display = 'none'; }
        else { creditsBadge.style.display = 'block'; document.getElementById('userCredits').textContent = Credits; }
        
        const expiryEl = document.getElementById('expiryPeriod');
        if (AccountType === 'god' || AccountType === 'admin') {
            expiryEl.innerHTML = `<option value="0.08333">5 Minutes</option><option value="1">1 Hour</option><option value="24">1 Day</option><option value="168" selected>7 Days</option><option value="360">15 Days</option><option value="720">30 Days</option><option value="9999">Never</option>`;
        } else {
            expiryEl.innerHTML = `<option value="168" selected>7 Days</option><option value="360">15 Days</option><option value="720">30 Days</option>`;
        }

        document.getElementById('deviceType').innerHTML = perms.includes('create_all') ? `<option value="single">Single</option><option value="double">Double</option><option value="unlimited">Unlimited</option>` : `<option value="single">Single</option><option value="double">Double</option>`;
        let options = '<option value="user">User</option>';
        if (perms.includes('create_reseller')) options += '<option value="reseller">Reseller</option>';
        if (perms.includes('create_seller')) options += '<option value="seller">Seller</option>';
        if (perms.includes('create_all')) options += '<option value="admin">Admin</option>';
        document.getElementById('accountType').innerHTML = options;
        this.updateFormVisibility();
        this.updateCreateButtonText();
    }
    
    updateFormVisibility() {
        const accountType = document.getElementById('accountType').value;
        const isPrivileged = ['admin', 'seller', 'reseller'].includes(accountType);
        document.getElementById('creditsGroup').style.display = isPrivileged ? 'block' : 'none';
        document.getElementById('expiryPeriod').parentElement.style.display = isPrivileged ? 'none' : 'block';
        document.getElementById('deviceType').parentElement.style.display = isPrivileged ? 'none' : 'block';
    }

    updateCreateButtonText() {
        const btnText = document.getElementById('createUserBtn').querySelector('span');
        const { AccountType } = this.currentUser;
        const selectedType = document.getElementById('accountType').value;
        if (AccountType === 'god' || AccountType === 'admin') {
            btnText.textContent = `Create ${selectedType}`;
            return;
        }
        const isPrivileged = ['admin', 'seller', 'reseller'].includes(selectedType);
        const cost = isPrivileged ? (document.getElementById('creditsToGive').value || '0') : this.calculateCreditCost();
        btnText.textContent = `Create ${selectedType} (-${cost} Credits)`;
    }
    
    calculateCreditCost() {
        const { PRICING, DEVICE_MULTIPLIER } = this.config.CREDITS;
        const period = document.getElementById('expiryPeriod').value;
        const device = document.getElementById('deviceType').value;
        return (PRICING[period] || 0) * (DEVICE_MULTIPLIER[device] || 1);
    }
    
    async handleCreateUser(e) {
        e.preventDefault();
        const form = e.target;
        const userData = {
            Username: form.newUsername.value.trim(), Password: form.newPassword.value,
            Expiry: form.expiryPeriod.value, Device: form.deviceType.value,
            AccountType: form.accountType.value, Credits: parseInt(form.creditsToGive.value) || 0,
        };
        if (!userData.Username || !userData.Password) return this.showNotification('Username and password are required', 'error');
        try {
            await this.createUser(userData);
            form.reset(); this.updateFormVisibility(); this.updateCreateButtonText();
            await this.loadUsers();
            this.showNotification('User created successfully', 'success');
        } catch (error) { this.showNotification(`Failed to create user: ${error.message}`, 'error'); }
    }

    async createUser(userData) {
        let cost = 0;
        const isPrivileged = ['admin', 'seller', 'reseller'].includes(userData.AccountType);
        if (this.currentUser.AccountType !== 'god' && this.currentUser.AccountType !== 'admin') {
            cost = isPrivileged ? userData.Credits : this.calculateCreditCost();
            if (this.currentUser.Credits < cost) throw new Error('Insufficient credits.');
        }
        userData.Expiry = isPrivileged ? '9999' : String(Math.floor(Date.now() / 1000) + (parseFloat(userData.Expiry) * 3600));
        userData.CreatedBy = this.currentUser.Username;
        userData.HWID = ''; userData.HWID2 = '';
        await this.secureFetch(this.config.API.BASE_URL, { method: 'POST', body: { records: [{ fields: userData }] } });
        if (cost > 0) {
            this.currentUser.Credits -= cost;
            await this.updateUserCredits(this.currentUser.recordId, this.currentUser.Credits);
            document.getElementById('userCredits').textContent = this.currentUser.Credits;
        }
    }

    async loadUsers() {
        document.getElementById('loadingUsers').style.display = 'block';
        try {
            let url = this.config.API.BASE_URL;
            if (this.currentUser.AccountType === 'admin') url += `?filterByFormula=NOT({AccountType}='god')`;
            else if (this.currentUser.AccountType !== 'god') url += `?filterByFormula={CreatedBy}='${encodeURIComponent(this.currentUser.Username)}'`;
            const data = await this.secureFetch(url); this.allUsers = data.records || [];
            this.renderUsersTable(); this.updateStats();
        } catch (error) { this.showNotification('Failed to load users: ' + error.message, 'error'); }
        finally { document.getElementById('loadingUsers').style.display = 'none'; }
    }

    renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';
        this.allUsers.forEach(({ id, fields: user }) => {
            const isExpired = user.Expiry !== '9999' && parseInt(user.Expiry) < Math.floor(Date.now() / 1000);
            const row = tbody.insertRow();
            
            let creditButton = '';
            if ((this.currentUser.AccountType === 'god' || this.currentUser.AccountType === 'admin' || this.currentUser.AccountType === 'seller') && (user.AccountType === 'seller' || user.AccountType === 'reseller')) {
                creditButton = `<button onclick="app.giveCredits('${id}', '${user.Username}')" class="action-btn" style="background-color: var(--success);">Give Credits</button>`;
            }

            row.innerHTML = `
                <td>${user.Username || ''}</td><td>${user.Password || ''}</td>
                <td>${user.AccountType || 'user'}</td><td>${(user.AccountType === 'seller' || user.AccountType === 'reseller') ? user.Credits || 0 : '-'}</td>
                <td>${user.Expiry === '9999' ? 'Never' : new Date(parseInt(user.Expiry) * 1000).toLocaleDateString()}</td>
                <td>${user.Device || 'Single'}</td><td>${user.HWID ? 'SET' : 'NONE'}</td>
                <td>${user.CreatedBy || ''}</td>
                <td><span class="status-badge ${isExpired ? 'status-expired' : 'status-active'}">${isExpired ? 'Expired' : 'Active'}</span></td>
                <td class="action-buttons">
                    ${creditButton}
                    <button onclick="app.resetHWID('${id}', '${user.Username}')" class="action-btn btn-warning">Reset HWID</button>
                    <button onclick="app.deleteUser('${id}', '${user.Username}')" class="action-btn btn-danger">Delete</button>
                </td>`;
        });
    }

    async giveCredits(recordId, username) {
        const amountStr = prompt(`How many credits to give to ${username}?`);
        if (!amountStr) return;
        const amount = parseInt(amountStr);
        if (isNaN(amount) || amount <= 0) return this.showNotification('Invalid credit amount.', 'error');
        if (this.currentUser.AccountType !== 'god' && this.currentUser.AccountType !== 'admin' && this.currentUser.Credits < amount) {
            return this.showNotification('Insufficient credits.', 'error');
        }
        try {
            const targetUser = this.allUsers.find(u => u.id === recordId).fields;
            const newCreditTotal = (targetUser.Credits || 0) + amount;
            await this.updateUserCredits(recordId, newCreditTotal);
            if (this.currentUser.AccountType !== 'god' && this.currentUser.AccountType !== 'admin') {
                this.currentUser.Credits -= amount;
                await this.updateUserCredits(this.currentUser.recordId, this.currentUser.Credits);
                document.getElementById('userCredits').textContent = this.currentUser.Credits;
            }
            this.showNotification(`Successfully gave ${amount} credits to ${username}`, 'success');
            await this.loadUsers();
        } catch (error) { this.showNotification(`Failed to give credits: ${error.message}`, 'error'); }
    }

    async resetHWID(recordId, username) {
        if (!confirm(`Reset HWID for ${username}?`)) return;
        try {
            await this.secureFetch(this.config.API.BASE_URL, { method: 'PATCH', body: { records: [{ id: recordId, fields: { HWID: '', HWID2: '' } }] } });
            this.showNotification(`HWID reset for ${username}`, 'success');
            const row = [...document.getElementById('usersTableBody').rows].find(r => r.cells[0].textContent === username);
            if (row) row.cells[6].textContent = 'NONE';
        } catch (error) { this.showNotification(`Failed to reset HWID: ${error.message}`, 'error'); }
    }

    async deleteUser(recordId, username) {
        if (!confirm(`Delete user ${username}?`)) return;
        try {
            await this.secureFetch(`${this.config.API.BASE_URL}/${recordId}`, { method: 'DELETE' });
            this.showNotification(`User ${username} deleted`, 'success');
            await this.loadUsers();
        } catch (error) { this.showNotification(`Failed to delete user: ${error.message}`, 'error'); }
    }

    async updateUserCredits(recordId, newCredits) {
        await this.secureFetch(this.config.API.BASE_URL, { method: 'PATCH', body: { records: [{ id: recordId, fields: { Credits: newCredits } }] } });
    }
    
    updateStats() {
        const total = this.allUsers.length;
        const active = this.allUsers.filter(({ fields }) => fields.Expiry === '9999' || parseInt(fields.Expiry) > Date.now() / 1000).length;
        document.getElementById('totalUsers').textContent = total;
        document.getElementById('activeUsers').textContent = active;
        document.getElementById('expiredUsers').textContent = total - active;
        document.getElementById('resellerCount').textContent = this.allUsers.filter(({ fields }) => fields.AccountType === 'reseller').length;
    }
    
    logout() { localStorage.removeItem('vip_session'); window.location.reload(); }
    showError(message) { const el = document.getElementById('loginError'); el.textContent = message; el.style.display = 'block'; }
    showNotification(message, type) {
        const el = document.getElementById('notification');
        el.textContent = message; el.className = `notification ${type} show`;
        setTimeout(() => el.classList.remove('show'), 3000);
    }
}
const app = new VIPAdminPanel();
