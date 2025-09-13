// This is a secure, server-side proxy function (v3 - Final Fix)
// It keeps your API token hidden from users.

export default async function handler(request, response) {
    const airtableUrl = request.headers['x-airtable-url'];
    if (!airtableUrl) {
        return response.status(400).json({ error: "Configuration error: Airtable URL is missing." });
    }

    const AIRTABLE_TOKEN = process.env.AIRTABLE_API_TOKEN;
    if (!AIRTABLE_TOKEN || AIRTABLE_TOKEN === "") {
        return response.status(500).json({ error: "Security Alert: The server's API Token is not configured." });
    }

    try {
        // --- THIS IS THE FIX ---
        // We create the options for the fetch request here
        const fetchOptions = {
            method: request.method,
            headers: {
                'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json',
            }
        };

        // We ONLY add a 'body' to the request if it's NOT a GET request
        // This prevents the "cannot have body" error during login.
        if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
            fetchOptions.body = JSON.stringify(request.body);
        }
        // --- END OF FIX ---

        const airtableResponse = await fetch(airtableUrl, fetchOptions);
        const data = await airtableResponse.json();

        return response.status(airtableResponse.status).json(data);

    } catch (error) {
        console.error('Fatal Error in Airtable proxy function:', error);
        return response.status(500).json({ error: 'An unexpected internal server error occurred.' });
    }
}
