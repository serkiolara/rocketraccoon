<?php
header('Content-Type: application/json');
require_once 'database.php';

$action = $_GET['action'] ?? '';
$response = ['status' => 'error', 'message' => 'Acción no válida'];

// Detectar acción en JSON si no está en GET
if (!$action) {
    $raw = file_get_contents('php://input');
    if ($raw) {
        $json = json_decode($raw, true);
        if (isset($json['action'])) {
            $action = $json['action'];
        }
    }
}

try {
    if ($action === 'getstate') {
        $code = $_GET['code'] ?? '';
        
        $stmt = $pdo->prepare("SELECT game_state, players FROM games WHERE id = ?");
        $stmt->execute([$code]);
        $game = $stmt->fetch();
        
        if ($game) {
            if ($game['game_state']) {
                $gameState = json_decode($game['game_state'], true);
            } else {
                // Crear estado inicial con jugadores de la partida
                $playerIds = json_decode($game['players'], true);
                $players = [];
                
                foreach ($playerIds as $playerId) {
                    $stmt = $pdo->prepare("SELECT username FROM users WHERE id = ?");
                    $stmt->execute([$playerId]);
                    $player = $stmt->fetch();
                    
                    if ($player) {
                        $players[$player['username']] = [
                            'dice' => [],
                            'diceCount' => 5,
                            'isHost' => $playerId == $playerIds[0] // El primer jugador es el host
                        ];
                    }
                }
                
                $gameState = [
                    'players' => $players,
                    'currentPlayer' => null,
                    'currentBet' => null,
                    'turnOrder' => [],
                    'turnIndex' => 0,
                    'phase' => 'waiting',
                    'lastAction' => null,
                    'round' => 0
                ];
            }
            
            $response = [
                'status' => 'success',
                'gameState' => $gameState
            ];
        } else {
            $response['message'] = 'Partida no encontrada';
        }
    }
    elseif ($action === 'savestate') {
        $data = json_decode(file_get_contents('php://input'), true);
        $code = $data['code'];
        $state = json_encode($data['state']);
        
        $stmt = $pdo->prepare("UPDATE games SET game_state = ? WHERE id = ?");
        $stmt->execute([$state, $code]);
        
        $response = ['status' => 'success'];
    }
} catch (PDOException $e) {
    $response['message'] = 'Error en la base de datos: ' . $e->getMessage();
}

echo json_encode($response);
?>