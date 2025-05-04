// RJ Dreamstime Auto
// Copyright (c) 2025 Riiicil
// Licensed under the MIT License. See LICENSE file for details.

// RJ Dreamstime Auto-Metadata - Content Script (content.js)

// Guard against multiple executions
if (window.hasRunRJDreamstimeContentScript) {
  console.log('RJ Dreamstime Content Script already running, exiting.');
} else {
  window.hasRunRJDreamstimeContentScript = true;
  console.log('RJ Dreamstime Auto-Metadata Content Script Loaded! (First run)');

  // --- Configuration (Selectors for Dreamstime elements - !! MUST BE UPDATED !!) ---
// These selectors are PLAEHOLDERS and likely INCORRECT.
// You MUST inspect the Dreamstime upload page to find the correct selectors.
const SELECTORS = {
    titleInput: 'input#title',                      // Selector for Title input field
    descriptionTextarea: 'textarea#description',    // Selector for Description textarea
    keywordsInput: 'input#keywords_tag',            // Selector for Keywords input field
    imagePreview: 'img.zoomImg',                    // Selector for the zoom/preview image provided
    submitButton: 'a#submitbutton',                 // Selector for the Submit button (<a> tag)
    fileIdLink: 'a#js-originalfilename'             // Selector for the file ID link
    // Add other selectors as needed, e.g., for categories if automated
};

// --- Listener for messages from Popup and Background Script ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Message received in content script:', message);

    if (message.action === 'getImageData') {
        // Use an immediately invoked async function expression (IIAFE)
        // to handle the async operation and call sendResponse correctly.
        (async () => {
            console.log('Background script requested image data.');
            try {
                const imageData = await extractImageData(); // Call the async function
                if (imageData) {
                    console.log('Sending image data back to background script.');
                    sendResponse({ imageData: imageData });
                } else {
                    console.error('Failed to extract image data after waiting.');
                    sendResponse({ error: 'Could not extract image data from the page after waiting.' });
                }
            } catch (error) {
                console.error('Error extracting image data:', error);
                sendResponse({ error: `Error extracting image data: ${error.message}` });
            }
        })(); // Execute the async function
        return true; // Crucial: Indicate that sendResponse will be called asynchronously

    } else if (message.action === 'fillMetadata' && message.data) {
        // This part also involves async operations (await), so wrap it too
        (async () => {
            console.log('Received metadata from background script:', message.data);
            try {
                const success = await fillFormFields(message.data); // await here
                if (success) {
                    console.log('Form fields filled successfully.');
                    // sendResponse({ status: 'success' }); // REMOVED: Don't send success yet
                    // Auto-submit after successful fill
                    console.log('Attempting auto-submit...');
                    // Add a small delay before clicking submit to ensure fields are processed
                    await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 second delay
                    clickSubmitButton(); // Submit the current form
                    // Background script will handle triggering the next step if needed
                    // No sendResponse needed here as background waits for submitAttempted
                } else {
                    console.error('Failed to fill one or more form fields.');
                    // Send error response if filling failed
                    // Note: sendResponse might fail if background already navigated due to submitAttempted
                    try {
                        sendResponse({ status: 'error', message: 'Could not find all required form fields.' });
                    } catch (e) {
                        console.warn("Could not send 'fillMetadata' error response, possibly due to navigation.");
                    }
                }
            } catch (error) {
                console.error('Error filling form fields:', error);
                 try {
                    sendResponse({ status: 'error', message: `Error filling form: ${error.message}` });
                 } catch (e) {
                     console.warn("Could not send 'fillMetadata' error response, possibly due to navigation.");
                 }
            }
        })(); // Execute the async function
        return true; // Indicate asynchronous response
    }
    // If message is not handled, return false or undefined implicitly to close the channel.
});


// --- Function to Extract Image Data ---
// !! This is a complex part and needs careful implementation !!
// How to get the image data depends heavily on how Dreamstime structures its page.
// Option 1: Find an image URL (e.g., thumbnail)
// Option 2: Find a hidden input with image data
// Option 3: Potentially use Canvas to extract data (more involved)
// Option 4: Get image data from user selection or other means (needs design)
// Modified to wait for the element to appear.
async function extractImageData() {
    console.log(`Attempting to extract image data using selector: ${SELECTORS.imagePreview}`);
    const maxWaitTimeMs = 5000; // Wait up to 5 seconds
    const checkIntervalMs = 500; // Check every 500ms
    let elapsedTimeMs = 0;

    while (elapsedTimeMs < maxWaitTimeMs) {
        const imgElement = document.querySelector(SELECTORS.imagePreview);
        if (imgElement && imgElement.src) {
            // Check if the src is not empty or a placeholder (adjust if needed)
            if (imgElement.src.startsWith('http')) {
                 console.log(`Found image preview src after ${elapsedTimeMs}ms: ${imgElement.src}`);
                 // Return the found image source URL.
                 // Note: Background script might need to fetch this URL and convert to base64
                 // if the Gemini API endpoint requires image bytes instead of a URL.
                 return imgElement.src;
            } else {
                 console.log(`Found image element, but src is not valid yet: ${imgElement.src}. Waiting...`);
            }
        } else {
             // console.log(`Image element not found yet. Waiting...`); // Can be noisy
        }

        // Wait for the next interval
        await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
        elapsedTimeMs += checkIntervalMs;
    }

    console.error(`Could not find image preview element with selector: ${SELECTORS.imagePreview} after waiting ${maxWaitTimeMs}ms.`);
    return null; // Indicate data could not be found after waiting
}

// --- Function to Fill Form Fields ---
// Make the function async to allow for delays
async function fillFormFields(metadata) {
    console.log('Attempting to fill form fields...');
    const titleInput = document.querySelector(SELECTORS.titleInput);
    const descriptionTextarea = document.querySelector(SELECTORS.descriptionTextarea);
    const keywordsInput = document.querySelector(SELECTORS.keywordsInput);

    let fieldsFound = true;

    if (titleInput && metadata.title) {
        console.log(`Filling title: ${metadata.title}`);
        titleInput.value = metadata.title;
        // Optionally trigger an 'input' or 'change' event if the site uses JS listeners
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        titleInput.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
        console.warn(`Title input not found or no title data. Selector: ${SELECTORS.titleInput}`);
        if (!titleInput) fieldsFound = false;
    }

    if (descriptionTextarea && metadata.description) {
        console.log(`Filling description: ${metadata.description.substring(0, 50)}...`);
        descriptionTextarea.value = metadata.description;
        descriptionTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        descriptionTextarea.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
        console.warn(`Description textarea not found or no description data. Selector: ${SELECTORS.descriptionTextarea}`);
         if (!descriptionTextarea) fieldsFound = false;
    }

    if (keywordsInput && metadata.keywords) {
        console.log(`Attempting to fill keywords individually: ${metadata.keywords}`);
        const keywordsArray = metadata.keywords.split(',').map(k => k.trim()).filter(k => k); // Split, trim, remove empty
        console.log(`Pasting full keyword string: ${metadata.keywords}`);

        // Explicitly focus the input field
        keywordsInput.focus();
        await new Promise(resolve => setTimeout(resolve, 50)); // Short delay before pasting

        // Paste the entire string
        keywordsInput.value = metadata.keywords;
        keywordsInput.dispatchEvent(new Event('input', { bubbles: true }));
        keywordsInput.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 50)); // Short delay after pasting

        // --- Simulate full Enter key press sequence once at the end ---
        console.log('Simulating full Enter key press sequence (down, press, up) after pasting...');
        const commonEnterProps = {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            };
            keywordsInput.dispatchEvent(new KeyboardEvent('keydown', commonEnterProps));
            // keypress is often needed for character input simulation, might help here too
            keywordsInput.dispatchEvent(new KeyboardEvent('keypress', commonEnterProps));
            keywordsInput.dispatchEvent(new KeyboardEvent('keyup', commonEnterProps));

        // Add a delay to allow the site's JS to process the events
        await new Promise(resolve => setTimeout(resolve, 150));

        // Clear the input field after attempting to add the tags
        keywordsInput.value = '';
        keywordsInput.dispatchEvent(new Event('input', { bubbles: true }));
        keywordsInput.dispatchEvent(new Event('change', { bubbles: true }));
        // Try blurring the input after adding all keywords
        keywordsInput.blur();

    } else {
        console.warn(`Keywords input not found or no keywords data. Selector: ${SELECTORS.keywordsInput}`);
        if (!keywordsInput) fieldsFound = false;
    }

    return fieldsFound; // Return true only if all essential fields were found (adjust as needed)
}

// --- Function to Click Submit Button (Reverting to direct .click()) ---
function clickSubmitButton() {
    console.log('Attempting direct .click() on submit button...');
    const submitButton = document.querySelector(SELECTORS.submitButton);

    if (submitButton) {
        let clicked = false;
        try {
            submitButton.click(); // Direct click attempt
            clicked = true; // Assume success if no immediate error
            console.log('Direct .click() executed.');
        } catch (e) {
            console.error('Error during direct .click():', e);
            // Check if it's a CSP error related to javascript:void(0)
            if (e.message && e.message.includes('Content Security Policy')) {
                 console.warn('Direct .click() likely blocked by CSP for javascript: URL.');
            }
            clicked = false;
        }

        // Inform background script about the attempt status
        // Even if CSP blocks the *action*, the click event itself might have been dispatched.
        // We'll rely on background script's navigation check.
        // Send 'success: true' if the click dispatch didn't throw an error,
        // 'success: false' only if the button wasn't found or click dispatch failed badly.
        if (clicked) {
             console.log('Submit attempt (direct .click()) made. Informing background script.');
             chrome.runtime.sendMessage({ action: 'submitAttempted', success: true });
        } else {
             console.error(`[AutoProcess] Failed to attempt direct .click() on submit button. Selector: ${SELECTORS.submitButton}. Informing background script.`);
             chrome.runtime.sendMessage({ action: 'submitAttempted', success: false }); // Inform background of failure
        }

    } else {
        console.error(`[AutoProcess] Submit button not found with selector: ${SELECTORS.submitButton}. Informing background script.`);
        chrome.runtime.sendMessage({ action: 'submitAttempted', success: false }); // Inform background of failure
    }
}

// --- Optional: Add a button to the page to trigger analysis ---
function addAnalyzeButton() {
    // Example: Find a place to insert the button (e.g., near the form)
    const targetElement = document.querySelector('#upload-form-container'); // Placeholder selector
    if (targetElement) {
        const button = document.createElement('button');
        button.textContent = 'Generate AI Metadata';
        button.id = 'rj-analyze-button';
        button.style.marginLeft = '10px'; // Basic styling
        button.style.padding = '5px 10px';
        button.style.cursor = 'pointer';

        button.addEventListener('click', () => {
            console.log('Manual Analyze Button clicked.');
            // Send message to background to start the flow
            chrome.runtime.sendMessage({ action: 'startAnalysis' });
        });

        targetElement.appendChild(button); // Or insertBefore, etc.
        console.log('Analyze button added to the page.');
    } else {
        console.warn('Could not find target element to add analyze button.');
    }
}

// Run initialization logic when the script loads

// Optional: Add analyze button (if still desired)
// setTimeout(addAnalyzeButton, 2000);

// --- Auto-Process Logic (v3) ---
// --- Auto-Process Logic ---
// Removed checkAndRunAutoProcessNext function and timeout.
// Background script now manages the auto-process state and trigger.

} // End of guard clause block
