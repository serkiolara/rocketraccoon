// Variables globales del juego
let gameState = {
    players: {},          // { username: { dice: [1,3,5], diceCount: 3, isHost: bool } }
    currentPlayer: null,  // username del jugador actual
    currentBet: null,     // { quantity: 3, value: 4 }
    turnOrder: [],        // [username1, username2, ...]
    turnIndex: 0,         // índice en turnOrder
    phase: 'betting',     // 'betting' | 'challenge' | 'reveal' | 'waiting' | 'finished'
    lastAction: null,     // Última acción para sincronizar
    round: 1
};

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(sessionStorage.getItem('user'));
    const gameCode = getGameCodeFromURL();
    
    if (!user || !gameCode) {
        window.location.href = 'index.html';
        return;
    }
    
    // Mostrar información básica
    document.getElementById('player-name').textContent = user.username;
    document.getElementById('game-code').textContent = gameCode;
    
    // Configurar chat
    document.getElementById('send-chat-btn').addEventListener('click', sendChatMessage);
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
    
    // Configurar botones de juego
    document.getElementById('place-bet-btn').addEventListener('click', placeBet);
    document.getElementById('call-liar-btn').addEventListener('click', callLiar);
    
    // Inicializar el juego
    initGame();
});

// Inicializar el juego
async function initGame() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    const gameCode = getGameCodeFromURL();
    
    // Obtener estado inicial del servidor (o crear si es host)
    await fetchInitialGameState();
    
    // Si soy el host, inicializar el juego
    if (isHost()) {
        initializeNewGame();
    }
    
    // Mostrar mis dados
    displayMyDice();
    updateGameUI();
}

// Obtener estado inicial del juego
async function fetchInitialGameState() {
    const gameCode = getGameCodeFromURL();
    const response = await fetch(`../server/game.php?action=getstate&code=${gameCode}`);
    const result = await response.json();
    
    if (result.status === 'success') {
        Object.assign(gameState, result.gameState);
    }
}

// Inicializar nuevo juego (solo host)
function initializeNewGame() {
    const players = Object.keys(gameState.players);
    
    if (players.length === 0) {
        // Si no hay jugadores en el estado, obtenerlos del lobby
        return;
    }
    
    // 1. Determinar orden de turno aleatorio
    gameState.turnOrder = shuffleArray([...players]);
    gameState.turnIndex = 0;
    gameState.currentPlayer = gameState.turnOrder[0];
    
    // 2. Repartir dados iniciales (5 por jugador)
    players.forEach(username => {
        const dice = rollDice(5);
        gameState.players[username] = {
            ...gameState.players[username],
            dice,
            diceCount: 5
        };
    });
    
    gameState.phase = 'betting';
    gameState.round = 1;
    
    // 3. Enviar estado a todos los jugadores
    broadcastGameState();
    saveGameState();
}

// Función para tirar dados
function rollDice(count) {
    const dice = [];
    for (let i = 0; i < count; i++) {
        dice.push(Math.floor(Math.random() * 6) + 1);
    }
    return dice;
}

// Mostrar dados del jugador actual
function displayMyDice() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    const myDice = gameState.players[user.username]?.dice || [];
    const container = document.getElementById('player-dice');
    container.innerHTML = '';
    
    myDice.forEach(value => {
        const die = document.createElement('div');
        die.className = 'die';
        die.textContent = value;
        container.appendChild(die);
    });
    
    // Actualizar contador de dados
    const diceCount = gameState.players[user.username]?.diceCount || 0;
    document.getElementById('dice-count').textContent = `🎲: ${diceCount}`;
}

// Enviar mensaje de chat
function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (message) {
        const user = JSON.parse(sessionStorage.getItem('user'));
        const chatData = {
            type: 'chat',
            from: user.username,
            text: message
        };
        
        // Mostrar localmente
        displayChatMessage(chatData);
        
        // Enviar a otros jugadores
        broadcastData(chatData);
        
        input.value = '';
    }
}

// Mostrar mensaje en el chat
function displayChatMessage(data) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    messageDiv.innerHTML = `<span class="sender">${data.from}:</span> ${data.text}`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Colocar una apuesta
function placeBet() {
    const diceValue = parseInt(document.getElementById('dice-value').value);
    const diceQuantity = parseInt(document.getElementById('dice-quantity').value);
    const user = JSON.parse(sessionStorage.getItem('user'));
    
    // Validar que es el turno del jugador
    if (gameState.currentPlayer !== user.username) {
        showMessage("No es tu turno", "error");
        return;
    }
    
    // Validar apuesta (debe ser mayor que la anterior)
    if (gameState.currentBet) {
        const currentQ = gameState.currentBet.quantity;
        const currentV = gameState.currentBet.value;
        
        if (diceQuantity < currentQ || (diceQuantity === currentQ && diceValue <= currentV)) {
            showMessage("Apuesta inválida. Debe ser mayor", "error");
            return;
        }
    }
    
    // Actualizar estado
    gameState.currentBet = { quantity: diceQuantity, value: diceValue };
    gameState.lastAction = { 
        type: 'bet', 
        player: user.username, 
        bet: `${diceQuantity}-${diceValue}` 
    };
    
    // Pasar al siguiente turno
    nextTurn();
    
    // Sincronizar con todos
    broadcastGameState();
    saveGameState();
    updateGameUI();
}

// Pasar al siguiente turno
function nextTurn() {
    gameState.turnIndex = (gameState.turnIndex + 1) % gameState.turnOrder.length;
    gameState.currentPlayer = gameState.turnOrder[gameState.turnIndex];
}

// Actualizar estado del juego
function updateGameState(data) {
    gameState.currentPlayer = data.player;
    gameState.currentBet = data.bet;
    
    document.getElementById('current-player').textContent = data.player;
    document.getElementById('bet-value').textContent = `🎲 ${data.bet.split('-')[0]}x${data.bet.split('-')[1]}`;
}

// Llamar "¡Mentiroso!"
function callLiar() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    
    // Validar que no es el turno del jugador (puede desafiar en cualquier momento)
    if (gameState.currentPlayer === user.username) {
        showMessage("Es tu turno, debes apostar", "error");
        return;
    }
    
    if (!gameState.currentBet) {
        showMessage("No hay apuesta para desafiar", "error");
        return;
    }
    
    // Cambiar fase a desafío
    gameState.phase = 'challenge';
    gameState.lastAction = { 
        type: 'challenge', 
        challenger: user.username, 
        target: gameState.currentPlayer 
    };
    
    // Sincronizar con todos
    broadcastGameState();
    saveGameState();
    updateGameUI();
    
    // Revelar todos los dados (solo host calcula)
    if (isHost()) {
        setTimeout(() => revealAllDice(), 1000); // Pequeña pausa para efecto dramático
    }
}

// Revelar todos los dados (solo host)
function revealAllDice() {
    // Calcular total de dados con el valor apostado
    let totalCount = 0;
    Object.values(gameState.players).forEach(player => {
        player.dice.forEach(die => {
            if (die === gameState.currentBet.value || die === 1) { // Los 1s son comodines
                totalCount++;
            }
        });
    });
    
    // Determinar perdedor: el retador o el apostador?
    const challenger = gameState.lastAction.challenger;
    const bettor = gameState.lastAction.target;
    
    let loser;
    if (totalCount >= gameState.currentBet.quantity) {
        // Apostador gana -> Retador pierde dado
        loser = challenger;
    } else {
        // Retador gana -> Apostador pierde dado
        loser = bettor;
    }
    
    gameState.players[loser].diceCount--;
    gameState.lastAction = {
        ...gameState.lastAction,
        result: `Total: ${totalCount}, Apostado: ${gameState.currentBet.quantity}`,
        loser: loser
    };
    
    // Preparar próximo round
    prepareNextRound();
}

// Preparar siguiente ronda
function prepareNextRound() {
    // 1. Eliminar jugadores sin dados
    Object.keys(gameState.players).forEach(username => {
        if (gameState.players[username].diceCount <= 0) {
            delete gameState.players[username];
            // Eliminar de turnOrder
            gameState.turnOrder = gameState.turnOrder.filter(u => u !== username);
        }
    });
    
    // 2. Verificar si hay ganador
    if (gameState.turnOrder.length === 1) {
        // Fin del juego
        gameState.phase = 'finished';
        gameState.lastAction = { type: 'winner', winner: gameState.turnOrder[0] };
    } else {
        // 3. Tirar dados para nuevo round
        Object.keys(gameState.players).forEach(username => {
            const diceCount = gameState.players[username].diceCount;
            gameState.players[username].dice = rollDice(diceCount);
        });
        
        // 4. Reiniciar apuesta y comenzar nuevo turno
        gameState.phase = 'betting';
        gameState.currentBet = null;
        gameState.turnIndex = (gameState.turnIndex + 1) % gameState.turnOrder.length;
        gameState.currentPlayer = gameState.turnOrder[gameState.turnIndex];
        gameState.round++;
    }
    
    broadcastGameState();
    saveGameState();
    updateGameUI();
}

// Enviar estado completo a todos los jugadores
function broadcastGameState() {
    broadcastData({
        type: 'state',
        state: gameState
    });
}

// Guardar estado en el servidor
async function saveGameState() {
    const gameCode = getGameCodeFromURL();
    await fetch('../server/game.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'savestate',
            code: gameCode,
            state: gameState
        })
    });
}

// Obtener estado del juego desde el servidor
async function fetchGameState() {
    const gameCode = getGameCodeFromURL();
    const response = await fetch(`../server/game.php?action=getstate&code=${gameCode}`);
    const result = await response.json();
    
    if (result.status === 'success') {
        Object.assign(gameState, result.gameState);
        updateGameUI();
        displayMyDice();
    }
}

// Actualizar UI con el estado actual
function updateGameUI() {
    // Actualizar jugadores
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';
    
    Object.keys(gameState.players).forEach(username => {
        const player = gameState.players[username];
        const li = document.createElement('li');
        li.innerHTML = `
            ${username} 
            <span class="dice-count">🎲: ${player.diceCount}</span>
        `;
        // Resaltar jugador actual
        if (username === gameState.currentPlayer) {
            li.style.backgroundColor = 'rgba(255, 215, 0, 0.3)';
        }
        playersList.appendChild(li);
    });
    
    // Actualizar turno y apuesta
    document.getElementById('current-player').textContent = gameState.currentPlayer || '-';
    
    if (gameState.currentBet) {
        document.getElementById('bet-value').textContent = 
            `🎲 ${gameState.currentBet.quantity}x${gameState.currentBet.value}`;
    } else {
        document.getElementById('bet-value').textContent = 'Ninguna';
    }
    
    // Mostrar mensaje de última acción
    if (gameState.lastAction) {
        let msg = '';
        switch (gameState.lastAction.type) {
            case 'bet':
                msg = `${gameState.lastAction.player} apostó ${gameState.lastAction.bet}`;
                break;
            case 'challenge':
                msg = `${gameState.lastAction.challenger} desafió a ${gameState.lastAction.target}!`;
                if (gameState.lastAction.result) {
                    msg += ` - ${gameState.lastAction.result} - ${gameState.lastAction.loser} pierde un dado`;
                }
                break;
            case 'winner':
                msg = `🏆 ${gameState.lastAction.winner} gana la partida!`;
                break;
        }
        showMessage(msg, 'info');
    }
    
    // Habilitar/deshabilitar botones según turno
    const user = JSON.parse(sessionStorage.getItem('user'));
    const isMyTurn = gameState.currentPlayer === user.username;
    
    document.getElementById('place-bet-btn').disabled = 
        !isMyTurn || gameState.phase !== 'betting';
    document.getElementById('call-liar-btn').disabled = 
        gameState.phase !== 'betting' || isMyTurn || !gameState.currentBet;
    
    // Actualizar opciones de cantidad basada en el número total de dados
    updateBetOptions();
}

// Actualizar opciones de apuesta
function updateBetOptions() {
    const quantitySelect = document.getElementById('dice-quantity');
    const totalDice = Object.values(gameState.players)
        .reduce((sum, player) => sum + player.diceCount, 0);
    
    quantitySelect.innerHTML = '';
    for (let i = 1; i <= totalDice; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        quantitySelect.appendChild(option);
    }
    
    // Si hay apuesta actual, ajustar mínimos
    if (gameState.currentBet) {
        for (let i = 1; i < gameState.currentBet.quantity; i++) {
            quantitySelect.children[i - 1].disabled = true;
        }
    }
}

// Función para barajar array (Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Verificar si soy el host
function isHost() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    return gameState.players[user.username]?.isHost || false;
}

// Mostrar mensajes al usuario
function showMessage(msg, type) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message system-message';
    messageDiv.innerHTML = `<span class="sender">Sistema:</span> ${msg}`;
    messageDiv.style.backgroundColor = type === 'error' ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 255, 0, 0.2)';
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Actualizar estado del juego (usado por P2P)
function updateGameState(data) {
    if (data.type === 'bet') {
        gameState.currentPlayer = data.player;
        gameState.currentBet = data.bet;
        
        document.getElementById('current-player').textContent = data.player;
        document.getElementById('bet-value').textContent = `🎲 ${data.bet.split('-')[0]}x${data.bet.split('-')[1]}`;
    }
}

// Función auxiliar para obtener código de juego
function getGameCodeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('code');
}