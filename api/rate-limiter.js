// A smart rate limiter that allows short bursts of requests but prevents sustained attacks.

const ipData = new Map();

// --- Configuration ---
// Allow a BURST of 25 requests in a short window (e.g., 1 minute)
const BURST_LIMIT = 25;
const BURST_WINDOW_MS = 60 * 1000; // 1 minute

// Allow a SUSTAINED rate of 100 requests over a longer window (e.g., 10 minutes)
const SUSTAINED_LIMIT = 100;
const SUSTAINED_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export default async function rateLimiter(request) {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();

    // Get the request history for this IP, or create a new one
    let currentData = ipData.get(ip);
    if (!currentData) {
        currentData = { requests: [] };
        ipData.set(ip, currentData);
    }

    // --- 1. Check the SUSTAINED limit first ---
    // Filter out old requests to only keep those within the sustained window
    const sustainedRequests = currentData.requests.filter(ts => (now - ts) < SUSTAINED_WINDOW_MS);
    if (sustainedRequests.length >= SUSTAINED_LIMIT) {
        // This IP is making too many requests over a long period. Block them.
        return new Response(JSON.stringify({ error: { message: "Sustained rate limit exceeded. Please wait." } }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // --- 2. Then, check the BURST limit ---
    // Filter out old requests to only keep those within the burst window
    const burstRequests = sustainedRequests.filter(ts => (now - ts) < BURST_WINDOW_MS);
    if (burstRequests.length >= BURST_LIMIT) {
        // This IP is making too many requests in a short burst. Block them.
        return new Response(JSON.stringify({ error: { message: "Burst rate limit exceeded. Please slow down." } }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // If both checks pass, record the new request and allow it
    sustainedRequests.push(now);
    currentData.requests = sustainedRequests;
    ipData.set(ip, currentData);
    
    // Return null to indicate the request should proceed
    return null;
}
