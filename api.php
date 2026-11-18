<?php
// CREATE TABLE funkos   (id INT UNSIGNED PRIMARY KEY, datos MEDIUMTEXT NOT NULL) DEFAULT CHARSET=utf8mb4;
// CREATE TABLE ajustes  (clave VARCHAR(50) PRIMARY KEY, valor MEDIUMTEXT NOT NULL) DEFAULT CHARSET=utf8mb4;
// CREATE TABLE intentos (id INT AUTO_INCREMENT PRIMARY KEY, ip VARCHAR(45) NOT NULL, hora INT UNSIGNED NOT NULL, INDEX (ip, hora)) DEFAULT CHARSET=utf8mb4;

declare(strict_types=1);

// ---- Configuración (idealmente en un config.php fuera de la carpeta pública) ----
const ADMIN_EMAIL = 'tu@email.com';
const ADMIN_HASH  = '$2y$10$...';          // salida de password_hash
const DB_DSN      = 'mysql:host=localhost;dbname=TU_BD;charset=utf8mb4';
const DB_USER     = 'USUARIO';
const DB_PASS     = 'CLAVE';
const MAX_INTENTOS = 5;                    // fallos permitidos por IP...
const VENTANA_SEG  = 900;                  // ...en 15 minutos
// -----------------------------------------------------------------------------------

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'secure'   => !empty($_SERVER['HTTPS']),
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

function salir(mixed $datos, int $codigo = 200): never {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function esAdmin(): bool { return !empty($_SESSION['admin']); }
function exigirAdmin(): void {
    // La cabecera propia impide que un formulario de otra web dispare escrituras (CSRF básico).
    if (!esAdmin() || !isset($_SERVER['HTTP_X_REQUESTED_WITH'])) salir(['error' => 'no autorizado'], 403);
}

try {
    $db = new PDO(DB_DSN, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    salir(['error' => 'sin conexión con la base de datos'], 500);
}

$accion = $_GET['a'] ?? '';
$in = json_decode(file_get_contents('php://input') ?: 'null', true);
$in = is_array($in) ? $in : [];

switch ($accion) {
    case 'cargar':
        $funkos = [];
        foreach ($db->query('SELECT id, datos FROM funkos') as $r) {
            $d = json_decode($r['datos'], true);
            if (is_array($d)) { $d['id'] = (int)$r['id']; $funkos[] = $d; }
        }
        $aj = [];
        foreach ($db->query('SELECT clave, valor FROM ajustes') as $r) $aj[$r['clave']] = json_decode($r['valor'], true);
        salir(['funkos' => $funkos, 'pegatinas' => $aj['pegatinas'] ?? [], 'colecciones' => $aj['colecciones'] ?? []]);

    case 'sesion':
        salir(esAdmin() ? ['email' => $_SESSION['email']] : null);

    case 'login':
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $db->prepare('DELETE FROM intentos WHERE hora < ?')->execute([time() - VENTANA_SEG]);
        $q = $db->prepare('SELECT COUNT(*) FROM intentos WHERE ip = ? AND hora >= ?');
        $q->execute([$ip, time() - VENTANA_SEG]);
        if ((int)$q->fetchColumn() >= MAX_INTENTOS) salir(['error' => 'demasiados intentos, espera unos minutos'], 429);

        $email = is_string($in['email'] ?? null) ? $in['email'] : '';
        $pass  = is_string($in['pass']  ?? null) ? $in['pass']  : '';
        // Se comprueba siempre el hash para que la respuesta tarde lo mismo acierte o no el email.
        $okPass  = password_verify($pass, ADMIN_HASH);
        $okEmail = hash_equals(ADMIN_EMAIL, $email);
        if ($okPass && $okEmail) {
            session_regenerate_id(true);
            $_SESSION['admin'] = true;
            $_SESSION['email'] = ADMIN_EMAIL;
            $db->prepare('DELETE FROM intentos WHERE ip = ?')->execute([$ip]);
            salir(['email' => ADMIN_EMAIL]);
        }
        $db->prepare('INSERT INTO intentos (ip, hora) VALUES (?, ?)')->execute([$ip, time()]);
        salir(['error' => 'datos incorrectos'], 401);

    case 'logout':
        $_SESSION = [];
        session_destroy();
        salir(['ok' => true]);

    case 'funkos':
        exigirAdmin();
        $guardar = is_array($in['guardar'] ?? null) ? $in['guardar'] : [];
        $borrar  = is_array($in['borrar']  ?? null) ? $in['borrar']  : [];
        $db->beginTransaction();
        $up  = $db->prepare('INSERT INTO funkos (id, datos) VALUES (?, ?) ON DUPLICATE KEY UPDATE datos = VALUES(datos)');
        foreach ($guardar as $f) {
            $id = is_array($f) ? (int)($f['id'] ?? 0) : 0;
            if ($id < 1) { $db->rollBack(); salir(['error' => 'funko sin id'], 400); }
            $up->execute([$id, json_encode($f, JSON_UNESCAPED_UNICODE)]);
        }
        $del = $db->prepare('DELETE FROM funkos WHERE id = ?');
        foreach ($borrar as $id) $del->execute([(int)$id]);
        $db->commit();
        salir(['ok' => true]);

    case 'ajustes':
        exigirAdmin();
        $up = $db->prepare('INSERT INTO ajustes (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)');
        foreach (['pegatinas', 'colecciones'] as $k) {
            $up->execute([$k, json_encode(is_array($in[$k] ?? null) ? $in[$k] : [], JSON_UNESCAPED_UNICODE)]);
        }
        salir(['ok' => true]);

    default:
        salir(['error' => 'acción no válida'], 400);
}