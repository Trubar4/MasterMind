// App version - increment this when making changes
window.APP_VERSION = '3.1.1';

// Make sure analytics is defined before any other script tries to use it
window.analytics = window.analytics || {
  initialize: function() {},
  trackGameStart: function() {},
  trackGameEnd: function() {},
  trackInteraction: function() {},
  trackError: function() {},
  trackPerformance: function() {},
  setEnabled: function() {}
};

// ============================
// 1. CONSTANTS AND GLOBALS
// ============================
// Colors for the game
const COLORS = [
  "#FF0000", // Red
  "#FFFF00", // Yellow
  "#FFC000", // Orange/Gold
  "#F36DED", // Pink
  "#0070C0", // Blue
  "#00B050", // Green
  "#A6A6A6", // Gray
  "#000000", // Black
];

// Game modes
const GAME_MODES = {
  BOTH: 'both',
  CODEMAKER: 'codemakerMode',
  CODEBREAKER: 'codebreakerMode',
};

// Game configuration
const MAX_ROWS = 10;
let CODE_LENGTH = 4;

// Translations
const translations = {
  en: {
    congratulations: "Code cracked",
    newGame: "New Game",
    submit: "Submit",
    giveUp: "Give Up",
    giveUpShort: "Show",
    check: "Check",
    colours: "Color",
    positions: "Position",
    codemaker: "Maker",
    codebreaker: "Breaker",
    mode: "Mode",
    both: "2 Player",
    codemakerMode: "Computer breaks Code",
    codebreakerMode: "Computer creates Code",
    findCode: "  Find the code.",
    circles: "Circles"
  },
  de: {
    congratulations: "Code geknackt",
    newGame: "Neues Spiel",
    submit: "Senden",
    giveUp: "Zeigen",
    giveUpShort: "Zeige",
    check: "Prüfen",
    colours: "Farbe",
    positions: "Position",
    codemaker: "Ersteller",
    codebreaker: "Löser",
    mode: "Modus",
    both: "2-Spieler",
    codemakerMode: "Computer knackt Code",
    codebreakerMode: "Computer erstellt Code",
    findCode: "  Finde den Code.",
    circles: "Kreise"
  }
};

// Game state
let currentLang = 'de';
let currentMode = GAME_MODES.BOTH;
let gameOver = false;
let secretCode = [];
let currentRow = 1;
let currentGuess = Array(CODE_LENGTH).fill(null);
let isCodemakerTurn = true;

// DOM Elements - will be initialized when DOM is loaded
let board;
let guessArea;
let colorPicker;
let modePicker;
let codemakerLabel;
let codebreakerLabel;
let newGameBtn;
let submitBtn;
let checkButton = null;

// ============================
// 2. UTILITY FUNCTIONS
// ============================

/**
 * Utility function for debugging
 */
function debug(message) {
  console.log(`[DEBUG] ${message}`);
}

/**
 * Get appropriate column width based on screen size
 */
function getColumnWidth() {
  if (window.innerWidth <= 320) {
    return 50;
  } else if (window.innerWidth <= 400) {
    return 60;
  } else if (window.innerWidth <= 500) {
    return 70;
  } else {
    return 80;
  }
}

/**
 * Update resource links with version parameter
 */
function updateResourceLinks() {
  debug(`Updating resource links with version: ${window.APP_VERSION}`);
  
  // Update CSS link
  const stylesLink = document.getElementById('styles-link');
  if (stylesLink) {
    stylesLink.href = `styles.css?v=${window.APP_VERSION}`;
  }
  
  // Update manifest link
  const manifestLink = document.getElementById('manifest-link');
  if (manifestLink) {
    manifestLink.href = `manifest.json?v=${window.APP_VERSION}`;
  }
}

/**
 * Force refresh the application
 */
function forceRefresh() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for (let registration of registrations) {
        debug('Unregistering service worker');
        registration.unregister();
      }
      
      // Clear caches
      if (window.caches) {
        caches.keys().then(function(names) {
          for (let name of names) {
            caches.delete(name);
          }
        });
      }
      
      debug('All service workers unregistered and caches cleared, reloading page');
      window.location.reload(true);
    });
  } else {
    // Fallback for browsers without service worker support
    window.location.reload(true);
  }
}

// ============================
// 3. INITIALIZATION FUNCTIONS
// ============================

/**
 * Initialize DOM references
 */
function initDomReferences() {
  debug('Initializing DOM references');
  
  board = document.getElementById("board");
  guessArea = document.getElementById("guess-area");
  colorPicker = document.getElementById("color-picker");
  modePicker = document.getElementById("modepicker");
  codemakerLabel = document.getElementById("codemaker-label");
  codebreakerLabel = document.getElementById("codebreaker-label");
  newGameBtn = document.getElementById("new-gamebtn");
  submitBtn = document.getElementById("submitbtn");
  
  // Check if we found all elements
  const allFound = board && guessArea && colorPicker && modePicker && 
                   codemakerLabel && codebreakerLabel && newGameBtn && submitBtn;
  
  debug(`All DOM elements found: ${allFound}`);
  
  if (!allFound) {
    console.error('Missing DOM elements:', {
      board: !!board,
      guessArea: !!guessArea,
      colorPicker: !!colorPicker,
      modePicker: !!modePicker,
      codemakerLabel: !!codemakerLabel,
      codebreakerLabel: !!codebreakerLabel,
      newGameBtn: !!newGameBtn,
      submitBtn: !!submitBtn
    });
  }
  
  return allFound;
}

/**
 * Set up language switcher
 */
function setupLanguageSwitcher() {
  debug('Setting up language switcher');
  document.querySelectorAll('.lang-option').forEach(option => {
    option.addEventListener('click', () => {
      const lang = option.dataset.lang;
      setLanguage(lang);
    });
  });
}

/**
 * Set the current language
 */
function setLanguage(lang) {
  debug(`Setting language to: ${lang}`);
  currentLang = lang;
  
  document.querySelectorAll('.translatable').forEach(element => {
    const key = element.dataset.key;
    if (key && translations[lang][key]) {
      element.textContent = translations[lang][key];
    }
  });

  document.querySelectorAll('.lang-option').forEach(option => {
    option.classList.toggle('active', option.dataset.lang === lang);
  });
  
  updateModePicker();
  colorizeHeading();
  
  //Track language change
  window.analytics.trackInteraction('language_change', { language: lang });
}

/**
 * Update mode picker with current options and language
 */
function updateModePicker() {
  debug('Updating mode picker');
  
  // Clear existing options
  modePicker.innerHTML = '';
  
  // Create new options with correct translations
  const modeOptions = [
    { mode: GAME_MODES.BOTH, key: 'both' },
    { mode: GAME_MODES.CODEMAKER, key: 'codemakerMode' },
    { mode: GAME_MODES.CODEBREAKER, key: 'codebreakerMode' }
  ];
  
  // Add mode options
  modeOptions.forEach(option => {
    const div = document.createElement('div');
    div.className = 'mode-option';
    div.dataset.mode = option.mode;
    div.textContent = translations[currentLang][option.key];
    
    // Add selected class if this is the current mode
    if (option.mode === currentMode) {
      div.classList.add('selected');
    }
    
    div.addEventListener('click', function(event) {
      // Get the selected mode from the clicked option
      const selectedMode = this.dataset.mode;
      
      // Update the mode
      currentMode = selectedMode;
      
      // Update selection visual
      document.querySelectorAll('.mode-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.mode === currentMode);
      });
      
      // Hide the mode picker
      modePicker.classList.add("hidden");
      modePicker.style.display = 'none';
      
      // Start new game
      initGame();
      
      // Prevent event bubbling
      event.stopPropagation();
    });
    
    modePicker.appendChild(div);
  });
  
  // Add separator line
  const separator = document.createElement('hr');
  separator.className = 'mode-separator';
  modePicker.appendChild(separator);
  
  // Add circle length selector
  const circlesContainer = document.createElement('div');
  circlesContainer.className = 'circles-selector';
  
  // Add label
  const circlesLabel = document.createElement('span');
  circlesLabel.className = 'circles-label';
  circlesLabel.textContent = translations[currentLang].circles + ':';
  circlesContainer.appendChild(circlesLabel);
  
  // Add space
  circlesContainer.appendChild(document.createTextNode(' '));
  
  // Add circle length options
  const circleLengths = [4, 5];
  circleLengths.forEach((length, index) => {
    const option = document.createElement('span');
    option.className = 'circle-length-option';
    option.dataset.length = length;
    option.textContent = length;
    
    // Add selected class if this is the current length
    if (length === CODE_LENGTH) {
      option.classList.add('selected');
    }
    
    option.addEventListener('click', function(event) {
      // Get the selected length
      const selectedLength = parseInt(this.dataset.length);
      
      // Update CODE_LENGTH
      CODE_LENGTH = selectedLength;
      
      // Update selection visual
      document.querySelectorAll('.circle-length-option').forEach(opt => {
        opt.classList.toggle('selected', parseInt(opt.dataset.length) === CODE_LENGTH);
      });
      
      // Recalculate grid layout for new CODE_LENGTH
      calculateGridLayout();
      
      // Prevent event bubbling
      event.stopPropagation();
    });
    
    circlesContainer.appendChild(option);
    
    // Add separator between options (but not after the last one)
    if (index < circleLengths.length - 1) {
      const separator = document.createElement('span');
      separator.className = 'circle-length-separator';
      separator.textContent = ' | ';
      circlesContainer.appendChild(separator);
    }
  });
  
  modePicker.appendChild(circlesContainer);
  
  // Add event tracking for mode selection
  document.querySelectorAll('.mode-option').forEach(option => {
    const originalClickHandler = option.onclick;
    
    option.onclick = function(event) {
      const selectedMode = this.dataset.mode;
      
      // Track the mode selection
      window.analytics.trackInteraction('mode_select', { mode: selectedMode });
      
      // Call the original handler
      if (originalClickHandler) {
        originalClickHandler.call(this, event);
      }
    };
  });
}

/**
 * Add CSS for mode options
 */
function addModeCss() {
  debug('Adding mode CSS');
  const existingStyle = document.getElementById('mode-option-styles');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  const styleElement = document.createElement('style');
  styleElement.id = 'mode-option-styles';
  styleElement.textContent = `
    .mode-option {
      cursor: pointer;
      padding: 5px 10px;
      margin: 5px 0;
      border-radius: 4px;
      transition: background-color 0.2s;
      color: #888; /* Grey text for non-selected options */
      font-weight: normal;
    }
    
    .mode-option:hover {
      background-color: #e0e0e0;
    }
    
    .mode-option.selected {
      color: #000; /* Black text for selected option */
      font-weight: bold;
    }
    
    #modepicker {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: #DAE3F3;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      width: 240px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    /* Remove triangle pseudo-elements */
    #modepicker:after, #modepicker:before {
      display: none;
    }
  `;
  document.head.appendChild(styleElement);
}

/**
 * Initialize the game
 */
function initGame() {
  debug('Initializing game');
  
  // Make sure the mode picker is hidden
  modePicker.classList.add("hidden");
  
  // Clear the board and game state
  board.innerHTML = "";
  guessArea.innerHTML = "";
  secretCode = [];
  currentRow = 1;
  currentGuess = Array(CODE_LENGTH).fill(null);
  isCodemakerTurn = true;
  gameOver = false;
  
  // Always remove any existing message first
  removeFindCodeMessage();
  
  // Calculate grid layout based on current CODE_LENGTH
  calculateGridLayout();
  
  // Set up UI for the different modes
  if (currentMode === GAME_MODES.CODEBREAKER) {
    debug('Setting up codebreaker mode');
    isCodemakerTurn = false; // Computer creates the code
    codemakerLabel.classList.remove("active");
    codebreakerLabel.classList.add("active");
    
    // Show findCode message only in codebreakerMode
    showFindCodeMessage();
  } else {
    // Default behavior for 'both' and 'codemakerMode'
    codemakerLabel.classList.add("active");
    codebreakerLabel.classList.remove("active");
  }
  
  // Reset submit button
  submitBtn.setAttribute("disabled", "true");
  submitBtn.classList.remove("active");
  
  debug('Building game board');
  // Create rows (10-1)
  for (let row = MAX_ROWS; row >= 1; row--) {
    createGameRow(row);
  }
  
  debug('Creating guess area');
  // Create the guess area circles with current CODE_LENGTH
  for (let col = 0; col < CODE_LENGTH; col++) {
    const circle = document.createElement("div");
    circle.className = "circle";
    circle.dataset.col = col;
    circle.addEventListener("click", () => onGuessCircleClick(col));
    guessArea.appendChild(circle);
  }
  
  // Apply five-circles class if CODE_LENGTH is 5
  if (CODE_LENGTH === 5) {
    document.querySelectorAll('.circles-container').forEach(container => {
      container.classList.add('five-circles');
    });
    guessArea.classList.add('five-circles');
  } else {
    document.querySelectorAll('.circles-container').forEach(container => {
      container.classList.remove('five-circles');
    });
    guessArea.classList.remove('five-circles');
  }
  
  // Initialize the buttons
  initializeButtons();
  
  // Handle computer code creation in codebreakerMode
  if (currentMode === GAME_MODES.CODEBREAKER) {
    generateComputerCode();
  }
  
  // Track game start
  window.analytics.trackGameStart({
    mode: currentMode,
    codeLength: CODE_LENGTH,
    language: currentLang
  });
  
  // Fix roles display
  fixRolesDisplay();
  
  // Ensure all layout is correct
  adjustGameScaling();
  
  debug('Game initialized');
}

/**
 * Initialize buttons
 */
function initializeButtons() {
  debug('Initializing buttons');
  
  // Make sure the new game button is always active
  newGameBtn.classList.add("active");
  
  // Set the submit button to its initial state
  submitBtn.textContent = translations[currentLang].submit;
  
  if (currentMode === GAME_MODES.CODEBREAKER) {
    // In codebreaker mode, the submit button is for "give up"
    submitBtn.textContent = translations[currentLang].giveUp;
    submitBtn.disabled = false;
    submitBtn.removeAttribute("disabled");
    submitBtn.classList.add("active");
    submitBtn.onclick = function() {
      revealCode();
    };
  } else if (currentMode === GAME_MODES.CODEMAKER) {
    // In codemaker mode, button starts disabled until code is complete
    submitBtn.disabled = true;
    submitBtn.setAttribute("disabled", "true");
    submitBtn.classList.remove("active");
    
    // Reset the onclick handler to submitCode
    submitBtn.onclick = submitCode;
  } else {
    // Default mode (BOTH)
    if (isCodemakerTurn) {
      // In codemaker turn, button starts disabled until code is complete
      submitBtn.disabled = true;
      submitBtn.setAttribute("disabled", "true");
      submitBtn.classList.remove("active");
      
      // Reset the onclick handler to submitCode
      submitBtn.onclick = submitCode;
    } else {
      // In codebreaker turn, the submit button is for "give up"
      submitBtn.textContent = translations[currentLang].giveUp;
      submitBtn.disabled = false;
      submitBtn.removeAttribute("disabled");
      submitBtn.classList.add("active");
      submitBtn.onclick = function() {
        revealCode();
      };
    }
  }
}

/**
 * Initialize service worker
 */
function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      debug('Checking for service worker support');
      
      // Register service worker with version parameter
      navigator.serviceWorker.register(`./service-worker.js?v=${window.APP_VERSION}`)
        .then(reg => {
          debug('Service worker registered!');
          
          // Force update check immediately
          reg.update();
          
          // Setup regular update checks
          setInterval(() => {
            debug('Checking for service worker updates...');
            reg.update();
          }, 60 * 60 * 1000); // Check hourly
          
          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            debug('Service Worker update found!');
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                debug('New service worker installed and ready for use!');
                
                // Create a more visible update notification
                showUpdateNotification();
              }
            });
          });
        })
        .catch(err => {
          console.error('Service worker registration failed:', err);
        });
    });
  }
}

// ============================
// 4. UI MANIPULATION FUNCTIONS
// ============================

/**
 * Colorize the heading text
 */
function colorizeHeading() {
  debug('Colorizing heading');
  const heading = document.querySelector('h1');
  if (!heading) return;
  
  const text = heading.textContent;
  const colors = [
    "#FF0000", // Red
    "#FFC000", // Orange/Gold
    "#F36DED", // Pink
    "#0070C0", // Blue
    "#00B050", // Green
    "#A6A6A6", // Gray
    "#000000"  // Black
  ];
  
  // Create spans for each character with alternating colors
  let coloredText = '';
  for (let i = 0; i < text.length; i++) {
    const color = colors[i % colors.length];
    coloredText += `<span style="color: ${color}">${text[i]}</span>`;
  }
  
  heading.innerHTML = coloredText;
}

/**
 * Show the find code message
 */
function showFindCodeMessage() {
  debug('Showing find code message');
  // Always remove any existing message first
  removeFindCodeMessage();
  
  // Only proceed to create the message if we're explicitly in codebreakerMode
  if (currentMode !== GAME_MODES.CODEBREAKER) {
    return;
  }
  
  // Create message container and element
  const messageContainer = document.createElement('div');
  messageContainer.className = 'message-container';
  messageContainer.id = 'find-code-message-container';
  
  const messageElement = document.createElement('div');
  messageElement.id = 'find-code-message';
  messageElement.className = 'find-code-message';
  messageElement.textContent = translations[currentLang].findCode;
  
  messageContainer.appendChild(messageElement);
  
  // Insert directly above the game board
  const labels = document.querySelectorAll('.translatable');
  let colorLabel = null;
  
  // Find the color label element
  for (const label of labels) {
    if (label.dataset.key === 'colours') {
      colorLabel = label;
      break;
    }
  }
  
  if (colorLabel) {
    // Find the parent container that holds the labels
    const labelContainer = colorLabel.closest('div') || colorLabel.parentNode;
    
    // Insert the message above this container
    if (labelContainer && labelContainer.parentNode) {
      labelContainer.parentNode.insertBefore(messageContainer, labelContainer);
    } else {
      // Fallback to original implementation
      const boardParent = board.parentNode;
      boardParent.insertBefore(messageContainer, board);
    }
  } else {
    // Fallback to original implementation
    const boardParent = board.parentNode;
    boardParent.insertBefore(messageContainer, board);
  }
  
  // Ensure CSS exists for the message
  ensureFindCodeMessageCSS();
}

/**
 * Remove the find code message
 */
function removeFindCodeMessage() {
  debug('Removing find code message');
  const messageContainer = document.getElementById('find-code-message-container');
  if (messageContainer) {
    messageContainer.remove();
  }
}

/**
 * Ensure the find code message CSS exists
 */
function ensureFindCodeMessageCSS() {
  if (document.getElementById('find-code-message-styles')) {
    return; // CSS already exists
  }
  
  const style = document.createElement('style');
  style.id = 'find-code-message-styles';
  style.textContent = `
    .message-container {
      display: grid;
      grid-template-columns: 40px 40px 240px 80px; /* Match the main grid layout */
      width: 100%;
    }
    
    @media (max-width: 500px) {
      .message-container {
        grid-template-columns: 30px 30px 200px 70px;
      }
    }
    
    @media (max-width: 400px) {
      .message-container {
        grid-template-columns: 25px 25px 160px 60px;
      }
    }
    
    @media (max-width: 320px) {
      .message-container {
        grid-template-columns: 20px 20px 140px 50px;
      }
    }
    
    .find-code-message {
      grid-column: 1 / span 4;
      text-align: center;
      padding: 8px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 0.9rem;
      font-style: italic;
      width: 100%;
      box-sizing: border-box;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Create a game row
 */
function createGameRow(row) {
  const rowDiv = document.createElement("div");
  rowDiv.className = "row";
  
  // Row number (column 1)
  const rowNumber = document.createElement("span");
  rowNumber.className = "row-number";
  rowNumber.textContent = row;
  rowDiv.appendChild(rowNumber);
  
  // Colors feedback (column 2)
  const colorsFeedback = document.createElement("span");
  colorsFeedback.className = "colors-feedback";
  rowDiv.appendChild(colorsFeedback);
  
  // Circles container (column 3)
  const circlesContainer = document.createElement("div");
  circlesContainer.className = "circles-container";
  circlesContainer.dataset.row = row;
  
  // Create circles based on CODE_LENGTH
  for (let col = 0; col < CODE_LENGTH; col++) {
    const circle = document.createElement("div");
    circle.className = "circle";
    circle.dataset.row = row;
    circle.dataset.col = col;
    circle.addEventListener("click", () => onCircleClick(row, col));
    circlesContainer.appendChild(circle);
  }
  rowDiv.appendChild(circlesContainer);
  
  // Position feedback (column 4)
  const positionFeedback = document.createElement("span");
  positionFeedback.className = "position-feedback";
  rowDiv.appendChild(positionFeedback);
  
  board.appendChild(rowDiv);
}


/**
 * Add check button to the current row
 */
function addCheckButton() {
  debug(`Adding check button for row ${currentRow}`);
  
  if (checkButton) {
    checkButton.remove();
  }
  
  checkButton = document.createElement("button");
  checkButton.className = "check-btn translatable disabled";
  checkButton.dataset.key = "check";
  checkButton.dataset.row = currentRow; 
  checkButton.textContent = translations[currentLang].check;
  checkButton.disabled = true;
  checkButton.onclick = checkGuess;
  
  checkButton.style.width = getColumnWidth() + 'px';
  checkButton.style.margin = '0 auto';
  checkButton.style.display = 'flex';
  checkButton.style.justifyContent = 'center';
  checkButton.style.alignItems = 'center';
  
  // Ensure proper styling for disabled state
  checkButton.style.backgroundColor = '#B0BEC5';
  
  // Find the current row
  const row = document.querySelector(`.circles-container[data-row="${currentRow}"]`).closest('.row');
  if (row) {
    const positionFeedback = row.querySelector(".position-feedback");
    if (positionFeedback) {
      // Store existing content as data attribute
      positionFeedback.dataset.original = positionFeedback.textContent;
      
      // Clear the position feedback and add the button inside it
      positionFeedback.textContent = "";
      positionFeedback.appendChild(checkButton);
    }
  }
}

/**
 * Show update notification
 */
function showUpdateNotification() {
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.top = '0';
  notification.style.left = '0';
  notification.style.right = '0';
  notification.style.backgroundColor = '#4CAF50';
  notification.style.color = 'white';
  notification.style.padding = '16px';
  notification.style.textAlign = 'center';
  notification.style.zIndex = '10000';
  notification.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
  
  notification.innerHTML = `
    <strong>New version available!</strong> 
    <button id="update-button" style="margin-left:15px; padding:8px; background-color:white; color:#4CAF50; border:none; border-radius:4px; cursor:pointer;">
      Update Now
    </button>
  `;
  
  document.body.appendChild(notification);
  
  document.getElementById('update-button').addEventListener('click', function() {
    forceRefresh();
  });
}

/**
 * Fix roles display to make Maker and Breaker labels aligned correctly
 */
function fixRolesDisplay() {
  debug('Fixing roles display');
  
  // Get the roles element
  const roles = document.querySelector('.roles');
  if (!roles) return;
  
  // Get the labels
  const codemakerLabel = document.getElementById('codemaker-label');
  const codebreakerLabel = document.getElementById('codebreaker-label');
  
  if (!codemakerLabel || !codebreakerLabel) return;
  
  // Set flexbox layout instead of grid
  roles.style.display = 'flex';
  roles.style.justifyContent = 'space-between';
  roles.style.alignItems = 'center';
  roles.style.width = '100%';
  roles.style.padding = '0';
  
  // Preserve the active state
  if (isCodemakerTurn) {
    codemakerLabel.classList.add('active');
    codebreakerLabel.classList.remove('active');
  } else {
    codemakerLabel.classList.remove('active');
    codebreakerLabel.classList.add('active');
  }
}

/**
 * Ensure all circles have perfect 1:1 aspect ratio
 */
function ensurePerfectCircles() {
  const circles = document.querySelectorAll('.circle');
  
  circles.forEach(circle => {
    const width = parseInt(window.getComputedStyle(circle).width);
    circle.style.height = `${width}px`;
    circle.style.width = `${width}px`;
    circle.style.minWidth = `${width}px`;
    circle.style.minHeight = `${width}px`;
    circle.style.maxWidth = `${width}px`;
    circle.style.maxHeight = `${width}px`;
    circle.style.borderRadius = '50%';
  });
}

/**
 * Adjust game scaling based on screen dimensions
 */
function adjustGameScaling() {
  debug('Adjusting game scaling with aspect ratio preservation');
  
  // Calculate the grid layout first
  calculateGridLayout();
  
  const gameWrapper = document.querySelector('.game-wrapper');
  const container = document.querySelector('.container');
  
  if (!gameWrapper || !container) {
    console.error('Game wrapper or container not found');
    return;
  }
  
  // Get viewport dimensions
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  
  // Reset container to measure natural dimensions
  const originalTransform = container.style.transform;
  container.style.transform = 'none';
  
  // Force layout recalculation
  void container.offsetHeight;
  
  // Get natural dimensions
  const containerRect = container.getBoundingClientRect();
  const containerWidth = containerRect.width;
  const containerHeight = containerRect.height;
  
  // Calculate the natural aspect ratio of the game
  const aspectRatio = containerWidth / containerHeight;
  
  debug(`Natural container dimensions: ${containerWidth}x${containerHeight}, aspect ratio: ${aspectRatio}`);
  
  // Available space (with margin)
  const availableWidth = viewportWidth * 0.95;
  const availableHeight = viewportHeight * 0.95;
  
  // Calculate scale based on available space while preserving aspect ratio
  let scale;
  
  if (availableHeight * aspectRatio <= availableWidth) {
    // Height constrained
    scale = availableHeight / containerHeight;
    debug('Height constrained scaling');
  } else {
    // Width constrained
    scale = availableWidth / containerWidth;
    debug('Width constrained scaling');
  }
  
  // Cap the scale between min and max values
  scale = Math.min(Math.max(scale, 0.5), 1.25);
  
  debug(`Applying scale: ${scale}`);
  
  // Apply the scaling
  container.style.transform = `scale(${scale})`;
  
  // Set transform origin to top center
  container.style.transformOrigin = 'center top';
  
  // Position the wrapper
  gameWrapper.style.alignItems = 'flex-start';
  gameWrapper.style.paddingTop = '10px';
  
  // Ensure the game wrapper height accounts for the scaled content
  const scaledHeight = containerHeight * scale;
  gameWrapper.style.minHeight = `${scaledHeight + 20}px`;
  
  // Fix visual elements
  ensurePerfectCircles();
  ensureColumnAlignment();
  fixButtonScaling();
  fixClickHandlers();
  
  // Fix check button styling
  if (checkButton) {
    if (checkButton.disabled) {
      checkButton.classList.add("disabled");
      checkButton.classList.remove("active");
      checkButton.style.backgroundColor = '#B0BEC5';
    } else {
      checkButton.classList.add("active");
      checkButton.classList.remove("disabled");
      checkButton.style.backgroundColor = '#6200EE';
    }
  }
}

/**
 * Apply initial setup and scaling
 * This function should be called directly after DOM load
 */
function applyInitialSetup() {
  debug('Applying initial setup and scaling');
  
  // Make container visible but with no transform to get proper dimensions
  const container = document.querySelector('.container');
  if (container) {
    container.style.visibility = 'visible';
    container.style.transform = 'none';
    
    // Force layout calculation
    void document.body.offsetHeight;
    
    // Apply scaling
    adjustGameScaling();
  }
}

/**
 * Position a picker element properly for the current screen size
 */
function positionPicker(pickerElement, targetElement, isModePicker = false) {
  if (!pickerElement || !targetElement) return;
  
  debug(`Positioning ${isModePicker ? 'mode' : 'color'} picker`);
  
  // Get viewport dimensions
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  
  // Get the target's position relative to the viewport
  const targetRect = targetElement.getBoundingClientRect();
  
  // Make picker visible but hidden to measure dimensions
  pickerElement.style.visibility = 'hidden';
  pickerElement.style.display = isModePicker ? 'flex' : 'block';
  
  // Get picker dimensions
  const pickerRect = pickerElement.getBoundingClientRect();
  
  // Reset visibility
  pickerElement.style.visibility = '';
  
  if (isModePicker) {
    // Center the mode picker on the screen
    pickerElement.style.top = '50%';
    pickerElement.style.left = '50%';
    pickerElement.style.transform = 'translate(-50%, -50%)';
  } else {
    // Position color picker relative to the target element
    const triangleHeight = 10;
    const spacing = 5;
    
    // Calculate the center position of the target
    const targetCenterX = targetRect.left + (targetRect.width / 2);
    
    // Check if there's enough space above
    const spaceAbove = targetRect.top;
    
    if (spaceAbove < pickerRect.height + triangleHeight + spacing) {
      // Not enough space above, position below
      pickerElement.style.top = `${targetRect.bottom + triangleHeight + spacing}px`;
      
      // Adjust triangle to point upward
      const triangle = pickerElement.querySelector('.triangle');
      if (triangle) {
        triangle.style.top = '-10px';
        triangle.style.bottom = 'auto';
        triangle.style.borderTop = 'none';
        triangle.style.borderBottom = '10px solid #DAE3F3';
      }
    } else {
      // Position above
      pickerElement.style.top = `${targetRect.top - pickerRect.height - triangleHeight - spacing}px`;
      
      // Reset triangle to point downward
      const triangle = pickerElement.querySelector('.triangle');
      if (triangle) {
        triangle.style.top = 'auto';
        triangle.style.bottom = '-10px';
        triangle.style.borderTop = '10px solid #DAE3F3';
        triangle.style.borderBottom = 'none';
      }
    }
    
    // Center horizontally
    pickerElement.style.left = `${targetCenterX - (pickerRect.width / 2)}px`;
    
    // Ensure picker stays within viewport horizontally
    const rightEdge = parseFloat(pickerElement.style.left) + pickerRect.width;
    const leftEdge = parseFloat(pickerElement.style.left);
    
    if (rightEdge > viewportWidth) {
      pickerElement.style.left = `${viewportWidth - pickerRect.width - 10}px`;
    }
    
    if (leftEdge < 0) {
      pickerElement.style.left = '10px';
    }
  }
  
  // Make sure the picker is visible
  pickerElement.style.zIndex = '2000';
}

/**
 * Ensure the color picker has all color options
 */
function ensureColorPickerOptions() {
  debug('Ensuring color picker options with matching sizes');
  const colorsContainer = colorPicker.querySelector('.colors');
  
  // Clear existing colors
  colorsContainer.innerHTML = '';
  
  // Check if we are in 5-circle mode
  const isFiveCircles = CODE_LENGTH === 5;
  
  // Add or remove five-circles class
  colorPicker.classList.toggle('five-circles', isFiveCircles);
  
  // Get the size of the current game circles
  let circleSize;
  if (isCodemakerTurn) {
    // Get size from guess area circles
    const guessCircle = guessArea.querySelector('.circle');
    if (guessCircle) {
      circleSize = window.getComputedStyle(guessCircle).width;
    }
  } else {
    // Get size from the current row circles
    const currentRowCircle = document.querySelector(`.circles-container[data-row="${currentRow}"] .circle`);
    if (currentRowCircle) {
      circleSize = window.getComputedStyle(currentRowCircle).width;
    }
  }
  
  // If we couldn't get a size, use the default based on screen width
  if (!circleSize) {
    if (window.innerWidth <= 320) {
      circleSize = isFiveCircles ? '21px' : '28px';
    } else if (window.innerWidth <= 400) {
      circleSize = isFiveCircles ? '24px' : '32px';
    } else if (window.innerWidth <= 500) {
      circleSize = isFiveCircles ? '28px' : '36px';
    } else {
      circleSize = isFiveCircles ? '32px' : '40px';
    }
  }
  
  // Create style for color options with dynamic size
  const styleElement = document.getElementById('color-option-styles') || document.createElement('style');
  styleElement.id = 'color-option-styles';
  styleElement.textContent = `
    .color-option {
      width: ${circleSize};
      height: ${circleSize};
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid #ccc;
      box-sizing: border-box;
      transition: transform 0.1s;
      pointer-events: auto !important;
    }
    
    .color-option:hover, .color-option:active {
      transform: scale(1.1);
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
    }
  `;
  
  if (!document.getElementById('color-option-styles')) {
    document.head.appendChild(styleElement);
  }
  
  // Add all color options
  COLORS.forEach(color => {
    const option = document.createElement('div');
    option.className = 'color-option';
    option.style.backgroundColor = color;
    option.addEventListener('click', () => selectColor(color));
    colorsContainer.appendChild(option);
  });
  
  // Adjust color picker grid for 5 circles if needed
  if (isFiveCircles) {
    colorsContainer.style.gridTemplateColumns = 'repeat(4, auto)';
    colorsContainer.style.gap = '4px';
  } else {
    colorsContainer.style.gridTemplateColumns = 'repeat(4, auto)';
    colorsContainer.style.gap = '8px';
  }
}

/**
 * Ensure consistent column 6 alignment for dynamically created elements
 */
function ensureColumnAlignment() {
  debug('Ensuring column 6 alignment');
  
  // Fix check button position
  if (checkButton) {
    checkButton.style.margin = '0 auto';
    checkButton.style.marginLeft = '0';
    checkButton.style.width = getColumnWidth() + 'px';
    checkButton.style.justifyContent = 'center';
  }
  
  // Fix submit button alignment
  const submitBtn = document.getElementById('submitbtn');
  if (submitBtn) {
    submitBtn.style.margin = '0 auto';
    submitBtn.style.width = getColumnWidth() + 'px';
    submitBtn.style.maxWidth = getColumnWidth() + 'px';
    submitBtn.style.justifyContent = 'center';
  }
  
  // Fix position feedback elements
  const positionFeedbacks = document.querySelectorAll('.position-feedback');
  positionFeedbacks.forEach(feedback => {
    feedback.style.textAlign = 'center';
    feedback.style.width = '100%';
  });
  
  // Fix position header
  const positionHeader = document.querySelector('.positions-header');
  if (positionHeader) {
    positionHeader.style.textAlign = 'center';
    positionHeader.style.width = '100%';
  }
  
  // Fix codebreaker label
  const codebreakerLabel = document.getElementById('codebreaker-label');
  if (codebreakerLabel) {
    codebreakerLabel.style.justifyContent = 'center';
    codebreakerLabel.style.width = '100%';
  }
}

/**
 * Fix button scaling
 */
function fixButtonScaling() {
  debug('Fixing button scaling');
  
  // Get all buttons
  const buttons = document.querySelectorAll('button');
  
  // Fix button scaling if necessary
  buttons.forEach(button => {
    // Ensure proper sizing for the submit button
    if (button.id === 'submitbtn') {
      // Make sure submit button has proper max-width based on screen size
      if (window.innerWidth <= 320) {
        button.style.maxWidth = '50px';
      } else if (window.innerWidth <= 400) {
        button.style.maxWidth = '60px';
      } else if (window.innerWidth <= 500) {
        button.style.maxWidth = '70px';
      } else {
        button.style.maxWidth = '80px';
      }
    }
    
    // Ensure all buttons have pointer events
    button.style.pointerEvents = 'auto';
  });
}

/**
 * Fix click handlers for scaled elements
 */
function fixClickHandlers() {
  debug('Fixing click handlers for scaled elements');
  
  // Make sure the container has pointer-events: auto
  const container = document.querySelector('.container');
  if (container) {
    container.style.pointerEvents = 'auto';
  }
  
  // Make sure all circle elements have pointer-events: auto
  const circles = document.querySelectorAll('.circle');
  circles.forEach(circle => {
    circle.style.pointerEvents = 'auto';
  });
}

function calculateGridLayout() {
  debug('Calculating grid layout for CODE_LENGTH: ' + CODE_LENGTH);
  
  let col1Width, col2Width, col4Width, col6Width, gapSize;
  
  // Base measurements on screen width
  if (window.innerWidth <= 320) { // Very small screens
    col1Width = 20;
    col2Width = 20;
    col6Width = 50;
    gapSize = 1;
  } else if (window.innerWidth <= 400) { // Small screens
    col1Width = 25;
    col2Width = 25;
    col6Width = 60;
    gapSize = 3;
  } else if (window.innerWidth <= 500) { // Medium screens
    col1Width = 30;
    col2Width = 30;
    col6Width = 70;
    gapSize = 4;
  } else { // Large screens
    col1Width = 40;
    col2Width = 40;
    col6Width = 80;
    gapSize = 8;
  }
  
  // Calculate circle size based on screen width and CODE_LENGTH
  let circleSize;
  if (window.innerWidth <= 320) {
    circleSize = CODE_LENGTH === 5 ? 21 : 28;
  } else if (window.innerWidth <= 400) {
    circleSize = CODE_LENGTH === 5 ? 24 : 32;
  } else if (window.innerWidth <= 500) {
    circleSize = CODE_LENGTH === 5 ? 28 : 36;
  } else {
    circleSize = CODE_LENGTH === 5 ? 32 : 40;
  }
  
  // Calculate column 4 width based on circle size and count
  col4Width = (circleSize * CODE_LENGTH) + (gapSize * (CODE_LENGTH - 1));
  
  // Create grid template columns string
  const gridTemplate = `${col1Width}px ${col2Width}px 3px ${col4Width}px 3px ${col6Width}px`;
  
  debug(`Grid template: ${gridTemplate}`);
  
  // Apply the grid template to all grid elements
  const gridElements = document.querySelectorAll('.header, .row, .controls, .top-bar');
  gridElements.forEach(element => {
    element.style.gridTemplateColumns = gridTemplate;
  });
  
  // Update circles container and guess area width
  const circleContainers = document.querySelectorAll('.circles-container, #guess-area');
  circleContainers.forEach(container => {
    container.style.width = `${col4Width}px`;
    container.style.gap = `${gapSize}px`;
  });
  
  // Update circle size for both circle containers and guess area
  const allCircles = document.querySelectorAll('.circles-container .circle, #guess-area .circle');
  allCircles.forEach(circle => {
    circle.style.width = `${circleSize}px`;
    circle.style.height = `${circleSize}px`;
    circle.style.minWidth = `${circleSize}px`;
    circle.style.minHeight = `${circleSize}px`;
  });
  
  // Ensure perfectly round circles
  ensurePerfectCircles();
}

// ============================
// 5. GAME LOGIC FUNCTIONS
// ============================

/**
 * Generate a random code for the computer
 */
function generateComputerCode() {
  debug('Generating computer code');
  
  // Clear existing code and generate new one with correct length
  secretCode = [];
  for (let i = 0; i < CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * COLORS.length);
    secretCode[i] = COLORS[randomIndex];
  }
  
  // Update game state to codebreaker turn
  isCodemakerTurn = false;
  
  // Add check button for the first row
  addCheckButton();
}

/**
 * Submit the secret code
 */
function submitCode() {
  debug('Submitting code');
  
  if ((currentMode === GAME_MODES.BOTH || currentMode === GAME_MODES.CODEMAKER) && isCodemakerTurn) {
    // Set the secret code
    secretCode = [...currentGuess];
    
    currentGuess = Array(CODE_LENGTH).fill(null); // Reset the current guess
    isCodemakerTurn = false;
    codemakerLabel.classList.remove("active");
    codebreakerLabel.classList.add("active");
    
    submitBtn.disabled = false;
    submitBtn.removeAttribute("disabled");
    submitBtn.classList.add("active");
    
    // Clear guess area circles
    for (let col = 0; col < CODE_LENGTH; col++) {
      const circle = guessArea.children[col];
      if (circle) {
        circle.style.backgroundColor = "";
      }
    }
    
    if (currentMode === GAME_MODES.BOTH) {
      // Update button for "GIVE UP" functionality
      submitBtn.textContent = translations[currentLang].giveUp;
      submitBtn.onclick = revealCode;

      // Add check button for the first row
      addCheckButton();
    } 
    else if (currentMode === GAME_MODES.CODEMAKER) {
      // Handle computer guess logic
      computerGuess();
    }
  }
}

/**
 * Reveal the secret code (give up)
 */
function revealCode() {
  debug('Revealing code');
  
  // Reveal the secret code
  for (let i = 0; i < CODE_LENGTH; i++) {
    guessArea.children[i].style.backgroundColor = secretCode[i];
  }
  
  // Disable the submit button
  submitBtn.disabled = true;
  submitBtn.setAttribute("disabled", "true");
  submitBtn.classList.remove("active");
  
  // Remove the check button if it exists
  if (checkButton) {
    checkButton.remove();
    checkButton = null;
  }
  
  // Set game over state
  gameOver = true;
  
  // Remove click handlers from all circles in the current and future rows
  for (let row = currentRow; row <= MAX_ROWS; row++) {
    const circles = document.querySelectorAll(`.circles-container[data-row="${row}"] .circle`);
    circles.forEach(circle => {
      // Clone and replace to remove event listeners
      const newCircle = circle.cloneNode(true);
      circle.parentNode.replaceChild(newCircle, circle);
    });
  }
  
  // Track the give up event
  window.analytics.trackGameEnd('abandoned', currentRow - 1, true);
}

/**
 * Check the current guess against the secret code
 */
function checkGuess() {
  debug('Checking guess');
  
  // Get the current row's circles to ensure we have the correct colors
  const currentRowCircles = Array.from(document.querySelectorAll(`.circles-container[data-row="${currentRow}"] .circle`));
  
  // Make sure currentGuess is updated with the actual circle colors
  // Use getComputedStyle for more reliable color extraction
  currentGuess = currentRowCircles.map(circle => {
    const backgroundColor = window.getComputedStyle(circle).backgroundColor;
    return backgroundColor || null;
  });
  
  // Check if all colors are set
  if (currentGuess.some(color => !color)) {
    debug('Not all colors are selected, ignoring check');
    return; // Don't proceed if some colors are missing
  }
  
  const result = checkGuessLogic(secretCode, currentGuess);
  
  const row = document.querySelector(`.circles-container[data-row="${currentRow}"]`).closest('.row');
  
  // Remove check button from the position-feedback element
  if (checkButton) {
    checkButton.remove();
    checkButton = null;
  }
  
  // Set the feedback values
  row.querySelector(".colors-feedback").textContent = result.correctColors;
  row.querySelector(".position-feedback").textContent = result.correctPositions;
  
  // Reset current guess for next row
  currentGuess = Array(CODE_LENGTH).fill(null);
  
  // Check if game is won
  if (result.correctPositions === CODE_LENGTH) {
    // Game won
    alert(translations[currentLang].congratulations);
    submitBtn.setAttribute("disabled", "true");
    gameOver = true;
    return;
  }
  
  // Move to next row
  currentRow++;
  
  // Check if max rows reached
  if (currentRow > MAX_ROWS) {
    // Game over - max rows reached
    for (let i = 0; i < CODE_LENGTH; i++) {
      guessArea.children[i].style.backgroundColor = secretCode[i];
    }
    alert(`${translations[currentLang].gameOverFailed || "Couldn't crack the code."}`);
    submitBtn.setAttribute("disabled", "true");
    gameOver = true;
    return;
  }
  
  // Add check button for next row
  addCheckButton();
  
    // Check if game is won
   if (result.correctPositions === CODE_LENGTH) {
    // Game won
    window.analytics.trackGameEnd('win', currentRow, false);
    alert(translations[currentLang].congratulations);
    submitBtn.setAttribute("disabled", "true");
    gameOver = true;
    return;
  }
  
  // Check if max rows reached
  if (currentRow > MAX_ROWS) {
    // Game over - max rows reached
    window.analytics.trackGameEnd('loss', MAX_ROWS, false);
    for (let i = 0; i < CODE_LENGTH; i++) {
      guessArea.children[i].style.backgroundColor = secretCode[i];
    }
    alert(`${translations[currentLang].gameOverFailed || "Couldn't crack the code."}`);
    submitBtn.setAttribute("disabled", "true");
    gameOver = true;
    return;
  }
}

/**
 * Logic to check a guess against the secret code
 */
function checkGuessLogic(secret, guess) {
  debug('Running guess logic check');
  
  let correctPositions = 0;
  let correctColors = 0;
  
  if (!secret || !guess || secret.length !== CODE_LENGTH || guess.length !== CODE_LENGTH) {
    console.error('Invalid secret or guess:', { secret, guess });
    return { correctPositions: 0, correctColors: 0 };
  }
  
  // Create copies of the arrays to avoid modifying the originals
  const secretTemp = [...secret];
  const guessTemp = [...guess];
  
  // Normalize colors for comparison
  function normalizeColor(color) {
    if (!color) return null;
    if (color === '') return null;
    
    // If already in hex format (#RRGGBB)
    if (color.startsWith('#')) {
      // Convert hex to RGB for consistent comparison
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgb(${r},${g},${b})`;
    }
    
    // If in rgb format, standardize it
    if (color.startsWith('rgb')) {
      // Extract RGB values to be more robust
      const rgbValues = color.match(/\d+/g);
      if (rgbValues && rgbValues.length >= 3) {
        return `rgb(${rgbValues[0]},${rgbValues[1]},${rgbValues[2]})`;
      }
    }
    
    return color.toLowerCase().trim();
  }
  
  // Normalize all colors for comparison
  const normalizedSecret = secretTemp.map(normalizeColor);
  const normalizedGuess = guessTemp.map(normalizeColor);
  
  // Create working copies for our algorithm
  const secretCopy = [...normalizedSecret];
  const guessCopy = [...normalizedGuess];
  
  // First pass: check for correct positions
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessCopy[i] === secretCopy[i]) {
      correctPositions++;
      // Mark as counted by setting to special value
      secretCopy[i] = null;
      guessCopy[i] = null;
    }
  }
  
  // Second pass: check for correct colors in wrong positions
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessCopy[i] !== null) {
      for (let j = 0; j < CODE_LENGTH; j++) {
        if (secretCopy[j] !== null && guessCopy[i] === secretCopy[j]) {
          correctColors++;
          // Mark as counted
          secretCopy[j] = null;
          guessCopy[i] = null;
          break;
        }
      }
    }
  }
  
  return { correctPositions, correctColors };
}

/**
 * Computer guess algorithm
 */
function computerGuess() {
  debug('Starting computer guess algorithm');
  
  gameOver = false;
  currentRow = 1;
  
  const guessDelay = 1500; // Delay between guesses for visual effect
  const colors = COLORS;
  let possibleCodes = [];
  
  // Generate all possible codes (using indices for efficiency)
  // Dynamically handle code length (4 or 5)
  if (CODE_LENGTH === 4) {
    for (let i = 0; i < colors.length; i++) {
      for (let j = 0; j < colors.length; j++) {
        for (let k = 0; k < colors.length; k++) {
          for (let l = 0; l < colors.length; l++) {
            possibleCodes.push([i, j, k, l]);
          }
        }
      }
    }
  } else if (CODE_LENGTH === 5) {
    for (let i = 0; i < colors.length; i++) {
      for (let j = 0; j < colors.length; j++) {
        for (let k = 0; k < colors.length; k++) {
          for (let l = 0; l < colors.length; l++) {
            for (let m = 0; m < colors.length; m++) {
              possibleCodes.push([i, j, k, l, m]);
            }
          }
        }
      }
    }
  }
  
  debug(`Generated ${possibleCodes.length} possible codes`);
  
  // Start with a simple first guess based on code length
  let currentGuessIndices;
  if (CODE_LENGTH === 4) {
    currentGuessIndices = [0, 0, 1, 1]; // Equivalent to "1122"
  } else { // CODE_LENGTH === 5
    currentGuessIndices = [0, 0, 1, 1, 2]; // Equivalent to "11223"
  }
  
  let currentGuessColors = indicesToColors(currentGuessIndices, colors);
  
  // Convert indices to actual colors
  function indicesToColors(indices, colors) {
    return indices.map(index => colors[index]);
  }
  
  // Convert colors to indices
  function colorsToIndices(colorArray, colors) {
    return colorArray.map(color => {
      const normalizedColor = normalizeColor(color);
      for (let i = 0; i < colors.length; i++) {
        if (normalizeColor(colors[i]) === normalizedColor) {
          return i;
        }
      }
      return 0;
    });
  }
  
  // Normalize color format
  function normalizeColor(color) {
    if (!color) return null;
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgb(${r},${g},${b})`;
    }
    if (color.startsWith('rgb')) {
      const rgbValues = color.match(/\d+/g);
      if (rgbValues && rgbValues.length >= 3) {
        return `rgb(${rgbValues[0]},${rgbValues[1]},${rgbValues[2]})`;
      }
    }
    return color.toLowerCase().trim();
  }
  
  // Evaluate a guess - make sure it handles CODE_LENGTH properly
  function evaluateGuess(secretIndices, guessIndices) {
    let correctPositions = 0;
    let correctColors = 0;
    const secretCopy = [...secretIndices];
    const guessCopy = [...guessIndices];
    
    // Check correct positions
    for (let i = 0; i < CODE_LENGTH; i++) {
      if (guessCopy[i] === secretCopy[i]) {
        correctPositions++;
        secretCopy[i] = -1;
        guessCopy[i] = -2;
      }
    }
    
    // Check correct colors in wrong positions
    for (let i = 0; i < CODE_LENGTH; i++) {
      if (guessCopy[i] >= 0) {
        for (let j = 0; j < CODE_LENGTH; j++) {
          if (secretCopy[j] >= 0 && guessCopy[i] === secretCopy[j]) {
            correctColors++;
            secretCopy[j] = -1;
            break;
          }
        }
      }
    }
    
    return { correctPositions, correctColors };
  }
  
  // Filter codes based on feedback
  function filterCodes(codes, guessIndices, correctPositions, correctColors) {
    return codes.filter(codeIndices => {
      const result = evaluateGuess(codeIndices, guessIndices);
      return result.correctPositions === correctPositions && 
            result.correctColors === correctColors;
    });
  }
  
  // Choose next guess using minimax
  function chooseNextGuess() {
    if (possibleCodes.length === 1) return possibleCodes[0];
    
    let bestGuess = null;
    let minMaxScore = Infinity;
    
    // Sample candidate codes for efficiency
    const candidateCodes = possibleCodes.length <= 50 ? 
      possibleCodes : sampleCodes(possibleCodes, 50);
    
    for (const candidate of candidateCodes) {
      const scoreDistribution = {};
      
      // Sample evaluation codes for efficiency
      const evaluationCodes = possibleCodes.length <= 80 ? 
        possibleCodes : sampleCodes(possibleCodes, 80);
      
      for (const code of evaluationCodes) {
        const result = evaluateGuess(code, candidate);
        const key = `${result.correctPositions},${result.correctColors}`;
        scoreDistribution[key] = (scoreDistribution[key] || 0) + 1;
      }
      
      // Find max score (worst case)
      let maxScore = Math.max(...Object.values(scoreDistribution));
      
      if (maxScore < minMaxScore) {
        minMaxScore = maxScore;
        bestGuess = candidate;
      } else if (maxScore === minMaxScore && possibleCodes.some(c => 
        c.every((val, idx) => val === candidate[idx]))) {
        bestGuess = candidate;
      }
    }
    
    return bestGuess || possibleCodes[0];
  }
  
  // Sample codes for efficiency
  function sampleCodes(codes, sampleSize) {
    if (codes.length <= sampleSize) return [...codes];
    
    const sample = [];
    const codesCopy = [...codes];
    
    for (let i = 0; i < sampleSize; i++) {
      const randomIndex = Math.floor(Math.random() * codesCopy.length);
      sample.push(codesCopy[randomIndex]);
      codesCopy.splice(randomIndex, 1);
    }
    
    return sample;
  }
  
  // Display functions
  function displayComputerGuess(colorGuess, row) {
    const circles = document.querySelectorAll(`.circles-container[data-row="${row}"] .circle`);
    for (let i = 0; i < CODE_LENGTH; i++) {
      circles[i].style.backgroundColor = colorGuess[i];
    }
  }
  
  function displayFeedback(correctPositions, correctColors, row) {
    const rowElement = document.querySelector(`.circles-container[data-row="${row}"]`).closest('.row');
    rowElement.querySelector(".colors-feedback").textContent = correctColors;
    rowElement.querySelector(".position-feedback").textContent = correctPositions;
  }
  
  // Main guess function
  function makeGuess() {
    if (currentRow > MAX_ROWS || gameOver) return;
    
    // Display the computer's guess
    displayComputerGuess(currentGuessColors, currentRow);
    
    // Evaluate the guess
    const secretIndices = colorsToIndices(secretCode, colors);
    const { correctPositions, correctColors } = evaluateGuess(secretIndices, currentGuessIndices);
    
    // Display feedback
    displayFeedback(correctPositions, correctColors, currentRow);
    
    // Check if won
    if (correctPositions === CODE_LENGTH) {
      setTimeout(() => {
        alert(`${translations[currentLang].computerSuccess || "Computer cracked the code!"}`);
        gameOver = true;
      }, 500);
      return;
    }
    
    // Next row
    currentRow++;
    
    // Check if max rows reached
    if (currentRow > MAX_ROWS) {
      setTimeout(() => {
        alert(translations[currentLang].computerFailed || "Computer couldn't crack the code within the maximum attempts.");
        gameOver = true;
        // Show secret code
        for (let i = 0; i < CODE_LENGTH; i++) {
          guessArea.children[i].style.backgroundColor = secretCode[i];
        }
      }, 500);
      return;
    }
    
    // Filter and choose next guess
    possibleCodes = filterCodes(possibleCodes, currentGuessIndices, correctPositions, correctColors);
    currentGuessIndices = chooseNextGuess();
    currentGuessColors = indicesToColors(currentGuessIndices, colors);
    
    // Schedule next guess
    setTimeout(makeGuess, guessDelay);
  }
  
  // Start the process
  setTimeout(makeGuess, guessDelay);
}

// ============================
// 6. EVENT HANDLERS
// ============================

/**
 * Handle circle click
 */
function onCircleClick(row, col) {
  debug(`Circle clicked: row ${row}, col ${col}`);
  
  // Ignore clicks if game is over
  if (gameOver) {
    return;
  }
  
  // Show color picker for codebreaker turn in 'both' mode or in 'codebreakerMode'
  if ((currentMode === GAME_MODES.BOTH && !isCodemakerTurn && row === currentRow) ||
    (currentMode === GAME_MODES.CODEBREAKER && row === currentRow)) {
    
    showColorPicker(row, col, false);
    
    // Add check button when clicking on a codebreaker row
    // Only add if it doesn't exist yet for this row
    if (!checkButton || parseInt(checkButton.dataset.row) !== row) {
      addCheckButton();
    }
  }
}

/**
 * Handle guess circle click
 */
function onGuessCircleClick(col) {
  debug(`Guess circle clicked: col ${col}`);
  
  // Show color picker for codemaker turn in 'both' mode or in 'codemakerMode'
  if ((currentMode === GAME_MODES.BOTH && isCodemakerTurn) || currentMode === GAME_MODES.CODEMAKER) {
    showColorPicker(0, col, true);
  }
}

/**
 * Show the color picker
 */
function showColorPicker(row, col, isGuess) {
  debug(`Showing color picker: row ${row}, col ${col}, isGuess ${isGuess}`);
  
  // First make sure the color picker has all color options with proper sizing
  ensureColorPickerOptions();
  
  // Show the picker
  colorPicker.classList.remove("hidden");
  
  // Find the target circle
  const circle = isGuess
    ? guessArea.children[col]
    : document.querySelector(`.circles-container[data-row="${row}"] .circle[data-col="${col}"]`);
    
  if (!circle) {
    console.error('Target circle not found');
    return;
  }
  
  // Position the picker
  positionPicker(colorPicker, circle);
  
  // Store the current target info in the picker element
  colorPicker.dataset.row = row;
  colorPicker.dataset.col = col;
  colorPicker.dataset.isGuess = isGuess;
  
  // Make sure color picker is above everything else
  colorPicker.style.zIndex = "2000";
  
  // Ensure pointer events work on the color picker
  colorPicker.style.pointerEvents = 'auto';
  
  // Make sure the color options have pointer events too
  const colorOptions = colorPicker.querySelectorAll('.color-option');
  colorOptions.forEach(option => {
    option.style.pointerEvents = 'auto';
  });
}

/**
 * Select a color from the color picker
 */
function selectColor(color) {
  debug(`Color selected: ${color}`);
  
  // Get target info from the picker element
  const row = parseInt(colorPicker.dataset.row);
  const col = parseInt(colorPicker.dataset.col);
  const isGuess = colorPicker.dataset.isGuess === 'true';
  
  if (isGuess) {
    // This is for the codemaker (guessArea)
    guessArea.children[col].style.backgroundColor = color;
    currentGuess[col] = color;
    
    // Enable submit button if all codemaker circles are filled
    if (currentGuess.every(c => c !== null)) {
      submitBtn.removeAttribute("disabled");
      submitBtn.classList.add("active");
    }
  } else {
    // This is for the codebreaker (board rows)
    const circle = document.querySelector(`.circles-container[data-row="${row}"] .circle[data-col="${col}"]`);
    if (circle) {
      circle.style.backgroundColor = color;
    }
    
    // In codebreaker mode, make sure currentGuess is updated correctly
    // Find all circles in the current row and get their colors
    const currentRowCircles = Array.from(document.querySelectorAll(`.circles-container[data-row="${row}"] .circle`));
    currentGuess = currentRowCircles.map(circle => circle.style.backgroundColor);
    
    // Enable check button if all circles in this row are filled
    const allFilled = currentGuess.every(c => c && c !== '');
    if (allFilled && checkButton) {
      checkButton.disabled = false;
      checkButton.removeAttribute("disabled");
      checkButton.classList.remove("disabled");
      checkButton.classList.add("active");
    }
  }
  
  // Track color selection
  window.analytics.trackInteraction('color_select', { 
    color: color,
    isCodemaker: isGuess,
    row: row
  });
  
  // Hide the color picker
  hideColorPicker();
}

/**
 * Hide the color picker
 */
function hideColorPicker() {
  debug('Hiding color picker');
  
  // Add the hidden class
  colorPicker.classList.add("hidden");
  
  // Reset any inline styles
  colorPicker.style.display = '';
  colorPicker.style.visibility = '';
}

/**
 * Add document click handler to close picker when clicking outside
 */
function setupDocumentClickHandler() {
  debug('Setting up document click handler');
  
  document.addEventListener('click', function(event) {
    // Color picker handling
    if (
      !colorPicker.contains(event.target) && 
      !event.target.classList.contains('circle') && 
      !colorPicker.classList.contains('hidden')
    ) {
      hideColorPicker();
    }
    
    // Mode picker handling
    if (
      modePicker && 
      !modePicker.contains(event.target) && 
      event.target.id !== 'new-gamebtn' && 
      !modePicker.classList.contains('hidden')
    ) {
      modePicker.classList.add("hidden");
      modePicker.style.display = 'none';
    }
  });
}

/**
 * Add window resize handler with improved aspect ratio preservation
 */
function setupResizeHandler() {
  debug('Setting up resize and orientation change handlers');
  
  // Remove any existing handlers
  if (window.resizeHandler) {
    window.removeEventListener('resize', window.resizeHandler);
  }
  
  // Create new resize handler with debounce
  let resizeTimeout;
  window.resizeHandler = function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
      debug('Window resize detected, adjusting scaling...');
      adjustGameScaling();
    }, 100);
  };
  
  // Add resize event listener
  window.addEventListener('resize', window.resizeHandler);
  
  // Handle orientation changes explicitly
  window.addEventListener('orientationchange', function() {
    debug('Orientation change detected');
    // Apply scaling after short delay to allow orientation to complete
    setTimeout(adjustGameScaling, 200);
  });
}


// ============================
// 7. MAIN INITIALIZATION
// ============================

// Make force refresh globally available
window.forceRefresh = forceRefresh;

// Add a global error handler
window.addEventListener('error', function(event) {
  console.error('Global error caught:', event.error);

  // Track the error
  window.analytics.trackError('javascript', {
    message: event.error ? event.error.message : 'Unknown error',
    stack: event.error ? event.error.stack : null,
    source: event.filename,
    line: event.lineno,
    column: event.colno
  });
});

// Main initialization when DOM content is loaded
document.addEventListener('DOMContentLoaded', function() {
  debug('DOM fully loaded, initializing game...');
  
  // Signal that we're running
  window.modulesLoaded = true;
  
  // First check if we can access all DOM elements
  if (!initDomReferences()) {
    console.error('Failed to initialize DOM references');
    return;
  }
  
  // Initialize analytics with your tracking ID
  window.analytics.initialize('G-W35Z46N2NT');
  addAnalyticsTranslations();
  addAnalyticsSettings();
  initializeEnhancedAnalytics(); // Add this line
  
  // Track page load performance
  if (window.performance) {
    const pageLoadTime = window.performance.timing.domContentLoadedEventEnd - 
                        window.performance.timing.navigationStart;
    window.analytics.trackPerformance('page_load', pageLoadTime, {
      appVersion: window.APP_VERSION
    });
  }
  
  // Update resource links with version
  updateResourceLinks();
  
  // Colorize the heading
  colorizeHeading();
  
  // Set default language
  setLanguage(currentLang);
  
  // Add CSS for mode options
  addModeCss();
  
  // Set up language switcher
  setupLanguageSwitcher();
  
  // Set up document click handler
  setupDocumentClickHandler();
  
  // Set up resize handler
  setupResizeHandler();
  
  // Apply initial scaling BEFORE initializing game
  applyInitialSetup();
  
  // Initialize the game
  initGame();
  
  // Set up new game button
  newGameBtn.addEventListener("click", function(event) {
    debug('New Game button clicked');
    event.stopPropagation();
    
    modePicker.classList.remove("hidden");
    updateModePicker();
    
    // Position the mode picker
    positionPicker(modePicker, newGameBtn, true);
  });
  
  // Initialize service worker
  initServiceWorker();
  
  debug('Game initialized successfully');
  
  // Apply scaling again after short delay to ensure all elements are rendered
  setTimeout(adjustGameScaling, 100);
  
  // Automatically show the mode picker when the page loads
  setTimeout(function() {
    debug('Auto-triggering new game button');
    modePicker.classList.remove("hidden");
    modePicker.style.display = 'flex';
    updateModePicker();
    
    // Position the picker properly
    positionPicker(modePicker, newGameBtn, true);
    
    // Apply scaling again
    adjustGameScaling();
  }, 300);
  
  // One final scaling adjustment after all animations and transitions
  setTimeout(adjustGameScaling, 1000);
});


// ============================
// 8. Analytic settings and functions
// ============================
function addAnalyticsSettings() {
  // Create a settings icon in the top bar
  const topBar = document.querySelector('.top-bar');
  const settingsIcon = document.createElement('div');
  settingsIcon.className = 'settings-icon';
  settingsIcon.innerHTML = '⚙️';
  settingsIcon.style.cursor = 'pointer';
  settingsIcon.style.fontSize = '1.2rem';
  settingsIcon.style.marginLeft = 'auto';
  settingsIcon.style.marginRight = '10px';
  
  settingsIcon.addEventListener('click', function() {
    showAnalyticsSettings();
  });
  
  topBar.appendChild(settingsIcon);
}


function showAnalyticsSettings() {
  // Create a simple modal for analytics settings
  const modal = document.createElement('div');
  modal.className = 'analytics-settings-modal';
  modal.style.position = 'fixed';
  modal.style.top = '50%';
  modal.style.left = '50%';
  modal.style.transform = 'translate(-50%, -50%)';
  modal.style.backgroundColor = '#DAE3F3';
  modal.style.padding = '20px';
  modal.style.borderRadius = '8px';
  modal.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  modal.style.zIndex = '3000';
  modal.style.minWidth = '250px';
  
  // Add content
  const heading = document.createElement('h3');
  heading.textContent = translations[currentLang].settings || 'Settings';
  heading.style.marginTop = '0';
  
  const analyticsLabel = document.createElement('label');
  analyticsLabel.style.display = 'block';
  analyticsLabel.style.margin = '10px 0';
  
  const analyticsCheckbox = document.createElement('input');
  analyticsCheckbox.type = 'checkbox';
  analyticsCheckbox.checked = window.analytics.enabled;
  analyticsCheckbox.style.marginRight = '10px';
  
  analyticsLabel.appendChild(analyticsCheckbox);
  analyticsLabel.appendChild(document.createTextNode(
    translations[currentLang].enableAnalytics || 'Enable analytics'
  ));
  
  // Add stats button
  const statsButton = document.createElement('button');
  statsButton.textContent = translations[currentLang].viewStats || 'View Statistics';
  statsButton.style.margin = '10px 0';
  statsButton.style.padding = '5px 10px';
  statsButton.style.backgroundColor = '#4CAF50';
  statsButton.style.color = 'white';
  statsButton.style.border = 'none';
  statsButton.style.borderRadius = '4px';
  statsButton.style.cursor = 'pointer';
  statsButton.style.width = '100%';
  
  statsButton.addEventListener('click', function() {
    document.body.removeChild(modal);
    showAnalyticsDashboard();
  });
  
  // Close button
  const closeButton = document.createElement('button');
  closeButton.textContent = translations[currentLang].close || 'Close';
  closeButton.style.marginTop = '15px';
  closeButton.style.padding = '5px 10px';
  closeButton.style.backgroundColor = '#6200EE';
  closeButton.style.color = 'white';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '4px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.width = '100%';
  
  closeButton.addEventListener('click', function() {
    document.body.removeChild(modal);
  });
  
  // Event listener for checkbox
  analyticsCheckbox.addEventListener('change', function() {
    window.analytics.setEnabled(this.checked);
  });
  
  // Assemble the modal
  modal.appendChild(heading);
  modal.appendChild(analyticsLabel);
  modal.appendChild(statsButton);
  modal.appendChild(closeButton);
  
  // Add modal to the page
  document.body.appendChild(modal);
}

function showAnalyticsDashboard() {
  // Get stats from analytics
  const stats = window.analytics.getPlayerStats();
  if (!stats) {
    alert("No analytics data available");
    return;
  }
  
  // Create dashboard modal
  const modal = document.createElement('div');
  modal.className = 'analytics-dashboard-modal';
  modal.style.position = 'fixed';
  modal.style.top = '50%';
  modal.style.left = '50%';
  modal.style.transform = 'translate(-50%, -50%)';
  modal.style.backgroundColor = '#DAE3F3';
  modal.style.padding = '20px';
  modal.style.borderRadius = '8px';
  modal.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  modal.style.zIndex = '3000';
  modal.style.width = '90%';
  modal.style.maxWidth = '500px';
  modal.style.maxHeight = '80vh';
  modal.style.overflow = 'auto';

  // Add title
  const heading = document.createElement('h3');
  heading.textContent = translations[currentLang].playerStats || 'Your Game Statistics';
  heading.style.marginTop = '0';
  heading.style.textAlign = 'center';
  heading.style.borderBottom = '1px solid #ccc';
  heading.style.paddingBottom = '10px';
  
  // Create stats container
  const statsContainer = document.createElement('div');
  statsContainer.style.display = 'grid';
  statsContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
  statsContainer.style.gap = '15px';
  statsContainer.style.marginTop = '15px';
  
  // Browser/Device info
  const deviceInfo = document.createElement('div');
  deviceInfo.style.gridColumn = '1 / span 2';
  deviceInfo.style.backgroundColor = '#f0f5ff';
  deviceInfo.style.padding = '10px';
  deviceInfo.style.borderRadius = '5px';
  deviceInfo.style.marginBottom = '10px';
  
  const browserInfo = detectBrowserInfo();
  deviceInfo.innerHTML = `
    <strong>${translations[currentLang].deviceInfo || 'Your Device'}</strong>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 5px;">
      <div>${translations[currentLang].browser || 'Browser'}:</div>
      <div>${browserInfo.browser} ${browserInfo.browserVersion}</div>
      <div>${translations[currentLang].os || 'OS'}:</div>
      <div>${browserInfo.os}</div>
      <div>${translations[currentLang].deviceType || 'Device Type'}:</div>
      <div>${browserInfo.deviceType}</div>
      <div>${translations[currentLang].screenSize || 'Screen Size'}:</div>
      <div>${window.innerWidth}x${window.innerHeight}</div>
    </div>
  `;
  
  // Add basic stats
  const statItems = [
    { label: translations[currentLang].totalGames || 'Total Games', value: stats.totalGames },
    { label: translations[currentLang].wins || 'Wins', value: stats.wins },
    { label: translations[currentLang].losses || 'Losses', value: stats.losses },
    { label: translations[currentLang].abandoned || 'Abandoned', value: stats.abandoned },
    { label: translations[currentLang].avgAttempts || 'Avg. Attempts', value: stats.averageAttempts },
    { label: translations[currentLang].avgDuration || 'Avg. Duration', value: `${stats.averageDuration}s` },
    { label: translations[currentLang].preferredMode || 'Preferred Mode', value: getModeName(stats.preferredMode) },
    { label: translations[currentLang].preferredLength || 'Preferred Length', value: stats.preferredCodeLength }
  ];
  
  statItems.forEach(item => {
    const statBlock = document.createElement('div');
    statBlock.style.backgroundColor = '#f0f5ff';
    statBlock.style.padding = '10px';
    statBlock.style.borderRadius = '5px';
    statBlock.style.textAlign = 'center';
    
    const label = document.createElement('div');
    label.textContent = item.label;
    label.style.fontSize = '0.8rem';
    label.style.color = '#555';
    
    const value = document.createElement('div');
    value.textContent = item.value;
    value.style.fontSize = '1.2rem';
    value.style.fontWeight = 'bold';
    value.style.marginTop = '5px';
    
    statBlock.appendChild(label);
    statBlock.appendChild(value);
    statsContainer.appendChild(statBlock);
  });
  
  // Function to get the translated mode name
  function getModeName(modeKey) {
    if (!modeKey || !translations[currentLang][modeKey]) {
      return modeKey || 'Unknown';
    }
    return translations[currentLang][modeKey];
  }
  
  // Add chart section
  const chartSection = document.createElement('div');
  chartSection.style.gridColumn = '1 / span 2';
  chartSection.style.marginTop = '15px';
  chartSection.style.textAlign = 'center';
  
  const chartTitle = document.createElement('h4');
  chartTitle.textContent = translations[currentLang].gameResults || 'Game Results';
  chartTitle.style.marginBottom = '10px';
  
  const chartContainer = document.createElement('div');
  chartContainer.style.height = '200px';
  chartContainer.style.position = 'relative';
  
  // Create simple bar chart
  const barChartContainer = document.createElement('div');
  barChartContainer.style.display = 'flex';
  barChartContainer.style.justifyContent = 'space-around';
  barChartContainer.style.alignItems = 'flex-end';
  barChartContainer.style.height = '160px';
  barChartContainer.style.padding = '0 20px';
  
  const total = Math.max(1, stats.totalGames);
  const resultTypes = [
    { label: translations[currentLang].wins || 'Wins', value: stats.wins, color: '#4CAF50' },
    { label: translations[currentLang].losses || 'Losses', value: stats.losses, color: '#F44336' },
    { label: translations[currentLang].abandoned || 'Abandoned', value: stats.abandoned, color: '#FFC107' }
  ];
  
  resultTypes.forEach(result => {
    const barGroup = document.createElement('div');
    barGroup.style.display = 'flex';
    barGroup.style.flexDirection = 'column';
    barGroup.style.alignItems = 'center';
    barGroup.style.width = '60px';
    
    const percentage = Math.round((result.value / total) * 100);
    const height = Math.max(10, Math.min(150, (result.value / total) * 150));
    
    const bar = document.createElement('div');
    bar.style.width = '40px';
    bar.style.height = `${height}px`;
    bar.style.backgroundColor = result.color;
    bar.style.position = 'relative';
    
    const barLabel = document.createElement('div');
    barLabel.textContent = `${percentage}%`;
    barLabel.style.position = 'absolute';
    barLabel.style.top = '5px';
    barLabel.style.left = '0';
    barLabel.style.right = '0';
    barLabel.style.textAlign = 'center';
    barLabel.style.color = percentage > 30 ? 'white' : 'black';
    barLabel.style.fontSize = '12px';
    
    bar.appendChild(barLabel);
    
    const nameLabel = document.createElement('div');
    nameLabel.textContent = result.label;
    nameLabel.style.marginTop = '5px';
    nameLabel.style.fontSize = '12px';
    
    const countLabel = document.createElement('div');
    countLabel.textContent = result.value;
    countLabel.style.fontSize = '12px';
    countLabel.style.fontWeight = 'bold';
    
    barGroup.appendChild(bar);
    barGroup.appendChild(nameLabel);
    barGroup.appendChild(countLabel);
    
    barChartContainer.appendChild(barGroup);
  });
  
  chartContainer.appendChild(barChartContainer);
  chartSection.appendChild(chartTitle);
  chartSection.appendChild(chartContainer);
  
  // Add close button
  const closeButton = document.createElement('button');
  closeButton.textContent = translations[currentLang].close || 'Close';
  closeButton.style.marginTop = '20px';
  closeButton.style.padding = '8px 15px';
  closeButton.style.backgroundColor = '#6200EE';
  closeButton.style.color = 'white';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '4px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.display = 'block';
  closeButton.style.margin = '20px auto 0';
  
  closeButton.addEventListener('click', function() {
    document.body.removeChild(modal);
  });
  
  // Assemble the modal
  modal.appendChild(heading);
  modal.appendChild(deviceInfo);
  modal.appendChild(statsContainer);
  modal.appendChild(chartSection);
  modal.appendChild(closeButton);
  
  // Add modal to the page
  document.body.appendChild(modal);
}

// Helper function to detect browser info
function detectBrowserInfo() {
  const userAgent = navigator.userAgent;
  let browserName = "Unknown";
  let browserVersion = "Unknown";
  let osName = "Unknown";
  let deviceType = "Unknown";
  
  // Detect OS
  if (userAgent.indexOf("Win") !== -1) osName = "Windows";
  else if (userAgent.indexOf("Mac") !== -1) osName = "macOS";
  else if (userAgent.indexOf("Linux") !== -1) osName = "Linux";
  else if (userAgent.indexOf("Android") !== -1) osName = "Android";
  else if (userAgent.indexOf("like Mac") !== -1) osName = "iOS";
  
  // Detect device type
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
    deviceType = "Tablet";
  } else if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated/.test(userAgent)) {
    deviceType = "Mobile";
  } else {
    deviceType = "Desktop";
  }
  
  // Detect browser
  try {
    if (userAgent.indexOf("Firefox") > -1) {
      browserName = "Firefox";
      const match = userAgent.match(/Firefox\/([0-9.]+)/);
      browserVersion = match ? match[1] : "";
    } else if (userAgent.indexOf("SamsungBrowser") > -1) {
      browserName = "Samsung Browser";
      const match = userAgent.match(/SamsungBrowser\/([0-9.]+)/);
      browserVersion = match ? match[1] : "";
    } else if (userAgent.indexOf("Opera") > -1 || userAgent.indexOf("OPR") > -1) {
      browserName = "Opera";
      if (userAgent.indexOf("Opera") > -1) {
        const match = userAgent.match(/Opera\/([0-9.]+)/);
        browserVersion = match ? match[1] : "";
      } else {
        const match = userAgent.match(/OPR\/([0-9.]+)/);
        browserVersion = match ? match[1] : "";
      }
    } else if (userAgent.indexOf("Trident") > -1) {
      browserName = "Internet Explorer";
      const match = userAgent.match(/rv:([0-9.]+)/);
      browserVersion = match ? match[1] : "";
    } else if (userAgent.indexOf("Edge") > -1) {
      browserName = "Edge";
      const match = userAgent.match(/Edge\/([0-9.]+)/);
      browserVersion = match ? match[1] : "";
    } else if (userAgent.indexOf("Chrome") > -1) {
      browserName = "Chrome";
      const match = userAgent.match(/Chrome\/([0-9.]+)/);
      browserVersion = match ? match[1] : "";
    } else if (userAgent.indexOf("Safari") > -1) {
      browserName = "Safari";
      const match = userAgent.match(/Safari\/([0-9.]+)/);
      browserVersion = match ? match[1] : "";
    }
  } catch (e) {
    console.error("Error detecting browser info:", e);
  }
  
  return {
    browser: browserName,
    browserVersion: browserVersion,
    os: osName,
    deviceType: deviceType
  };
}

// Function to track returning users
function trackReturningUser() {
  if (window.analytics && window.analytics.userData) {
    const userData = window.analytics.userData;
    
    // Calculate days since first visit
    const daysSinceFirstVisit = Math.floor((Date.now() - userData.firstSeen) / (1000 * 60 * 60 * 24));
    
    // Track user retention data
    window.analytics.trackEvent('user', 'retention', {
      daysSinceFirstVisit: daysSinceFirstVisit,
      visits: userData.visits,
      userType: window.analytics._getUserType ? window.analytics._getUserType() : 'unknown',
      uniqueId: userData.uniqueId
    });
    
    // If it's been more than 7 days since first visit, they're a retained user
    if (daysSinceFirstVisit >= 7) {
      window.analytics.trackEvent('user', 'retained', {
        days: daysSinceFirstVisit,
        games: userData.gameHistory ? userData.gameHistory.length : 0
      });
    }
  }
}

// Function to initialize enhanced analytics
function initializeEnhancedAnalytics() {
  // Track returning users when the app loads
  trackReturningUser();
  
  // Set up periodic sync of analytics data if needed
  setInterval(function() {
    if (window.analytics.enabled) {
      // Flush current events queue
      if (window.analytics.flush) {
        window.analytics.flush(false);
      }
    }
  }, 5 * 60 * 1000); // Every 5 minutes
  
  // Track session duration more accurately
  let sessionHeartbeatInterval;
  
  function startSessionHeartbeat() {
    if (sessionHeartbeatInterval) {
      clearInterval(sessionHeartbeatInterval);
    }
    
    // Send heartbeat every minute to accurately track session duration
    sessionHeartbeatInterval = setInterval(function() {
      if (window.analytics.enabled && window.analytics._getSessionDuration) {
        window.analytics.trackEvent('session', 'heartbeat', {
          duration: window.analytics._getSessionDuration()
        });
      }
    }, 60 * 1000); // Every minute
  }
  
  // Start the heartbeat
  startSessionHeartbeat();
  
  // Stop heartbeat when page is hidden and restart when visible again
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      clearInterval(sessionHeartbeatInterval);
      
      // Track that the user left the page
      if (window.analytics.enabled && window.analytics._getSessionDuration) {
        window.analytics.trackEvent('session', 'background', {
          duration: window.analytics._getSessionDuration()
        });
      }
    } else {
      // Track that the user returned to the page
      if (window.analytics.enabled && window.analytics._getSessionDuration) {
        window.analytics.trackEvent('session', 'foreground', {
          duration: window.analytics._getSessionDuration()
        });
      }
      
      startSessionHeartbeat();
    }
  });
}

// Don't forget to add the settings to your translations
function addAnalyticsTranslations() {
  // Add to your existing translations
  translations.en.settings = "Settings";
  translations.en.enableAnalytics = "Enable anonymous usage statistics";
  translations.en.close = "Close";
  translations.en.playerStats = "Your Game Statistics";
  translations.en.deviceInfo = "Your Device";
  translations.en.browser = "Browser";
  translations.en.os = "Operating System";
  translations.en.deviceType = "Device Type";
  translations.en.screenSize = "Screen Size";
  translations.en.totalGames = "Total Games";
  translations.en.wins = "Wins";
  translations.en.losses = "Losses";
  translations.en.abandoned = "Abandoned";
  translations.en.avgAttempts = "Avg. Attempts";
  translations.en.avgDuration = "Avg. Duration";
  translations.en.preferredMode = "Preferred Mode";
  translations.en.preferredLength = "Preferred Length";
  translations.en.gameResults = "Game Results";
  translations.en.viewStats = "View Statistics";
  
  translations.de.settings = "Einstellungen";
  translations.de.enableAnalytics = "Anonyme Nutzungsstatistiken aktivieren";
  translations.de.close = "Schließen";
  translations.de.playerStats = "Deine Spielstatistiken";
  translations.de.deviceInfo = "Dein Gerät";
  translations.de.browser = "Browser";
  translations.de.os = "Betriebssystem";
  translations.de.deviceType = "Gerätetyp";
  translations.de.screenSize = "Bildschirmgröße";
  translations.de.totalGames = "Gesamtspiele";
  translations.de.wins = "Gewonnen";
  translations.de.losses = "Verloren";
  translations.de.abandoned = "Abgebrochen";
  translations.de.avgAttempts = "Durchschn. Versuche";
  translations.de.avgDuration = "Durchschn. Dauer";
  translations.de.preferredMode = "Bevorzugter Modus";
  translations.de.preferredLength = "Bevorzugte Länge";
  translations.de.gameResults = "Spielergebnisse";
  translations.de.viewStats = "Statistiken anzeigen";
}

