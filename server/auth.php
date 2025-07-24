<?php
header('Content-Type: application/json');
require_once 'database.php';

$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'];
$username = $data['username'];
$password = $data['password'];

$response = ['status' => 'error', 'message' => 'Acción no válida'];

try {
    if ($action === 'register') {
        // Verificar si el usuario ya existe
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        
        if ($stmt->rowCount() > 0) {
            $response['message'] = 'El nombre de usuario ya existe';
        } else {
            // Crear hash de contraseña
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            
            // Insertar nuevo usuario
            $stmt = $pdo->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
            $stmt->execute([$username, $hashedPassword]);
            
            $response = [
                'status' => 'success',
                'message' => 'Usuario registrado correctamente',
                'user' => [
                    'id' => $pdo->lastInsertId(),
                    'username' => $username
                ]
            ];
        }
    } 
    elseif ($action === 'login') {
        // Buscar usuario
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password'])) {
            $response = [
                'status' => 'success',
                'message' => 'Inicio de sesión exitoso',
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username']
                ]
            ];
        } else {
            $response['message'] = 'Usuario o contraseña incorrectos';
        }
    }
} catch (PDOException $e) {
    $response['message'] = 'Error en la base de datos: ' . $e->getMessage();
}

echo json_encode($response);
?>