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
const newGameBtn = document.getElementById("new-game-btn");
const submitBtn = document.getElementById("submit-btn");

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
    submitBtn.disabled = true;
    submitBtn.classList.remove("active");

    for (let row = maxRows; row >= 1; row--) {
        const rowDiv = document.createElement("div");
        rowDiv.className = "row";
        rowDiv.innerHTML = `
            <span class="row-number">${row}</span>
            <span class="colors-feedback"></span>
            <div class="circle" data-row="${row}" data-col="0"></div>
            <div class="circle" data-row="${row}" data-col="1"></div>
            <div class="circle" data-row="${row}" data-col="2"></div>
            <div class="circle" data-row="${row}" data-col="3"></div>
            <span class="position-feedback"></span>
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
        circle.addEventListener("click", () => onGuessCircleClick(col));
        guessArea.appendChild(circle);
    }
}

function onCircleClick(row, col) {
    if (!isCodemakerTurn && row === currentRow) {
        showColorPicker(row, col, false);
    }
}

function onGuessCircleClick(col) {
    if (isCodemakerTurn) {
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
            submitBtn.disabled = false;
            submitBtn.classList.add("active");
        } else {
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
    codemakerLabel.classList.remove("active");
    codebreakerLabel.classList.add("active");
    submitBtn.disabled = true;
    submitBtn.classList.remove("active");
    for (let circle of guessArea.children) {
        circle.style.backgroundColor = "white";
    }
    addCheckButton();
}

function addCheckButton() {
    if (checkButton) {
        checkButton.remove();
    }
    checkButton = document.createElement("button");
    checkButton.className = "check-btn";
    checkButton.textContent = "CHECK";
    checkButton.disabled = true;
    checkButton.onclick = checkGuess;
    const row = board.children[maxRows - currentRow];
    row.appendChild(checkButton);
}

function checkGuess() {
    const { correctPositions, correctColors } = checkGuessLogic(secretCode, currentGuess);
    const row = board.children[maxRows - currentRow];
    row.querySelector(".colors-feedback").textContent = correctColors;
    row.querySelector(".position-feedback").textContent = correctPositions;

    currentGuess = [null, null, null, null];
    for (let circle of guessArea.children) {
        circle.style.backgroundColor = "white";
    }
    checkButton.disabled = true;
    checkButton.classList.remove("active");
    currentRow++;
    if (currentRow <= maxRows) {
        addCheckButton();
    }
    if (correctPositions === 4) {
        alert("Congratulations! You cracked the code!");
        initGame();
    } else if (currentRow > maxRows) {
        alert(`Game Over! The code was ${secretCode}`);
        initGame();
    }
}

function checkGuessLogic(secret, guess) {
    let correctPositions = 0;
    let correctColors = 0;
    const secretTemp = [...secret];
    const guessTemp = [...guess];
    for (let i = 0; i < 4; i++) {
        if (guessTemp[i] === secretTemp[i]) {
            correctPositions++;
            secretTemp[i] = guessTemp[i] = null;
        }
    }
    for (let i = 0; i < 4; i++) {
        if (guessTemp[i] && secretTemp.includes(guessTemp[i])) {
            correctColors++;
            secretTemp[secretTemp.indexOf(guessTemp[i])] = null;
        }
    }
    return { correctPositions, correctColors };
}

newGameBtn.addEventListener("click", initGame);
submitBtn.addEventListener("click", submitCode);

initGame();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('Service worker registered!', reg))
            .catch(err => console.log('Service worker registration failed:', err));
    });
}