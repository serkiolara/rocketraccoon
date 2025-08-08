// Variables globales
let peer;
let connections = {};
let currentGameCode;

// Inicializar conexión PeerJS
function initPeerConnection(userId) {
    // Guardar el ID del usuario actual
    sessionStorage.setItem('currentUserId', userId);
    
    peer = new Peer({
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        debug: 1
    });

    peer.on('open', (id) => {
        console.log('✅ PeerJS conectado:', id);
        // Guardar ID en sessionStorage y en servidor
        sessionStorage.setItem('peerId', id);
        
        // Notificar en chat
        displayChatMessage({
            type: 'chat',
            from: 'Sistema',
            text: `Tu ID de conexión: ${id.substring(0, 8)}...`,
            isSystem: true
        });
        
        // Guardar en base de datos
        const user = JSON.parse(sessionStorage.getItem('user'));
        savePeerId(user.id, id);
        
        // Comenzar a buscar otros jugadores
        startPlayerDiscovery();
    });

    peer.on('connection', (conn) => {
        console.log('📞 Conexión entrante de:', conn.peer);
        setupConnection(conn);
    });

    peer.on('error', (err) => {
        console.error('❌ Error PeerJS:', err);
        displayChatMessage({
            type: 'chat',
            from: 'Sistema',
            text: `Error de conexión: ${err.message}`,
            isSystem: true
        });
        
        // Intentar reconectar después de 5 segundos
        setTimeout(() => {
            console.log('🔄 Reintentando conexión...');
            initPeerConnection(userId);
        }, 5000);
    });
}

// Comenzar descubrimiento de jugadores
function startPlayerDiscovery() {
    // Conectar inmediatamente
    connectToOtherPlayers();
    
    // Buscar nuevos jugadores cada 5 segundos
    setInterval(() => {
        connectToOtherPlayers();
    }, 5000);
}

// Conectar con otros jugadores en la partida
async function connectToOtherPlayers() {
    const gameCode = getGameCodeFromURL();
    const user = JSON.parse(sessionStorage.getItem('user'));
    const myPeerId = sessionStorage.getItem('peerId');
    
    if (!user || !gameCode || !myPeerId) {
        console.log('⚠️ Datos faltantes para conectar');
        return;
    }
    
    try {
        console.log('🔍 Buscando jugadores en partida:', gameCode);
        
        // Obtener lista de jugadores del servidor
        const response = await fetch(`../server/lobby.php?action=getplayers&code=${gameCode}`);
        const result = await response.json();
        
        if (result.status === 'success' && result.players) {
            console.log('👥 Jugadores encontrados:', result.players.length);
            
            // Mostrar información detallada de jugadores
            result.players.forEach(player => {
                console.log(`- ${player.username} (ID: ${player.id}, Peer: ${player.peer_id || 'SIN PEER'})`);
            });
            
            // Verificar mi propio peer ID
            console.log(`🔍 Mi Peer ID: ${myPeerId}`);
            console.log(`🔍 Mi User ID: ${user.id}`);
            
            // Filtrar jugadores válidos para conectar
            const validPlayers = result.players.filter(player => {
                const isDifferentUser = player.id !== user.id;
                const hasPeerId = player.peer_id && player.peer_id !== myPeerId;
                const notAlreadyConnected = !connections[player.peer_id];
                
                console.log(`🔍 ${player.username}: DifferentUser=${isDifferentUser}, HasPeer=${!!player.peer_id}, NotConnected=${notAlreadyConnected}`);
                
                return isDifferentUser && hasPeerId && notAlreadyConnected;
            });
            
            console.log(`🎯 Jugadores válidos para conectar: ${validPlayers.length}`);
            
            // Intentar conectar con cada jugador válido
            for (const player of validPlayers) {
                console.log(`🔗 Iniciando conexión con ${player.username} (${player.peer_id})`);
                
                try {
                    const conn = peer.connect(player.peer_id);
                    setupConnection(conn);
                    
                    // Dar tiempo para que se establezca la conexión
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Verificar si la conexión se estableció
                    if (connections[player.peer_id]) {
                        console.log(`✅ Conectado exitosamente con ${player.username}`);
                        displayChatMessage({
                            type: 'chat',
                            from: 'Sistema',
                            text: `🟢 Conectado con ${player.username}`,
                            isSystem: true
                        });
                    } else {
                        console.log(`❌ Falló conexión con ${player.username}`);
                    }
                    
                } catch (connError) {
                    console.error(`❌ Error conectando con ${player.username}:`, connError);
                }
            }
            
            // Mostrar estado final de conexiones
            const connectedCount = Object.keys(connections).length;
            console.log(`📊 Total conexiones activas: ${connectedCount}`);
            
            if (connectedCount === 0 && validPlayers.length > 0) {
                displayChatMessage({
                    type: 'chat',
                    from: 'Sistema',
                    text: `⚠️ No se pudo conectar con otros jugadores. Reintentando...`,
                    isSystem: true
                });
            }
            
        } else {
            console.log('⚠️ No se pudieron obtener jugadores:', result.message);
        }
    } catch (error) {
        console.error('❌ Error buscando jugadores:', error);
    }
}

// Configurar una conexión P2P
function setupConnection(conn) {
    const user = JSON.parse(sessionStorage.getItem('user'));
    
    conn.on('open', () => {
        console.log('✅ Conexión P2P establecida con:', conn.peer);
        connections[conn.peer] = conn;
        
        // Enviar mensaje de saludo con información completa
        const helloMessage = {
            type: 'hello',
            from: sessionStorage.getItem('peerId'),
            username: user.username,
            userId: user.id,
            gameCode: getGameCodeFromURL(),
            timestamp: Date.now()
        };
        
        conn.send(helloMessage);
        console.log('📤 Enviando saludo:', helloMessage);
        
        // Mostrar conexión exitosa
        displayChatMessage({
            type: 'chat',
            from: 'Sistema',
            text: `🟢 Conexión establecida con otro jugador`,
            isSystem: true
        });
        
        // Reproducir sonido de conexión
        if (typeof playSound === 'function') {
            playSound('connect');
        }
        
        // Enviar mensaje de prueba para verificar que funciona el chat
        setTimeout(() => {
            conn.send({
                type: 'chat',
                from: user.username,
                text: `¡Hola! Me acabo de conectar`,
                timestamp: Date.now(),
                isSystem: false
            });
        }, 2000);
    });

    conn.on('data', (data) => {
        console.log('📥 Datos recibidos de', conn.peer, ':', data);
        
        // Procesar inmediatamente
        handleIncomingData(data);
        
        // Si es un saludo, responder
        if (data.type === 'hello') {
            displayChatMessage({
                type: 'chat',
                from: 'Sistema',
                text: `🎮 ${data.username} se unió a la partida`,
                isSystem: true
            });
        }
    });

    conn.on('close', () => {
        console.log('❌ Conexión cerrada con:', conn.peer);
        delete connections[conn.peer];
        
        displayChatMessage({
            type: 'chat',
            from: 'Sistema',
            text: `🔴 Un jugador se desconectó`,
            isSystem: true
        });
    });

    conn.on('error', (err) => {
        console.error('❌ Error de conexión P2P:', err);
        delete connections[conn.peer];
    });
}

// Enviar datos a un jugador específico
function sendData(data, peerId) {
    if (connections[peerId]) {
        connections[peerId].send(data);
    }
}

// Enviar datos a todos los jugadores
function broadcastData(data) {
    const connectedPeers = Object.keys(connections);
    console.log('📡 Enviando a', connectedPeers.length, 'jugadores:', data);
    
    if (connectedPeers.length === 0) {
        console.log('⚠️ No hay jugadores conectados para enviar datos');
        return;
    }
    
    connectedPeers.forEach(peerId => {
        try {
            if (connections[peerId] && connections[peerId].open) {
                connections[peerId].send(data);
                console.log('✅ Datos enviados a:', peerId);
            } else {
                console.log('❌ Conexión cerrada, removiendo:', peerId);
                delete connections[peerId];
            }
        } catch (error) {
            console.error('❌ Error enviando datos a', peerId, ':', error);
            delete connections[peerId];
        }
    });
}

// Obtener código de juego de la URL
function getGameCodeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('code');
}

// Manejar datos entrantes
function handleIncomingData(data) {
    console.log('📨 Procesando:', data.type, 'de:', data.from || data.username || 'desconocido');
    
    switch (data.type) {
        case 'chat':
            displayChatMessage(data);
            break;
            
        case 'hello':
            console.log(`👋 Nuevo jugador conectado: ${data.username}`);
            addPlayerToList(data);
            
            // Si soy el host y tengo estado del juego, enviarlo
            if (typeof isHost === 'function' && isHost() && typeof gameState !== 'undefined') {
                broadcastCurrentGameState();
            }
            break;
            
        case 'bet':
            console.log('🎯 Apuesta recibida:', data);
            if (typeof gameState !== 'undefined') {
                gameState.currentBet = data.bet;
                gameState.currentPlayer = data.nextPlayer;
                gameState.lastAction = `${data.player} apostó: ${data.bet.quantity}x dados con valor ${data.bet.value}`;
                
                if (typeof updateGameUI === 'function') {
                    updateGameUI();
                }
                if (typeof updatePlayersList === 'function') {
                    updatePlayersList();
                }
                if (typeof showGameMessage === 'function') {
                    showGameMessage(gameState.lastAction);
                }
            }
            break;
            
        case 'pass':
            console.log('🚶 Turno pasado recibido:', data);
            if (typeof gameState !== 'undefined') {
                gameState.currentPlayer = data.nextPlayer;
                gameState.lastAction = `${data.player} pasó su turno`;
                
                if (typeof updateGameUI === 'function') {
                    updateGameUI();
                }
                if (typeof updatePlayersList === 'function') {
                    updatePlayersList();
                }
                if (typeof showGameMessage === 'function') {
                    showGameMessage(gameState.lastAction);
                }
            }
            break;
            
        case 'challenge':
            console.log('⚔️ Desafío recibido:', data);
            if (typeof gameState !== 'undefined') {
                gameState.phase = 'challenge';
                gameState.challenger = data.challenger;
                gameState.lastAction = `${data.challenger} gritó ¡MENTIROSO! a ${data.challenged}`;
                
                if (typeof updateGameUI === 'function') {
                    updateGameUI();
                }
                if (typeof updatePlayersList === 'function') {
                    updatePlayersList();
                }
                if (typeof showGameMessage === 'function') {
                    showGameMessage(`🎲 ${gameState.lastAction} - Revelando dados...`);
                }
            }
            break;
            
        case 'challenge-result':
            console.log('📊 Resultado de desafío recibido:', data);
            if (typeof gameState !== 'undefined' && data.result) {
                gameState.lastChallenge = data.result;
                // No iniciar nueva ronda automáticamente, esperar que el host lo haga
                if (typeof showRoundResults === 'function') {
                    const result = data.result;
                    showRoundResults(result.totalFound, result.winner, result.loser);
                }
            }
            break;
            
        case 'game-state':
            console.log('🎮 Estado del juego recibido');
            if (typeof gameState !== 'undefined') {
                Object.assign(gameState, data.state);
                if (typeof updateGameUI === 'function') {
                    updateGameUI();
                }
                if (typeof updatePlayersList === 'function') {
                    updatePlayersList();
                }
                if (typeof displayMyDice === 'function') {
                    displayMyDice();
                }
            }
            break;
            
        case 'dice-roll':
            if (typeof handleDiceRollReceived === 'function') {
                handleDiceRollReceived(data);
            }
            break;
            
        case 'player-action':
            if (typeof handlePlayerAction === 'function') {
                handlePlayerAction(data);
            }
            break;
            
        case 'player-left':
            handlePlayerDisconnect(data.peerId);
            break;
            
        default:
            console.log('❓ Tipo de mensaje desconocido:', data.type);
    }
}

// Manejar desconexión de jugador
function handlePlayerDisconnect(peerId) {
    // Obtener username del jugador desconectado
    const username = Object.keys(gameState.players).find(
        un => gameState.players[un].peerId === peerId
    );
    
    if (username) {
        showMessage(`${username} se ha desconectado`, "warning");
        
        // Eliminar jugador del estado
        delete gameState.players[username];
        
        // Remover de turnOrder si existe
        if (gameState.turnOrder) {
            gameState.turnOrder = gameState.turnOrder.filter(u => u !== username);
        }
        
        // Si era el jugador actual, pasar al siguiente
        if (gameState.currentPlayer === username && gameState.turnOrder.length > 0) {
            gameState.turnIndex = gameState.turnIndex % gameState.turnOrder.length;
            gameState.currentPlayer = gameState.turnOrder[gameState.turnIndex];
        }
        
        // Actualizar UI
        updateGameUI();
        
        // Si soy host, actualizar estado
        if (typeof isHost === 'function' && isHost()) {
            broadcastGameState();
        }
    }
}

// Agregar jugador a la lista (función auxiliar)
function addPlayerToList(data) {
    console.log('👤 Nuevo jugador conectado:', data.username);
    
    // Agregar al estado del juego si no existe
    if (typeof gameState !== 'undefined' && !gameState.players[data.username]) {
        gameState.players[data.username] = {
            dice: [],
            diceCount: 5,
            isHost: false,
            peerId: data.from
        };
        
        console.log('✅ Jugador agregado al estado:', data.username);
        
        // Si soy el host y hay suficientes jugadores, iniciar el juego
        if (typeof isHost === 'function' && isHost() && 
            Object.keys(gameState.players).length >= 2 && 
            gameState.phase === 'waiting') {
            
            console.log('🚀 Suficientes jugadores - iniciando juego');
            setTimeout(() => {
                if (typeof initializeNewGame === 'function') {
                    initializeNewGame();
                }
            }, 2000);
        }
    }
    
    // Mostrar mensaje en chat
    displayChatMessage({
        type: 'chat',
        from: 'Sistema',
        text: `🟢 ${data.username} se ha unido al juego`,
        isSystem: true
    });
    
    // Actualizar lista de jugadores
    if (typeof updatePlayersList === 'function') {
        updatePlayersList();
    }
    
    // Actualizar UI completa
    if (typeof updateGameUI === 'function') {
        updateGameUI();
    }
}

// Función para mostrar mensajes de chat
function displayChatMessage(message) {
    // Asegurar que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => displayChatMessage(message));
        return;
    }
    
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) {
        console.log('⚠️ Elemento chat-messages no encontrado, reintentando...');
        setTimeout(() => displayChatMessage(message), 500);
        return;
    }
    
    // Verificar duplicados antes de agregar
    const messageId = `${message.from}_${message.text}_${Date.now()}`;
    if (chatMessages.querySelector(`[data-message-id="${messageId}"]`)) {
        console.log('🚫 Mensaje duplicado evitado:', message.text);
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    messageDiv.setAttribute('data-message-id', messageId);
    
    // Agregar timestamp para debugging
    const timestamp = new Date().toLocaleTimeString();
    
    if (message.isSystem) {
        messageDiv.classList.add('system-message');
        messageDiv.innerHTML = `
            <span class="system-text">[${timestamp}] ${message.text}</span>
        `;
        messageDiv.style.color = '#00E676'; // Verde en lugar de amarillo
        messageDiv.style.fontStyle = 'italic';
    } else {
        messageDiv.innerHTML = `
            <span class="sender">[${timestamp}] ${message.from}:</span>
            <span class="text">${message.text}</span>
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    console.log('💬 Mensaje mostrado:', message.text);
    
    // Hacer parpadear el nuevo mensaje
    messageDiv.style.animation = 'fadeIn 0.5s ease-in';
}

// Función para enviar mensajes de chat
function sendChatMessage(text) {
    if (!text || !text.trim()) return;
    
    const user = JSON.parse(sessionStorage.getItem('user'));
    const message = {
        type: 'chat',
        from: user.username,
        text: text.trim(),
        timestamp: Date.now(),
        isSystem: false
    };
    
    // Mostrar en mi propio chat inmediatamente
    displayChatMessage(message);
    
    // Enviar a todos los jugadores conectados
    broadcastData(message);
    
    console.log('Mensaje enviado:', message);
}

// Función para solicitar estado del juego
function requestGameState() {
    broadcastData({
        type: 'request-state',
        from: sessionStorage.getItem('peerId')
    });
}

// Función para transmitir el estado actual del juego
function broadcastCurrentGameState() {
    if (typeof gameState !== 'undefined') {
        const filteredState = {
            phase: gameState.phase,
            currentPlayer: gameState.currentPlayer,
            currentBet: gameState.currentBet,
            players: gameState.players,
            lastAction: gameState.lastAction
        };
        broadcastData({
            type: 'game-state',
            state: filteredState,
            timestamp: Date.now()
        });
    }
}

// Función para enviar acciones de jugador
function broadcastPlayerAction(action, data = {}) {
    const user = JSON.parse(sessionStorage.getItem('user'));
    broadcastData({
        type: 'player-action',
        action: action,
        player: user.username,
        data: data,
        timestamp: Date.now()
    });
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(sessionStorage.getItem('user'));
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    console.log('🚀 Inicializando WebRTC para:', user.username);
    
    // Esperar a que la página esté completamente cargada
    setTimeout(() => {
        // Inicializar conexión P2P
        initPeerConnection(user.id);
        
        // Mostrar mensaje inicial en chat
        displayChatMessage({
            type: 'chat',
            from: 'Sistema',
            text: `Conectando como ${user.username}...`,
            isSystem: true
        });
    }, 1000);
    
    // Intentar conectar cada 15 segundos
    setInterval(() => {
        if (Object.keys(connections).length === 0) {
            console.log('🔄 Sin conexiones, reintentando...');
            connectToOtherPlayers();
        }
    }, 15000);
});

// Guardar peer_id en la base de datos
async function savePeerId(userId, peerId) {
    try {
        await fetch('../server/lobby.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'savepeer',
                user_id: userId,
                peer_id: peerId
            })
        });
        console.log('✅ Peer ID guardado:', peerId);
    } catch (error) {
        console.error('❌ Error guardando peer ID:', error);
    }
}