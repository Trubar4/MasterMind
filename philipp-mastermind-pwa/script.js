// App version - increment this when making changes
const APP_VERSION = '1.0.7';

const translations = {
    en: {
        congratulations: "Code cracked",
        newGame: "New Game",
        submit: "Submit",
        giveUp: "Give-up",
        check: "Check",
        colours: "Color",
        positions: "Position",
        codemaker: "Maker",
        codebreaker: "Breaker",
        mode: "Mode",
        both: "2 Player",
        codemakerMode: "Computer breaks Code",
        codebreakerMode: "Computer creates Code",
        findCode: "Please try to find the right code."
    },
    de: {
        congratulations: "Code geknackt",
        newGame: "Neues Spiel",
        submit: "Senden",
        giveUp: "Aufgeben",
        check: "Prüfen",
        colours: "Farbe",
        positions: "Position",
        codemaker: "Ersteller",
        codebreaker: "Löser",
        mode: "Modus",
        both: "2-Spieler",
        codemakerMode: "Computer knackt Code",
        codebreakerMode: "Computer erstellt Code",
        findCode: "Bitte versuche den richtigen Code zu finden."
    }
};

let currentLang = 'de';
let currentMode = 'both';
let gameOver = false; // Add this game state variable

const heading = document.querySelector('h1');
if (heading) {
    heading.style.fontSize = '135%';
}

// Add CSS for mode options
function addModeCss() {
    console.log('Function called: addModeCss()');
    const existingStyle = document.getElementById('mode-option-styles');
    if (existingStyle) {
        console.log('Removing existing mode styles');
        existingStyle.remove(); // Remove any existing style to avoid duplication
    }
    
    console.log('Creating new mode style element');
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
    `;
    document.head.appendChild(styleElement);
    console.log('Mode CSS added to document head');
}

// Function to update mode picker with correct translations and current selection
function updateModePicker() {
    console.log('Function called: updateModePicker()');
    const modePicker = document.getElementById('modepicker');
    if (!modePicker) {
        console.log('Mode picker element not found, returning');
        return;
    }
    
    console.log('Clearing existing mode options');
    // Clear existing options
    modePicker.innerHTML = '';
    
    // Create new options with correct translations
    const modeOptions = [
        { mode: 'both', key: 'both' },
        { mode: 'codemakerMode', key: 'codemakerMode' },
        { mode: 'codebreakerMode', key: 'codebreakerMode' }
    ];
    
    console.log('Creating new mode options with current language:', currentLang);
    modeOptions.forEach(option => {
        const div = document.createElement('div');
        div.className = 'mode-option';
        div.dataset.mode = option.mode;
        div.textContent = translations[currentLang][option.key];
        
        // Add selected class if this is the current mode
        if (option.mode === currentMode) {
            console.log(`Mode ${option.mode} is currently selected`);
            div.classList.add('selected');
        }
        
        div.addEventListener('click', () => {
            console.log(`Mode option clicked: ${option.mode}`);
            currentMode = option.mode;
            modePicker.classList.add("hidden");
            console.log('Mode picker hidden after selection');
            updateModePicker(); // Update the selection visually
            initGame(); // Restart game with new mode
        });
        
        modePicker.appendChild(div);
    });
    console.log('Mode picker updated successfully');
}

// Function to setup the language switcher with proper handlers
function setupLanguageSwitcher() {
    console.log('Function called: setupLanguageSwitcher()');
    document.querySelectorAll('.lang-option').forEach(option => {
        option.addEventListener('click', () => {
            const lang = option.dataset.lang;
            console.log(`Language option clicked: ${lang}`);
            setLanguage(lang);
            updateModePicker(); // Update mode picker with new language
        });
    });
    console.log('Language switcher event listeners added');
}

// Update the setLanguage function to also update the mode picker
function setLanguage(lang) {
    console.log(`Function called: setLanguage(${lang})`);
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
    
    console.log('Updating mode picker with new language');
    // Update mode picker with new language
    updateModePicker();
    // Re-colorize the heading after language update
    setTimeout(colorizeHeading, 0);
    console.log(`Language set to: ${lang}`);
}

function updateResourceLinks() {
    console.log('Updating resource links with version:', APP_VERSION);
    
    // Update CSS link
    const stylesLink = document.getElementById('styles-link');
    if (stylesLink) {
        stylesLink.href = `styles.css?v=${APP_VERSION}`;
    }
    
    // Update manifest link
    const manifestLink = document.getElementById('manifest-link');
    if (manifestLink) {
        manifestLink.href = `manifest.json?v=${APP_VERSION}`;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing game...');
	updateResourceLinks();
	colorizeHeading(); // Colorize the heading
    setLanguage(currentLang);
    addModeCss();
    setupLanguageSwitcher();

    const colors = ["#FF0000", "#FFFF00", "#FFC000", "#F36DED", "#0070C0", "#00B050", "#A6A6A6", "#000000"];
    let secretCode = [];
    let currentRow = 1;
    let currentGuess = [null, null, null, null];
    let isCodemakerTurn = true;
    const maxRows = 10;

    const board = document.getElementById("board");
    const guessArea = document.getElementById("guess-area");
    const colorPicker = document.getElementById("color-picker");
    const modePicker = document.getElementById("modepicker");
    const codemakerLabel = document.getElementById("codemaker-label");
    const codebreakerLabel = document.getElementById("codebreaker-label");
    const newGameBtn = document.getElementById("new-gamebtn");
    const submitBtn = document.getElementById("submitbtn");
    const modeBtn = document.getElementById("mode-btn");
    let checkButton = null;

    console.log('Game elements initialized');
    console.log('Current game state:', {
        currentLang,
        currentMode,
        isCodemakerTurn,
        currentRow
    });

    // Set up mode button event listener
    modeBtn.addEventListener("click", function(event) {
        console.log('Mode button clicked');
        // Prevent the default button behavior
        event.stopPropagation();
        
        // First make sure the modePicker is visible (not hidden) so we can get its dimensions
        modePicker.classList.remove("hidden");
        console.log('Mode picker made visible after button click');
        
        // Get the button's position
        const rect = this.getBoundingClientRect();
        console.log('Mode button position:', rect);
        
        // Position the picker above the button
        // Add page scroll offsets to ensure correct positioning
        modePicker.style.position = "absolute";
        modePicker.style.left = rect.left + window.pageXOffset + (rect.width/2 - modePicker.offsetWidth/2) + "px";
        modePicker.style.top = rect.top + window.pageYOffset - modePicker.offsetHeight - 10 + "px"; // 10px gap
        modePicker.style.zIndex = "1000";
        console.log('Mode picker positioned above mode button');
    });
	
	function showModePicker(button) {
		console.log('Function called: showModePicker()');
		// Make sure modePicker is visible for calculating dimensions
		modePicker.classList.remove("hidden");
		console.log('Mode picker made visible for positioning');
		
		// Ensure the mode picker is updated with current language and selection
		updateModePicker();
		
		const rect = button.getBoundingClientRect();
		console.log('Button position:', rect);
		
		// Position picker above button
		modePicker.style.position = "absolute";
		modePicker.style.left = rect.left + window.pageXOffset + (rect.width/2 - modePicker.offsetWidth/2) + "px";
		
		// Account for the triangle height (10px) and add a small gap (5px)
		const triangleHeight = 15; // Height of triangle + small gap
		modePicker.style.top = rect.top + window.pageYOffset - modePicker.offsetHeight - triangleHeight + "px";
		modePicker.style.zIndex = "1000";
		console.log('Mode picker positioned above button');
	}

    // Add click event listener to the document to close the modePicker when clicking outside
    document.addEventListener('click', function(event) {
        if (!modePicker.contains(event.target) && 
            event.target.id !== 'mode-btn' && 
            !modePicker.classList.contains('hidden')) {
            console.log('Click outside mode picker detected, hiding picker');
            modePicker.classList.add("hidden");
        }
    });

    // Language switcher
    document.querySelectorAll('.lang-option').forEach(option => {
        option.addEventListener('click', () => {
            const lang = option.dataset.lang;
            console.log(`Language option clicked: ${lang}`);
            setLanguage(lang);
        });
    });

    // Mode picker options
    document.querySelectorAll('.mode-option').forEach(option => {
        option.addEventListener('click', () => {
            console.log(`Mode option clicked: ${option.dataset.mode}`);
            currentMode = option.dataset.mode;
            modePicker.classList.add("hidden");
            initGame();
        });
    });

    function initGame() {
        console.log('Function called: initGame()');
        console.log('Current game mode:', currentMode);
        
        board.innerHTML = "";
        guessArea.innerHTML = "";
        secretCode = [];
        currentRow = 1;
        currentGuess = [null, null, null, null];
        isCodemakerTurn = true;
        gameOver = false; // Reset game over state
        
        // Set up UI for the different modes
        if (currentMode === 'codebreakerMode') {
            console.log('Setting up codebreakerMode');
            isCodemakerTurn = false; // Force codebreaker turn since computer creates the code
            codemakerLabel.classList.remove("active");
            codebreakerLabel.classList.add("active");
        } else {
            // Default behavior for 'both' and 'codemakerMode'
            codemakerLabel.classList.add("active");
            codebreakerLabel.classList.remove("active");
        }
        
        submitBtn.setAttribute("disabled", "true");
        submitBtn.classList.remove("active");
        
        console.log('Game state reset');
        console.log('Building game board with rows:', maxRows);

        for (let row = maxRows; row >= 1; row--) {
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
            
            // Create 4 circles
            for (let col = 0; col < 4; col++) {
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
        console.log('Game board created with all rows');

        console.log('Creating guess area circles');
        for (let col = 0; col < 4; col++) {
            const circle = document.createElement("div");
            circle.className = "circle";
            circle.dataset.col = col;
            circle.addEventListener("click", () => onGuessCircleClick(col));
            guessArea.appendChild(circle);
        }
        console.log('Guess area circles created');

        initializeButtons();
        
        // Handle computer code creation in codebreakerMode
        if (currentMode === 'codebreakerMode') {
            generateComputerCode();
            
            // Display message to user
            showFindCodeMessage();
        }
    }

    // Function to generate a random code for the computer
    function generateComputerCode() {
        console.log('Function called: generateComputerCode()');
        const colors = ["#FF0000", "#FFFF00", "#FFC000", "#F36DED", "#0070C0", "#00B050", "#A6A6A6", "#000000"];
        
        // Generate 4 random colors for the secret code
        for (let i = 0; i < 4; i++) {
            const randomIndex = Math.floor(Math.random() * colors.length);
            secretCode[i] = colors[randomIndex];
        }
        
        console.log('Computer generated secret code:', secretCode);
        
        // Update game state to codebreaker turn
        isCodemakerTurn = false;
        
        // Add check button for the first row
        addCheckButton();
    }

    // Function to show the message to find the code
	function showFindCodeMessage() {
		console.log('Function called: showFindCodeMessage()');
		
		let messageElement = document.getElementById('find-code-message');
		if (!messageElement) {
			messageElement = document.createElement('div');
			messageElement.id = 'find-code-message';
			messageElement.className = 'find-code-message';
			
			const boardParent = board.parentNode;
			boardParent.insertBefore(messageElement, board);
		}
		
		messageElement.textContent = translations[currentLang].findCode;
		console.log('Find code message displayed');
	}


	function onCircleClick(row, col) {
			console.log(`Function called: onCircleClick(${row}, ${col})`);
			console.log('Current state:', {
				currentMode,
				isCodemakerTurn,
				currentRow,
				gameOver
			});
			
			// Ignore clicks if game is over
			if (gameOver) {
				console.log('Game is over, ignoring circle click');
				return;
			}
			
			// Show color picker for codebreaker turn in 'both' mode or in 'codebreakerMode'
			if ((currentMode === 'both' && !isCodemakerTurn && row === currentRow) ||
				(currentMode === 'codebreakerMode' && row === currentRow)) {
				console.log('Valid circle click for codebreaker, showing color picker');
				showColorPicker(row, col, false);
				
				// Add check button when clicking on a codebreaker row
				// Only add if it doesn't exist yet for this row
				if (!checkButton || parseInt(checkButton.dataset.row) !== row) {
					console.log('Adding check button for this row');
					addCheckButton();
				}
			} else {
				console.log('Circle click ignored: not allowed in current game state');
			}
		}

		function onGuessCircleClick(col) {
			console.log(`Function called: onGuessCircleClick(${col})`);
			console.log('Current state:', {
				currentMode,
				isCodemakerTurn
			});
			
			// Show color picker for codemaker turn in 'both' mode or in 'codemakerMode'
			if ((currentMode === 'both' && isCodemakerTurn) || currentMode === 'codemakerMode') {
				console.log('Valid circle click for codemaker, showing color picker');
				showColorPicker(0, col, true);
			} else {
				console.log('Guess circle click ignored: not allowed in current game state');
			}
		}

		// Updated showColorPicker function
		function showColorPicker(row, col, isGuess) {
			console.log(`Function called: showColorPicker(${row}, ${col}, ${isGuess})`);
			
			colorPicker.classList.remove("hidden");
			const circle = isGuess
				? guessArea.children[col]
				: document.querySelector(`.circles-container[data-row="${row}"] .circle[data-col="${col}"]`);
				
			console.log('Target circle found:', circle);
			
			const rect = circle.getBoundingClientRect();
			console.log('Circle position:', rect);
			
			// Force the color picker to be visible to get its dimensions
			colorPicker.style.visibility = 'hidden';
			colorPicker.style.display = 'flex';
			
			// Get the actual dimensions after making it visible
			const pickerRect = colorPicker.getBoundingClientRect();
			const pickerWidth = pickerRect.width || 240;
			const pickerHeight = pickerRect.height || 130;
			console.log('Color picker dimensions:', { width: pickerWidth, height: pickerHeight });
			
			// Reset visibility
			colorPicker.style.visibility = '';
			
			// Calculate center position for the circle
			const circleCenter = rect.left + (rect.width / 2);
			
			// Position the picker so the triangle points to the circle's center
			colorPicker.style.left = `${circleCenter - (pickerWidth / 2) + window.scrollX}px`;
			
			// Position the picker above the circle with enough space
			const triangleHeight = 10; // Height of the triangle
			const spacing = 5; // Additional spacing
			colorPicker.style.top = `${rect.top - pickerHeight - triangleHeight - spacing + window.scrollY}px`;
			
			// Make sure the triangle is centered
			const triangle = colorPicker.querySelector('.triangle');
			if (triangle) {
				triangle.style.left = '50%';
				triangle.style.transform = 'translateX(-50%)';
			}
			
			colorPicker.style.zIndex = "1000";
			console.log('Color picker positioned and displayed');

			// Clear previous event listeners (to prevent duplicates)
			const colorOptions = document.querySelectorAll(".color-option");
			colorOptions.forEach(option => {
				// Clone and replace to remove old event listeners
				const newOption = option.cloneNode(true);
				option.parentNode.replaceChild(newOption, option);
			});
			console.log('Previous color option event listeners cleared');

			// Add fresh click listeners to color options
			document.querySelectorAll(".color-option").forEach(option => {
				option.onclick = () => selectColor(row, col, option.style.backgroundColor, isGuess);
			});
			console.log('New color option event listeners added');
		}

		function selectColor(row, col, color, isGuess) {
			console.log(`Function called: selectColor(${row}, ${col}, ${color}, ${isGuess})`);
			
			if (isGuess) {
				console.log('Setting color for codemaker (guess area)');
				// This is for the codemaker (guessArea)
				guessArea.children[col].style.backgroundColor = color;
				currentGuess[col] = color;
				console.log('Current guess updated:', currentGuess);
				
				// Enable submit button if all codemaker circles are filled
				if (currentGuess.every(c => c !== null)) {
					console.log('All guess circles filled, enabling submit button');
					submitBtn.removeAttribute("disabled");
					submitBtn.classList.add("active");
				}
			} else {
				console.log('Setting color for codebreaker (board row)');
				// This is for the codebreaker (board rows)
				const circle = document.querySelector(`.circles-container[data-row="${row}"] .circle[data-col="${col}"]`);
				circle.style.backgroundColor = color;
				
				// In codebreaker mode, make sure currentGuess is updated correctly
				// Find all circles in the current row and get their colors
				const currentRowCircles = Array.from(document.querySelectorAll(`.circles-container[data-row="${row}"] .circle`));
				currentGuess = currentRowCircles.map(circle => circle.style.backgroundColor);
				
				console.log('Current guess updated from all circles:', currentGuess);
				
				// Enable check button if all circles in this row are filled
				const allFilled = currentGuess.every(c => c && c !== '');
				if (allFilled && checkButton) {
					console.log('All row circles filled, enabling check button');
					checkButton.disabled = false;
					checkButton.removeAttribute("disabled");
					checkButton.classList.remove("disabled");
					checkButton.classList.add("active");
				}
			}
			
			hideColorPicker();
		}

		// New function to properly hide the color picker
		function hideColorPicker() {
			console.log('Function called: hideColorPicker()');
			
			// Add the hidden class
			colorPicker.classList.add("hidden");
			
			// Reset any inline styles that might override the hidden class
			colorPicker.style.display = '';
			colorPicker.style.visibility = '';
			
			console.log('Color picker hidden');
		}

		// Also add a click event listener to the document to close picker when clicking outside
		document.addEventListener('click', function(event) {
			// If click is outside the color picker and the picker is visible
			if (!colorPicker.contains(event.target) && 
				!event.target.classList.contains('circle') && 
				!colorPicker.classList.contains('hidden')) {
				console.log('Click outside color picker detected, hiding picker');
				hideColorPicker();
			}
		});

		function submitCode() {
			console.log('Function called: submitCode()');
			console.log("isCodemakerTurn=", isCodemakerTurn);
			console.log("currentMode=", currentMode);
			
			if ((currentMode === 'both' || currentMode === 'codemakerMode') && isCodemakerTurn) {
				console.log('Valid codemaker submission, setting secret code');
				secretCode = [...currentGuess];
				console.log('Secret code set:', secretCode);
				
				currentGuess = [null, null, null, null]; // Reset the current guess
				isCodemakerTurn = false;
				codemakerLabel.classList.remove("active");
				codebreakerLabel.classList.add("active");
				
				submitBtn.disabled = false;
				submitBtn.removeAttribute("disabled");
				submitBtn.classList.add("active");
				console.log('Game state changed to codebreaker turn');
				
				// Clear guess area circles
				console.log('Replacing guess area circles');
				// Create brand new circles to replace the existing ones
				while (guessArea.firstChild) {
					guessArea.removeChild(guessArea.firstChild);
				}
				
				// Recreate the circles from scratch
				for (let col = 0; col < 4; col++) {
					const circle = document.createElement("div");
					circle.className = "circle";
					circle.dataset.col = col;
					circle.style.backgroundColor = ""; // Reset to default
					circle.style.backgroundColor = "white"; // Then set to white
					circle.addEventListener("click", () => onGuessCircleClick(col));
					guessArea.appendChild(circle);
				}
			
				// Log to verify
				console.log("Guess area children count:", guessArea.children.length);
				Array.from(guessArea.children).forEach((c, i) => {
					console.log(`New circle ${i} bg color:`, c.style.backgroundColor);
				});
				
				if (currentMode === 'both') {
					console.log('In "both" mode, updating button for GIVE UP functionality');
					// Update button for "GIVE UP" functionality
					submitBtn.textContent = translations[currentLang].giveUp;
					submitBtn.addEventListener("click", revealCode);

					// Add check button for the first row
					addCheckButton();
				} 
				else if (currentMode === 'codemakerMode') {
					console.log('In "codemakerMode", handling computer guess logic');
					// Handle computer guess logic
					computerGuess();
				}
			} else {
				console.log('submitCode called but conditions not met');
				if (currentMode === 'codebreakerMode') {
					console.log('In "codebreakerMode" mode, no action needed');
					// Add logic for codebreaker-only mode if needed
				}
			}
		}
		
		function computerGuess() {
			console.log('Function called: computerGuess()');
			gameOver = false;
			currentRow = 1;
			
			const guessDelay = 1500; // Delay between guesses for visual effect
			const colors = ["#FF0000", "#FFFF00", "#FFC000", "#F36DED", "#0070C0", "#00B050", "#A6A6A6", "#000000"];
			let possibleCodes = [];
			
			// Color conversion and normalization functions
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
			
			function indicesToColors(indices) {
				return indices.map(index => colors[index]);
			}
			
			function colorsToIndices(colorArray) {
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
			
			// Generate all possible codes (using indices for efficiency)
			for (let i = 0; i < colors.length; i++) {
				for (let j = 0; j < colors.length; j++) {
					for (let k = 0; k < colors.length; k++) {
						for (let l = 0; l < colors.length; l++) {
							possibleCodes.push([i, j, k, l]);
						}
					}
				}
			}
			console.log(`Generated ${possibleCodes.length} possible codes`);
			
			// Start with Knuth's recommended first guess: 1122
			let currentGuessIndices = [0, 0, 1, 1]; // Equivalent to "1122"
			let currentGuess = indicesToColors(currentGuessIndices);
			
			// Evaluate a guess (using indices)
			function evaluateGuess(secretIndices, guessIndices) {
				let correctPositions = 0;
				let correctColors = 0;
				const secretCopy = [...secretIndices];
				const guessCopy = [...guessIndices];
				
				// Check correct positions
				for (let i = 0; i < 4; i++) {
					if (guessCopy[i] === secretCopy[i]) {
						correctPositions++;
						secretCopy[i] = -1;
						guessCopy[i] = -2;
					}
				}
				
				// Check correct colors in wrong positions
				for (let i = 0; i < 4; i++) {
					if (guessCopy[i] >= 0) {
						for (let j = 0; j < 4; j++) {
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
			
			// Choose next guess using minimax (with sampling for efficiency)
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
						c[0] === candidate[0] && c[1] === candidate[1] && 
						c[2] === candidate[2] && c[3] === candidate[3])) {
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
				for (let i = 0; i < 4; i++) {
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
				if (currentRow > maxRows || gameOver) return;
				
				// Display the computer's guess
				displayComputerGuess(currentGuess, currentRow);
				
				// Evaluate the guess
				const secretIndices = colorsToIndices(secretCode);
				const { correctPositions, correctColors } = evaluateGuess(secretIndices, currentGuessIndices);
				
				// Display feedback
				displayFeedback(correctPositions, correctColors, currentRow);
				
				// Check if won
				if (correctPositions === 4) {
					setTimeout(() => {
						alert(`${translations[currentLang].congratulations.replace("Du", "Computer")}\n${currentRow} ${currentLang === 'en' ? 'attempts' : 'Versuche'}`);
						gameOver = true;
					}, 500);
					return;
				}
				
				// Next row
				currentRow++;
				
				// Check if max rows reached
				if (currentRow > maxRows) {
					setTimeout(() => {
						alert(currentLang === 'en' ? 
							  "Computer couldn't crack the code within the maximum number of attempts." : 
							  "Der Computer konnte den Code nicht innerhalb der maximalen Anzahl von Versuchen knacken.");
						gameOver = true;
						// Show secret code
						for (let i = 0; i < 4; i++) {
							guessArea.children[i].style.backgroundColor = secretCode[i];
						}
					}, 500);
					return;
				}
				
				// Filter and choose next guess
				possibleCodes = filterCodes(possibleCodes, currentGuessIndices, correctPositions, correctColors);
				console.log(`Remaining possible codes: ${possibleCodes.length}`);
				currentGuessIndices = chooseNextGuess();
				currentGuess = indicesToColors(currentGuessIndices);
				
				// Schedule next guess
				setTimeout(makeGuess, guessDelay);
			}
			
			// Start the process
			setTimeout(makeGuess, guessDelay);
		}

		function setButtonLabel(button, key) {
			console.log(`Function called: setButtonLabel(button, ${key})`);
			if (button && translations[currentLang][key]) {
				button.textContent = translations[currentLang][key];
				console.log(`Button label set to: ${translations[currentLang][key]}`);
			} else {
				console.log('Button or translation key not found');
			}
		}

		function revealCode() {
			console.log('Function called: revealCode()');
			console.log('Secret code to reveal:', secretCode);
			
			// Reveal the secret code
			for (let i = 0; i < 4; i++) {
				guessArea.children[i].style.backgroundColor = secretCode[i];
			}
			console.log('Secret code revealed in guess area');
			
			// Disable the submit button
			submitBtn.disabled = true;
			submitBtn.setAttribute("disabled", "true");
			submitBtn.classList.remove("active");
			
			// Remove the check button if it exists
			if (checkButton) {
				console.log('Removing check button after give up');
				checkButton.remove();
				checkButton = null;
			}
			
			// Set game over state
			gameOver = true;
			console.log('Game over state set to:', gameOver);
			
			// Optional: Display game over message
			alert(`Game Over! The code was revealed.`);
			
			// Remove click handlers from all circles in the current and future rows
			for (let row = currentRow; row <= maxRows; row++) {
				const circles = document.querySelectorAll(`.circles-container[data-row="${row}"] .circle`);
				circles.forEach(circle => {
					// Clone and replace to remove event listeners
					const newCircle = circle.cloneNode(true);
					circle.parentNode.replaceChild(newCircle, circle);
				});
			}
			
			console.log('Game ended after user gave up');
		}

		function initializeButtons() {
			console.log('Function called: initializeButtons()');
			
			// Make sure the new game button is always active
			newGameBtn.classList.add("active");
			
			// Set the submit button to its initial state
			submitBtn.textContent = translations[currentLang].submit;
			console.log(`Submit button label set to: ${translations[currentLang].submit}`);
			
			if (currentMode === 'codebreakerMode') {
				console.log('In codebreakerMode, setting submit button for "give up"');
				// In codebreaker mode, the submit button is for "give up"
				submitBtn.textContent = translations[currentLang].giveUp;
				submitBtn.disabled = false;
				submitBtn.removeAttribute("disabled");
				submitBtn.classList.add("active");
				submitBtn.onclick = function() {
					revealCode();
				};
			} else if (isCodemakerTurn) {
				console.log('In codemaker turn, setting submit button to disabled initially');
				// In codemaker turn, button starts disabled until code is complete
				submitBtn.disabled = true;
				submitBtn.setAttribute("disabled", "true");
				submitBtn.classList.remove("active");
				
				// Reset the onclick handler to submitCode
				submitBtn.onclick = submitCode;
			} else {
				console.log('In codebreaker turn, setting submit button for "give up"');
				// In codebreaker mode, the submit button is for "give up"
				submitBtn.textContent = translations[currentLang].giveUp;
				submitBtn.disabled = false;
				submitBtn.removeAttribute("disabled");
				submitBtn.classList.add("active");
				submitBtn.onclick = function() {
					revealCode();
				};
			}
			console.log('Buttons initialized for current game state');
		}
		
		function addCheckButton() {
			console.log(`Function called: addCheckButton() for row ${currentRow}`);
			
			if (checkButton) {
				console.log('Removing existing check button');
				checkButton.remove();
			}
			
			checkButton = document.createElement("button");
			checkButton.className = "check-btn translatable";
			checkButton.dataset.key = "check";
			checkButton.dataset.row = currentRow; // Track which row this button belongs to
			checkButton.textContent = translations[currentLang].check;
			checkButton.disabled = true;
			checkButton.classList.add("disabled"); // Add disabled class
			checkButton.onclick = checkGuess;
			
			// Find the current row
			const row = document.querySelector(`.circles-container[data-row="${currentRow}"]`).closest('.row');
			if (row) {
				const positionFeedback = row.querySelector(".position-feedback");
				if (positionFeedback) {
					// Store existing content as data attribute
					positionFeedback.dataset.original = positionFeedback.textContent;
					positionFeedback.textContent = "";
				}
				
				// Add check button directly as a child of the row
				row.appendChild(checkButton);
				console.log(`Check button added to row ${currentRow}`);
			} else {
				console.log(`Failed to find row ${currentRow} to add check button`);
			}
		}

		// Also update the checkGuess function to restore position feedback
		function checkGuess() {
			console.log('Function called: checkGuess()');
			console.log('Current guess to check:', currentGuess);
			console.log('Secret code to compare against:', secretCode);
			
			// Get the current row's circles to ensure we have the correct colors
			const currentRowCircles = Array.from(document.querySelectorAll(`.circles-container[data-row="${currentRow}"] .circle`));
			
			// Make sure currentGuess is updated with the actual circle colors
			// Use getComputedStyle for more reliable color extraction
			currentGuess = currentRowCircles.map(circle => {
				const backgroundColor = window.getComputedStyle(circle).backgroundColor;
				return backgroundColor || null;
			});
			
			console.log('Updated current guess from DOM:', currentGuess);
			
			// Check if all colors are set
			if (currentGuess.some(color => !color)) {
				console.warn('Not all colors are selected in the current row');
				return; // Don't proceed if some colors are missing
			}
			
			const { correctPositions, correctColors } = checkGuessLogic(secretCode, currentGuess);
			console.log('Check results:', { correctPositions, correctColors });
			
			const row = document.querySelector(`.circles-container[data-row="${currentRow}"]`).closest('.row');
			
			// Remove check button from the position-feedback element
			if (checkButton) {
				checkButton.remove();
				checkButton = null;
			}
			
			// Set the feedback values
			row.querySelector(".colors-feedback").textContent = correctColors;
			row.querySelector(".position-feedback").textContent = correctPositions;
			console.log(`Feedback displayed for row ${currentRow}`);

			// Reset current guess for next row
			currentGuess = [null, null, null, null];
			console.log('Current guess reset');
			
			currentRow++;
			console.log(`Current row advanced to ${currentRow}`);
			
			if (currentRow <= maxRows) {
				console.log(`Row ${currentRow} is within maximum rows, adding new check button`);
				addCheckButton();
			} else {
				console.log('Maximum rows reached, game over');
				for (let i = 0; i < 4; i++) {
					guessArea.children[i].style.backgroundColor = secretCode[i];
				}
				console.log('Secret code revealed in guess area');
				alert(`Game Over! You didn't find the code.`);
				submitBtn.setAttribute("disabled", "true");
				if (checkButton) checkButton.disabled = true;
				gameOver = true;
				console.log('Game buttons disabled after max rows reached');
			}
			
			if (correctPositions === 4) {
				console.log('All positions correct! Game won');
				alert(translations[currentLang].congratulations);
				submitBtn.setAttribute("disabled", "true");
				if (checkButton) checkButton.disabled = true;
				gameOver = true;
				console.log('Game buttons disabled after win');
			}
		}

		function checkGuessLogic(secret, guess) {
			console.log('Function called: checkGuessLogic()');
			console.log('Checking secret:', secret, 'against guess:', guess);
			
			let correctPositions = 0;
			let correctColors = 0;
			
			if (!secret || !guess || secret.length !== 4 || guess.length !== 4) {
				console.error('Invalid secret or guess:', { secret, guess });
				return { correctPositions: 0, correctColors: 0 };
			}
			
			// Create copies of the arrays to avoid modifying the originals
			const secretTemp = [...secret];
			const guessTemp = [...guess];
			
			// Improved color normalization function
			function normalizeColor(color) {
				if (!color) return null;
				
				// If empty, return null
				if (color === '') return null;
				
				// If already in hex format (#RRGGBB)
				if (color.startsWith('#')) {
					// Convert hex to RGB values for consistent comparison
					const r = parseInt(color.slice(1, 3), 16);
					const g = parseInt(color.slice(3, 5), 16);
					const b = parseInt(color.slice(5, 7), 16);
					return `rgb(${r},${g},${b})`;
				}
				
				// If in rgb format, standardize it
				if (color.startsWith('rgb')) {
					// Extract RGB values using regex to be more robust
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
			
			console.log('Normalized secret:', normalizedSecret);
			console.log('Normalized guess:', normalizedGuess);
			
			// Create working copies for our algorithm
			const secretCopy = [...normalizedSecret];
			const guessCopy = [...normalizedGuess];
			
			// First pass: check for correct positions
			for (let i = 0; i < 4; i++) {
				if (guessCopy[i] === secretCopy[i]) {
					console.log(`Position ${i} correct! Color: ${guessCopy[i]}`);
					correctPositions++;
					// Mark as counted by setting to special value
					secretCopy[i] = null;
					guessCopy[i] = null;
				}
			}
			
			// Second pass: check for correct colors in wrong positions
			for (let i = 0; i < 4; i++) {
				if (guessCopy[i] !== null) {
					for (let j = 0; j < 4; j++) {
						if (secretCopy[j] !== null && guessCopy[i] === secretCopy[j]) {
							console.log(`Color ${guessCopy[i]} is in the code but wrong position`);
							correctColors++;
							// Mark as counted
							secretCopy[j] = null;
							guessCopy[i] = null;
							break;
						}
					}
				}
			}
			
			console.log('Check result:', { correctPositions, correctColors });
			return { correctPositions, correctColors };
		}

		newGameBtn.addEventListener("click", initGame);
		submitBtn.addEventListener("click", submitCode);

		initGame();
		console.log('Game initialized successfully');
	});

// Function to colorize the heading with game colors
function colorizeHeading() {
    console.log('Function called: colorizeHeading()');
    const heading = document.querySelector('h1');
    if (!heading) {
        console.log('Heading element not found');
        return;
    }
    
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
    console.log('Heading colorized successfully');
}


if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        console.log('Checking for service worker support');
        // Add version to service worker registration
        navigator.serviceWorker.register(`./service-worker.js?v=${APP_VERSION}`)
            .then(reg => {
                console.log('Service worker registered!', reg);
                
                // Check for updates
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    console.log('Service Worker update found!');
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('New service worker installed and ready for use!');
                            // You could show a notification here that an update is available
                            if (confirm('New version available! Reload to update?')) {
                                window.location.reload();
                            }
                        }
                    });
                });
            })
            .catch(err => console.log('Service worker registration failed:', err));
            
        // Add function to force a refresh
        window.forceRefresh = function() {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for (let registration of registrations) {
                        console.log('Unregistering service worker:', registration);
                        registration.unregister();
                    }
                    console.log('All service workers unregistered, reloading page');
                    window.location.reload(true);
                });
            }
        };
        
        // Add a debug button to allow manual refreshing (only in development)
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            const refreshBtn = document.createElement('button');
            refreshBtn.textContent = 'Force Refresh';
            refreshBtn.style.position = 'fixed';
            refreshBtn.style.bottom = '10px';
            refreshBtn.style.right = '10px';
            refreshBtn.style.zIndex = '9999';
            refreshBtn.style.padding = '8px';
            refreshBtn.style.background = '#D32F2F';
            refreshBtn.style.color = 'white';
            refreshBtn.style.border = 'none';
            refreshBtn.style.borderRadius = '4px';
            refreshBtn.onclick = window.forceRefresh;
            document.body.appendChild(refreshBtn);
        }
    });
}