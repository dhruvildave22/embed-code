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
    rephraseText(request.text, request.style)
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

// Mock API function with style support - replace this with your real API call
async function rephraseText(text, style = 'professional') {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock rephrased responses based on style
  const stylePrompts = {
    professional: `Professional version: ${text}`,
    casual: `Hey! Here's a casual take: ${text}`,
    formal: `In formal terms: ${text}`,
    creative: `Creative twist: ${text}`,
    funny: `Funny version: ${text} 😄`,
    concise: `Brief: ${text}`,
    detailed: `Detailed explanation: ${text}`,
    persuasive: `Compelling argument: ${text}`
  };
  
  return stylePrompts[style] || `Rephrased (${style}): ${text}`;
}