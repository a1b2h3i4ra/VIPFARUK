// A smart rate limiter that allows short bursts of requests but prevents sustained attacks.

const ipData = new Map();

// Configuration:
// Allow a BURST of 25 requests in a short window (e.g., 1 minute)
const BURST_LIMIT = 25;
const BURST_WINDOW_MS = 60 * 1000; // 1 minute

// Allow a SUSTAINED rate of 100 requests over a longer window (e.g., 10 minutes)
const SUSTAINED_LIMIT = 100;
const SUSTAINED_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export default async function rateLimiter(request) {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();

    let currentData = ipData.get(ip);
    if (!currentData) {
        currentData = { requests: [] };
        ipData.set(ip, currentData);
    }

    // 1. Check the SUSTAINED limit first
    const sustainedRequests = currentData.requests.filter(ts => (now - ts) < SUSTAINED_WINDOW_MS);
    if (sustainedRequests.length >= SUSTAINED_LIMIT) {
        return new Response(JSON.stringify({ error: { message: "Sustained rate limit exceeded. Please wait." } }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // 2. Then, check the BURST limit
    const burstRequests = sustainedRequests.filter(ts => (now - ts) < BURST_WINDOW_MS);
    if (burstRequests.length >= BURST_LIMIT) {
        return new Response(JSON.stringify({ error: { message: "Burst rate limit exceeded. Please slow down." } }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // If both checks pass, record the new request and allow it
    sustainedRequests.push(now);
    currentData.requests = sustainedRequests;
    ipData.set(ip, currentData);
    
    return null; // Request is allowed
}
