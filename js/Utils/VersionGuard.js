/*
    File: js/Utils/VersionGuard.js
    Description: Validates the application version from the URL query parameter.
    If the version is missing or incorrect, it redirects to the correct URL.
    This script MUST run before any other script in index.html.
*/

(function() {
    // --- SINGLE SOURCE OF TRUTH ---
    // This version MUST be updated to match the version in 'database/Update.json'
    // during each new release.
    const REQUIRED_VERSION = '1.1.0';

    try {
        const url = new URL(window.location.href);
        const currentVersion = url.searchParams.get('v');

        // Check if the version in the URL is missing or incorrect.
        if (currentVersion !== REQUIRED_VERSION) {
            
            // Set the correct version parameter.
            url.searchParams.set('v', REQUIRED_VERSION);
            
            // Redirect to the corrected URL.
            // Using replace() prevents the incorrect URL from being stored in browser history,
            // so the user cannot navigate back to it.
            window.location.replace(url.toString());
        }
    } catch (error) {
        console.error("[VersionGuard] Critical error during URL validation:", error);
        // Optional: You could display a user-friendly error message on the page here.
    }
})();