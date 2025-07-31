<?php
require 'server/database.php';

try {
    $stmt = $pdo->query("SELECT 1");
    echo "✅ Conexión a MySQL exitosa!";
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage();
}
?>