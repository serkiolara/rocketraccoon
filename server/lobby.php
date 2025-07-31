<?php
header('Content-Type: application/json');
require_once 'database.php';

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
    switch ($action) {
        case 'create':
            $data = json_decode(file_get_contents('php://input'), true);
            $hostId = $data['host_id'];
            $code = substr(strtoupper(uniqid()), 0, 6);
            $players = json_encode([$hostId]);

            $stmt = $pdo->prepare("INSERT INTO games (id, host_id, players) VALUES (?, ?, ?)");
            $stmt->execute([$code, $hostId, $players]);

            $response = [
                'status' => 'success',
                'game_code' => $code
            ];
            break;

        case 'list':
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
            break;

        case 'join':
            $data = json_decode(file_get_contents('php://input'), true);
            $code = $data['game_code'];
            $playerId = $data['player_id'];

            $stmt = $pdo->prepare("SELECT * FROM games WHERE id = ?");
            $stmt->execute([$code]);
            $game = $stmt->fetch();

            if (!$game) {
                $response['message'] = 'Partida no encontrada';
            } else {
                $players = json_decode($game['players'], true);
                if (in_array($playerId, $players)) {
                    $response['message'] = 'Ya estás en esta partida';
                } else {
                    $players[] = $playerId;
                    $stmt = $pdo->prepare("UPDATE games SET players = ? WHERE id = ?");
                    $stmt->execute([json_encode($players), $code]);

                    $response = [
                        'status' => 'success',
                        'message' => 'Unido a la partida'
                    ];
                }
            }
            break;

        case 'savepeer':
            $data = json_decode(file_get_contents('php://input'), true);
            $userId = $data['user_id'];
            $peerId = $data['peer_id'];

            $stmt = $pdo->prepare("UPDATE users SET peer_id = ? WHERE id = ?");
            $stmt->execute([$peerId, $userId]);

            $response = ['status' => 'success'];
            break;

        case 'getplayers':
            $code = $_GET['code'] ?? '';
            $stmt = $pdo->prepare("
                SELECT u.id, u.username, u.peer_id 
                FROM games g
                JOIN users u ON JSON_CONTAINS(g.players, CAST(u.id AS JSON), '$')
                WHERE g.id = ?
            ");
            $stmt->execute([$code]);
            $players = $stmt->fetchAll();

            $response = [
                'status' => 'success',
                'players' => $players
            ];
            break;
    }
} catch (PDOException $e) {
    $response['message'] = 'Error en la base de datos: ' . $e->getMessage();
}

echo json_encode($response);
?> 