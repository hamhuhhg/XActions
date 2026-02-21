// Auto Poster - Post single or multiple tweets
// Uses the XActions actions library
// Inputs:
// - TWEETS: Text block containing tweets. Separate multiple tweets with ---

async function runAutoPoster() {
    console.log('[autoPoster.js] Script initialized in browser context.');

    // Check if XActions object exists
    if (!window.XActions || !window.XActions.Core) {
        console.log('[autoPoster.js] ERROR: window.XActions.Core is missing!');
        return { success: false, reason: 'XActions Library Missing' };
    }

    const { log, sleep, randomDelay } = window.XActions.Core;
    const { tweet } = window.XActions;

    console.log('[autoPoster.js] XActions library loaded successfully.');

    // Get tweets from config injected by server
    const rawInput = window.XActionsConfig?.tweets || window.XActionsConfig?.TWEETS || '';

    console.log(`[autoPoster.js] Raw input received: "${rawInput.substring(0, 50)}..."`);

    if (!rawInput.trim()) {
        log('No tweets provided to post.', 'error');
        return { success: false, reason: 'Empty input' };
    }

    // Split by --- to allow mass posting of separate tweets
    const tweets = rawInput.split('---').map(t => t.trim()).filter(t => t.length > 0);

    log(`Starting Auto Poster for ${tweets.length} tweet(s)...`, 'info');
    console.log(`[autoPoster.js] Parsed ${tweets.length} tweets to post.`);

    let successCount = 0;

    for (let i = 0; i < tweets.length; i++) {
        const text = tweets[i];

        // Removed: Navigation to `/home` which kills the injected JS environment.
        // `tweet.post()` already handles finding or opening the tweet composer natively.

        log(`Posting tweet ${i + 1}/${tweets.length}...`, 'action');

        try {
            const posted = await tweet.post(text);
            if (posted) {
                successCount++;
                log(`Successfully posted tweet ${i + 1}!`, 'success');
            } else {
                log(`Failed to post tweet ${i + 1}.`, 'error');
            }
        } catch (e) {
            log(`Error posting tweet ${i + 1}: ${e.message}`, 'error');
        }

        // If there are more tweets, wait before the next one to avoid spam filters
        if (i < tweets.length - 1) {
            const waitTime = await randomDelay(10000, 30000);
            log(`Waiting ${Math.round(waitTime / 1000)} seconds before next tweet...`, 'info');
        }
    }

    log(`Auto Poster finished! Posted ${successCount}/${tweets.length} tweets.`, 'success');
    return { success: true, count: successCount, total: tweets.length };
}

// Start execution
runAutoPoster().catch(e => {
    console.error('Fatal error in auto poster:', e);
});
