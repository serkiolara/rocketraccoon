<?php
require_once 'database.php';

class MinesweeperWebSocket {
    private $clients = [];
    private $rooms = [];
    private $db;

    public function __construct() {
        global $pdo;
        $this->db = $pdo;
    }

    public function handleConnection($socket) {
        $this->clients[] = $socket;
        echo "Nueva conexión establecida\n";
    }

    public function handleMessage($socket, $data) {
        $message = json_decode($data, true);
        
        switch($message['type']) {
            case 'join_room':
                $this->joinRoom($socket, $message['room_id'], $message['username']);
                break;
            case 'chat_message':
                $this->broadcastToRoom($socket, $message);
                break;
            case 'cell_click':
                $this->broadcastToRoom($socket, $message);
                break;
            case 'game_update':
                $this->broadcastToRoom($socket, $message);
                break;
        }
    }

    private function joinRoom($socket, $roomId, $username) {
        // Agregar cliente a la sala
        if (!isset($this->rooms[$roomId])) {
            $this->rooms[$roomId] = [];
        }
        
        $this->rooms[$roomId][] = [
            'socket' => $socket,
            'username' => $username
        ];

        // Notificar a otros en la sala
        $this->broadcastToRoom($socket, [
            'type' => 'user_joined',
            'username' => $username,
            'room_id' => $roomId
        ]);

        // Enviar lista de usuarios actuales
        $users = [];
        foreach ($this->rooms[$roomId] as $client) {
            $users[] = $client['username'];
        }

        $this->sendToSocket($socket, [
            'type' => 'room_users',
            'users' => $users
        ]);
    }

    private function broadcastToRoom($senderSocket, $message) {
        $roomId = $message['room_id'] ?? null;
        if (!$roomId || !isset($this->rooms[$roomId])) {
            return;
        }

        foreach ($this->rooms[$roomId] as $client) {
            if ($client['socket'] !== $senderSocket) {
                $this->sendToSocket($client['socket'], $message);
            }
        }
    }

    private function sendToSocket($socket, $message) {
        $data = json_encode($message);
        socket_write($socket, $data, strlen($data));
    }

    public function handleDisconnection($socket) {
        // Remover de salas y notificar
        foreach ($this->rooms as $roomId => $clients) {
            foreach ($clients as $index => $client) {
                if ($client['socket'] === $socket) {
                    unset($this->rooms[$roomId][$index]);
                    
                    // Notificar a otros usuarios
                    $this->broadcastToRoom($socket, [
                        'type' => 'user_left',
                        'username' => $client['username'],
                        'room_id' => $roomId
                    ]);
                    break;
                }
            }
        }

        $key = array_search($socket, $this->clients);
        if ($key !== false) {
            unset($this->clients[$key]);
        }
    }
}

// Servidor básico para testing (usando polling en lugar de WebSockets reales)
if (php_sapi_name() == "cli") {
    echo "Servidor WebSocket iniciado en puerto 8080\n";
    $server = new MinesweeperWebSocket();
    
    // Aquí iría la implementación del servidor WebSocket real
    // Por simplicidad, usaremos polling HTTP
}
?>
