// RJ Dreamstime Auto-Metadata Extension
// Copyright (c) [Tahun Sekarang] [Nama Anda atau Nama Perusahaan Anda]
// Licensed under the MIT License. See LICENSE file for details.

// --- Global State for Auto-Processing ---
let isAutoProcessingEnabled = false; // Default to disabled
let currentProcessingTabId = null; // ID of the tab currently being processed
let currentProcessingUrl = null; // URL of the page currently being processed
let waitingForNavigation = false; // Flag to indicate if we expect a page load after submit
// Removed currentModelName as it's now retrieved from storage per analysis

// --- Listener for messages from Popup or Content Script ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Message received in background:', message, 'from sender:', sender);

    // Modified startAnalysis: No longer receives model directly
    if (message.action === 'startAnalysis') {
        console.log(`Received startAnalysis request.`);
        // 1. Get API Keys, Model, and Last Index from storage
        chrome.storage.local.get(['apiKeys', 'selectedModel', 'lastKeyIndex'], (result) => {
            const apiKeys = result.apiKeys;
            const selectedModel = result.selectedModel;
            let lastKeyIndex = result.lastKeyIndex !== undefined ? result.lastKeyIndex : -1; // Default to -1 if not set

            if (!apiKeys || apiKeys.length === 0) {
                console.error('API Keys not found or empty in storage.');
                sendPopupStatus('Error: File API Key belum dimuat/disimpan atau kosong.');
                // Respond to the sender (popup) if needed
                // sendResponse({ status: 'Error: API Key belum disimpan.' });
                return; // Stop if no keys
            }
            if (!selectedModel) {
                 console.error('Selected model not found in storage.');
                 sendPopupStatus('Error: Model AI belum dipilih/disimpan.');
                 return; // Stop if no model
            }

            // --- API Key Rotation Logic ---
            let nextKeyIndex = (lastKeyIndex + 1) % apiKeys.length;
            const apiKeyToUse = apiKeys[nextKeyIndex];
            console.log(`Using API Key at index ${nextKeyIndex} (Total: ${apiKeys.length})`);

            // Save the new index back to storage
            chrome.storage.local.set({ lastKeyIndex: nextKeyIndex }, () => {
                 console.log(`Updated lastKeyIndex to ${nextKeyIndex}`);
            });
            // --- End Rotation Logic ---

            // 2. Get image information from the content script for the *current* active tab
            chrome.tabs.query({ active: true, currentWindow: true, url: "*://*.dreamstime.com/upload*" }, (tabs) => {
                 if (tabs.length === 0) {
                    console.error('No active Dreamstime upload tab found when starting analysis.');
                    sendPopupStatus('Error: Tidak ada tab upload Dreamstime aktif.');
                    return;
                 }
                 currentProcessingTabId = tabs[0].id; // Store the tab ID we are starting with
                 currentProcessingUrl = tabs[0].url; // Store the initial URL
                 console.log(`Starting analysis on Tab ID: ${currentProcessingTabId}, URL: ${currentProcessingUrl}, Model: ${selectedModel}`);
                 // Pass the selected API key and model to the next step
                 getImageInfoFromContentScript(apiKeyToUse, selectedModel, currentProcessingTabId);
            });

            // We might not respond immediately to the popup here,
            // as the process involves async calls. Status updates will be sent.
            // sendResponse({ status: 'Analysis started...' }); // Optional immediate response
        });
        // Return true to indicate that sendResponse will be called asynchronously
        // (though we might not use it directly from popup message)
        return true;
    } else if (message.action === 'enableAutoProcess') {
        console.log('Received enableAutoProcess request.');
        isAutoProcessingEnabled = true;
        // Reset state variables when enabling
        currentProcessingTabId = null;
        currentProcessingUrl = null;
        waitingForNavigation = false;
        // Don't reset model name here, it's saved separately
        console.log('Auto-processing enabled. State reset.');
        sendResponse({ status: 'enabled' }); // Acknowledge
        return true; // Keep channel open if needed
    } else if (message.action === 'disableAutoProcess') {
        console.log('Received disableAutoProcess request.');
        isAutoProcessingEnabled = false;
        waitingForNavigation = false; // Ensure we stop waiting if disabled mid-wait
        currentProcessingTabId = null; // Clear state
        currentProcessingUrl = null;
        // Don't clear model name on disable
        console.log('Auto-processing disabled. State cleared.');
        sendResponse({ status: 'disabled' }); // Acknowledge
        return true;
    } else if (message.action === 'getAutoProcessState') {
         console.log('Received getAutoProcessState request.');
         sendResponse({ isEnabled: isAutoProcessingEnabled });
         return false; // Synchronous response
    } else if (message.action === 'submitAttempted') {
        console.log('Received submitAttempted message from content script:', message);
        if (!isAutoProcessingEnabled) {
             console.warn('Received submitAttempted but auto-processing is disabled. Ignoring.');
             return false; // No further action needed
        }
        if (message.success === true) {
            // Store the URL from which the submit was initiated
            if (sender.tab && sender.tab.url) {
                 currentProcessingUrl = sender.tab.url;
                 console.log(`Submit successful on URL: ${currentProcessingUrl}. Waiting for navigation...`);
                 waitingForNavigation = true; // Set flag to wait for tab update
                 sendPopupStatus('Submit berhasil, menunggu navigasi...');
            } else {
                 console.error('Submit successful, but could not get sender URL. Stopping auto-process.');
                 isAutoProcessingEnabled = false;
                 sendPopupStatus('Error: Gagal mendapatkan URL. Otomatisasi dihentikan.');
            }
        } else {
            console.error('Submit attempt failed according to content script. Stopping auto-process.');
            isAutoProcessingEnabled = false;
            waitingForNavigation = false;
            currentProcessingTabId = null;
            currentProcessingUrl = null;
            // Don't clear model name on failure
            sendPopupStatus('Error: Gagal submit. Otomatisasi dihentikan.');
        }
        // No sendResponse needed here as it's just an update from content script
        return false;
    }

    // Add other message handlers if needed
});


// --- Function to get image info from Content Script ---
// Added tabId parameter, removed modelName (retrieved later)
function getImageInfoFromContentScript(apiKey, selectedModel, tabId) { // Pass selectedModel for logging/use
    if (!tabId) {
        console.error("getImageInfoFromContentScript called without a valid tabId.");
        sendPopupStatus("Error internal: Tab ID tidak valid.");
        isAutoProcessingEnabled = false; // Stop if this happens
        return;
    }
    console.log(`Asking content script for image info on Tab ID: ${tabId}...`);

    // Ensure content script is injected before sending a message
    chrome.scripting.executeScript(
        {
            target: { tabId: tabId },
            files: ['scripts/content.js'], // Make sure this path is correct relative to manifest.json
        },
        (injectionResults) => { // Start Callback B (executeScript)
            // Check for errors during injection
            if (chrome.runtime.lastError) {
                console.warn(`Script injection might have failed (maybe already injected): ${chrome.runtime.lastError.message}`);
                // Proceed anyway, the declarative injection might have worked or it was already there
            } else {
                console.log('Content script potentially injected or already present.');
            }

            // NOW, send the message after attempting injection
            console.log(`Sending 'getImageData' message to Tab ID: ${tabId}`);
            chrome.tabs.sendMessage(tabId, { action: 'getImageData' }, (response) => { // Start Callback C (sendMessage)
                // Important: Check chrome.runtime.lastError first in message callbacks
                if (chrome.runtime.lastError) {
                    console.error(`Error communicating with content script on Tab ID ${tabId}:`, chrome.runtime.lastError.message);
                    sendPopupStatus(`Error: Gagal komunikasi (${chrome.runtime.lastError.message})`);
                    // Consider stopping auto-process here if communication fails
                    isAutoProcessingEnabled = false;
                    waitingForNavigation = false;
                    currentProcessingTabId = null;
                    currentProcessingUrl = null;
                } else if (response && response.imageData) { // Check for response and imageData
                    // Log the type and beginning of the data for debugging, without assuming it's a string
                    console.log(`Received image data from content script (type: ${typeof response.imageData}):`, String(response.imageData).substring(0, 100) + "...");
                    // Pass apiKey, imageData, selectedModel, and tabId
                    callGeminiApi(apiKey, response.imageData, selectedModel, tabId);
                } else { // Handle cases where response exists but lacks imageData or is otherwise invalid
                    console.error('Invalid or no image data received from content script:', response);
                    sendPopupStatus('Error: Data gambar tidak valid dari halaman.');
                    // Stop auto-process if we can't get image data
                    isAutoProcessingEnabled = false;
                    waitingForNavigation = false;
                    currentProcessingTabId = null;
                    currentProcessingUrl = null;
                }
            }); // End Callback C (sendMessage)
        } // End Callback B (executeScript)
    ); // Closing parenthesis for executeScript call
} // End function getImageInfoFromContentScript


// --- Function to call Gemini API ---
// Helper function to convert Blob to Base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            // result includes "data:mime/type;base64," prefix, remove it
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.readAsDataURL(blob);
    });
}

// Added tabId parameter, accepts selectedModel
async function callGeminiApi(apiKey, imageDataUrl, selectedModel, tabId) {
    if (!tabId) {
        console.error("callGeminiApi called without a valid tabId.");
        sendPopupStatus("Error internal: Tab ID tidak valid saat panggil API.");
        isAutoProcessingEnabled = false; // Stop
        return;
    }
    console.log(`Calling Gemini API for model ${selectedModel} on Tab ID ${tabId}...`); // Use selectedModel
    sendPopupStatus('Mengolah gambar & memanggil API...'); // Update popup status

    // Construct endpoint dynamically using the selected model
    const GEMINI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`; // Use selectedModel
    console.log(`Using API Endpoint: ${GEMINI_API_ENDPOINT}`);

    let imageBase64 = null;
    let mimeType = 'image/jpeg'; // Default MIME type

    try {
        // --- Step 1: Fetch image from URL and convert to Base64 ---
        if (typeof imageDataUrl === 'string' && imageDataUrl.startsWith('http')) {
            console.log(`Fetching image from URL: ${imageDataUrl}`);
            const fetchResponse = await fetch(imageDataUrl);
            if (!fetchResponse.ok) {
                throw new Error(`Gagal mengunduh gambar: ${fetchResponse.status} ${fetchResponse.statusText}`);
            }
            const imageBlob = await fetchResponse.blob();
            // Try to get MIME type from response header, fallback to guessing or default
            const contentType = fetchResponse.headers.get('Content-Type');
            if (contentType && contentType.startsWith('image/')) {
                mimeType = contentType;
            } else if (imageDataUrl.endsWith('.png')) {
                 mimeType = 'image/png';
            } // Add more guesses if needed (.gif, .webp etc.)
             else {
                 mimeType = 'image/jpeg'; // Default assumption
            }
            console.log(`Determined/Assumed MIME type: ${mimeType}`);

            imageBase64 = await blobToBase64(imageBlob);
            console.log(`Image successfully converted to Base64 (length: ${imageBase64.length})`);
            sendPopupStatus('Gambar siap, memanggil Gemini API...');

        } else {
            // Handle cases where imageDataUrl is not a valid URL string (error?)
            throw new Error('Data gambar yang diterima bukan URL yang valid.');
        }

        // --- Step 2: Construct the API request body with Base64 data ---
        if (!imageBase64) {
             throw new Error('Gagal menyiapkan data gambar Base64.');
        }

        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: "Generate a suitable title, a detailed description (around 50-100 words), and 15-25 relevant keywords (comma-separated) for this image, suitable for a stock photo platform like Dreamstime. IMPORTANT: Ignore any watermarks present on the image itself and focus only on the main subject and scene. Describe the visual elements, concepts, and potential uses. Provide the output as a JSON object with keys 'title', 'description', and 'keywords'." },
                        {
                            inline_data: {
                                mime_type: mimeType, // Use determined MIME type
                                data: imageBase64    // Use the Base64 string
                            }
                        }
                    ]
                }
            ],
             "generationConfig": { // Optional: Fine-tune generation
                "temperature": 0.4,
                "topK": 32,
                "topP": 1,
                "maxOutputTokens": 8192, // Adjust as needed
                "stopSequences": []
            },
            "safetySettings": [ // Adjust safety settings as needed
                { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
                { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
                { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
                { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" }
            ]
        };

        console.log("Sending request to Gemini:", JSON.stringify(requestBody).substring(0, 200) + "..."); // Log snippet

        const response = await fetch(GEMINI_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Gemini API Error: ${response.status} ${response.statusText}`, errorBody);
            throw new Error(`HTTP error ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        console.log('Gemini API Response:', data);

        // --- Parse the response ---
        // This depends on the exact structure returned by Gemini based on the prompt
         if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
            const rawText = data.candidates[0].content.parts[0].text;
            console.log("Raw text from Gemini:", rawText);

            try {
                 // Find the first '{' and the last '}'
                 const firstBraceIndex = rawText.indexOf('{');
                 const lastBraceIndex = rawText.lastIndexOf('}');

                 if (firstBraceIndex === -1 || lastBraceIndex === -1 || lastBraceIndex < firstBraceIndex) {
                     throw new Error("Could not find a valid JSON structure '{...}' in the response text.");
                 }

                 // Extract the potential JSON block
                 let potentialJsonString = rawText.substring(firstBraceIndex, lastBraceIndex + 1);

                 // Clean markdown fences AND control characters from the extracted block, then trim
                 const cleanedJsonString = potentialJsonString
                    .replace(/^```(?:json)?\s*|\s*```$/g, "") // Remove markdown fences from start/end of the block
                    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove residual control characters
                    .trim();

                 console.log("Final cleaned JSON string for parsing:", cleanedJsonString);
                 // Attempt to parse the fully cleaned string
                 const metadata = JSON.parse(cleanedJsonString);

                if (metadata.title && metadata.description && metadata.keywords) {
                     console.log("Parsed Metadata:", metadata);
                    // 4. Send metadata back to content script, passing tabId along (modelName no longer needed here)
                    sendMetadataToContentScript(metadata, tabId);
                    sendPopupStatus('Metadata diterima, mengisi form...');
                } else {
                    throw new Error("JSON response missing required keys (title, description, keywords).");
                }
            } catch (parseError) {
                 console.error('Error parsing Gemini response:', parseError);
                 console.error('Raw response text was:', rawText);
                 sendPopupStatus('Error: Gagal memproses response AI.');
                 // Maybe try basic parsing if JSON fails? Or just report error.
            }
        } else {
             console.error('Unexpected Gemini API response structure:', data);
             throw new Error('Unexpected response structure from Gemini API.');
        }

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        sendPopupStatus(`Error: Gagal menghubungi API (${error.message})`);
        // Stop auto-process if API call fails
        isAutoProcessingEnabled = false;
        waitingForNavigation = false;
        currentProcessingTabId = null;
        currentProcessingUrl = null;
    }
}


// --- Function to send metadata to Content Script ---
// Removed modelName parameter, added tabId
function sendMetadataToContentScript(metadata, tabId) {
     if (!tabId) {
        console.error("sendMetadataToContentScript called without a valid tabId.");
        sendPopupStatus("Error internal: Tab ID tidak valid saat kirim metadata.");
        isAutoProcessingEnabled = false; // Stop
        return;
    }
    console.log(`Sending metadata to content script (Tab ID: ${tabId}):`, metadata);
    chrome.tabs.sendMessage(tabId, { action: 'fillMetadata', data: metadata }, (response) => {
         if (chrome.runtime.lastError) {
             // Log the error, but don't immediately stop auto-processing.
             // The submitAttempted message or lack of navigation will determine the next step.
             console.warn(`Error sending metadata to content script on Tab ID ${tabId} (might be due to navigation):`, chrome.runtime.lastError.message);
             // sendPopupStatus(`Warning: Gagal mengirim data (${chrome.runtime.lastError.message})`); // Optional: maybe too noisy
             // DO NOT stop auto-processing here:
             // isAutoProcessingEnabled = false;
             // waitingForNavigation = false;
             // currentProcessingTabId = null;
             // currentProcessingUrl = null;
         } else if (response && response.status === 'error') {
             // Handle specific error reported by content script during fill
             console.error('Content script reported error filling form:', response.message);
             sendPopupStatus(`Error: Gagal mengisi form (${response.message || 'unknown reason'})`);
             isAutoProcessingEnabled = false; // Stop if filling fails
             waitingForNavigation = false;
             currentProcessingTabId = null;
             currentProcessingUrl = null;
         } else {
             // Content script will now send 'submitAttempted' message separately.
             // We don't need to check response status here for triggering next step.
             console.log('Metadata sent to content script. Waiting for submit attempt message...');
             // Status was already updated: 'Metadata diterima, mengisi form...'
         }
    });
}


// --- Helper function to send status updates to Popup ---
function sendPopupStatus(statusText) {
    console.log(`Updating popup status: ${statusText}`);
    // Use runtime.sendMessage to send status to potentially open popups
    chrome.runtime.sendMessage({ action: 'updatePopupStatus', status: statusText });
}

// --- Helper function to send status updates to Popup ---
function sendPopupStatus(statusText) {
    console.log(`Updating popup status: ${statusText}`);
    // Use runtime.sendMessage to send status to potentially open popups
    chrome.runtime.sendMessage({ action: 'updatePopupStatus', status: statusText });
}

// --- Listener for Tab Updates (Navigation Detection) ---
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Ensure auto-processing is enabled AND we are waiting for navigation
    if (!isAutoProcessingEnabled || !waitingForNavigation) {
        return;
    }

    // Check if the update is for the tab we are currently processing
    if (tabId !== currentProcessingTabId) {
        return;
    }

    // Check if the URL has changed and the tab is fully loaded
    // Use tab.url as changeInfo.url might not be present for all status updates
    if (changeInfo.status === 'complete' && tab.url) {
        const newUrl = tab.url;
        const dreamstimeEditPattern = "*://*.dreamstime.com/upload/edit*"; // Match pattern

        console.log(`Tab ${tabId} updated. Status: ${changeInfo.status}, New URL: ${newUrl}, Old URL: ${currentProcessingUrl}`);

        // Check if the new URL matches the pattern AND is different from the old one
        if (newUrl.match(chrome.runtime.getManifest().host_permissions[0].replace('*://','').replace('/upload*','').replace('*','[^\/]+') + '/upload/edit[0-9]+') && // Basic regex check for edit page
            newUrl !== currentProcessingUrl)
        {
            console.log(`Navigation detected on Tab ${tabId} to new edit page: ${newUrl}`);
            waitingForNavigation = false; // Reset flag, we found the new page
            currentProcessingUrl = newUrl; // Update the current URL

            sendPopupStatus('Halaman baru dimuat, menunggu elemen...');

            // Wait a short delay for elements to potentially load on the new page
            const elementWaitDelayMs = 1500; // 1.5 seconds delay
            console.log(`Waiting ${elementWaitDelayMs}ms for elements to load...`);
            setTimeout(() => {
                if (!isAutoProcessingEnabled) {
                     console.log("Auto-processing was disabled during element wait. Stopping.");
                     return;
                }
                console.log(`Delay finished. Triggering analysis for new page: ${currentProcessingUrl}`);
                // Get API key again and start the process for the new page
                chrome.storage.local.get(['geminiApiKey'], (result) => {
                    // Get keys, model, and index again for the next iteration
                    chrome.storage.local.get(['apiKeys', 'selectedModel', 'lastKeyIndex'], (nextResult) => {
                        const nextApiKeys = nextResult.apiKeys;
                        const nextSelectedModel = nextResult.selectedModel;
                        let nextLastKeyIndex = nextResult.lastKeyIndex !== undefined ? nextResult.lastKeyIndex : -1;

                        if (!nextApiKeys || nextApiKeys.length === 0 || !nextSelectedModel) {
                            console.error('API Keys or Model not found before starting next analysis.');
                            sendPopupStatus('Error: Pengaturan API/Model hilang. Otomatisasi dihentikan.');
                            isAutoProcessingEnabled = false;
                            return;
                        }

                        // Rotate key for the next call
                        let nextIndexToUse = (nextLastKeyIndex + 1) % nextApiKeys.length;
                        const nextApiKey = nextApiKeys[nextIndexToUse];
                        console.log(`Next analysis: Using API Key at index ${nextIndexToUse}`);

                        // Save the new index
                        chrome.storage.local.set({ lastKeyIndex: nextIndexToUse });

                        // Call getImageInfo for the *same tab* which has now navigated
                        getImageInfoFromContentScript(nextApiKey, nextSelectedModel, currentProcessingTabId);
                    });
                });
            }, elementWaitDelayMs);

        } else if (newUrl === currentProcessingUrl) {
             // URL didn't change, might be other updates (e.g., title). Ignore.
             // console.log(`Tab ${tabId} updated but URL (${newUrl}) hasn't changed from ${currentProcessingUrl}. Ignoring.`);
        } else {
             // URL changed but doesn't match the edit pattern. Maybe navigated away?
             console.warn(`Tab ${tabId} navigated to a non-edit URL: ${newUrl}. Stopping auto-process.`);
             isAutoProcessingEnabled = false;
             waitingForNavigation = false;
             currentProcessingTabId = null;
             currentProcessingUrl = null;
             // Don't clear model name
             sendPopupStatus('Navigasi ke halaman tak dikenal. Otomatisasi dihentikan.');
        }
    }
});


// --- Optional: Initialization or other background tasks ---
chrome.runtime.onInstalled.addListener(() => {
    console.log('RJ Dreamstime Auto-Metadata extension installed/updated.');
    // Perform any first-time setup if needed
    isAutoProcessingEnabled = false; // Ensure it's disabled on install/update
    waitingForNavigation = false;
    currentProcessingTabId = null;
    currentProcessingUrl = null;
    // Don't clear model name on install/update, keep user's last selection
    // chrome.storage.local.remove(['lastKeyIndex']); // Optionally reset index on update
});

// Listener to clear state if the processing tab is closed
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    if (tabId === currentProcessingTabId) {
        console.warn(`Processing tab (ID: ${tabId}) was closed. Stopping auto-process.`);
        isAutoProcessingEnabled = false;
        waitingForNavigation = false;
        currentProcessingTabId = null;
        currentProcessingUrl = null;
        // Don't clear model name when tab is closed
        sendPopupStatus('Tab proses ditutup. Otomatisasi dihentikan.');
    }
});
