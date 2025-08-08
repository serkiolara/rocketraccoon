<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');
header('Access-Control-Allow-Headers: Content-Type');

// Configuración de base de datos
$host = 'localhost';
$dbname = 'liars_table';
$username = 'root';
$password = '';

class MultiplayerHandler {
    private $db;
    
    public function __construct() {
        $dsn = "mysql:host=localhost;dbname=liars_table;charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        
        try {
            $this->db = new PDO($dsn, 'root', '', $options);
            $this->initTables();
        } catch (PDOException $e) {
            error_log("Error de conexión a BD: " . $e->getMessage());
            die(json_encode(['error' => 'Error de conexión a la base de datos']));
        }
    }
    
    private function initTables() {
        // Tabla para mensajes de chat
        $sql = "CREATE TABLE IF NOT EXISTS chat_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            room_id INT NOT NULL,
            username VARCHAR(50) NOT NULL,
            message TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )";
        $this->db->exec($sql);
        
        // Tabla para acciones de juego
        $sql = "CREATE TABLE IF NOT EXISTS game_actions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            room_id INT NOT NULL,
            username VARCHAR(50) NOT NULL,
            action_type VARCHAR(20) NOT NULL,
            action_data JSON NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )";
        $this->db->exec($sql);
        
        // Tabla para usuarios conectados
        $sql = "CREATE TABLE IF NOT EXISTS room_users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            room_id INT NOT NULL,
            username VARCHAR(50) NOT NULL,
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_room (room_id, username)
        )";
        $this->db->exec($sql);
    }
    
    public function handleRequest() {
        $action = $_POST['action'] ?? $_GET['action'] ?? '';
        
        switch($action) {
            case 'join_room':
                return $this->joinRoom();
            case 'send_message':
                return $this->sendMessage();
            case 'get_messages':
                return $this->getMessages();
            case 'send_action':
                return $this->sendGameAction();
            case 'get_actions':
                return $this->getGameActions();
            case 'get_users':
                return $this->getRoomUsers();
            case 'update_presence':
                return $this->updatePresence();
            default:
                return ['error' => 'Acción no válida'];
        }
    }
    
    private function joinRoom() {
        $roomId = $_POST['room_id'] ?? '';
        $username = $_POST['username'] ?? '';
        
        if (empty($roomId) || empty($username)) {
            return ['error' => 'Faltan datos'];
        }
        
        try {
            $sql = "INSERT INTO room_users (room_id, username) VALUES (?, ?) 
                    ON DUPLICATE KEY UPDATE last_seen = CURRENT_TIMESTAMP";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$roomId, $username]);
            
            return ['success' => true, 'message' => 'Usuario conectado a la sala'];
        } catch(Exception $e) {
            return ['error' => 'Error al conectar: ' . $e->getMessage()];
        }
    }
    
    private function sendMessage() {
        $roomId = $_POST['room_id'] ?? '';
        $username = $_POST['username'] ?? '';
        $message = $_POST['message'] ?? '';
        
        if (empty($roomId) || empty($username) || empty($message)) {
            return ['error' => 'Faltan datos'];
        }
        
        try {
            $sql = "INSERT INTO chat_messages (room_id, username, message) VALUES (?, ?, ?)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$roomId, $username, $message]);
            
            return ['success' => true];
        } catch(Exception $e) {
            return ['error' => 'Error al enviar mensaje: ' . $e->getMessage()];
        }
    }
    
    private function getMessages() {
        $roomId = $_GET['room_id'] ?? '';
        $lastId = $_GET['last_id'] ?? 0;
        
        if (empty($roomId)) {
            return ['error' => 'ID de sala requerido'];
        }
        
        try {
            $sql = "SELECT id, username, message, timestamp FROM chat_messages 
                    WHERE room_id = ? AND id > ? ORDER BY timestamp ASC LIMIT 50";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$roomId, $lastId]);
            
            $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return ['messages' => $messages];
        } catch(Exception $e) {
            return ['error' => 'Error al obtener mensajes: ' . $e->getMessage()];
        }
    }
    
    private function sendGameAction() {
        $roomId = $_POST['room_id'] ?? '';
        $username = $_POST['username'] ?? '';
        $actionType = $_POST['action_type'] ?? '';
        $actionData = $_POST['action_data'] ?? '';
        
        if (empty($roomId) || empty($username) || empty($actionType)) {
            return ['error' => 'Faltan datos'];
        }
        
        try {
            $sql = "INSERT INTO game_actions (room_id, username, action_type, action_data) VALUES (?, ?, ?, ?)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$roomId, $username, $actionType, $actionData]);
            
            return ['success' => true];
        } catch(Exception $e) {
            return ['error' => 'Error al enviar acción: ' . $e->getMessage()];
        }
    }
    
    private function getGameActions() {
        $roomId = $_GET['room_id'] ?? '';
        $lastId = $_GET['last_id'] ?? 0;
        
        if (empty($roomId)) {
            return ['error' => 'ID de sala requerido'];
        }
        
        try {
            $sql = "SELECT id, username, action_type, action_data, timestamp FROM game_actions 
                    WHERE room_id = ? AND id > ? ORDER BY timestamp ASC LIMIT 100";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$roomId, $lastId]);
            
            $actions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return ['actions' => $actions];
        } catch(Exception $e) {
            return ['error' => 'Error al obtener acciones: ' . $e->getMessage()];
        }
    }
    
    private function getRoomUsers() {
        $roomId = $_GET['room_id'] ?? '';
        
        if (empty($roomId)) {
            return ['error' => 'ID de sala requerido'];
        }
        
        try {
            // Obtener usuarios activos (última actividad en los últimos 30 segundos)
            $sql = "SELECT username FROM room_users 
                    WHERE room_id = ? AND last_seen > DATE_SUB(NOW(), INTERVAL 30 SECOND)
                    ORDER BY username";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$roomId]);
            
            $users = $stmt->fetchAll(PDO::FETCH_COLUMN);
            return ['users' => $users];
        } catch(Exception $e) {
            return ['error' => 'Error al obtener usuarios: ' . $e->getMessage()];
        }
    }
    
    private function updatePresence() {
        $roomId = $_POST['room_id'] ?? '';
        $username = $_POST['username'] ?? '';
        
        if (empty($roomId) || empty($username)) {
            return ['error' => 'Faltan datos'];
        }
        
        try {
            $sql = "UPDATE room_users SET last_seen = CURRENT_TIMESTAMP 
                    WHERE room_id = ? AND username = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$roomId, $username]);
            
            return ['success' => true];
        } catch(Exception $e) {
            return ['error' => 'Error al actualizar presencia: ' . $e->getMessage()];
        }
    }
}

// Ejecutar el handler
try {
    $handler = new MultiplayerHandler();
    $result = $handler->handleRequest();
    echo json_encode($result);
} catch(Exception $e) {
    echo json_encode(['error' => 'Error del servidor: ' . $e->getMessage()]);
}
?>
