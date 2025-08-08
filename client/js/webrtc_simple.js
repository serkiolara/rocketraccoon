// ====================================
// 🔗 WEBRTC SIMPLIFICADO PARA BUSCAMINAS
// ====================================

// Variables globales
let peer = null;
let connections = {};
let isHost = false;
let gameCode = null;
let currentUser = null;

// ====================================
// INICIALIZACIÓN
// ====================================

function initWebRTC() {
    currentUser = JSON.parse(sessionStorage.getItem('user'));
    gameCode = getGameCodeFromURL();
    
    if (!currentUser || !gameCode) {
        console.error('❌ Usuario o código de juego no encontrado');
        return;
    }
    
    console.log('🔗 Iniciando WebRTC para:', currentUser.username);
    
    // Crear conexión PeerJS
    const peerId = `${gameCode}_${currentUser.username}_${Date.now()}`;
    
    peer = new Peer(peerId, {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        debug: 1
    });
    
    peer.on('open', (id) => {
        console.log('✅ Conectado a PeerJS:', id);
        sessionStorage.setItem('peerId', id);
        
        // Determinar si soy host (primer jugador)
        isHost = determineHost();
        
        displaySystemMessage(`🔗 Conectado como ${isHost ? 'HOST' : 'JUGADOR'}`);
        
        // Buscar otros jugadores
        setTimeout(() => {
            findOtherPlayers();
        }, 1000);
    });
    
    peer.on('connection', (conn) => {
        console.log('📞 Nueva conexión entrante:', conn.peer);
        handleIncomingConnection(conn);
    });
    
    peer.on('error', (err) => {
        console.error('❌ Error PeerJS:', err);
        displaySystemMessage(`❌ Error de conexión: ${err.type}`);
    });
}

function determineHost() {
    // Simple: el que tiene menor timestamp en el ID es el host
    const myTimestamp = peer.id.split('_').pop();
    return true; // Por simplicidad, todos pueden ser host inicialmente
}

// ====================================
// CONEXIONES P2P
// ====================================

function findOtherPlayers() {
    console.log('🔍 Buscando otros jugadores...');
    
    // Lista de posibles IDs de otros jugadores (simulado)
    const possiblePlayers = ['user1', 'user2', 'user3', 'user4'];
    
    possiblePlayers.forEach(username => {
        if (username !== currentUser.username) {
            const targetId = `${gameCode}_${username}`;
            tryConnectToPlayer(targetId);
        }
    });
    
    // También intentar conectar con IDs más recientes
    setTimeout(() => {
        checkForMorePlayers();
    }, 3000);
}

function tryConnectToPlayer(targetId) {
    console.log('🔗 Intentando conectar con:', targetId);
    
    try {
        const conn = peer.connect(targetId, {
            metadata: {
                username: currentUser.username,
                gameCode: gameCode
            }
        });
        
        conn.on('open', () => {
            console.log('✅ Conectado con:', targetId);
            connections[targetId] = conn;
            handleNewConnection(conn);
        });
        
        conn.on('error', (err) => {
            console.log('❌ No se pudo conectar con:', targetId, err.type);
        });
        
    } catch (err) {
        console.log('❌ Error conectando con:', targetId);
    }
}

function handleIncomingConnection(conn) {
    conn.on('open', () => {
        console.log('✅ Conexión entrante abierta:', conn.peer);
        connections[conn.peer] = conn;
        handleNewConnection(conn);
    });
    
    conn.on('data', (data) => {
        handleIncomingMessage(data, conn.peer);
    });
    
    conn.on('error', (err) => {
        console.error('❌ Error en conexión entrante:', err);
    });
    
    conn.on('close', () => {
        console.log('🔌 Conexión cerrada:', conn.peer);
        delete connections[conn.peer];
        updatePlayersList();
    });
}

function handleNewConnection(conn) {
    displaySystemMessage(`👤 Jugador conectado: ${extractUsername(conn.peer)}`);
    
    // Configurar listeners
    conn.on('data', (data) => {
        handleIncomingMessage(data, conn.peer);
    });
    
    conn.on('close', () => {
        console.log('🔌 Conexión perdida:', conn.peer);
        delete connections[conn.peer];
        updatePlayersList();
        displaySystemMessage(`👤 Jugador desconectado: ${extractUsername(conn.peer)}`);
    });
    
    // Actualizar UI
    updatePlayersList();
    
    // Si soy host y hay suficientes jugadores, mostrar botón de inicio
    if (isHost && Object.keys(connections).length > 0) {
        showStartGameButton();
    }
}

// ====================================
// MENSAJERÍA
// ====================================

function handleIncomingMessage(data, fromPeer) {
    console.log('📨 Mensaje recibido:', data);
    
    switch (data.type) {
        case 'chat':
            displayChatMessage({
                from: extractUsername(fromPeer),
                text: data.message,
                isSystem: false
            });
            break;
            
        case 'game_action':
            if (typeof window.receiveAction === 'function') {
                window.receiveAction(data.action);
            }
            break;
            
        case 'game_state':
            if (typeof window.updateGameState === 'function') {
                window.updateGameState(data.gameState);
            }
            break;
            
        case 'start_game':
            if (typeof window.startNewGame === 'function') {
                window.startNewGame();
            }
            displaySystemMessage('🎮 ¡El host ha iniciado la partida!');
            break;
    }
}

function broadcastMessage(type, data) {
    const message = {
        type: type,
        timestamp: Date.now(),
        from: currentUser.username,
        ...data
    };
    
    Object.values(connections).forEach(conn => {
        if (conn.open) {
            try {
                conn.send(message);
            } catch (err) {
                console.error('❌ Error enviando mensaje:', err);
            }
        }
    });
    
    console.log('📤 Mensaje enviado:', message);
}

// ====================================
// FUNCIONES PÚBLICAS
// ====================================

window.sendChatMessage = function(text) {
    if (!text || !text.trim()) return;
    
    // Mostrar localmente
    displayChatMessage({
        from: currentUser.username,
        text: text,
        isSystem: false
    });
    
    // Enviar a otros jugadores
    broadcastMessage('chat', { message: text });
};

window.broadcastGameAction = function(action) {
    broadcastMessage('game_action', { action: action });
};

window.broadcastGameState = function(gameState) {
    broadcastMessage('game_state', { gameState: gameState });
};

window.startGameForAll = function() {
    if (!isHost) {
        displaySystemMessage('❌ Solo el host puede iniciar el juego');
        return;
    }
    
    broadcastMessage('start_game', {});
    displaySystemMessage('🎮 ¡Iniciando partida para todos los jugadores!');
};

// ====================================
// FUNCIONES DE INTERFAZ
// ====================================

function updatePlayersList() {
    const playersList = document.getElementById('players-list');
    if (!playersList) return;
    
    playersList.innerHTML = '';
    
    // Agregar mi usuario
    const myItem = document.createElement('li');
    myItem.className = 'player-item';
    myItem.innerHTML = `
        <div>
            <span class="player-name">${currentUser.username} ${isHost ? '👑' : ''} (Tú)</span>
            <small>🔗 Conectado</small>
        </div>
        <span class="player-score">0</span>
    `;
    playersList.appendChild(myItem);
    
    // Agregar jugadores conectados
    Object.keys(connections).forEach(peerId => {
        const username = extractUsername(peerId);
        const li = document.createElement('li');
        li.className = 'player-item';
        li.innerHTML = `
            <div>
                <span class="player-name">${username}</span>
                <small>🔗 Conectado</small>
            </div>
            <span class="player-score">0</span>
        `;
        playersList.appendChild(li);
    });
    
    // Actualizar contador
    const totalPlayers = Object.keys(connections).length + 1;
    updateGameStatus(`👥 ${totalPlayers} jugador${totalPlayers > 1 ? 'es' : ''} conectado${totalPlayers > 1 ? 's' : ''}`);
}

function showStartGameButton() {
    const startButton = document.getElementById('new-game-btn');
    if (startButton && isHost) {
        startButton.style.display = 'block';
        startButton.textContent = '🚀 INICIAR PARTIDA';
        
        // Agregar event listener si no existe
        if (!startButton.dataset.listenerAdded) {
            startButton.addEventListener('click', () => {
                if (typeof window.startNewGame === 'function') {
                    window.startNewGame();
                    window.startGameForAll();
                }
            });
            startButton.dataset.listenerAdded = 'true';
        }
    }
}

function updateGameStatus(message) {
    const statusElement = document.getElementById('current-status');
    if (statusElement) {
        const textElement = statusElement.querySelector('.status-text');
        if (textElement) {
            textElement.textContent = message;
        }
    }
}

function displaySystemMessage(message) {
    displayChatMessage({
        from: 'Sistema',
        text: message,
        isSystem: true
    });
}

function displayChatMessage(messageData) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    if (messageData.isSystem) {
        messageDiv.classList.add('system-message');
        messageDiv.innerHTML = `<span class="system-text">${messageData.text}</span>`;
        messageDiv.style.background = '#f59e0b';
        messageDiv.style.color = 'white';
    } else {
        messageDiv.innerHTML = `
            <span class="sender">${messageData.from}:</span>
            <span class="text">${messageData.text}</span>
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ====================================
// UTILIDADES
// ====================================

function extractUsername(peerId) {
    // Formato: gameCode_username_timestamp
    const parts = peerId.split('_');
    return parts.length >= 2 ? parts[1] : 'Jugador';
}

function getGameCodeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('code') || sessionStorage.getItem('gameCode');
}

function checkForMorePlayers() {
    // Buscar patrones de ID más dinámicos
    const basePattern = `${gameCode}_`;
    console.log('🔍 Buscando más jugadores con patrón:', basePattern);
    
    // Intentar conectar con patrones comunes
    const commonUsernames = ['admin', 'player', 'test', 'user'];
    
    commonUsernames.forEach(username => {
        if (username !== currentUser.username) {
            for (let i = 0; i < 3; i++) {
                const targetId = `${basePattern}${username}_${Date.now() - (i * 10000)}`;
                setTimeout(() => {
                    tryConnectToPlayer(targetId);
                }, i * 500);
            }
        }
    });
}

// ====================================
// INICIALIZACIÓN AUTOMÁTICA
// ====================================

// Auto-inicializar cuando se carga la página
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWebRTC);
} else {
    // Si la página ya está cargada
    setTimeout(initWebRTC, 1000);
}

console.log('🔗 WebRTC simplificado cargado');
