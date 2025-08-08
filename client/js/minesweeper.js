// ====================================
// 🔍 BUSCAMINAS COLABORATIVO - LÓGICA
// ====================================

// Variables globales del Buscaminas Colaborativo
let gameState = {
    board: [],                  // Tablero del buscaminas [[{value: 0, revealed: false, flagged: false}]]
    width: 16,                  // Ancho del tablero
    height: 16,                 // Alto del tablero
    mines: 40,                  // Número de minas
    players: {},                // { username: { score: 0, flags: 0, reveals: 0, isHost: false } }
    gameStatus: 'waiting',      // 'waiting' | 'playing' | 'won' | 'lost'
    timeStarted: null,          // Timestamp de inicio
    lastAction: null,           // Última acción para sincronizar
    revealedCells: 0,           // Celdas reveladas
    totalSafeCells: 0,          // Total de celdas sin minas
    gameTimer: null,            // Timer del juego
    elapsedTime: 0              // Tiempo transcurrido en segundos
};

// Variables de UI
let timerInterval = null;
let gameCode = null;
let currentUser = null;

// Sistema de comunicación multiplayer
let multiplayerClient = null;

// ====================================
// INICIALIZACIÓN
// ====================================

document.addEventListener('DOMContentLoaded', () => {
    currentUser = JSON.parse(sessionStorage.getItem('user'));
    gameCode = getGameCodeFromURL();
    
    if (!currentUser || !gameCode) {
        window.location.href = 'index.html';
        return;
    }

    initializeUI();
    initializeEventListeners();
    initGame();
    
    // Inicializar sistema multiplayer HTTP
    setTimeout(() => {
        initMultiplayer();
    }, 500);
    
    console.log('🔍 Buscaminas Colaborativo inicializado');
    displaySystemMessage('🔍 Bienvenido al Buscaminas Colaborativo!');
});

function initializeUI() {
    document.getElementById('player-name').textContent = currentUser.username;
    document.getElementById('game-code').textContent = gameCode;
    
    // Inicializar contadores
    updateMinesCount();
    updateFlagsCount();
    updateTimer();
}

function initializeEventListeners() {
    // Chat
    document.getElementById('send-chat-btn').addEventListener('click', sendChatMessage);
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
    
    // Controles del juego
    document.getElementById('new-game-btn').addEventListener('click', startNewGame);
    document.getElementById('help-btn').addEventListener('click', showHelpModal);
    document.getElementById('leave-game-btn').addEventListener('click', leaveGame);
    
    // Modales
    document.getElementById('close-help-btn').addEventListener('click', hideHelpModal);
    document.getElementById('play-again-btn').addEventListener('click', () => {
        hideResultModal();
        startNewGame();
    });
    document.getElementById('back-to-lobby-btn').addEventListener('click', backToLobby);
    
    // Prevenir menú contextual en el tablero
    document.addEventListener('contextmenu', (e) => {
        if (e.target.classList.contains('cell')) {
            e.preventDefault();
        }
    });
}

// ====================================
// LÓGICA DEL JUEGO
// ====================================

function initGame() {
    // Agregar jugador actual si no existe
    if (!gameState.players[currentUser.username]) {
        gameState.players[currentUser.username] = {
            score: 0,
            flags: 0,
            reveals: 0,
            isHost: true // Todos pueden ser host por simplicidad
        };
    }
    
    updatePlayersPanel();
    updateStatus('Esperando jugadores...');
    
    // Mostrar botón de nueva partida para todos
    const newGameBtn = document.getElementById('new-game-btn');
    if (newGameBtn) {
        newGameBtn.style.display = 'block';
        newGameBtn.addEventListener('click', () => {
            startNewGame();
            // También notificar a otros si hay conexión
            if (typeof window.startGameForAll === 'function') {
                window.startGameForAll();
            }
        });
    }
    
    displaySystemMessage('🎮 Haz clic en "Nueva Partida" para comenzar');
}

function startNewGame() {
    console.log('🆕 Iniciando nueva partida...');
    
    // Reiniciar estado del juego
    gameState.gameStatus = 'playing';
    gameState.timeStarted = Date.now();
    gameState.revealedCells = 0;
    gameState.elapsedTime = 0;
    gameState.totalSafeCells = (gameState.width * gameState.height) - gameState.mines;
    
    // Reiniciar puntuaciones
    Object.keys(gameState.players).forEach(username => {
        gameState.players[username].score = 0;
        gameState.players[username].flags = 0;
        gameState.players[username].reveals = 0;
    });
    
    // Crear tablero
    generateBoard();
    renderBoard();
    
    // Iniciar timer
    startGameTimer();
    
    // Actualizar UI
    updateStatus('🎮 ¡Juego en progreso! Trabajen en equipo');
    updatePlayersPanel();
    hideInstructions();
    
    displaySystemMessage('🎮 ¡Nueva partida iniciada! ¡Buena suerte equipo!');
    
    // Sincronizar con otros jugadores
    if (typeof window.broadcastGameState === 'function') {
        window.broadcastGameState(gameState);
    }
    
    // Ocultar botón de inicio
    const startButton = document.getElementById('new-game-btn');
    if (startButton) {
        startButton.style.display = 'none';
    }
}

function generateBoard() {
    console.log('🎲 Generando tablero...');
    
    // Crear tablero vacío
    gameState.board = [];
    for (let y = 0; y < gameState.height; y++) {
        gameState.board[y] = [];
        for (let x = 0; x < gameState.width; x++) {
            gameState.board[y][x] = {
                value: 0,       // 0-8 = números, -1 = mina
                revealed: false,
                flagged: false,
                x: x,
                y: y
            };
        }
    }
    
    // Colocar minas aleatoriamente
    let minesPlaced = 0;
    while (minesPlaced < gameState.mines) {
        const x = Math.floor(Math.random() * gameState.width);
        const y = Math.floor(Math.random() * gameState.height);
        
        if (gameState.board[y][x].value !== -1) {
            gameState.board[y][x].value = -1;
            minesPlaced++;
        }
    }
    
    // Calcular números adyacentes
    for (let y = 0; y < gameState.height; y++) {
        for (let x = 0; x < gameState.width; x++) {
            if (gameState.board[y][x].value !== -1) {
                gameState.board[y][x].value = countAdjacentMines(x, y);
            }
        }
    }
    
    console.log(`✅ Tablero generado: ${gameState.width}x${gameState.height} con ${gameState.mines} minas`);
}

function countAdjacentMines(x, y) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < gameState.width && ny >= 0 && ny < gameState.height) {
                if (gameState.board[ny][nx].value === -1) {
                    count++;
                }
            }
        }
    }
    return count;
}

function renderBoard() {
    const boardElement = document.getElementById('minesweeper-board');
    boardElement.innerHTML = '';
    
    // Configurar grid CSS
    boardElement.style.gridTemplateColumns = `repeat(${gameState.width}, 1fr)`;
    
    for (let y = 0; y < gameState.height; y++) {
        for (let x = 0; x < gameState.width; x++) {
            const cell = createCellElement(x, y);
            boardElement.appendChild(cell);
        }
    }
}

function createCellElement(x, y) {
    const cellData = gameState.board[y][x];
    const cellElement = document.createElement('div');
    cellElement.className = 'cell';
    cellElement.dataset.x = x;
    cellElement.dataset.y = y;
    
    // Event listeners
    cellElement.addEventListener('click', (e) => handleCellClick(x, y, e));
    cellElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        handleCellRightClick(x, y);
    });
    
    updateCellDisplay(cellElement, cellData);
    return cellElement;
}

function updateCellDisplay(cellElement, cellData) {
    // Limpiar clases
    cellElement.className = 'cell';
    cellElement.textContent = '';
    
    if (cellData.flagged) {
        cellElement.classList.add('flagged');
        cellElement.textContent = '🚩';
    } else if (cellData.revealed) {
        cellElement.classList.add('revealed');
        
        if (cellData.value === -1) {
            cellElement.classList.add('mine');
            cellElement.textContent = '💣';
        } else if (cellData.value > 0) {
            cellElement.classList.add(`mine-adjacent-${cellData.value}`);
            cellElement.textContent = cellData.value;
        }
    }
}

// ====================================
// INTERACCIONES DEL JUGADOR
// ====================================

function handleCellClick(x, y, event) {
    if (gameState.gameStatus !== 'playing') {
        displaySystemMessage('❌ El juego no está activo');
        return;
    }
    
    const cellData = gameState.board[y][x];
    
    if (cellData.revealed || cellData.flagged) {
        return;
    }
    
    console.log(`👆 Jugador ${currentUser.username} revela celda (${x}, ${y})`);
    
    // Enviar acción al servidor ANTES de procesar localmente
    if (multiplayerClient) {
        multiplayerClient.sendGameAction('cell_reveal', { row: y, col: x });
    }
    
    revealCell(x, y);
}

function handleCellRightClick(x, y) {
    if (gameState.gameStatus !== 'playing') {
        return;
    }
    
    const cellData = gameState.board[y][x];
    
    if (cellData.revealed) {
        return;
    }
    
    console.log(`🚩 Jugador ${currentUser.username} ${cellData.flagged ? 'quita' : 'coloca'} bandera (${x}, ${y})`);
    
    // Enviar acción al servidor ANTES de procesar localmente
    if (multiplayerClient) {
        multiplayerClient.sendGameAction('cell_flag', { row: y, col: x });
    }
    
    toggleFlag(x, y);
}

function revealCell(x, y) {
    const cellData = gameState.board[y][x];
    
    if (cellData.revealed || cellData.flagged) {
        return;
    }
    
    cellData.revealed = true;
    gameState.revealedCells++;
    
    // Actualizar puntuación del jugador
    gameState.players[currentUser.username].reveals++;
    
    if (cellData.value === -1) {
        // ¡Mina! Juego perdido
        gameState.gameStatus = 'lost';
        revealAllMines();
        endGame(false);
        displaySystemMessage(`💥 ${currentUser.username} tocó una mina! Juego perdido`);
    } else {
        // Celda segura
        gameState.players[currentUser.username].score += 10;
        
        // Si es 0, revelar celdas adyacentes automáticamente
        if (cellData.value === 0) {
            revealAdjacentCells(x, y);
        }
        
        // Verificar condición de victoria
        if (gameState.revealedCells >= gameState.totalSafeCells) {
            gameState.gameStatus = 'won';
            endGame(true);
            displaySystemMessage('🎉 ¡Felicidades! ¡Ganaron el juego en equipo!');
        }
    }
    
    updateBoardDisplay();
    updatePlayersPanel();
    updateFlagsCount();
}

function revealAdjacentCells(x, y) {
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < gameState.width && ny >= 0 && ny < gameState.height) {
                const adjacentCell = gameState.board[ny][nx];
                if (!adjacentCell.revealed && !adjacentCell.flagged) {
                    revealCell(nx, ny);
                }
            }
        }
    }
}

function toggleFlag(x, y) {
    const cellData = gameState.board[y][x];
    
    if (cellData.revealed) {
        return;
    }
    
    cellData.flagged = !cellData.flagged;
    
    if (cellData.flagged) {
        gameState.players[currentUser.username].flags++;
        
        // Bonus por marcar correctamente una mina
        if (cellData.value === -1) {
            gameState.players[currentUser.username].score += 20;
        }
    } else {
        gameState.players[currentUser.username].flags--;
        
        // Penalización por desmarcar una mina correcta
        if (cellData.value === -1) {
            gameState.players[currentUser.username].score -= 5;
        }
    }
    
    updateBoardDisplay();
    updatePlayersPanel();
    updateFlagsCount();
}

function revealAllMines() {
    for (let y = 0; y < gameState.height; y++) {
        for (let x = 0; x < gameState.width; x++) {
            if (gameState.board[y][x].value === -1) {
                gameState.board[y][x].revealed = true;
            }
        }
    }
}

// ====================================
// ACTUALIZACIÓN DE UI
// ====================================

function updateBoardDisplay() {
    const boardElement = document.getElementById('minesweeper-board');
    const cells = boardElement.querySelectorAll('.cell');
    
    cells.forEach(cellElement => {
        const x = parseInt(cellElement.dataset.x);
        const y = parseInt(cellElement.dataset.y);
        const cellData = gameState.board[y][x];
        
        updateCellDisplay(cellElement, cellData);
        
        // Animación de revelación
        if (cellData.revealed && !cellElement.classList.contains('cell-reveal')) {
            cellElement.classList.add('cell-reveal');
        }
        
        // Animación de bandera
        if (cellData.flagged && !cellElement.classList.contains('cell-flag')) {
            cellElement.classList.add('cell-flag');
        }
    });
}

function updatePlayersPanel() {
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';
    
    Object.entries(gameState.players).forEach(([username, playerData]) => {
        const li = document.createElement('li');
        li.className = 'player-item';
        
        li.innerHTML = `
            <div>
                <span class="player-name">${username} ${playerData.isHost ? '👑' : ''}</span>
                <small>🔍 ${playerData.reveals} | 🚩 ${playerData.flags}</small>
            </div>
            <span class="player-score">${playerData.score}</span>
        `;
        
        playersList.appendChild(li);
    });
}

function updateStatus(message) {
    const statusElement = document.getElementById('current-status');
    const iconElement = statusElement.querySelector('.status-icon');
    const textElement = statusElement.querySelector('.status-text');
    
    textElement.textContent = message;
    
    // Cambiar ícono según el estado
    switch (gameState.gameStatus) {
        case 'waiting':
            iconElement.textContent = '⏳';
            break;
        case 'playing':
            iconElement.textContent = '🔍';
            break;
        case 'won':
            iconElement.textContent = '🏆';
            statusElement.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            break;
        case 'lost':
            iconElement.textContent = '💥';
            statusElement.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
            break;
    }
}

function updateMinesCount() {
    document.getElementById('mines-count').textContent = `💣 ${gameState.mines}`;
}

function updateFlagsCount() {
    const totalFlags = Object.values(gameState.players).reduce((sum, player) => sum + player.flags, 0);
    document.getElementById('flags-count').textContent = `🚩 ${totalFlags}`;
}

function updateTimer() {
    const minutes = Math.floor(gameState.elapsedTime / 60);
    const seconds = gameState.elapsedTime % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('timer').textContent = `⏱️ ${timeString}`;
}

function startGameTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(() => {
        if (gameState.gameStatus === 'playing') {
            gameState.elapsedTime++;
            updateTimer();
        }
    }, 1000);
}

function stopGameTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ====================================
// FUNCIONES DE JUEGO
// ====================================

function endGame(won) {
    gameState.gameStatus = won ? 'won' : 'lost';
    stopGameTimer();
    
    updateStatus(won ? '🏆 ¡Victoria del equipo!' : '💥 Derrota del equipo');
    
    setTimeout(() => {
        showResultModal(won);
    }, 1000);
}

function showResultModal(won) {
    const modal = document.getElementById('game-result-modal');
    const title = document.getElementById('result-title');
    const content = document.getElementById('result-content');
    
    title.textContent = won ? '🏆 ¡Victoria del Equipo!' : '💥 Derrota del Equipo';
    title.style.color = won ? '#10b981' : '#ef4444';
    
    const sortedPlayers = Object.entries(gameState.players)
        .sort((a, b) => b[1].score - a[1].score);
    
    let resultHTML = `
        <div style="text-align: center; margin-bottom: 2rem;">
            <h3>${won ? '🎉 ¡Felicidades!' : '😓 No se rindan'}</h3>
            <p>Tiempo: ${Math.floor(gameState.elapsedTime / 60)}:${(gameState.elapsedTime % 60).toString().padStart(2, '0')}</p>
            <p>Celdas reveladas: ${gameState.revealedCells}/${gameState.totalSafeCells}</p>
        </div>
        
        <h4>🏆 Puntuaciones del Equipo:</h4>
        <div style="margin-top: 1rem;">
    `;
    
    sortedPlayers.forEach(([username, playerData], index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
        resultHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; margin: 0.25rem 0; background: #f8fafc; border-radius: 0.5rem;">
                <span>${medal} ${username}</span>
                <span><strong>${playerData.score} pts</strong> (🔍${playerData.reveals} | 🚩${playerData.flags})</span>
            </div>
        `;
    });
    
    resultHTML += '</div>';
    content.innerHTML = resultHTML;
    
    modal.classList.add('show');
}

function hideResultModal() {
    document.getElementById('game-result-modal').classList.remove('show');
}

function hideInstructions() {
    const instructions = document.getElementById('game-instructions');
    if (instructions) {
        instructions.style.display = 'none';
    }
}

// ====================================
// CHAT Y COMUNICACIÓN
// ====================================

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    
    if (text) {
        // Usar el nuevo sistema multiplayer
        if (multiplayerClient) {
            multiplayerClient.sendMessage(text);
        } else {
            // Fallback local si no hay conexión
            displayChatMessage(currentUser.username, text);
        }
        input.value = '';
    }
}

function displayChatMessage(usernameOrData, message, timestamp) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    let finalTimestamp, finalUsername, finalMessage, isSystem = false;
    
    // Compatibilidad con ambos formatos
    if (typeof usernameOrData === 'object') {
        // Formato antiguo
        finalUsername = usernameOrData.from;
        finalMessage = usernameOrData.text;
        isSystem = usernameOrData.isSystem || false;
        finalTimestamp = new Date().toLocaleTimeString();
    } else {
        // Formato nuevo del sistema multiplayer
        finalUsername = usernameOrData;
        finalMessage = message;
        finalTimestamp = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
    }
    
    if (isSystem || finalUsername === 'Sistema') {
        messageDiv.classList.add('system-message');
        messageDiv.innerHTML = `<span class="system-text">[${finalTimestamp}] ${finalMessage}</span>`;
        messageDiv.style.background = '#f59e0b';
        messageDiv.style.color = 'white';
        messageDiv.style.fontStyle = 'italic';
    } else {
        messageDiv.innerHTML = `
            <span class="sender">[${finalTimestamp}] ${finalUsername}:</span>
            <span class="text">${finalMessage}</span>
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function displaySystemMessage(message) {
    displayChatMessage({
        from: 'Sistema',
        text: message,
        isSystem: true
    });
}

// ====================================
// UTILIDADES
// ====================================

function getGameCodeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('code') || sessionStorage.getItem('gameCode');
}

function isHost() {
    // El primer jugador en entrar es el host
    const playerNames = Object.keys(gameState.players);
    return playerNames.length === 0 || playerNames[0] === currentUser.username;
}

function showHelpModal() {
    document.getElementById('help-modal').classList.add('show');
}

function hideHelpModal() {
    document.getElementById('help-modal').classList.remove('show');
}

function leaveGame() {
    if (confirm('¿Estás seguro de que quieres salir del juego?')) {
        window.location.href = 'lobby.html';
    }
}

function backToLobby() {
    hideResultModal();
    window.location.href = 'lobby.html';
}

// ====================================
// COMUNICACIÓN P2P (PLACEHOLDER)
// ====================================

function broadcastGameState() {
    // Esta función será implementada por webrtc.js
    if (typeof window.broadcastGameState === 'function') {
        window.broadcastGameState(gameState);
    }
}

function broadcastAction(action) {
    // Esta función será implementada por webrtc.js
    if (typeof window.broadcastAction === 'function') {
        window.broadcastAction(action);
    }
}

// Función para recibir acciones de otros jugadores
window.receiveAction = function(action) {
    console.log('📨 Acción recibida:', action);
    
    switch (action.type) {
        case 'reveal':
            if (action.player !== currentUser.username) {
                revealCell(action.x, action.y);
                displaySystemMessage(`${action.player} reveló celda (${action.x}, ${action.y})`);
            }
            break;
        case 'flag':
            if (action.player !== currentUser.username) {
                toggleFlag(action.x, action.y);
                displaySystemMessage(`${action.player} ${action.flagged ? 'marcó' : 'desmarcó'} celda (${action.x}, ${action.y})`);
            }
            break;
        case 'newgame':
            if (action.player !== currentUser.username) {
                Object.assign(gameState, action.gameState);
                renderBoard();
                updatePlayersPanel();
                updateStatus('🎮 ¡Juego en progreso! Trabajen en equipo');
                startGameTimer();
            }
            break;
    }
};

// ====================================
// 🌐 SISTEMA MULTIPLAYER HTTP
// ====================================

function initMultiplayer() {
    if (!window.MultiplayerClient) {
        console.error('❌ MultiplayerClient no encontrado. Asegúrate de incluir multiplayer_http.js');
        displaySystemMessage('❌ Error: Sistema multiplayer no disponible');
        return;
    }
    
    console.log('🌐 Inicializando sistema multiplayer...');
    displaySystemMessage('🔄 Conectando al servidor...');
    
    multiplayerClient = new MultiplayerClient(gameCode, currentUser.username);
    
    // Configurar callbacks
    multiplayerClient.onMessage = (username, message, timestamp) => {
        displayChatMessage(username, message, timestamp);
    };
    
    multiplayerClient.onGameAction = (username, actionType, actionData) => {
        handleRemoteGameAction(username, actionType, actionData);
    };
    
    multiplayerClient.onUsersUpdate = (users) => {
        updateConnectedUsers(users);
    };
    
    multiplayerClient.onConnectionStatus = (status, error) => {
        handleConnectionStatus(status, error);
    };
    
    // Conectar
    multiplayerClient.connect();
}

function handleConnectionStatus(status, error) {
    const statusDiv = document.getElementById('connection-status');
    
    switch(status) {
        case 'connected':
            console.log('✅ Conectado al servidor multiplayer');
            displaySystemMessage('✅ Conectado al servidor - ¡Ya puedes jugar con otros!');
            if (statusDiv) {
                statusDiv.textContent = '🟢 Conectado';
                statusDiv.className = 'connected';
            }
            break;
        case 'disconnected':
            console.log('🔌 Desconectado del servidor');
            displaySystemMessage('🔌 Desconectado del servidor');
            if (statusDiv) {
                statusDiv.textContent = '🔴 Desconectado';
                statusDiv.className = 'disconnected';
            }
            break;
        case 'error':
            console.error('❌ Error de conexión:', error);
            displaySystemMessage('❌ Error de conexión: ' + error);
            if (statusDiv) {
                statusDiv.textContent = '⚠️ Error';
                statusDiv.className = 'error';
            }
            break;
    }
}

function updateConnectedUsers(users) {
    console.log('👥 Usuarios conectados:', users);
    
    // Actualizar lista de jugadores
    users.forEach(username => {
        if (!gameState.players[username]) {
            gameState.players[username] = {
                score: 0,
                flags: 0,
                reveals: 0,
                isHost: false
            };
        }
    });
    
    updatePlayersPanel();
    
    const userCount = users.length;
    displaySystemMessage(`👥 ${userCount} jugador${userCount !== 1 ? 'es' : ''} conectado${userCount !== 1 ? 's' : ''}`);
}

function handleRemoteGameAction(username, actionType, actionData) {
    console.log('🎮 Acción recibida:', username, actionType, actionData);
    
    switch(actionType) {
        case 'cell_reveal':
            if (actionData.row !== undefined && actionData.col !== undefined) {
                const cell = gameState.board[actionData.row][actionData.col];
                if (cell && !cell.revealed && !cell.flagged) {
                    revealCellRemote(actionData.row, actionData.col, username);
                }
            }
            break;
        case 'cell_flag':
            if (actionData.row !== undefined && actionData.col !== undefined) {
                const cell = gameState.board[actionData.row][actionData.col];
                if (cell && !cell.revealed) {
                    toggleFlagRemote(actionData.row, actionData.col, username);
                }
            }
            break;
        case 'new_game':
            if (actionData.gameState) {
                Object.assign(gameState, actionData.gameState);
                renderBoard();
                updatePlayersPanel();
                updateStatus('🎮 ¡Juego en progreso! Trabajen en equipo');
                startGameTimer();
                displaySystemMessage('🆕 ' + username + ' inició una nueva partida');
            }
            break;
    }
}

function revealCellRemote(row, col, username) {
    const cell = gameState.board[row][col];
    
    if (cell.revealed || cell.flagged) return;
    
    cell.revealed = true;
    gameState.revealedCells++;
    
    // Actualizar puntuación del jugador
    if (gameState.players[username]) {
        gameState.players[username].reveals++;
        gameState.players[username].score += 1;
    }
    
    // Si es una mina, game over
    if (cell.value === -1) {
        gameState.gameStatus = 'lost';
        revealAllMines();
        updateStatus('💥 ¡Explosión! El equipo perdió');
        stopGameTimer();
        displaySystemMessage('💥 ' + username + ' encontró una mina - ¡Juego terminado!');
    } else {
        // Si es celda vacía, revelar adyacentes
        if (cell.value === 0) {
            revealAdjacentCells(row, col, username);
        }
        
        // Verificar victoria
        if (gameState.revealedCells === gameState.totalSafeCells) {
            gameState.gameStatus = 'won';
            updateStatus('🎉 ¡Victoria! El equipo ganó');
            stopGameTimer();
            displaySystemMessage('🎉 ¡Victoria del equipo!');
        }
    }
    
    renderBoard();
    updatePlayersPanel();
}

function toggleFlagRemote(row, col, username) {
    const cell = gameState.board[row][col];
    
    if (cell.revealed) return;
    
    cell.flagged = !cell.flagged;
    
    // Actualizar puntuación del jugador
    if (gameState.players[username]) {
        if (cell.flagged) {
            gameState.players[username].flags++;
        } else {
            gameState.players[username].flags--;
        }
    }
    
    renderBoard();
    updatePlayersPanel();
}

// Sobrescribir funciones existentes para enviar acciones
window.broadcastGameState = function(gameState) {
    if (multiplayerClient) {
        multiplayerClient.sendGameAction('new_game', { gameState: gameState });
    }
};

window.startGameForAll = function() {
    if (multiplayerClient) {
        multiplayerClient.sendGameAction('new_game', { gameState: gameState });
    }
};

console.log('🔍 Buscaminas Colaborativo cargado');
