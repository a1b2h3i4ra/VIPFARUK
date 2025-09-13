// VIP FARUK 999 - Secure Application Logic (v12 - Final with all features)
class VIPAdminPanel {
    constructor() { /* ... constructor logic ... */ }
    init() { this.setupEventListeners(); this.checkExistingSession(); }

    async secureFetch(url, options = {}) { /* ... secureFetch logic ... */ }
    
    setupEventListeners() {
        document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('createUserForm')?.addEventListener('submit', (e) => this.handleCreateUser(e));
        document.getElementById('accountType')?.addEventListener('change', () => { this.updateFormVisibility(); this.updateCreateButtonText(); });
        ['expiryPeriod', 'deviceType', 'creditsToGive'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.updateCreateButtonText());
        });
        document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => { e.preventDefault(); this.openModal(); });
        document.getElementById('sendOtpForm')?.addEventListener('submit', (e) => this.handleSendOtp(e));
        document.getElementById('verifyOtpForm')?.addEventListener('submit', (e) => this.handleVerifyOtp(e));
    }
    
    async handleLogin(e) { /* ... login logic ... */ }
    checkExistingSession() { /* ... session logic ... */ }
    async authenticateUser(username, password) { /* ... authentication logic ... */ }
    async setupPermissions() { /* ... permissions logic ... */ }
    updateFormVisibility() { /* ... form visibility logic ... */ }
    updateCreateButtonText() { /* ... button text logic ... */ }
    calculateCreditCost() { /* ... credit cost logic ... */ }
    async handleCreateUser(e) { /* ... create user logic ... */ }
    async createUser(userData) { /* ... create user logic ... */ }
    async loadUsers() { /* ... load users logic ... */ }
    
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

    async giveCredits(recordId, username) { /* ... give credits logic ... */ }
    async resetHWID(recordId, username) { /* ... reset HWID logic ... */ }
    async deleteUser(recordId, username) { /* ... delete user logic ... */ }
    async updateUserCredits(recordId, newCredits) { /* ... update credits logic ... */ }
    updateStats() { /* ... update stats logic ... */ }
    logout() { /* ... logout logic ... */ }
    showError(message) { /* ... show error logic ... */ }
    showNotification(message, type) { /* ... show notification logic ... */ }

    // --- NEW FUNCTIONS FOR PASSWORD RESET MODAL ---
    openModal() {
        document.getElementById('resetPasswordModal').style.display = 'flex';
        document.getElementById('resetStep1').style.display = 'block';
        document.getElementById('resetStep2').style.display = 'none';
        document.getElementById('resetError').style.display = 'none';
        document.getElementById('sendOtpForm').reset();
        document.getElementById('verifyOtpForm').reset();
    }

    closeModal() {
        document.getElementById('resetPasswordModal').style.display = 'none';
    }

    async handleSendOtp(e) {
        e.preventDefault();
        const username = document.getElementById('resetUsername').value.trim();
        const telegramId = document.getElementById('resetTelegramId').value.trim();
        const btn = e.target.querySelector('button');
        btn.disabled = true; btn.querySelector('span').textContent = 'Sending...';
        document.getElementById('resetError').style.display = 'none';
        try {
            const response = await fetch('/api/password-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, telegramId }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            document.getElementById('resetStep1').style.display = 'none';
            document.getElementById('resetStep2').style.display = 'block';
            this.showNotification(result.message, 'success');
        } catch (error) {
            document.getElementById('resetError').textContent = error.message;
            document.getElementById('resetError').style.display = 'block';
        } finally {
            btn.disabled = false; btn.querySelector('span').textContent = 'Send OTP';
        }
    }

    async handleVerifyOtp(e) {
        e.preventDefault();
        const username = document.getElementById('resetUsername').value.trim();
        const otp = document.getElementById('otpInput').value.trim();
        const newPassword = document.getElementById('newPasswordInput').value;
        const btn = e.target.querySelector('button');
        btn.disabled = true; btn.querySelector('span').textContent = 'Verifying...';
        document.getElementById('resetError').style.display = 'none';
        try {
            const response = await fetch('/api/password-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, otp, newPassword }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            this.showNotification(result.message, 'success');
            setTimeout(() => this.closeModal(), 2000);
        } catch (error) {
            document.getElementById('resetError').textContent = error.message;
            document.getElementById('resetError').style.display = 'block';
        } finally {
            btn.disabled = false; btn.querySelector('span').textContent = 'Reset Password';
        }
    }
}

const app = new VIPAdminPanel();
