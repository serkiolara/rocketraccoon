<?php
header('Content-Type: application/json');
require_once 'database.php';

// Mejor detección de la acción (GET, POST, o JSON)
$action = $_GET['action'] ?? ($_POST['action'] ?? null);
if (!$action) {
    $raw = file_get_contents('php://input');
    if ($raw) {
        $json = json_decode($raw, true);
        if (isset($json['action'])) {
            $action = $json['action'];
        }
    }
}
$response = ['status' => 'error', 'message' => 'Acción no válida'];

try {
    if ($action === 'create') {
        $data = json_decode(file_get_contents('php://input'), true);
        $hostId = $data['host_id'];
        
        // Generar código único de 6 caracteres
        $code = substr(strtoupper(uniqid()), 0, 6);
        
        // Crear nueva partida
        $stmt = $pdo->prepare("INSERT INTO games (id, host_id, players) VALUES (?, ?, ?)");
        $players = json_encode([$hostId]); // El host es el primer jugador
        $stmt->execute([$code, $hostId, $players]);
        
        $response = [
            'status' => 'success',
            'game_code' => $code
        ];
    }
    elseif ($action === 'list') {
        // Obtener partidas en espera
        $stmt = $pdo->query("
            SELECT g.id AS code, u.username AS host_username, 
                   JSON_LENGTH(g.players) AS player_count, g.status
            FROM games g
            JOIN users u ON g.host_id = u.id
            WHERE g.status = 'waiting'
        ");
        $games = $stmt->fetchAll();
        
        $response = [
            'status' => 'success',
            'games' => $games
        ];
    }
    elseif ($action === 'join') {
        $data = json_decode(file_get_contents('php://input'), true);
        $code = $data['game_code'];
        $playerId = $data['player_id'];
        
        // Verificar que la partida existe
        $stmt = $pdo->prepare("SELECT * FROM games WHERE id = ?");
        $stmt->execute([$code]);
        $game = $stmt->fetch();
        
        if (!$game) {
            $response['message'] = 'Partida no encontrada';
        } else {
            // Verificar que el jugador no está ya en la partida
            $players = json_decode($game['players'], true);
            if (in_array($playerId, $players)) {
                $response['message'] = 'Ya estás en esta partida';
            } else {
                // Añadir jugador
                $players[] = $playerId;
                $stmt = $pdo->prepare("UPDATE games SET players = ? WHERE id = ?");
                $stmt->execute([json_encode($players), $code]);
                
                $response = [
                    'status' => 'success',
                    'message' => 'Unido a la partida'
                ];
            }
        }
    }
    elseif ($action === 'savepeer') {
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = $data['user_id'];
        $peerId = $data['peer_id'];
        $stmt = $pdo->prepare("UPDATE users SET peer_id = ? WHERE id = ?");
        $stmt->execute([$peerId, $userId]);
        $response = ['status' => 'success'];
    }
    elseif ($action === 'getplayers') {
        $code = $_GET['code'] ?? '';
        
        // Primero obtener la partida
        $stmt = $pdo->prepare("SELECT players FROM games WHERE id = ?");
        $stmt->execute([$code]);
        $game = $stmt->fetch();
        
        if ($game) {
            $playerIds = json_decode($game['players'], true) ?? [];
            $players = [];
            
            if (!empty($playerIds)) {
                // Crear placeholders para la consulta IN
                $placeholders = str_repeat('?,', count($playerIds) - 1) . '?';
                $stmt = $pdo->prepare("
                    SELECT id, username, peer_id 
                    FROM users 
                    WHERE id IN ($placeholders)
                ");
                $stmt->execute($playerIds);
                $players = $stmt->fetchAll();
            }
            
            $response = [
                'status' => 'success',
                'players' => $players
            ];
        } else {
            $response = [
                'status' => 'error',
                'message' => 'Partida no encontrada'
            ];
        }
    }
} catch (PDOException $e) {
    $response['message'] = 'Error en la base de datos: ' . $e->getMessage();
}

echo json_encode($response);
?> 