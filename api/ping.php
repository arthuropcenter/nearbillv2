<?php
require_once 'conn.php';
require_once 'crypto.php';
require_once 'RouterOS.php';
require_auth();

$id = (int) (get_payload()['id'] ?? 0);
if ($id <= 0) respond_error('ID router tidak valid');

$stmt = $koneksi->prepare("SELECT * FROM tbl_routers WHERE id = ?");
$stmt->bind_param('i', $id);
$stmt->execute();
$router = $stmt->get_result()->fetch_assoc();

if (!$router) respond_error('Router tidak ditemukan', 404);
if (!$router['enabled']) respond_error('Router nonaktif', 400);

$start = microtime(true);

$ipPort = explode(':', $router['ip_address']);
$ip = $ipPort[0];
$port = isset($ipPort[1]) ? (int) $ipPort[1] : 8728;

$username = $router['username'];
$password = decrypt_router_password($router['password']);

$r = new RouterOS();
$connected = $r->connect($ip, $port, $username, $password);

if ($connected) {
    $identity = $r->print('/system/identity');
    $r->disconnect();
    $elapsed = round((microtime(true) - $start) * 1000, 2);

    $upd = $koneksi->prepare("UPDATE tbl_routers SET status='Online', last_seen=NOW() WHERE id=?");
    $upd->bind_param('i', $id);
    $upd->execute();

    respond_ok([
        'success' => true,
        'online' => true,
        'message' => 'Router online',
        'identity' => $identity[0]['name'] ?? '',
        'ping_ms' => $elapsed,
        'source' => 'routeros-api'
    ]);
}

$elapsed = round((microtime(true) - $start) * 1000, 2);
$upd = $koneksi->prepare("UPDATE tbl_routers SET status='Offline' WHERE id=?");
$upd->bind_param('i', $id);
$upd->execute();

respond_ok([
    'success' => true,
    'online' => false,
    'message' => "Router tidak dapat dijangkau di {$ip}:{$port}",
    'ping_ms' => $elapsed,
    'source' => 'routeros-api'
]);
