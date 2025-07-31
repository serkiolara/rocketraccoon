// Variables globales
let peer;
let connections = {};
let currentGameCode;

// Inicializar conexión PeerJS
function initPeerConnection(userId) {
    peer = new Peer({
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        debug: 3
    });

    peer.on('open', (id) => {
        console.log('ID PeerJS:', id);
        // Guardar ID en sessionStorage
        sessionStorage.setItem('peerId', id);
        
        // Conectar con otros jugadores
        connectToOtherPlayers();
    });

    peer.on('connection', (conn) => {
        console.log('Nueva conexión de:', conn.peer);
        setupConnection(conn);
    });

    peer.on('error', (err) => {
        console.error('Error PeerJS:', err);
    });
}

// Conectar con otros jugadores en la partida
async function connectToOtherPlayers() {
    const gameCode = getGameCodeFromURL();
    const userId = JSON.parse(sessionStorage.getItem('user')).id;
    
    // Obtener lista de jugadores del servidor
    const response = await fetch(`../server/lobby.php?action=getplayers&code=${gameCode}`);
    const result = await response.json();
    
    if (result.status === 'success') {
        const players = result.players;
        const myPeerId = sessionStorage.getItem('peerId');
        
        players.forEach(player => {
            if (player.peer_id && player.peer_id !== myPeerId) {
                const conn = peer.connect(player.peer_id);
                setupConnection(conn);
            }
        });
    }
}

// Configurar una conexión P2P
function setupConnection(conn) {
    conn.on('open', () => {
        console.log('Conexión establecida con:', conn.peer);
        connections[conn.peer] = conn;
        
        // Enviar mensaje de saludo
        sendData({
            type: 'hello',
            from: sessionStorage.getItem('peerId'),
            username: JSON.parse(sessionStorage.getItem('user')).username
        }, conn.peer);
    });

    conn.on('data', (data) => {
        console.log('Datos recibidos:', data);
        handleIncomingData(data);
    });

    conn.on('close', () => {
        console.log('Conexión cerrada con:', conn.peer);
        delete connections[conn.peer];
    });

    conn.on('error', (err) => {
        console.error('Error de conexión:', err);
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
    Object.keys(connections).forEach(peerId => {
        connections[peerId].send(data);
    });
}

// Obtener código de juego de la URL
function getGameCodeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('code');
}

// Manejar datos entrantes
function handleIncomingData(data) {
    switch (data.type) {
        case 'chat':
            displayChatMessage(data);
            break;
        case 'bet':
            updateGameState(data);
            break;
        case 'state':
            // Actualizar estado del juego
            Object.assign(gameState, data.state);
            updateGameUI();
            // Si soy el jugador actual, mostrar mis dados
            const user = JSON.parse(sessionStorage.getItem('user'));
            if (gameState.players[user.username]) {
                displayMyDice();
            }
            break;
        case 'hello':
            // Registrar nuevo jugador
            addPlayerToList(data);
            break;
    }
}

// Agregar jugador a la lista (función auxiliar)
function addPlayerToList(data) {
    console.log('Nuevo jugador conectado:', data.username);
    // Esta función se puede expandir para manejar la UI de jugadores conectados
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(sessionStorage.getItem('user'));
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    // Guardar nuestro peer_id en la DB
    savePeerId(user.id);
    
    // Inicializar conexión P2P
    initPeerConnection(user.id);
});

// Guardar peer_id en la base de datos
async function savePeerId(userId) {
    const peerId = sessionStorage.getItem('peerId') || 'pending';
    
    await fetch('../server/lobby.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            action: 'savepeer',
            user_id: userId,
            peer_id: peerId
        })
    });
}