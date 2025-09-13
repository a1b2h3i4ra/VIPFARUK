// VIP FARUK 999 - Secure Password Reset API (v4 - 15 Min OTP & Final Fix)
export default async function handler(request, response) {
    const { username, telegramId, otp, newPassword } = request.body;
    const AIRTABLE_TOKEN = process.env.AIRTABLE_API_TOKEN;
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const AIRTABLE_BASE_URL = 'https://api.airtable.com/v0/appyns7Hg147GniSq/tbls64uNeAgvXrZge';

    async function sendTelegramMessage(chatId, text) {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }) });
    }

    async function updateAirtableRecord(recordId, fields) {
        await fetch(`${AIRTABLE_BASE_URL}/${recordId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields }),
        });
    }

    try {
        const findUserUrl = `${AIRTABLE_BASE_URL}?filterByFormula={Username}='${encodeURIComponent(username)}'`;
        const userRes = await fetch(findUserUrl, { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } });
        if (!userRes.ok) throw new Error("Could not connect to the database.");
        const userData = await userRes.json();
        
        if (!userData.records || userData.records.length === 0) return response.status(404).json({ error: 'User not found.' });
        
        const userRecord = userData.records[0];
        const { TelegramID, AccountType, Otp: storedOtp, OtpExpiry, OtpLastRequest, OtpAttempts } = userRecord.fields;

        if (AccountType === 'user') return response.status(403).json({ error: 'Password reset is not available for this account type.' });
        if (!TelegramID) return response.status(400).json({ error: 'This user has no Telegram ID configured.' });
        
        // --- LOGIC TO CHANGE THE PASSWORD ---
        if (otp && newPassword) {
            if ((OtpAttempts || 0) >= 3) {
                await updateAirtableRecord(userRecord.id, { Otp: null, OtpExpiry: null, OtpAttempts: null });
                return response.status(400).json({ error: 'Too many incorrect attempts. OTP has been invalidated.' });
            }
            if (!storedOtp || !OtpExpiry || Date.now() > OtpExpiry) return response.status(400).json({ error: 'OTP is invalid or has expired.' });
            if (storedOtp !== otp) {
                await updateAirtableRecord(userRecord.id, { OtpAttempts: (OtpAttempts || 0) + 1 });
                return response.status(400).json({ error: 'Incorrect OTP.' });
            }
            await updateAirtableRecord(userRecord.id, { Password: newPassword, Otp: null, OtpExpiry: null, OtpLastRequest: null, OtpAttempts: null });
            await sendTelegramMessage(TelegramID, `✅ Your password for user *'${username}'* has been reset successfully.`);
            return response.status(200).json({ message: 'Password has been reset successfully.' });
        } 
        // --- LOGIC TO SEND AN OTP ---
        else {
            if (TelegramID !== telegramId) return response.status(401).json({ error: 'Incorrect Telegram ID for this user.' });
            if (OtpLastRequest && (Date.now() - new Date(OtpLastRequest).getTime()) < 60000) {
                return response.status(429).json({ error: 'Please wait 60 seconds before requesting another OTP.' });
            }
            const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
            // UPDATED: OTP is now valid for 15 minutes (900000 milliseconds)
            const newOtpExpiry = Date.now() + 900000; 
            const loginTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });

            await updateAirtableRecord(userRecord.id, { Otp: newOtp, OtpExpiry: newOtpExpiry, OtpLastRequest: new Date().toISOString(), OtpAttempts: 0 });
            
            const message = `Your login OTP is: *${newOtp}*\n\nLogin Time: ${loginTime}\nExpiration Time: +15 minutes\n\n_If you did not request this, please ignore this message._`;
            await sendTelegramMessage(TelegramID, message);
            return response.status(200).json({ message: 'An OTP has been sent to your registered Telegram account.' });
        }
    } catch (error) {
        return response.status(500).json({ error: 'An internal server error occurred.' });
    }
}
