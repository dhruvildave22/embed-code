// Popup functionality for Text Rephraser extension

// Mode switching functionality
document.addEventListener('DOMContentLoaded', function() {
  console.log('Popup script loaded');
  
  const modeTabs = document.querySelectorAll('.mode-tab');
  const modePanels = document.querySelectorAll('.mode-panel');
  const inputText = document.getElementById('input-text');
  const rephraseBtn = document.getElementById('rephrase-btn');
  const charCountPopup = document.querySelector('.char-count-popup');
  const resultSection = document.getElementById('result-section');
  const outputText = document.getElementById('output-text');
  const copyResultBtn = document.getElementById('copy-result-btn');
  const regenerateBtn = document.getElementById('regenerate-result-btn');
  const styleDropdown = document.getElementById('rephrase-style');
  const styleHint = document.getElementById('style-hint');

  console.log('Found elements:', {
    modeTabs: modeTabs.length,
    modePanels: modePanels.length,
    inputText: !!inputText,
    rephraseBtn: !!rephraseBtn,
    styleDropdown: !!styleDropdown
  });

  // Mode tab switching with simpler approach
  modeTabs.forEach((tab, index) => {
    console.log(`Adding click listener to tab ${index}:`, tab.dataset.mode);
    tab.addEventListener('click', function(e) {
      console.log('Tab clicked:', this.dataset.mode);
      e.preventDefault();
      e.stopPropagation();
      
      const mode = this.dataset.mode;
      console.log('Switching to mode:', mode);
      
      // Update active tab
      document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      // Update active panel
      document.querySelectorAll('.mode-panel').forEach(panel => {
        panel.classList.remove('active');
      });
      
      const targetPanel = document.getElementById(mode + '-mode');
      if (targetPanel) {
        targetPanel.classList.add('active');
        console.log('Activated panel:', targetPanel.id);
      } else {
        console.error('Panel not found:', mode + '-mode');
      }
    });
  });

  // Input text functionality
  if (inputText && charCountPopup && rephraseBtn) {
    console.log('Setting up input text functionality');
    
    inputText.addEventListener('input', () => {
      const length = inputText.value.length;
      charCountPopup.textContent = `${length} characters`;
      
      // Enable/disable rephrase button
      rephraseBtn.disabled = length === 0;
      
      // Color code character count
      if (length > 1000) {
        charCountPopup.style.color = '#dc3545';
      } else if (length > 500) {
        charCountPopup.style.color = '#ffc107';
      } else {
        charCountPopup.style.color = '#6c757d';
      }
    });
  } else {
    console.error('Missing elements for input functionality:', {
      inputText: !!inputText,
      charCountPopup: !!charCountPopup,
      rephraseBtn: !!rephraseBtn
    });
  }

  // Rephrase button functionality
  if (rephraseBtn) {
    rephraseBtn.addEventListener('click', async () => {
      const text = inputText.value.trim();
      const selectedStyle = styleDropdown ? styleDropdown.value : 'professional';
      
      if (!text) return;

      // Show loading state
      rephraseBtn.disabled = true;
      rephraseBtn.textContent = '⏳ Rephrasing...';

      try {
        // Send message to background script with style
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: "callAPI",
            text: text,
            style: selectedStyle
          }, resolve);
        });

        if (response && response.success) {
          outputText.value = response.rephrasedText;
          resultSection.classList.remove('hidden');
        } else {
          outputText.value = 'Error: Failed to rephrase text';
          resultSection.classList.remove('hidden');
        }
      } catch (error) {
        outputText.value = 'Error: ' + error.message;
        resultSection.classList.remove('hidden');
      }

      // Reset button
      rephraseBtn.disabled = false;
      rephraseBtn.textContent = '🤖 Rephrase Text';
    });
  }

  // Copy result functionality
  if (copyResultBtn && outputText) {
    copyResultBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(outputText.value).then(() => {
        const originalText = copyResultBtn.textContent;
        copyResultBtn.textContent = '✅ Copied!';
        setTimeout(() => {
          copyResultBtn.textContent = originalText;
        }, 1000);
      }).catch(() => {
        // Fallback for older browsers
        outputText.select();
        document.execCommand('copy');
        const originalText = copyResultBtn.textContent;
        copyResultBtn.textContent = '✅ Copied!';
        setTimeout(() => {
          copyResultBtn.textContent = originalText;
        }, 1000);
      });
    });
  }

  // Regenerate functionality
  if (regenerateBtn && inputText && outputText) {
    regenerateBtn.addEventListener('click', async () => {
      const text = inputText.value.trim();
      const selectedStyle = styleDropdown ? styleDropdown.value : 'professional';
      
      if (!text) return;

      regenerateBtn.disabled = true;
      regenerateBtn.textContent = '⏳ Regenerating...';

      try {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: "callAPI",
            text: text,
            style: selectedStyle
          }, resolve);
        });

        if (response && response.success) {
          outputText.value = response.rephrasedText;
        } else {
          outputText.value = 'Error: Failed to regenerate text';
        }
      } catch (error) {
        outputText.value = 'Error: ' + error.message;
      }

      regenerateBtn.disabled = false;
      regenerateBtn.textContent = '🔄 Regenerate';
    });
  }

  // Style dropdown change handler
  if (styleDropdown && styleHint) {
    styleDropdown.addEventListener('change', () => {
      const selectedOption = styleDropdown.options[styleDropdown.selectedIndex];
      styleHint.textContent = `Using: ${selectedOption.textContent} style`;
    });
  }
});