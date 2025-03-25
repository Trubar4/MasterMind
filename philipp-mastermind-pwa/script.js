const translations = {
    en: {
        congratulations: "Congratulations! You cracked the code!",
        newGame: "NEW GAME",
        submit: "SUBMIT",
        check: "CHECK",
        colours: "Colours",
        positions: "Positions",
        codemaker: "CODEMAKER",
        codebreaker: "CODEBREAKER",
        both: "BOTH",
        mode: "MODE"
    },
    de: {
        congratulations: "Gratuliere! Du hast den Code geknackt!",
        newGame: "Neues Spiel",
        submit: "Senden",
        check: "Prüfen",
        colours: "Farben",
        positions: "Positionen",
        codemaker: "ERSTELLER",
        codebreaker: "LÖSER",
        both: "BEIDE",
        mode: "MODUS"
    }
};

let currentLang = 'en';
let currentMode = 'both'; // both, codemaker, codebreaker

function setLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('.translatable').forEach(element => {
        const key = element.dataset.key;
        element.textContent = translations[lang][key];
    });

    document.querySelectorAll('.lang-option').forEach(option => {
        option.classList.toggle('active', option.dataset.lang === lang);
    });
}

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-option').forEach(option => {
        option.classList.toggle('active', option.dataset.mode === mode);
    });
    document.getElementById('modepicker').classList.add('hidden');
    initGame(); // Restart game with new mode
}

document.addEventListener('DOMContentLoaded', () => {
    // Language switcher event listeners
    document.querySelectorAll('.lang-option').forEach(option => {
        option.addEventListener('click', () => {
            const lang = option.dataset.lang;
            setLanguage(lang);
        });
    });

    // Mode picker event listeners
    document.getElementById('modebtn').addEventListener('click', () => {
        const modepicker = document.getElementById('modepicker');
        const modebtn = document.getElementById('modebtn');
        const rect = modebtn.getBoundingClientRect();
        modepicker.style.left = `${rect.left + window.scrollX}px`;
        modepicker.style.top = `${rect.top + window.scrollY - 100}px`;
        modepicker.classList.toggle('hidden');
    });

    document.querySelectorAll('.mode-option').forEach(option => {
        option.addEventListener('click', () => {
            const mode = option.dataset.mode;
            setMode(mode);
        });
    });

    // Initial language and mode setup
    setLanguage(currentLang);
    setMode(currentMode);
});

const colors = ["#FF0000", "#FFFF00", "#FFC000", "#F36DED", "#0070C0", "#00B050", "#A6A6A6", "#000000"];
let secretCode = [];
let currentRow = 1;
let currentGuess = [null, null, null, null];
let isCodemakerTurn = true;
const maxRows = 10;

const board = document.getElementById("board");
const guessArea = document.getElementById("guess-area");
const colorPicker = document.getElementById("color-picker");
const codemakerLabel = document.getElementById("codemaker-label");
const codebreakerLabel = document.getElementById("codebreaker-label");
const newGamebtn = document.getElementById("new-gamebtn");
const modebtn = document.getElementById("modebtn");
const submitbtn = document.getElementById("submitbtn");

let checkButton = null;

function initGame() {
    board.innerHTML = "";
    guessArea.innerHTML = "";
    secretCode = [];
    currentRow = 1;
    currentGuess = [null, null, null, null];
    isCodemakerTurn = true;
    codemakerLabel.classList.add("active");
    codebreakerLabel.classList.remove("active");
    submitbtn.disabled = true;
    submitbtn.classList.remove("active");

    for (let row = maxRows; row >= 1; row--) {
        const rowDiv = document.createElement("div");
        rowDiv.className = "row";
        rowDiv.innerHTML = `
            <span class="row-number">${row}</span>
            <span class="colorsfeedback"></span>
            <div class="circle" data-row="${row}" data-col="0"></div>
            <div class="circle" data-row="${row}" data-col="1"></div>
            <div class="circle" data-row="${row}" data-col="2"></div>
            <div class="circle" data-row="${row}" data-col="3"></div>
            <span class="positionfeedback"></span>
        `;
        const circles = rowDiv.querySelectorAll(".circle");
        circles.forEach(circle => {
            const row = parseInt(circle.dataset.row);
            const col = parseInt(circle.dataset.col);
            circle.addEventListener("click", () => onCircleClick(row, col));
        });
        board.appendChild(rowDiv);
    }

    for (let col = 0; col < 4; col++) {
        const circle = document.createElement("div");
        circle.className = "circle";
        circle.dataset.col = col;
        if (currentMode !== 'codebreaker') {
            circle.addEventListener("click", () => onGuessCircleClick(col));
        }
        guessArea.appendChild(circle);
    }

    setLanguage(currentLang);

    // If Codemaker is computer, generate the code automatically
    if (currentMode === 'codebreaker') {
        secretCode = Array(4).fill().map(() => colors[Math.floor(Math.random() * colors.length)]);
        currentGuess = [null, null, null, null];
        isCodemakerTurn = false;
        codemakerLabel.classList.remove("active");
        codebreakerLabel.classList.add("active");
        // Set and hide the codemaker's code
        for (let col = 0; col < 4; col++) {
            guessArea.children[col].style.backgroundColor = secretCode[col];
            guessArea.children[col].classList.add("hidden");
        }
        addCheckButton();
    }
}

function onCircleClick(row, col) {
    if (!isCodemakerTurn && row === currentRow && currentMode !== 'codemaker') {
        showColorPicker(row, col, false);
    }
}

function onGuessCircleClick(col) {
    if (isCodemakerTurn && currentMode !== 'codebreaker') {
        showColorPicker(0, col, true);
    }
}

function showColorPicker(row, col, isGuess) {
    colorPicker.classList.remove("hidden");
    const circle = isGuess
        ? guessArea.children[col]
        : board.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    const rect = circle.getBoundingClientRect();
    const pickerWidth = 240;
    const circleWidth = rect.width;
    const offsetX = (pickerWidth - circleWidth) / 2;
    colorPicker.style.left = `${rect.left + window.scrollX - offsetX}px`;
    colorPicker.style.top = `${rect.top + window.scrollY - 100}px`;

    const options = colorPicker.querySelectorAll(".color-option");
    options.forEach((option, index) => {
        option.onclick = () => selectColor(row, col, colors[index], isGuess);
    });
}

function selectColor(row, col, color, isGuess) {
    currentGuess[col] = color;
    if (isGuess) {
        guessArea.children[col].style.backgroundColor = color;
    } else {
        const circle = board.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        circle.style.backgroundColor = color;
    }
    colorPicker.classList.add("hidden");
    if (currentGuess.every(c => c !== null)) {
        if (isCodemakerTurn) {
            submitbtn.disabled = false;
            submitbtn.classList.add("active");
        } else if (currentMode !== 'codemaker') {
            if (checkButton) {
                checkButton.disabled = false;
                checkButton.classList.add("active");
            }
        }
    }
}

function submitCode() {
    secretCode = [...currentGuess];
    currentGuess = [null, null, null, null];
    isCodemakerTurn = false;