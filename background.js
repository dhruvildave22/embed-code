// Background service worker for Text Rephraser extension
console.log('Background script loaded!');

// Create context menu when extension starts
chrome.runtime.onStartup.addListener(createContextMenu);
chrome.runtime.onInstalled.addListener(createContextMenu);

function createContextMenu() {
  console.log('Creating context menu...');
  chrome.contextMenus.create({
    id: "rephraseText",
    title: "Rephrase this with AI",
    contexts: ["selection"]
  });
  console.log('Context menu created');
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "rephraseText" && info.selectionText) {
    // Send selected text to content script
    chrome.tabs.sendMessage(tab.id, {
      action: "rephraseText",
      selectedText: info.selectionText
    });
  }
});

// Handle messages from content script (for API calls)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "callAPI") {
    rephraseText(request.text)
      .then(result => {
        sendResponse({ success: true, rephrasedText: result });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to indicate we'll send response asynchronously
    return true;
  }
});

// Mock API function - replace this with your real API call
async function rephraseText(text) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock rephrased response
  return `Rephrased: ${text}`;
}