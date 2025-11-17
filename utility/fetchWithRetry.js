const {logger}=require("../middleware/logger");
const fetchWithRetry = async (url, options = {}) => {
    const {
        maxRetries = 3,
        timeout = 10000,
        baseDelay = 1000,
        fetchOptions = {}
    } = options;

    // Default headers
    const defaultHeaders = {
        'User-Agent': 'ChatTown-API/1.0',
        ...fetchOptions.headers
    };

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Create AbortController for timeout
            logger.info(`Fetch attempt ${attempt + 1}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                ...fetchOptions,
                headers: defaultHeaders,
                signal: controller.signal
            });

            // Clear timeout on successful response
            clearTimeout(timeoutId);

            // Check if response is ok
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return response;

        } catch (error) {
            const isLastAttempt = attempt === maxRetries - 1;
            const isRetryableError = isNetworkError(error);

            logger.info(`Fetch attempt ${attempt + 1}/${maxRetries} failed:`, error.message);

            // Don't retry on last attempt or non-retryable errors
            if (isLastAttempt || !isRetryableError) {
                throw error;
            }

            // Wait before next retry (exponential backoff with jitter)
            const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
            await sleep(delay);
        }
    }
};

const isNetworkError = (error) => {
    const retryableCodes = [
        'ECONNRESET',    // Connection reset
        'ENOTFOUND',     // DNS lookup failed
        'ECONNREFUSED',  // Connection refused
        'ETIMEDOUT',     // Request timeout
        'EPIPE',         // Broken pipe
        'ENETUNREACH'    // Network unreachable
    ];

    const retryableMessages = [
        'fetch failed',
        'network error',
        'timeout',
        'aborted'
    ];

    // Check error codes
    if (error.code && retryableCodes.includes(error.code)) {
        return true;
    }

    // Check error messages
    const message = error.message.toLowerCase();
    return retryableMessages.some(msg => message.includes(msg));
};
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = fetchWithRetry;