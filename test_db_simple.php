<?php
try {
    require_once 'server/database.php';
    echo "Database OK";
} catch(Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
