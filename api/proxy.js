// This is a secure, server-side proxy function (v2 - with enhanced logging)
// It keeps your API token hidden from users.

export default async function handler(request, response) {
    // Log that the function was triggered
    console.log("Proxy function started.");

    // 1. Get the real Airtable URL from the request header
    const airtableUrl = request.headers['x-airtable-url'];
    if (!airtableUrl) {
        console.error("Proxy Error: 'x-airtable-url' header is missing.");
        return response.status(400).json({ error: "Configuration error: Airtable URL is missing from the request." });
    }
    console.log("Attempting to contact Airtable URL:", airtableUrl);

    // 2. Use your secret API token from a secure environment variable
    const AIRTABLE_TOKEN = process.env.AIRTABLE_API_TOKEN;
    if (!AIRTABLE_TOKEN || AIRTABLE_TOKEN === "") {
        console.error("CRITICAL SECURITY ERROR: The AIRTABLE_API_TOKEN environment variable is not set on Vercel!");
        return response.status(500).json({ error: "Security Alert: The server's API Token is not configured. Please check your Vercel Environment Variables." });
    }
    // Log a small, non-sensitive part of the token to confirm it's loaded
    console.log("API Token has been loaded successfully.");

    try {
        // 3. Make the request to Airtable from the secure server
        const airtableResponse = await fetch(airtableUrl, {
            method: request.method,
            headers: {
                'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: request.body ? JSON.stringify(request.body) : null,
        });

        console.log("Received response from Airtable. Status:", airtableResponse.status);

        // 4. Get the response data from Airtable
        const data = await airtableResponse.json();
        
        // If Airtable itself returned an error (like "NOT_FOUND"), log it for debugging
        if (!airtableResponse.ok) {
            console.error("Airtable API returned an error:", JSON.stringify(data));
        }

        // 5. Send the exact status and data from Airtable back to the website
        return response.status(airtableResponse.status).json(data);

    } catch (error) {
        console.error('Fatal Error in Airtable proxy function:', error);
        return response.status(500).json({ error: 'An unexpected internal server error occurred while contacting the database.' });
    }
}
