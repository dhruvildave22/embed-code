// Content script for Text Rephraser extension

let currentSelection = null; // Store the current selection
let selectionWatcher = null; // Store selection watcher

// Initialize selection tracking when page loads
initializeSelectionTracking();

function initializeSelectionTracking() {
  // Track selection changes to store the most recent valid selection
  document.addEventListener('mouseup', handleSelectionChange);
  document.addEventListener('keyup', handleSelectionChange);
}

function handleSelectionChange() {
  const selection = window.getSelection();
  if (selection.rangeCount > 0 && selection.toString().trim().length > 0) {
    // Store valid selection
    currentSelection = {
      range: selection.getRangeAt(0).cloneRange(),
      text: selection.toString(),
      timestamp: Date.now()
    };
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "rephraseText") {
    handleRephraseRequest(request.selectedText);
  }
});

// Handle rephrase request
async function handleRephraseRequest(selectedText) {
  // Show loading modal
  showModal(selectedText, "Loading...", true);
  
  try {
    // Send API request to background script
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: "callAPI",
        text: selectedText
      }, resolve);
    });
    
    if (response.success) {
      // Update modal with results
      showModal(selectedText, response.rephrasedText, false);
    } else {
      showModal(selectedText, "Error: " + response.error, false);
    }
  } catch (error) {
    showModal(selectedText, "Error: Failed to rephrase text", false);
  }
}

// Create and show modal
function showModal(originalText, rephrasedText, isLoading) {
  // Remove existing modal if any
  const existingModal = document.getElementById('rephraser-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create modal HTML with editable textarea
  const modal = document.createElement('div');
  modal.id = 'rephraser-modal';
  modal.innerHTML = `
    <div class="rephraser-modal-overlay">
      <div class="rephraser-modal-content">
        <div class="rephraser-modal-header">
          <h3>Text Rephraser AI</h3>
          <button class="rephraser-close-btn">×</button>
        </div>
        
        <div class="rephraser-section">
          <label>Original Text:</label>
          <div class="rephraser-text-box original-text">${escapeHtml(originalText)}</div>
        </div>
        
        <div class="rephraser-section">
          <label>Rephrased Text:</label>
          ${isLoading ? 
            `<div class="rephraser-text-box rephrased-text loading">
              <div class="spinner"></div>
            </div>` :
            `<textarea 
              class="rephraser-textarea" 
              rows="4" 
              placeholder="Rephrased text will appear here..."
            >${escapeHtml(rephrasedText)}</textarea>
            <div class="rephraser-textarea-info">
              <span class="char-count">${rephrasedText.length} characters</span>
              <button class="rephraser-btn-small regenerate-btn">🔄 Regenerate</button>
            </div>`
          }
        </div>
        
        <div class="rephraser-buttons">
          <button class="rephraser-btn copy-btn" ${isLoading ? 'disabled' : ''}>
            📋 Copy
          </button>
          <button class="rephraser-btn replace-btn" ${isLoading ? 'disabled' : ''}>
            🔄 Replace on Page
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to page
  document.body.appendChild(modal);
  
  // Always add basic event listeners (close functionality)
  addBasicModalListeners(modal);
  
  // Add full event listeners if not loading
  if (!isLoading) {
    addModalEventListeners(originalText, rephrasedText);
  }
  
  // Make modal draggable
  makeDraggable(modal.querySelector('.rephraser-modal-content'));
}

// Add basic event listeners that work even during loading
function addBasicModalListeners(modal) {
  // Close button event listener
  const closeBtn = modal.querySelector('.rephraser-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.remove();
    });
  }
  
  // Close modal when clicking outside (on overlay)
  const overlay = modal.querySelector('.rephraser-modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        modal.remove();
      }
    });
  }
  
  // Close modal with Escape key
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

// Add event listeners to modal buttons
function addModalEventListeners(originalText, rephrasedText) {
  const modal = document.getElementById('rephraser-modal');
  const textarea = modal.querySelector('.rephraser-textarea');
  const charCount = modal.querySelector('.char-count');
  
  // Update character count as user types
  if (textarea && charCount) {
    textarea.addEventListener('input', () => {
      const count = textarea.value.length;
      charCount.textContent = `${count} characters`;
      
      // Add visual feedback for length
      if (count > 1000) {
        charCount.style.color = '#dc3545'; // Red for very long
      } else if (count > 500) {
        charCount.style.color = '#ffc107'; // Yellow for long
      } else {
        charCount.style.color = '#6c757d'; // Default gray
      }
    });
    
    // Auto-resize textarea based on content
    textarea.addEventListener('input', autoResizeTextarea);
    autoResizeTextarea.call(textarea); // Initial resize
  }
  
  // Copy button - now gets text from textarea
  modal.querySelector('.copy-btn').addEventListener('click', () => {
    const textToCopy = textarea ? textarea.value : rephrasedText;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      showButtonFeedback(modal.querySelector('.copy-btn'), '✅ Copied!');
    }).catch(() => {
      // Fallback for older browsers
      fallbackCopy(textToCopy);
      showButtonFeedback(modal.querySelector('.copy-btn'), '✅ Copied!');
    });
  });
  
  // Replace button - now gets text from textarea
  modal.querySelector('.replace-btn').addEventListener('click', () => {
    const textToReplace = textarea ? textarea.value : rephrasedText;
    const success = replaceSelectedText(originalText, textToReplace);
    
    if (success) {
      showButtonFeedback(modal.querySelector('.replace-btn'), '✅ Replaced!');
      setTimeout(() => modal.remove(), 1000);
    } else {
      showButtonFeedback(modal.querySelector('.replace-btn'), '❌ Failed to replace', 2000);
    }
  });
  
  // Regenerate button - calls API again
  const regenerateBtn = modal.querySelector('.regenerate-btn');
  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', async () => {
      regenerateBtn.disabled = true;
      regenerateBtn.textContent = '⏳ Regenerating...';
      
      try {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: "callAPI",
            text: originalText
          }, resolve);
        });
        
        if (response.success && textarea) {
          textarea.value = response.rephrasedText;
          textarea.dispatchEvent(new Event('input')); // Trigger char count update
          autoResizeTextarea.call(textarea);
          showButtonFeedback(regenerateBtn, '✅ Regenerated!', 1500);
        } else {
          showButtonFeedback(regenerateBtn, '❌ Failed', 2000);
        }
      } catch (error) {
        showButtonFeedback(regenerateBtn, '❌ Error', 2000);
      }
      
      setTimeout(() => {
        regenerateBtn.disabled = false;
        regenerateBtn.textContent = '🔄 Regenerate';
      }, 1500);
    });
  }
}

// Auto-resize textarea function
function autoResizeTextarea() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 200) + 'px'; // Max 200px height
}

function showButtonFeedback(button, message, duration = 1000) {
  const originalText = button.textContent;
  button.textContent = message;
  setTimeout(() => button.textContent = originalText, duration);
}

function fallbackCopy(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
}

// Replace selected text on the page using multiple strategies
function replaceSelectedText(originalText, newText) {
  console.log('Attempting to replace text:', { originalText, newText });
  
  // Strategy 1: Use stored selection if it matches
  if (currentSelection && currentSelection.text === originalText) {
    try {
      // Check if range is still valid
      const container = currentSelection.range.commonAncestorContainer;
      if (container && document.contains(container)) {
        currentSelection.range.deleteContents();
        currentSelection.range.insertNode(document.createTextNode(newText));
        currentSelection = null; // Clear after use
        console.log('Successfully replaced using stored selection');
        return true;
      }
    } catch (error) {
      console.log('Stored selection failed:', error);
    }
  }
  
  // Strategy 2: Try current selection
  try {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      
      if (selectedText === originalText) {
        range.deleteContents();
        range.insertNode(document.createTextNode(newText));
        selection.removeAllRanges();
        console.log('Successfully replaced using current selection');
        return true;
      }
    }
  } catch (error) {
    console.log('Current selection failed:', error);
  }
  
  // Strategy 3: Find exact text match in DOM
  return findAndReplaceInDOM(originalText, newText);
}

function findAndReplaceInDOM(originalText, newText) {
  try {
    // Create a tree walker to traverse text nodes
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip script and style elements
          if (node.parentElement && 
              (node.parentElement.tagName === 'SCRIPT' || 
               node.parentElement.tagName === 'STYLE' ||
               node.parentElement.id === 'rephraser-modal')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    // Look for exact matches first
    for (const textNode of textNodes) {
      if (textNode.textContent === originalText) {
        textNode.textContent = newText;
        console.log('Successfully replaced exact match in DOM');
        return true;
      }
    }
    
    // Look for partial matches (text might be split across nodes or contain the text)
    for (const textNode of textNodes) {
      if (textNode.textContent.includes(originalText)) {
        // Only replace if it's a clean match (not partial word)
        const regex = new RegExp('\\b' + escapeRegExp(originalText) + '\\b');
        if (regex.test(textNode.textContent)) {
          textNode.textContent = textNode.textContent.replace(regex, newText);
          console.log('Successfully replaced partial match in DOM');
          return true;
        }
      }
    }
    
    console.log('No matching text found in DOM');
    return false;
  } catch (error) {
    console.error('DOM replacement failed:', error);
    return false;
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Make modal draggable
function makeDraggable(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  const header = element.querySelector('.rephraser-modal-header');
  
  header.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
    header.style.cursor = 'grabbing';
  }
  
  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }
  
  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    header.style.cursor = 'grab';
  }
  
  header.style.cursor = 'grab';
}

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}