<?php
require_once 'server/database.php';

try {
    // Agregar la columna peer_id si no existe
    $pdo->exec("ALTER TABLE users ADD COLUMN peer_id VARCHAR(255) NULL");
    echo "✅ Columna peer_id agregada exitosamente\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "ℹ️ La columna peer_id ya existe\n";
    } else {
        echo "❌ Error: " . $e->getMessage() . "\n";
    }
}

// Verificar la estructura de la tabla
try {
    $stmt = $pdo->query("DESCRIBE users");
    $columns = $stmt->fetchAll();
    
    echo "\n📋 Estructura de la tabla users:\n";
    foreach ($columns as $column) {
        echo "- {$column['Field']} ({$column['Type']})\n";
    }
} catch (PDOException $e) {
    echo "❌ Error verificando estructura: " . $e->getMessage() . "\n";
}
?>
