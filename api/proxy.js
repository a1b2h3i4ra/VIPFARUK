// This is a secure, server-side proxy function.
// It keeps your API token hidden from users.

export default async function handler(request, response) {
    // 1. Get the real Airtable URL from the request header
    const airtableUrl = request.headers['x-airtable-url'];
    if (!airtableUrl) {
        return response.status(400).json({ error: 'Airtable URL is missing' });
    }

    // 2. Use your secret API token from a secure environment variable
    const AIRTABLE_TOKEN = process.env.AIRTABLE_API_TOKEN;
    if (!AIRTABLE_TOKEN) {
        return response.status(500).json({ error: 'API Token is not configured' });
    }

    try {
        // 3. Make the request to Airtable from the secure server
        const airtableResponse = await fetch(airtableUrl, {
            method: request.method,
            headers: {
                'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json',
            },
            // Pass along the body if it exists (for creating/updating users)
            body: request.body ? JSON.stringify(request.body) : null,
        });

        // 4. Send the data from Airtable back to your website
        const data = await airtableResponse.json();
        response.status(airtableResponse.status).json(data);

    } catch (error) {
        console.error('Error in Airtable proxy:', error);
        response.status(500).json({ error: 'An internal error occurred.' });
    }
}
