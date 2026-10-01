<?php
// Lee y guarda data/funkos.json y data/pegatinas.json. Compatible con PHP 5.3.
// Antes de sobrescribir guarda una copia en data/backups/ (como mucho una cada 10 min, se conservan 30).
header('Content-Type: application/json; charset=utf-8');
$dir = dirname(__FILE__) . '/data/';
$que = isset($_GET['que']) ? $_GET['que'] : '';
if ($que !== 'funkos' && $que !== 'pegatinas') {
    header('HTTP/1.1 400 Bad Request');
    echo '{"error":"parametro que no valido"}';
    exit;
}
$archivo = $dir . $que . '.json';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $cuerpo = file_get_contents('php://input');
    $datos = json_decode($cuerpo, true);
    if (!is_array($datos)) {
        header('HTTP/1.1 400 Bad Request');
        echo '{"error":"JSON no valido"}';
        exit;
    }
    if (!is_dir($dir . 'backups')) {
        mkdir($dir . 'backups', 0755, true);
    }
    $copias = glob($dir . 'backups/' . $que . '-*.json');
    if (!$copias) { $copias = array(); }
    sort($copias);
    $ultima = end($copias);
    if (is_file($archivo) && (!$ultima || time() - filemtime($ultima) > 600)) {
        copy($archivo, $dir . 'backups/' . $que . '-' . date('Ymd-His') . '.json');
        $copias[] = 'nueva';
    }
    $copias = glob($dir . 'backups/' . $que . '-*.json');
    if (!$copias) { $copias = array(); }
    sort($copias);
    while (count($copias) > 30) {
        unlink(array_shift($copias));
    }
    if (file_put_contents($archivo, $cuerpo, LOCK_EX) === false) {
        header('HTTP/1.1 500 Internal Server Error');
        echo '{"error":"no se pudo escribir (permisos de data/)"}';
        exit;
    }
    echo '{"ok":true}';
    exit;
}

if (is_file($archivo)) { readfile($archivo); } else { echo '[]'; }
