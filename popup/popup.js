// DOM Elements (Updated for File Input)
const apiKeyFileInput = document.getElementById('apiKeyFile'); // Input file element
const saveSettingsButton = document.getElementById('saveSettingsButton'); // Changed button ID
const fileStatus = document.getElementById('fileStatus'); // Changed status ID
const modelSelect = document.getElementById('modelSelect');
const analyzeButton = document.getElementById('analyzeButton');
const statusDisplay = document.querySelector('#content p:first-of-type');
// Updated elements for auto-processing v3
const stopAutoButton = document.getElementById('stopAutoButton'); // Keep this one


// --- Defaults ---
const DEFAULT_MODEL = 'gemini-1.5-flash';

// --- Global variable to hold file content temporarily ---
let loadedApiKeys = [];
let loadedFileName = '';

// Load saved settings when popup opens
document.addEventListener('DOMContentLoaded', () => {
    // Load saved file name and model
    chrome.storage.local.get(['apiKeyFileName', 'selectedModel', 'apiKeys', 'lastKeyIndex'], (result) => {
        // Display loaded file name if available
        if (result.apiKeyFileName) {
            fileStatus.textContent = `File dimuat: ${result.apiKeyFileName}`;
            console.log(`Loaded file name: ${result.apiKeyFileName}`);
            // Optionally store the loaded keys and index if needed immediately,
            // but background script will handle the actual usage.
            // loadedApiKeys = result.apiKeys || []; // Example if needed in popup
        } else {
            fileStatus.textContent = 'Belum ada file API Key yang dimuat.';
            console.log('No API Key file name found in storage.');
        }

        // Load Selected Model
        if (result.selectedModel) {
            modelSelect.value = result.selectedModel;
            console.log(`Selected model loaded: ${result.selectedModel}`);
        } else {
            modelSelect.value = DEFAULT_MODEL; // Set default if nothing saved
            console.log(`No saved model found, using default: ${DEFAULT_MODEL}`);
        }

        // Ask background script for initial auto-process state
        console.log('Asking background script for initial autoProcessEnabled state...');
        chrome.runtime.sendMessage({ action: 'getAutoProcessState' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error getting initial state:', chrome.runtime.lastError.message);
                stopAutoButton.style.display = 'none'; // Default to hidden on error
            } else {
                const isEnabled = response?.isEnabled || false;
                console.log('Initial autoProcessEnabled state received:', isEnabled);
                stopAutoButton.style.display = isEnabled ? 'inline-block' : 'none';
            }
        });
    });
});

// --- Helper Function to Update Auto Button States ---
// --- Event Listener for File Input Change ---
apiKeyFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        console.log('No file selected.');
        return;
    }

    if (file.type !== 'text/plain') {
        fileStatus.textContent = 'Error: Pilih file .txt';
        console.error('Invalid file type selected.');
        loadedApiKeys = []; // Clear any previously loaded keys
        loadedFileName = '';
        apiKeyFileInput.value = ''; // Reset file input
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        // Split by newline, trim whitespace, filter out empty lines
        loadedApiKeys = content.split(/\r?\n/)
                               .map(key => key.trim())
                               .filter(key => key.length > 0);

        if (loadedApiKeys.length > 0) {
            loadedFileName = file.name;
            fileStatus.textContent = `File "${loadedFileName}" siap di-load (${loadedApiKeys.length} key). Klik Simpan.`;
            console.log(`File "${loadedFileName}" read successfully, ${loadedApiKeys.length} keys found.`);
        } else {
            fileStatus.textContent = 'Error: File .txt kosong atau tidak ada API key valid.';
            console.error('File content is empty or contains no valid keys.');
            loadedApiKeys = [];
            loadedFileName = '';
            apiKeyFileInput.value = ''; // Reset file input
        }
    };
    reader.onerror = (e) => {
        fileStatus.textContent = 'Error: Gagal membaca file.';
        console.error('Error reading file:', e);
        loadedApiKeys = [];
        loadedFileName = '';
        apiKeyFileInput.value = ''; // Reset file input
    };
    reader.readAsText(file);
});

// --- Save Settings Button Listener ---
saveSettingsButton.addEventListener('click', () => {
    const selectedModel = modelSelect.value;

    if (loadedApiKeys.length > 0 && loadedFileName) {
        // Save the list of keys, the filename, the selected model, and reset the key index
        chrome.storage.local.set({
            apiKeys: loadedApiKeys,
            apiKeyFileName: loadedFileName,
            selectedModel: selectedModel,
            lastKeyIndex: -1 // Reset index to -1 so background starts with 0
        }, () => {
            fileStatus.textContent = `File "${loadedFileName}" & Model disimpan!`;
            console.log(`Settings saved: ${loadedFileName}, ${selectedModel}, ${loadedApiKeys.length} keys.`);
            // Clear temporary variables after saving
            // loadedApiKeys = [];
            // loadedFileName = '';
            // apiKeyFileInput.value = ''; // Optionally reset file input after save
            setTimeout(() => {
                 // Keep showing loaded file name after timeout
                 chrome.storage.local.get(['apiKeyFileName'], (result) => {
                     if (result.apiKeyFileName) {
                         fileStatus.textContent = `File dimuat: ${result.apiKeyFileName}`;
                     } else {
                          fileStatus.textContent = 'Belum ada file API Key yang dimuat.';
                     }
                 });
            }, 2500); // Clear message after 2.5 seconds
        });
    } else {
        // If no new file was loaded, just save the model selection
        chrome.storage.local.get(['apiKeyFileName', 'apiKeys'], (result) => {
             if (result.apiKeyFileName && result.apiKeys && result.apiKeys.length > 0) {
                 // File already loaded, just save the model
                 chrome.storage.local.set({ selectedModel: selectedModel }, () => {
                     fileStatus.textContent = `Model pilihan (${selectedModel}) disimpan.`;
                     console.log(`Model selection saved: ${selectedModel}. Using existing file: ${result.apiKeyFileName}`);
                     setTimeout(() => {
                         fileStatus.textContent = `File dimuat: ${result.apiKeyFileName}`;
                     }, 2000);
                 });
             } else {
                 // No file loaded and no new file selected
                 fileStatus.textContent = 'Pilih file .txt berisi API Key terlebih dahulu.';
                 setTimeout(() => { fileStatus.textContent = ''; }, 2000);
             }
        });
    }
});


// Handle Analyze Button click (No longer sends model directly)
analyzeButton.addEventListener('click', () => {
    statusDisplay.textContent = 'Status: Mengirim perintah analisis...';
    console.log(`Analyze button clicked. Telling background to enable auto-process.`);

    // Tell background to enable auto-process
    chrome.runtime.sendMessage({ action: 'enableAutoProcess' }, () => {
         if (chrome.runtime.lastError) {
             console.error("Error enabling auto-process:", chrome.runtime.lastError.message);
             statusDisplay.textContent = 'Status: Error mengaktifkan auto-proses.';
             return;
         }
        console.log('Background script acknowledged enableAutoProcess.');
        stopAutoButton.style.display = 'inline-block'; // Show Stop button

        // Send message to background script to process the *current* file
        // Background will now retrieve keys and model from storage
        chrome.runtime.sendMessage({ action: 'startAnalysis' }, (response) => {
            if (chrome.runtime.lastError) {
            // Handle errors if the background script is inactive or has an issue
            statusDisplay.textContent = `Status: Error (${chrome.runtime.lastError.message})`;
            console.error('Error sending message:', chrome.runtime.lastError);
        } else if (response && response.status) {
            // Update status based on initial response from background (optional)
            statusDisplay.textContent = `Status: ${response.status}`;
            console.log('Received response from background:', response);
        } else {
             // Handle cases where background script doesn't send an immediate response
             console.log('Message sent to background script, awaiting further updates.');
             // Status might be updated later via messages from background script
        }
    }); // End of chrome.runtime.sendMessage (startAnalysis)
  }); // End of chrome.runtime.sendMessage (enableAutoProcess)
});

// Optional: Listen for status updates from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Only listen for general status updates now
    if (message.action === 'updatePopupStatus' && message.status) {
        statusDisplay.textContent = `Status: ${message.status}`;
        console.log('Popup status updated:', message.status);
    }
});

// --- Stop Auto Button Listener ---

stopAutoButton.addEventListener('click', () => {
    console.log('Stop Auto button clicked.');
    // Tell background to disable auto-process
    chrome.runtime.sendMessage({ action: 'disableAutoProcess' }, () => {
         if (chrome.runtime.lastError) {
             console.error("Error disabling auto-process:", chrome.runtime.lastError.message);
             // Maybe still hide button? Or show error?
             statusDisplay.textContent = 'Status: Error menghentikan auto-proses.';
         } else {
            console.log('Background script acknowledged disableAutoProcess.');
            stopAutoButton.style.display = 'none'; // Hide Stop button
            statusDisplay.textContent = 'Status: Otomatisasi dihentikan.'; // Update status
         }
    });
});
