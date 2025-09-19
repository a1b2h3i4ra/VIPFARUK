// VIP FARUK 999 - Secure Application Logic (v16 - Auto-Delete Expired Users)
class VIPAdminPanel {
    constructor() {
        this.currentUser = null;
        this.allUsers = [];
        this.config = CONFIG;
        this.loginUsername = null; 
        this.resetUsername = null; 
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingSession();
    }

    async secureFetch(url, options = {}) {
        const fetchOptions = {
            method: options.method || 'GET',
            headers: { 'Content-Type': 'application/json' },
        };
        if (!url.startsWith('/api/')) {
            fetchOptions.headers['x-airtable-url'] = url;
            url = this.config.API.PROXY_URL;
        }
        if (options.body) { fetchOptions.body = JSON.stringify(options.body); }

        try {
            const response = await fetch(url, fetchOptions);
            const data = await response.json().catch(() => ({ error: { message: `Server returned status ${response.status}. Could not parse response.` } }));
            if (!response.ok) {
                throw new Error(data.error?.message || `An unknown server error occurred. (Status: ${response.status})`);
            }
            return data;
        } catch (error) {
            console.error('SecureFetch Error:', error);
            throw error;
        }
    }

    setupEventListeners() {
        document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handlePasswordSubmit(e));
        document.getElementById('otpForm')?.addEventListener('submit', (e) => this.handleOtpSubmit(e));
        document.getElementById('createUserForm')?.addEventListener('submit', (e) => this.handleCreateUser(e));
        document.getElementById('accountType')?.addEventListener('change', () => { this.updateFormVisibility(); this.updateCreateButtonText(); });
        ['expiryPeriod', 'deviceType', 'creditsToGive'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.updateCreateButtonText());
        });
        document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => { e.preventDefault(); this.openResetModal(); });
        document.getElementById('closeModalBtn')?.addEventListener('click', () => this.closeResetModal());
        document.getElementById('resetPasswordModal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) this.closeResetModal(); });
        document.getElementById('requestOtpForm')?.addEventListener('submit', (e) => this.handleRequestOtp(e));
        document.getElementById('verifyOtpForm')?.addEventListener('submit', (e) => this.handleResetPassword(e));
    }

    async handlePasswordSubmit(e) { /* ... UNCHANGED ... */ 
        e.preventDefault();
        this.showError('');
        const form = e.target;
        const btn = form.querySelector('button');
        const username = form.loginUsername.value.trim();
        const password = form.loginPassword.value;
        if (!username || !password) return this.showError('Please enter both username and password.');

        this.loginUsername = username;
        btn.disabled = true; btn.querySelector('span').textContent = 'Sending OTP...';

        try {
            await this.secureFetch('/api/login', {
                method: 'POST',
                body: { username, password }
            });
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('otpForm').style.display = 'block';
            this.showNotification('An OTP has been sent to your Telegram', 'success');
        } catch (error) {
            this.showError(error.message);
        } finally {
            btn.disabled = false; btn.querySelector('span').textContent = 'Continue';
        }
    }
    async handleOtpSubmit(e) { /* ... UNCHANGED ... */ 
        e.preventDefault();
        this.showError('');
        const form = e.target;
        const btn = form.querySelector('button');
        const otp = form.loginOtp.value.trim();
        if (!otp) return this.showError('Please enter the OTP from Telegram.');

        btn.disabled = true; btn.querySelector('span').textContent = 'Verifying...';

        try {
            const { success, user } = await this.secureFetch('/api/login', {
                method: 'POST',
                body: { username: this.loginUsername, otp }
            });

            if (success && user) {
                this.currentUser = user;
                createSession(this.currentUser);
                document.getElementById('loginSection').style.display = 'none';
                document.getElementById('dashboardSection').style.display = 'block';
                await this.setupPermissions();
                await this.loadUsers();
                this.showNotification('Login successful!', 'success');
            } else {
                 this.showError('Login failed. Please try again.');
            }
        } catch (error) {
            this.showError(error.message);
        } finally {
            btn.disabled = false; btn.querySelector('span').textContent = 'Enter VIP Panel';
        }
    }

    openResetModal() { /* ... UNCHANGED ... */ 
        document.getElementById('resetPasswordModal').style.display = 'flex';
        document.getElementById('resetStep1').style.display = 'block';
        document.getElementById('resetStep2').style.display = 'none';
        document.getElementById('requestOtpForm').reset();
        document.getElementById('verifyOtpForm').reset();
        this.showResetError('');
    }
    closeResetModal() { /* ... UNCHANGED ... */ 
        document.getElementById('resetPasswordModal').style.display = 'none';
    }
    showResetError(message) { /* ... UNCHANGED ... */ 
        const el = document.getElementById('resetError');
        el.textContent = message;
        el.style.display = message ? 'block' : 'none';
    }
    async handleRequestOtp(e) { /* ... UNCHANGED ... */ 
        e.preventDefault();
        this.showResetError('');
        const form = e.target;
        const btn = form.querySelector('button');
        const username = form.resetUsername.value.trim();
        const telegramId = form.telegramId.value.trim();
        if (!username || !telegramId) return this.showResetError('Username and Telegram ID are required.');
        
        this.resetUsername = username;
        btn.disabled = true; btn.querySelector('span').textContent = 'Sending...';

        try {
            const data = await this.secureFetch('/api/password-reset', { method: 'POST', body: { username, telegramId } });
            this.showNotification(data.message, 'success');
            document.getElementById('resetStep1').style.display = 'none';
            document.getElementById('resetStep2').style.display = 'block';
        } catch (error) {
            this.showResetError(error.message);
        } finally {
            btn.disabled = false; btn.querySelector('span').textContent = 'Send OTP';
        }
    }
    async handleResetPassword(e) { /* ... UNCHANGED ... */ 
        e.preventDefault();
        this.showResetError('');
        const form = e.target;
        const btn = form.querySelector('button');
        const otp = form.otp.value.trim();
        const newPassword = form.newPasswordReset.value;
        if (!otp || !newPassword) return this.showResetError('OTP and new password are required.');
        
        btn.disabled = true; btn.querySelector('span').textContent = 'Resetting...';

        try {
            const data = await this.secureFetch('/api/password-reset', { method: 'POST', body: { username: this.resetUsername, otp, newPassword } });
            this.showNotification(data.message, 'success');
            this.closeResetModal();
        } catch (error) {
            this.showResetError(error.message);
        } finally {
            btn.disabled = false; btn.querySelector('span').textContent = 'Reset Password';
        }
    }
    
    checkExistingSession() { /* ... UNCHANGED ... */ 
        const session = validateSession();
        if (session) {
            this.currentUser = session.user;
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('dashboardSection').style.display = 'block';
            this.setupPermissions();
            this.loadUsers();
        }
    }
    async setupPermissions() { /* ... UNCHANGED ... */ 
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

    updateFormVisibility() { /* ... UNCHANGED ... */
        const accountType = document.getElementById('accountType').value;
        const isPrivileged = ['admin', 'seller', 'reseller'].includes(accountType);
        const needsTelegramId = ['seller', 'reseller'].includes(accountType);

        document.getElementById('creditsGroup').style.display = isPrivileged ? 'block' : 'none';
        document.getElementById('telegramIdGroup').style.display = needsTelegramId ? 'block' : 'none';
        
        document.getElementById('expiryPeriod').parentElement.style.display = isPrivileged ? 'none' : 'block';
        document.getElementById('deviceType').parentElement.style.display = isPrivileged ? 'none' : 'block';
    }

    updateCreateButtonText() { /* ... UNCHANGED ... */ 
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
    calculateCreditCost() { /* ... UNCHANGED ... */ 
        const { PRICING, DEVICE_MULTIPLIER } = this.config.CREDITS;
        const period = document.getElementById('expiryPeriod').value;
        const device = document.getElementById('deviceType').value;
        return (PRICING[period] || 0) * (DEVICE_MULTIPLIER[device] || 1);
    }
    
    async handleCreateUser(e) { /* ... UNCHANGED ... */
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button');
        
        const userData = {
            Username: form.newUsername.value.trim(),
            Password: form.newPassword.value,
            Expiry: form.expiryPeriod.value,
            Device: form.deviceType.value,
            AccountType: form.accountType.value,
            Credits: parseInt(form.creditsToGive.value) || 0,
            TelegramID: form.newTelegramId.value.trim()
        };

        if (!userData.Username || !userData.Password) {
            return this.showNotification('Username and password are required', 'error');
        }
        if (['seller', 'reseller'].includes(userData.AccountType) && !userData.TelegramID) {
            return this.showNotification('Telegram ID is required for Sellers and Resellers', 'error');
        }
        
        btn.disabled = true;
        try {
            await this.createUser(userData);
            form.reset(); this.updateFormVisibility(); this.updateCreateButtonText();
            await this.loadUsers();
            this.showNotification('User created successfully', 'success');
        } catch (error) { this.showNotification(`Failed to create user: ${error.message}`, 'error'); }
        finally { btn.disabled = false; }
    }

    async createUser(userData) {
        let cost = 0;
        const isPrivileged = ['admin', 'seller', 'reseller'].includes(userData.AccountType);
        if (this.currentUser.AccountType !== 'god' && this.currentUser.AccountType !== 'admin') {
            cost = isPrivileged ? userData.Credits : this.calculateCreditCost();
            if (this.currentUser.Credits < cost) throw new Error('Insufficient credits.');
        }
        // --- THIS IS THE CORRECTED LINE ---
        userData.Expiry = isPrivileged ? '9999' : String(Math.floor(Date.now() / 1000) + Math.floor(parseFloat(userData.Expiry) * 3600));
        userData.CreatedBy = this.currentUser.Username;
        userData.HWID = ''; userData.HWID2 = '';
        await this.secureFetch(this.config.API.BASE_URL, { method: 'POST', body: { records: [{ fields: userData }] } });
        if (cost > 0) {
            this.currentUser.Credits -= cost;
            await this.updateUserCredits(this.currentUser.recordId, this.currentUser.Credits);
            document.getElementById('userCredits').textContent = this.currentUser.Credits;
        }
    }

    // --- THIS FUNCTION IS UPDATED WITH AUTO-DELETE LOGIC ---
    async loadUsers() {
        document.getElementById('loadingUsers').style.display = 'block';
        document.getElementById('usersTableBody').innerHTML = '';
        try {
            let url = this.config.API.BASE_URL;
            if (this.currentUser.AccountType === 'admin') url += `?filterByFormula=NOT({AccountType}='god')`;
            else if (this.currentUser.AccountType !== 'god') url += `?filterByFormula={CreatedBy}='${encodeURIComponent(this.currentUser.Username)}'`;
            
            const data = await this.secureFetch(url);
            this.allUsers = data.records || [];

            // Note: Do not auto-delete expired users. Keep them in Airtable and display as "Expired" in UI.
            // The UI badge in renderUsersTable() already shows expired status based on the Expiry timestamp.

            this.renderUsersTable();
            this.updateStats();
        } catch (error) {
            this.showNotification('Failed to load users: ' + error.message, 'error');
        } finally {
            document.getElementById('loadingUsers').style.display = 'none';
        }
    }

    renderUsersTable() { /* ... UNCHANGED ... */ 
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';
        if (this.allUsers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center;">No users found.</td></tr>`;
            return;
        }
        this.allUsers.forEach(({ id, fields: user }) => {
            const isExpired = user.Expiry !== '9999' && parseInt(user.Expiry) < Math.floor(Date.now() / 1000);
            const row = tbody.insertRow();
            let creditButton = '';
            if ((this.currentUser.AccountType === 'god' || this.currentUser.AccountType === 'admin' || this.currentUser.AccountType === 'seller') && (user.AccountType === 'seller' || user.AccountType === 'reseller')) {
                creditButton = `<button onclick="app.giveCredits('${id}', '${user.Username}')" class="action-btn" style="background-color: var(--success);">Give Credits</button>`;
            }
            row.innerHTML = `<td>${user.Username || ''}</td><td>${user.Password || ''}</td><td>${user.AccountType || 'user'}</td><td>${(user.AccountType === 'seller' || user.AccountType === 'reseller') ? user.Credits || 0 : '-'}</td><td>${user.Expiry === '9999' ? 'Never' : new Date(parseInt(user.Expiry) * 1000).toLocaleDateString()}</td><td>${user.Device || 'Single'}</td><td>${user.HWID ? 'SET' : 'NONE'}</td><td>${user.CreatedBy || ''}</td><td><span class="status-badge ${isExpired ? 'status-expired' : 'status-active'}">${isExpired ? 'Expired' : 'Active'}</span></td><td class="action-buttons">${creditButton}<button onclick="app.resetHWID('${id}', '${user.Username}')" class="action-btn btn-warning">Reset HWID</button><button onclick="app.deleteUser('${id}', '${user.Username}')" class="action-btn btn-danger">Delete</button></td>`;
        });
    }
    async giveCredits(recordId, username) { /* ... UNCHANGED ... */ 
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
    async resetHWID(recordId, username) { /* ... UNCHANGED ... */ 
        if (!confirm(`Reset HWID for ${username}?`)) return;
        try {
            await this.secureFetch(this.config.API.BASE_URL, { method: 'PATCH', body: { records: [{ id: recordId, fields: { HWID: '', HWID2: '' } }] } });
            this.showNotification(`HWID reset for ${username}`, 'success');
            await this.loadUsers();
        } catch (error) { this.showNotification(`Failed to reset HWID: ${error.message}`, 'error'); }
    }
    async deleteUser(recordId, username) {
        // No confirmation needed for auto-delete, but keep for manual delete
        if (username && !confirm(`Delete user ${username}?`)) return;
        try {
            await this.secureFetch(`${this.config.API.BASE_URL}/${recordId}`, { method: 'DELETE' });
            if (username) { // Only show notification for manual deletion
                this.showNotification(`User ${username} deleted`, 'success');
            }
            // Manually remove the user from the table to avoid a full reload
            const index = this.allUsers.findIndex(u => u.id === recordId);
            if (index > -1) {
                this.allUsers.splice(index, 1);
                this.renderUsersTable();
                this.updateStats();
            }
        } catch (error) { this.showNotification(`Failed to delete user: ${error.message}`, 'error'); }
    }
    async updateUserCredits(recordId, newCredits) { /* ... UNCHANGED ... */ 
        await this.secureFetch(this.config.API.BASE_URL, { method: 'PATCH', body: { records: [{ id: recordId, fields: { Credits: newCredits } }] } });
    }
    updateStats() { /* ... UNCHANGED ... */ 
        const total = this.allUsers.length;
        const active = this.allUsers.filter(({ fields }) => fields.Expiry === '9999' || parseInt(fields.Expiry) > Date.now() / 1000).length;
        document.getElementById('totalUsers').textContent = total;
        document.getElementById('activeUsers').textContent = active;
        document.getElementById('expiredUsers').textContent = total - active;
        document.getElementById('resellerCount').textContent = this.allUsers.filter(({ fields }) => fields.AccountType === 'reseller').length;
    }
    logout() { /* ... UNCHANGED ... */ 
        localStorage.removeItem('vip_session'); window.location.reload(); 
    }
    showError(message) { /* ... UNCHANGED ... */ 
        const el = document.getElementById('loginError');
        el.textContent = message;
        el.style.display = message ? 'block' : 'none';
    }
    showNotification(message, type) { /* ... UNCHANGED ... */ 
        const el = document.getElementById('notification');
        el.textContent = message; el.className = `notification ${type} show`;
        setTimeout(() => el.classList.remove('show'), 3000);
    }
}
const app = new VIPAdminPanel();
