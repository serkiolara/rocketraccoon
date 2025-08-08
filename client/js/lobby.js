document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(sessionStorage.getItem('user'));
    const usernameDisplay = document.getElementById('username-display');
    const logoutBtn = document.getElementById('logout-btn');
    const createGameBtn = document.getElementById('create-game-btn');
    const joinGameBtn = document.getElementById('join-game-btn');
    const gameCodeInput = document.getElementById('game-code-input');
    const gamesContainer = document.getElementById('games-container');
    const messageDiv = document.getElementById('lobby-message');

    // Mostrar nombre de usuario
    if (!user) {
        showMessage("No has iniciado sesión", "error");
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }
    usernameDisplay.textContent = user.username;

    // Botón de salir
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('user');
        window.location.href = 'index.html';
    });

    // Cargar partidas disponibles
    loadGames();

    // Crear partida
    createGameBtn.addEventListener('click', async () => {
        const response = await fetch('../server/lobby.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'create',
                host_id: user.id
            })
        });

        const result = await response.json();
        if (result.status === 'success') {
            // Guardar código de partida y redirigir al buscaminas
            sessionStorage.setItem('currentGame', result.game_code);
            window.location.href = `minesweeper.html?code=${result.game_code}`;
        } else {
            showMessage(result.message, "error");
        }
    });

    // Unirse a partida por código
    joinGameBtn.addEventListener('click', () => {
        const code = gameCodeInput.value.trim();
        if (code.length !== 6) {
            showMessage("El código debe tener 6 caracteres", "error");
            return;
        }
        joinGame(code);
    });

    // Función para cargar partidas
    async function loadGames() {
        const response = await fetch('../server/lobby.php?action=list');
        const result = await response.json();
        
        if (result.status === 'success') {
            renderGames(result.games);
        } else {
            showMessage("Error cargando partidas", "error");
        }
    }

    // Función para renderizar partidas
    function renderGames(games) {
        gamesContainer.innerHTML = '';
        games.forEach(game => {
            const gameCard = document.createElement('div');
            gameCard.className = 'game-card';
            gameCard.innerHTML = `
                <h3>Partida: ${game.code}</h3>
                <p>Host: ${game.host_username}</p>
                <p>Jugadores: ${game.player_count}/4</p>
                <p>Estado: ${game.status === 'waiting' ? 'Esperando' : 'En juego'}</p>
            `;
            gameCard.addEventListener('click', () => joinGame(game.code));
            gamesContainer.appendChild(gameCard);
        });
    }

    // Función para unirse a partida
    async function joinGame(code) {
        const response = await fetch('../server/lobby.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'join',
                game_code: code,
                player_id: user.id
            })
        });

        const result = await response.json();
        if (result.status === 'success') {
            sessionStorage.setItem('currentGame', code);
            window.location.href = `minesweeper.html?code=${code}`;
        } else {
            showMessage(result.message, "error");
        }
    }

    // Mostrar mensajes
    function showMessage(msg, type) {
        messageDiv.textContent = msg;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        if (type === "error") {
            messageDiv.style.backgroundColor = "#ff6b6b";
        } else {
            messageDiv.style.backgroundColor = "#4CAF50";
        }
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
});