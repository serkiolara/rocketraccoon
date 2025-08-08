// Variables globales del Buscaminas Colaborativo
let gameState = {
    board: [],                  // Tablero del buscaminas [[{value: 0, revealed: false, flagged: false}]]
    width: 16,                  // Ancho del tablero
    height: 16,                 // Alto del tablero
    mines: 40,                  // Número de minas
    players: {},                // { username: { score: 0, flags: 0, reveals: 0 } }
    gameStatus: 'waiting',      // 'waiting' | 'playing' | 'won' | 'lost'
    timeStarted: null,          // Timestamp de inicio
    lastAction: null,           // Última acción para sincronizar
    revealedCells: 0,           // Celdas reveladas
    totalCells: 0,              // Total de celdas sin minas
    currentPlayer: null         // Jugador que está jugando
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
    document.getElementById('send-chat-btn').addEventListener('click', () => {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (text) {
            if (typeof sendChatMessage === 'function') {
                sendChatMessage(text);
            }
            input.value = '';
        }
    });
    
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const text = e.target.value.trim();
            if (text && typeof sendChatMessage === 'function') {
                sendChatMessage(text);
                e.target.value = '';
            }
        }
    });
    
    // Configurar botón de inicio de juego
    document.getElementById('start-game-btn').addEventListener('click', () => {
        console.log('🎮 Botón de inicio presionado');
        if (isHost()) {
            const players = Object.keys(gameState.players);
            if (players.length >= 1) { // Permitir juego con 1 jugador para prueba
                console.log('🚀 Iniciando juego manual con', players.length, 'jugadores');
                initializeNewGame();
            } else {
                showGameMessage('⚠️ Esperando más jugadores...');
            }
        } else {
            showGameMessage('⚠️ Solo el host puede iniciar el juego');
        }
    });
    
    // Configurar botones de juego
    document.getElementById('place-bet-btn').addEventListener('click', () => {
        const quantity = parseInt(document.getElementById('bet-quantity').value);
        const value = parseInt(document.getElementById('bet-value').value);
        
        if (quantity && value) {
            placeBet(quantity, value);
        } else {
            showGameMessage('⚠️ Ingresa cantidad y valor válidos');
        }
    });
    document.getElementById('call-liar-btn').addEventListener('click', callLiar);
    document.getElementById('pass-turn-btn').addEventListener('click', passTurn);
    
    // Configurar modal de ayuda
    document.getElementById('help-btn').addEventListener('click', () => {
        document.getElementById('help-modal').style.display = 'flex';
    });
    
    document.getElementById('close-help-btn').addEventListener('click', () => {
        document.getElementById('help-modal').style.display = 'none';
    });
    
    // Configurar botón debug
    document.getElementById('debug-btn').addEventListener('click', () => {
        console.log('=== DEBUG INFO ===');
        console.log('Usuario:', JSON.parse(sessionStorage.getItem('user')));
        console.log('Peer ID:', sessionStorage.getItem('peerId'));
        console.log('Conexiones:', Object.keys(connections || {}));
        console.log('Estado del juego:', gameState);
        
        // Mostrar info en chat
        displayChatMessage({
            type: 'chat',
            from: 'Debug',
            text: `🔧 Conexiones: ${Object.keys(connections || {}).length} | Peer: ${sessionStorage.getItem('peerId')?.substring(0, 8)}...`,
            isSystem: true
        });
        
        // Forzar búsqueda de jugadores
        if (typeof connectToOtherPlayers === 'function') {
            connectToOtherPlayers();
        }
    });
    
    // Cerrar modal al hacer clic fuera
    document.getElementById('help-modal').addEventListener('click', (e) => {
        if (e.target.id === 'help-modal') {
            document.getElementById('help-modal').style.display = 'none';
        }
    });
    
    // Inicializar el juego
    initGame();
    
    // Mostrar mensaje de bienvenida con instrucciones básicas
    setTimeout(() => {
        displayChatMessage({
            type: 'chat',
            from: 'Sistema',
            text: `¡Bienvenido ${user.username}! 🎲`,
            isSystem: true
        });
    }, 1000);
    
    setTimeout(() => {
        displayChatMessage({
            type: 'chat',
            from: 'Sistema',
            text: "Haz clic en ❓ Ayuda para ver las reglas completas",
            isSystem: true
        });
    }, 3000);
    
    setTimeout(() => {
        displayChatMessage({
            type: 'chat',
            from: 'Sistema',
            text: "Usa 🔧 Debug para ver información de conexión",
            isSystem: true
        });
    }, 5000);
    
    // Mensaje de prueba cada 30 segundos para verificar que el chat funciona
    setInterval(() => {
        const now = new Date();
        displayChatMessage({
            type: 'chat',
            from: 'Sistema',
            text: `⏰ Prueba de chat - ${now.toLocaleTimeString()}`,
            isSystem: true
        });
    }, 30000);
});

// Inicializar el juego
async function initGame() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    const gameCode = getGameCodeFromURL();
    
    console.log('🎮 Inicializando juego para:', user.username);
    
    // Crear controles de apuesta si no existen
    createBetControls();
    
    // Intentar cargar estado guardado localmente primero
    const savedState = localStorage.getItem(`gameState_${gameCode}`);
    if (savedState) {
        try {
            const parsedState = JSON.parse(savedState);
            Object.assign(gameState, parsedState);
            console.log('✅ Estado cargado localmente:', gameState);
        } catch (e) {
            console.log('❌ Error cargando estado local:', e);
        }
    }
    
    // Obtener estado del servidor como respaldo
    await fetchInitialGameState();
    
    // Asegurar que el jugador actual existe en el estado
    if (!gameState.players[user.username]) {
        gameState.players[user.username] = {
            dice: [],
            diceCount: 5,
            isHost: Object.keys(gameState.players).length === 0
        };
        console.log(`🆕 Jugador ${user.username} agregado al estado`);
    }
    
    // Inicializar WebRTC y buscar otros jugadores
    if (typeof initPeerConnection === 'function') {
        initPeerConnection(user.id);
        if (typeof startPlayerDiscovery === 'function') {
            startPlayerDiscovery();
        }
    }
    
    // Si soy el host, mostrar botón de inicio
    if (isHost()) {
        console.log('🎯 Soy el host - mostrando botón de inicio');
        document.getElementById('start-game-btn').style.display = 'block';
        showGameMessage('🎮 Eres el host. Presiona "INICIAR JUEGO" cuando estés listo.');
        
        // Ya no inicializar automáticamente - esperar al botón
    } else {
        console.log('� Soy un jugador - esperando al host');
        showGameMessage('⏳ Esperando que el host inicie el juego...');
    }
    
    // Actualizar UI inicial
    updateGameUI();
    updatePlayersList();
    
    // Mostrar mensaje de bienvenida
    showGameMessage(`¡Bienvenido ${user.username}! ${isHost() ? '(Host)' : ''}`);
    
    // Guardar estado inicial
    saveGameStateLocally();
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
    
    console.log('🚀 Host inicializando nuevo juego con jugadores:', players);
    
    if (players.length < 2) {
        console.log('⚠️ Necesitamos al menos 2 jugadores para iniciar');
        showGameMessage('Esperando más jugadores...');
        return;
    }
    
    // 1. Determinar orden de turno aleatorio
    gameState.turnOrder = shuffleArray([...players]);
    gameState.turnIndex = 0;
    gameState.currentPlayer = gameState.turnOrder[0];
    
    console.log('🔀 Orden de turno:', gameState.turnOrder);
    console.log('🎯 Primer jugador:', gameState.currentPlayer);
    
    // 2. Repartir dados iniciales (5 por jugador)
    players.forEach(username => {
        const dice = rollDice(5);
        gameState.players[username] = {
            ...gameState.players[username],
            dice,
            diceCount: 5
        };
        console.log(`🎲 ${username} recibió dados:`, dice);
    });
    
    // 3. Configurar estado inicial
    gameState.phase = 'betting';
    gameState.round = 1;
    gameState.currentBet = null;
    gameState.challenger = null;
    
    console.log('✅ Juego inicializado - Estado completo:', gameState);
    
    // 4. Actualizar UI local inmediatamente
    updateGameUI();
    updatePlayersList();
    displayMyDice();
    
    // 5. Forzar actualización del indicador de turno
    setTimeout(() => {
        const currentPlayerElement = document.getElementById('current-player');
        const user = JSON.parse(sessionStorage.getItem('user'));
        if (currentPlayerElement && gameState.currentPlayer) {
            const isMyTurn = gameState.currentPlayer === user.username;
            currentPlayerElement.innerHTML = `
                <div class="turn-display ${isMyTurn ? 'my-turn' : 'other-turn'}">
                    <div class="turn-label">🎯 TURNO ACTUAL</div>
                    <div class="player-name">${gameState.currentPlayer}</div>
                    ${isMyTurn ? 
                        '<div class="turn-status my-status">¡ES TU TURNO!</div>' : 
                        '<div class="turn-status waiting-status">Esperando turno...</div>'
                    }
                </div>
            `;
            console.log(`🎯 Indicador de turno actualizado para: ${gameState.currentPlayer}`);
        }
    }, 500);
    
    // 6. Mostrar mensaje de inicio
    showGameMessage(`🎮 ¡Juego iniciado! Turno de ${gameState.currentPlayer}`);
    
    // 7. Enviar estado a todos los jugadores
    broadcastGameState();
    saveGameState();
    
    // 8. Log final de verificación
    setTimeout(() => {
        console.log('🔍 Verificación post-inicialización:');
        console.log('- Jugador actual:', gameState.currentPlayer);
        console.log('- Fase:', gameState.phase);
        console.log('- Dados del host:', gameState.players[Object.keys(gameState.players)[0]]?.dice);
    }, 1000);
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
    if (!user || !gameState.players[user.username]) {
        console.log('❌ No se puede mostrar dados - jugador no encontrado');
        return;
    }
    
    const myDice = gameState.players[user.username].dice || [];
    const container = document.getElementById('player-dice');
    
    if (!container) {
        console.error('❌ Contenedor de dados no encontrado');
        return;
    }
    
    console.log(`🎲 Mostrando ${myDice.length} dados para ${user.username}:`, myDice);
    
    container.innerHTML = '';
    
    if (myDice.length === 0) {
        container.innerHTML = '<div class="no-dice">Esperando dados...</div>';
        return;
    }
    
    myDice.forEach((value, index) => {
        const die = document.createElement('div');
        die.className = 'die';
        die.textContent = value;
        
        // Animación de entrada
        die.style.opacity = '0';
        die.style.transform = 'scale(0)';
        container.appendChild(die);
        
        // Animación con retardo
        setTimeout(() => {
            die.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            die.style.opacity = '1';
            die.style.transform = 'scale(1)';
        }, index * 100);
    });
    
    // Actualizar contador de dados
    const diceCount = gameState.players[user.username].diceCount || 0;
    const diceCountElement = document.getElementById('dice-count');
    if (diceCountElement) {
        diceCountElement.textContent = `🎲: ${diceCount}`;
    }
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
    const quantitySelect = document.getElementById('bet-quantity');
    const valueSelect = document.getElementById('bet-value');
    
    if (!quantitySelect || !valueSelect) {
        console.error('❌ Controles de apuesta no encontrados');
        createBetControls();
        return;
    }
    
    const quantity = parseInt(quantitySelect.value);
    const value = parseInt(valueSelect.value);
    const user = JSON.parse(sessionStorage.getItem('user'));
    
    console.log(`🎯 Intentando apostar: ${quantity}x dados con valor ${value}`);
    
    // Validar que es el turno del jugador
    if (gameState.currentPlayer !== user.username) {
        showMessage("❌ No es tu turno", "error");
        console.log(`❌ Turno actual: ${gameState.currentPlayer}, Usuario: ${user.username}`);
        return;
    }
    
    // Validar apuesta
    if (!isValidBet(quantity, value)) {
        const currentBetText = gameState.currentBet 
            ? `${gameState.currentBet.quantity}x dados con valor ${gameState.currentBet.value}`
            : 'ninguna';
        showMessage(`❌ Apuesta inválida. Actual: ${currentBetText}`, "error");
        return;
    }
    
    playSound('bet'); // Sonido de apuesta
    
    // Actualizar estado
    gameState.currentBet = { quantity, value };
    gameState.lastAction = `${user.username} apostó: ${quantity}x dados con valor ${value}`;
    gameState.timestamp = Date.now();
    
    console.log('✅ Apuesta válida:', gameState.currentBet);
    
    // Pasar al siguiente turno
    nextTurn();
    
    // Enviar la apuesta a todos los jugadores
    if (typeof broadcastData === 'function') {
        broadcastData({
            type: 'bet',
            player: user.username,
            bet: gameState.currentBet,
            nextPlayer: gameState.currentPlayer,
            timestamp: gameState.timestamp
        });
    }
    
    // Actualizar UI local y guardar estado
    updateGameUI();
    updateCurrentBetDisplay();
    updatePlayersList();
    showGameMessage(gameState.lastAction);
    
    if (isHost()) {
        saveGameState();
    }
}

// Pasar al siguiente turno
function nextTurn() {
    console.log('➡️ Pasando al siguiente turno');
    console.log('🔄 Turno actual:', gameState.turnIndex, 'Jugador:', gameState.currentPlayer);
    
    playSound('turn'); // Sonido de turno
    
    // Avanzar al siguiente jugador
    gameState.turnIndex = (gameState.turnIndex + 1) % gameState.turnOrder.length;
    gameState.currentPlayer = gameState.turnOrder[gameState.turnIndex];
    
    console.log('➡️ Nuevo turno:', gameState.turnIndex, 'Jugador:', gameState.currentPlayer);
    
    // Actualizar UI inmediatamente
    updateGameUI();
    updatePlayersList();
    
    // Mostrar mensaje del turno
    showGameMessage(`🎯 Turno de ${gameState.currentPlayer}`);
}

// Función para pasar turno
function passTurn() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    
    console.log(`🚶 ${user.username} quiere pasar turno`);
    
    if (gameState.currentPlayer !== user.username) {
        showMessage("❌ No es tu turno", "error");
        return;
    }
    
    // Solo se puede pasar si hay al menos una apuesta previa
    if (!gameState.currentBet) {
        showMessage("❌ Debes hacer la primera apuesta, no puedes pasar", "error");
        return;
    }
    
    console.log('✅ Pasando turno válido');
    
    playSound('pass'); // Sonido de pasar
    
    gameState.lastAction = `${user.username} pasó su turno`;
    gameState.timestamp = Date.now();
    
    // Pasar al siguiente turno
    nextTurn();
    
    // Enviar acción a todos los jugadores
    if (typeof broadcastData === 'function') {
        broadcastData({
            type: 'pass',
            player: user.username,
            nextPlayer: gameState.currentPlayer,
            timestamp: gameState.timestamp
        });
    }
    
    showGameMessage(gameState.lastAction);
    
    if (isHost()) {
        saveGameState();
    }
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
    
    console.log(`🎯 ${user.username} quiere decir mentiroso`);
    console.log(`🎯 Turno actual: ${gameState.currentPlayer}`);
    console.log(`🎯 Apuesta actual:`, gameState.currentBet);
    
    // Validar que NO es el turno del jugador (solo puede desafiar cuando NO es su turno)
    if (gameState.currentPlayer === user.username) {
        showMessage("❌ Es tu turno, debes apostar o pasar", "error");
        return;
    }
    
    // Validar que hay una apuesta para desafiar
    if (!gameState.currentBet) {
        showMessage("❌ No hay apuesta para desafiar", "error");
        return;
    }
    
    // Validar que el juego está en fase de apuestas
    if (gameState.phase !== 'betting') {
        showMessage("❌ No puedes desafiar en este momento", "error");
        return;
    }
    
    playSound('challenge'); // Sonido de desafío
    
    console.log('✅ Desafío válido - iniciando resolución');
    
    // Cambiar fase a desafío
    gameState.phase = 'challenge';
    gameState.challenger = user.username;
    gameState.lastAction = `${user.username} gritó ¡MENTIROSO! a ${gameState.currentPlayer}`;
    gameState.timestamp = Date.now();
    
    // Enviar desafío a todos los jugadores
    if (typeof broadcastData === 'function') {
        broadcastData({
            type: 'challenge',
            challenger: user.username,
            challenged: gameState.currentPlayer,
            bet: gameState.currentBet,
            timestamp: gameState.timestamp
        });
    }
    
    updateGameUI();
    updatePlayersList();
    showGameMessage(`🎲 ${gameState.lastAction} - Revelando dados...`);
    
    // Revelar todos los dados (solo host calcula)
    if (isHost()) {
        setTimeout(() => revealAllDice(), 2000); // Pausa dramática
    }
}

// Revelar todos los dados (solo host)
function revealAllDice() {
    console.log('🎲 Revelando dados para resolver desafío');
    console.log('🎯 Apuesta actual:', gameState.currentBet);
    console.log('⚔️ Challenger:', gameState.challenger);
    console.log('🎯 Current Player (apostador):', gameState.currentPlayer);
    
    // Calcular total de dados con el valor apostado
    let totalCount = 0;
    let allDice = [];
    
    Object.keys(gameState.players).forEach(username => {
        const player = gameState.players[username];
        console.log(`🎲 ${username} tiene dados:`, player.dice);
        
        player.dice.forEach(die => {
            allDice.push({player: username, value: die});
            if (die === gameState.currentBet.value || die === 1) { // Los 1s son comodines
                totalCount++;
            }
        });
    });
    
    console.log('🎲 Todos los dados:', allDice);
    console.log(`📊 Total dados con valor ${gameState.currentBet.value} (incluyendo 1s): ${totalCount}`);
    console.log(`🎯 Apostado: ${gameState.currentBet.quantity}`);
    
    // Determinar perdedor
    const challenger = gameState.challenger;
    const bettor = gameState.currentPlayer; // Quien hizo la apuesta original
    
    let loser, winner;
    if (totalCount >= gameState.currentBet.quantity) {
        // La apuesta era correcta -> El challenger pierde
        loser = challenger;
        winner = bettor;
    } else {
        // La apuesta era incorrecta -> El apostador pierde
        loser = bettor;
        winner = challenger;
    }
    
    console.log(`🏆 Ganador: ${winner}, 💥 Perdedor: ${loser}`);
    
    // El perdedor pierde un dado
    gameState.players[loser].diceCount--;
    
    // Actualizar estado del juego
    gameState.lastChallenge = {
        challenger: challenger,
        bettor: bettor,
        bet: gameState.currentBet,
        totalFound: totalCount,
        winner: winner,
        loser: loser,
        allDice: allDice
    };
    
    // Mostrar resultados
    showRoundResults(totalCount, winner, loser);
    
    // Broadcast del resultado a todos
    if (typeof broadcastData === 'function') {
        broadcastData({
            type: 'challenge-result',
            result: gameState.lastChallenge,
            timestamp: Date.now()
        });
    }
}

// Mostrar resultados de la ronda
function showRoundResults(totalCount, winner, loser) {
    console.log('📊 Mostrando resultados del desafío');
    
    const modal = document.getElementById('results-modal');
    const content = document.getElementById('results-content');
    
    if (!modal || !content) {
        console.error('❌ Modal de resultados no encontrado');
        return;
    }
    
    // Mostrar dados de cada jugador
    let diceDetails = '<div class="dice-reveal">';
    Object.keys(gameState.players).forEach(username => {
        const player = gameState.players[username];
        diceDetails += `
            <div class="player-dice-reveal">
                <strong>${username}:</strong> 
                ${player.dice.map(die => {
                    const isWildOrMatch = die === 1 || die === gameState.currentBet.value;
                    return `<span class="die-result ${isWildOrMatch ? 'match' : ''}">${die}</span>`;
                }).join(' ')}
            </div>
        `;
    });
    diceDetails += '</div>';
    
    content.innerHTML = `
        <div class="challenge-summary">
            <h3>🎲 Resultado del Desafío</h3>
            <p><strong>Apuesta:</strong> ${gameState.currentBet.quantity} dados con valor ${gameState.currentBet.value}</p>
            <p><strong>Apostador:</strong> ${gameState.currentPlayer}</p>
            <p><strong>Retador:</strong> ${gameState.challenger}</p>
            ${diceDetails}
            <p><strong>Total encontrado:</strong> ${totalCount} (incluyendo 1s como comodines)</p>
            <div class="result-verdict">
                ${totalCount >= gameState.currentBet.quantity 
                    ? `<p class="winner">✅ La apuesta era CORRECTA</p>
                       <p><strong>${winner}</strong> gana el desafío</p>
                       <p><strong>${loser}</strong> pierde un dado (${gameState.players[loser].diceCount} restantes)</p>`
                    : `<p class="loser">❌ La apuesta era INCORRECTA</p>
                       <p><strong>${winner}</strong> gana el desafío</p>
                       <p><strong>${loser}</strong> pierde un dado (${gameState.players[loser].diceCount} restantes)</p>`
                }
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    
    // Auto cerrar después de 8 segundos y continuar
    setTimeout(() => {
        modal.style.display = 'none';
        continueToNextRound();
    }, 8000);
    
    // Configurar botón de continuar
    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
        continueBtn.onclick = () => {
            modal.style.display = 'none';
            continueToNextRound();
        };
    }
    
    // Agregar evento para cerrar modal
    document.getElementById('continue-btn').addEventListener('click', () => {
        document.getElementById('results-modal').style.display = 'none';
    });
}

// Función para continuar a la siguiente ronda
function continueToNextRound() {
    console.log('🚀 Continuando a la siguiente ronda');
    
    // Verificar si alguien fue eliminado
    const eliminatedPlayers = Object.keys(gameState.players).filter(
        username => gameState.players[username].diceCount <= 0
    );
    
    if (eliminatedPlayers.length > 0) {
        eliminatedPlayers.forEach(username => {
            showGameMessage(`💀 ${username} ha sido eliminado del juego`);
            delete gameState.players[username];
            gameState.turnOrder = gameState.turnOrder.filter(u => u !== username);
        });
    }
    
    // Verificar condición de victoria
    if (gameState.turnOrder.length === 1) {
        // ¡Tenemos un ganador!
        const winner = gameState.turnOrder[0];
        gameState.phase = 'finished';
        showGameMessage(`🏆 ¡${winner} gana el juego!`);
        
        // Mostrar modal de victoria
        const modal = document.getElementById('results-modal');
        const content = document.getElementById('results-content');
        content.innerHTML = `
            <div class="victory-screen">
                <h2>🏆 ¡VICTORIA!</h2>
                <p><strong>${winner}</strong> es el último jugador en pie</p>
                <p>¡Felicitaciones por ganar en Liar's Dice!</p>
            </div>
        `;
        modal.style.display = 'flex';
        
        return; // Terminar aquí
    }
    
    // Continuar con nueva ronda
    prepareNextRound();
}

// Preparar siguiente ronda
function prepareNextRound() {
    console.log('🔄 Preparando siguiente ronda');
    
    // El perdedor del desafío comienza la siguiente ronda
    const loser = gameState.lastChallenge?.loser;
    
    // 1. Tirar nuevos dados para todos los jugadores restantes
    Object.keys(gameState.players).forEach(username => {
        const diceCount = gameState.players[username].diceCount;
        if (diceCount > 0) {
            gameState.players[username].dice = rollDice(diceCount);
            console.log(`🎲 ${username} tiró ${diceCount} dados:`, gameState.players[username].dice);
        }
    });
    
    // 2. Reiniciar estado de la ronda
    gameState.phase = 'betting';
    gameState.currentBet = null;
    gameState.challenger = null;
    gameState.lastChallenge = null;
    gameState.round++;
    
    // 3. El perdedor comienza (o el siguiente en línea si el perdedor fue eliminado)
    if (loser && gameState.players[loser] && gameState.players[loser].diceCount > 0) {
        // El perdedor existe y puede jugar
        const loserIndex = gameState.turnOrder.indexOf(loser);
        if (loserIndex !== -1) {
            gameState.turnIndex = loserIndex;
            gameState.currentPlayer = loser;
        }
    } else {
        // El perdedor fue eliminado, siguiente jugador
        gameState.turnIndex = gameState.turnIndex % gameState.turnOrder.length;
        gameState.currentPlayer = gameState.turnOrder[gameState.turnIndex];
    }
    
    console.log(`🚀 Nueva ronda ${gameState.round} - Comienza: ${gameState.currentPlayer}`);
    
    // 4. Actualizar UI y mostrar dados
    updateGameUI();
    updatePlayersList();
    displayMyDice();
    
    // 5. Mostrar mensaje de nueva ronda
    showGameMessage(`🎲 Ronda ${gameState.round} - Turno de ${gameState.currentPlayer}`);
    
    // 6. Sincronizar con otros jugadores
    broadcastGameState();
    
    if (isHost()) {
        saveGameState();
    }
}

// Enviar estado completo a todos los jugadores
function broadcastGameState() {
    gameState.timestamp = Date.now(); // Agregar timestamp
    
    if (typeof broadcastData === 'function') {
        broadcastData({
            type: 'game-state',
            state: gameState,
            timestamp: gameState.timestamp
        });
    }
    
    // Guardar estado localmente
    saveGameStateLocally();
    
    // Solo el host guarda en el servidor
    if (isHost()) {
        saveGameState();
    }
}

// Recibir estado del juego de otro jugador
function receiveGameState(newState) {
    // Actualizar solo si el timestamp es más reciente
    if (!gameState.timestamp || newState.timestamp > gameState.timestamp) {
        // Preservar mis dados actuales
        const user = JSON.parse(sessionStorage.getItem('user'));
        const myCurrentDice = gameState.players[user.username]?.dice;
        
        gameState = { ...newState };
        
        // Restaurar mis dados si no están en el nuevo estado
        if (myCurrentDice && (!newState.players[user.username]?.dice || newState.players[user.username].dice.length === 0)) {
            gameState.players[user.username].dice = myCurrentDice;
        }
        
        updateGameUI();
        displayMyDice();
        saveGameStateLocally();
        
        // Mostrar mensaje de actualización
        showGameMessage("Estado del juego actualizado");
    }
}

// Guardar estado localmente
function saveGameStateLocally() {
    const gameCode = getGameCodeFromURL();
    try {
        localStorage.setItem(`gameState_${gameCode}`, JSON.stringify(gameState));
    } catch (e) {
        console.log('Error guardando estado localmente:', e);
    }
}

// Limpiar estado local al finalizar partida
function clearLocalGameState() {
    const gameCode = getGameCodeFromURL();
    localStorage.removeItem(`gameState_${gameCode}`);
}

// Manejar apuesta recibida
function handleBetReceived(data) {
    gameState.currentBet = data.bet;
    gameState.currentPlayer = data.nextPlayer;
    gameState.lastAction = `${data.player} apostó: ${data.bet.quantity} ${getDiceLabel(data.bet.value)}`;
    
    updateGameUI();
    showGameMessage(gameState.lastAction);
    playSound('bet');
}

// Manejar desafío recibido
function handleChallengeReceived(data) {
    gameState.phase = 'reveal';
    gameState.lastAction = `${data.challenger} desafió a ${data.challenged}`;
    
    updateGameUI();
    showGameMessage(gameState.lastAction);
    playSound('challenge');
    
    // Procesar resultado del desafío
    setTimeout(() => {
        processChallengeResult(data);
    }, 2000);
}

// Manejar tirada de dados recibida
function handleDiceRollReceived(data) {
    if (gameState.players[data.player]) {
        gameState.players[data.player].dice = data.dice;
        gameState.players[data.player].diceCount = data.dice.length;
    }
    
    updateGameUI();
    showGameMessage(`${data.player} ha tirado sus dados`);
}

// Manejar acciones de jugador
function handlePlayerAction(data) {
    switch (data.action) {
        case 'join':
            gameState.players[data.player] = {
                dice: [],
                diceCount: 0,
                isHost: false
            };
            showGameMessage(`${data.player} se unió al juego`);
            break;
        case 'leave':
            if (gameState.players[data.player]) {
                delete gameState.players[data.player];
                showGameMessage(`${data.player} abandonó el juego`);
                
                // Actualizar orden de turnos
                gameState.turnOrder = gameState.turnOrder.filter(p => p !== data.player);
                if (gameState.turnOrder.length > 0) {
                    gameState.turnIndex = gameState.turnIndex % gameState.turnOrder.length;
                    gameState.currentPlayer = gameState.turnOrder[gameState.turnIndex];
                }
            }
            break;
        case 'pass':
            gameState.currentPlayer = data.data.nextPlayer;
            showGameMessage(`${data.player} pasó su turno`);
            break;
        case 'ready':
            showGameMessage(`${data.player} está listo`);
            break;
    }
    
    updateGameUI();
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
    console.log('🎮 Actualizando UI del juego');
    
    const user = JSON.parse(sessionStorage.getItem('user'));
    
    // Crear controles si no existen
    if (!document.getElementById('bet-quantity')) {
        createBetControls();
    }
    
    // Actualizar controles del juego
    updateGameControls();
    
    // Actualizar información del turno con más detalle
    const currentPlayerElement = document.getElementById('current-player');
    if (currentPlayerElement) {
        const currentPlayer = gameState.currentPlayer || 'Esperando...';
        
        if (currentPlayer === 'Esperando...') {
            currentPlayerElement.innerHTML = '<div class="waiting-turn">⏳ Esperando inicio de turno...</div>';
        } else {
            const isMyTurn = currentPlayer === user.username;
            currentPlayerElement.innerHTML = `
                <div class="turn-display ${isMyTurn ? 'my-turn' : 'other-turn'}">
                    <div class="turn-label">🎯 TURNO ACTUAL</div>
                    <div class="player-name">${currentPlayer}</div>
                    ${isMyTurn ? 
                        '<div class="turn-status my-status">¡ES TU TURNO!</div>' : 
                        '<div class="turn-status waiting-status">Esperando turno...</div>'
                    }
                </div>
            `;
        }
    }
    
    // Resaltar jugador actual en lista de jugadores
    const playersList = document.getElementById('players-list');
    if (playersList && gameState.currentPlayer) {
        const playerItems = playersList.querySelectorAll('li');
        playerItems.forEach(item => {
            const playerName = item.textContent.split(' (')[0].trim();
            item.classList.remove('current-turn');
            if (playerName === gameState.currentPlayer) {
                item.classList.add('current-turn');
                console.log(`✅ Resaltando jugador actual en lista: ${playerName}`);
            }
        });
    }
    
    // Actualizar información de la apuesta
    updateCurrentBetDisplay();
    
    // Actualizar lista de jugadores
    updatePlayersList();
    
    // Actualizar conteo de mis dados
    if (gameState.players[user.username]) {
        const diceCountElement = document.getElementById('dice-count');
        if (diceCountElement) {
            diceCountElement.textContent = `🎲: ${gameState.players[user.username].diceCount || 0}`;
        }
    }
    
    console.log('✅ UI actualizada completamente');
}

// Función para mostrar/ocultar controles según el estado del juego
function updateGameControls() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    const isMyTurn = gameState.currentPlayer === user.username;
    const isHostUser = isHost();
    
    // Botón de inicio (solo host y si el juego no ha empezado)
    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
        const showStart = isHostUser && (!gameState.currentPlayer || gameState.phase === 'waiting');
        startBtn.style.display = showStart ? 'block' : 'none';
        console.log(`🎮 Botón inicio - Host: ${isHostUser}, Mostrar: ${showStart}`);
    }
    
    // Controles de apuesta (solo en mi turno y fase betting)
    const bettingControls = document.getElementById('betting-controls');
    if (bettingControls) {
        bettingControls.style.display = (isMyTurn && gameState.phase === 'betting') ? 'block' : 'none';
    }
    
    // Botón de desafío (solo si hay una apuesta activa y no es mi turno)
    const liarBtn = document.getElementById('call-liar-btn');
    if (liarBtn) {
        liarBtn.style.display = (gameState.currentBet && !isMyTurn && gameState.phase === 'betting') ? 'block' : 'none';
    }
    
    console.log(`🎮 Controles - Mi turno: ${isMyTurn}, Fase: ${gameState.phase}, Host: ${isHostUser}`);
}
    
    // Resaltar jugador actual en lista de jugadores
    const playersList = document.getElementById('players-list');
    if (playersList && gameState.currentPlayer) {
        const playerItems = playersList.querySelectorAll('li');
        playerItems.forEach(item => {
            const playerName = item.textContent.split(' (')[0].trim();
            item.classList.remove('current-turn');
            if (playerName === gameState.currentPlayer) {
                item.classList.add('current-turn');
                console.log(`✅ Resaltando jugador actual en lista: ${playerName}`);
            }
        });
    }
    
    // Actualizar información de la apuesta
    updateCurrentBetDisplay();
    
    // Actualizar lista de jugadores
    updatePlayersList();
    
    // Actualizar conteo de mis dados
    if (gameState.players[user.username]) {
        const diceCountElement = document.getElementById('dice-count');
        if (diceCountElement) {
            diceCountElement.textContent = `🎲: ${gameState.players[user.username].diceCount || 0}`;
        }
    }
    
    // Actualizar botones según el estado del juego
    updateButtonStates();
    
    // Mostrar mis dados si existen
    if (gameState.players[user.username] && gameState.players[user.username].dice) {
        displayMyDice();
    }

// Actualizar estados de botones
function updateButtonStates() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    const isMyTurn = gameState.currentPlayer === user.username;
    const isGameActive = gameState.phase === 'betting';
    const hasBet = !!gameState.currentBet;
    
    console.log(`🎮 Actualizando botones - Mi turno: ${isMyTurn}, Juego activo: ${isGameActive}, Hay apuesta: ${hasBet}`);
    
    // Botón de apostar - solo si es mi turno y el juego está activo
    const placeBetBtn = document.getElementById('place-bet-btn');
    if (placeBetBtn) {
        placeBetBtn.disabled = !isMyTurn || !isGameActive;
        placeBetBtn.textContent = hasBet ? 'Subir Apuesta' : 'Apostar';
    }
    
    // Botón de pasar turno - solo si es mi turno, hay apuesta previa
    const passTurnBtn = document.getElementById('pass-turn-btn');
    if (passTurnBtn) {
        passTurnBtn.disabled = !isMyTurn || !isGameActive || !hasBet;
    }
    
    // Botón de desafiar - solo si NO es mi turno, hay apuesta, y juego activo
    const callLiarBtn = document.getElementById('call-liar-btn');
    if (callLiarBtn) {
        callLiarBtn.disabled = isMyTurn || !isGameActive || !hasBet;
        if (!callLiarBtn.disabled) {
            callLiarBtn.style.background = '#f44336';
            callLiarBtn.style.animation = 'pulse 2s infinite';
        } else {
            callLiarBtn.style.background = '#666';
            callLiarBtn.style.animation = 'none';
        }
    }
    
    // Selectores de apuesta - solo si es mi turno
    const quantitySelect = document.getElementById('bet-quantity');
    const valueSelect = document.getElementById('bet-value');
    if (quantitySelect) quantitySelect.disabled = !isMyTurn || !isGameActive;
    if (valueSelect) valueSelect.disabled = !isMyTurn || !isGameActive;
}

// Mostrar mensaje de juego en el chat
function showGameMessage(message) {
    displayChatMessage({
        type: 'chat',
        from: 'Juego',
        text: message,
        isSystem: true
    });
}

// Actualizar opciones de apuesta
function updateBetOptions() {
    const quantitySelect = document.getElementById('dice-quantity');
    if (!quantitySelect) return;
    
    const totalDice = Object.values(gameState.players)
        .reduce((sum, player) => sum + (player.diceCount || 0), 0);
    
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
            if (quantitySelect.children[i - 1]) {
                quantitySelect.children[i - 1].disabled = true;
            }
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

// Funciones de sonido usando Web Audio API
let soundContext;
try {
    soundContext = new (window.AudioContext || window.webkitAudioContext)();
} catch (e) {
    console.log('Web Audio API no soportada');
    soundContext = null;
}

// Función de sonido mejorada con diferentes tipos
function playSound(type, duration = 0.2) {
    if (!soundContext) return;
    
    let frequency;
    switch (type) {
        case 'bet':
            frequency = 523.25; // Do - sonido de apuesta
            break;
        case 'challenge':
            frequency = 349.23; // Fa - sonido dramático de desafío
            duration = 0.5;
            break;
        case 'turn':
            frequency = 659.25; // Mi - sonido de cambio de turno
            duration = 0.1;
            break;
        case 'pass':
            frequency = 440.00; // La - sonido neutral de pasar
            duration = 0.15;
            break;
        case 'win':
            frequency = 783.99; // Sol - sonido de victoria
            duration = 1.0;
            break;
        case 'lose':
            frequency = 293.66; // Re - sonido de derrota
            duration = 0.8;
            break;
        case 'connect':
            frequency = 698.46; // Fa# - sonido de conexión
            duration = 0.3;
            break;
        default:
            frequency = type; // Para compatibilidad con llamadas numéricas
    }
    
    try {
        const oscillator = soundContext.createOscillator();
        const gainNode = soundContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(soundContext.destination);
        
        oscillator.type = type === 'challenge' ? 'square' : 'triangle';
        oscillator.frequency.value = frequency;
        
        gainNode.gain.setValueAtTime(0.1, soundContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, soundContext.currentTime + duration);
        
        oscillator.start(soundContext.currentTime);
        oscillator.stop(soundContext.currentTime + duration);
    } catch (e) {
        console.log('Error reproduciendo sonido:', e);
    }
}

// Función para obtener etiqueta de dado
function getDiceLabel(value) {
    const labels = {
        1: "1 (comodín)",
        2: "2",
        3: "3", 
        4: "4",
        5: "5",
        6: "6"
    };
    return labels[value] || value.toString();
}

// Animación para cambio de dados
function animateDiceChange(oldCount, newCount) {
    const container = document.getElementById('player-dice');
    
    // Animación de salida para dados perdidos
    if (newCount < oldCount) {
        const dice = container.querySelectorAll('.die');
        for (let i = newCount; i < oldCount; i++) {
            setTimeout(() => {
                if (dice[i]) {
                    dice[i].style.transform = 'scale(0)';
                    dice[i].style.opacity = '0';
                }
            }, (i - newCount) * 200);
        }
    }
    
    // Actualizar después de la animación
    setTimeout(() => {
        displayMyDice();
    }, (oldCount - newCount) * 200 + 300);
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

// Actualizar lista de jugadores
function updatePlayersList() {
    const playersList = document.getElementById('players-list');
    if (!playersList) return;
    
    console.log('🎮 Actualizando lista de jugadores:', Object.keys(gameState.players));
    
    playersList.innerHTML = '';
    
    Object.keys(gameState.players).forEach(username => {
        const player = gameState.players[username];
        const li = document.createElement('li');
        
        // Marcar jugador actual
        if (username === gameState.currentPlayer) {
            li.classList.add('current-turn');
        }
        
        li.innerHTML = `
            <div class="player-info">
                <span class="player-name">${username}</span>
                ${player.isHost ? '<span class="host-badge">👑</span>' : ''}
            </div>
            <span class="dice-count">🎲 ${player.diceCount}</span>
        `;
        
        playersList.appendChild(li);
    });
}

// Crear controles de apuesta dinámicamente
function createBetControls() {
    const gameControls = document.querySelector('.game-controls');
    if (!gameControls) return;
    
    // Verificar si ya existen
    if (gameControls.querySelector('.bet-controls')) return;
    
    const betControlsHTML = `
        <div class="bet-controls">
            <div class="bet-input-group">
                <label for="bet-quantity">Cantidad:</label>
                <select id="bet-quantity">
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="7">7</option>
                    <option value="8">8</option>
                    <option value="9">9</option>
                    <option value="10">10</option>
                </select>
            </div>
            <div class="bet-input-group">
                <label for="bet-value">Valor del dado:</label>
                <select id="bet-value">
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                </select>
            </div>
            <div class="bet-actions">
                <button id="place-bet-btn" class="bet-action-btn">Apostar</button>
                <button id="pass-turn-btn" class="bet-action-btn" style="background: #FF9800;">Pasar</button>
            </div>
        </div>
    `;
    
    // Insertar antes del botón de mentiroso
    const callLiarBtn = document.getElementById('call-liar-btn');
    callLiarBtn.insertAdjacentHTML('beforebegin', betControlsHTML);
    
    // Agregar eventos
    document.getElementById('place-bet-btn').addEventListener('click', placeBet);
    document.getElementById('pass-turn-btn').addEventListener('click', passTurn);
    
    console.log('🎮 Controles de apuesta creados');
}

// Validar apuesta
function isValidBet(quantity, value) {
    if (!gameState.currentBet) {
        // Primera apuesta de la ronda
        return quantity >= 1 && value >= 2 && value <= 6;
    }
    
    const currentQuantity = gameState.currentBet.quantity;
    const currentValue = gameState.currentBet.value;
    
    // La nueva apuesta debe ser mayor
    if (quantity > currentQuantity) {
        return value >= 2 && value <= 6;
    } else if (quantity === currentQuantity) {
        return value > currentValue;
    }
    
    return false;
}

// Función mejorada para mostrar apuesta actual
function updateCurrentBetDisplay() {
    const betValueElement = document.getElementById('bet-value');
    if (!betValueElement) return;
    
    if (gameState.currentBet) {
        const { quantity, value } = gameState.currentBet;
        betValueElement.textContent = `${quantity}x dados con valor ${value}`;
    } else {
        betValueElement.textContent = 'Ninguna';
    }
}