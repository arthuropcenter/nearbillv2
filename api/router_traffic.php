<?php
require_once 'conn.php';
require_once 'crypto.php';
require_once 'RouterOS.php';
require_auth();

$id = (int) ($_GET['id'] ?? 0);
$action = $_GET['action'] ?? 'poll';

// ============ history: data grafik per interface ============
if ($action === 'history') {
    if ($id <= 0) respond_error('ID router tidak valid');

    $iface = trim($_GET['interface'] ?? '');
    $minutes = max(1, min(1440, (int) ($_GET['minutes'] ?? 30)));

    if ($iface === '') {
        $stmt = $koneksi->prepare(
            "SELECT interface, rx_bps, tx_bps, created_at FROM tbl_router_traffic
             WHERE router_id = ? AND created_at >= (NOW() - INTERVAL ? MINUTE)
             ORDER BY created_at ASC"
        );
        $stmt->bind_param('ii', $id, $minutes);
    } else {
        $stmt = $koneksi->prepare(
            "SELECT interface, rx_bps, tx_bps, created_at FROM tbl_router_traffic
             WHERE router_id = ? AND interface = ? AND created_at >= (NOW() - INTERVAL ? MINUTE)
             ORDER BY created_at ASC"
        );
        $stmt->bind_param('isi', $id, $iface, $minutes);
    }
    $stmt->execute();
    respond_ok(['history' => $stmt->get_result()->fetch_all(MYSQLI_ASSOC)]);
}

function bool_val($v)
{
    if (is_string($v)) {
        $l = strtolower(trim($v));
        if ($l === 'true' || $l === 'yes' || $l === '1') return true;
        if ($l === 'false' || $l === 'no' || $l === '0') return false;
    }
    return (bool) $v;
}

// ============ poll: ambil statistik interface + simpan sampel ============
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method tidak diizinkan']);
    exit;
}

if ($id <= 0) respond_error('ID router tidak valid');

$stmt = $koneksi->prepare("SELECT * FROM tbl_routers WHERE id = ?");
$stmt->bind_param('i', $id);
$stmt->execute();
$router = $stmt->get_result()->fetch_assoc();

if (!$router) respond_error('Router tidak ditemukan', 404);
if (!$router['enabled']) respond_error('Router nonaktif', 400);

$ipPort = explode(':', $router['ip_address']);
$ip = $ipPort[0];
$port = isset($ipPort[1]) ? (int) $ipPort[1] : 8728;

$r = new RouterOS();
$connected = $r->connect($ip, $port, $router['username'], decrypt_router_password($router['password']));

if (!$connected) {
    $upd = $koneksi->prepare("UPDATE tbl_routers SET status='Offline' WHERE id=?");
    $upd->bind_param('i', $id);
    $upd->execute();

    respond_ok([
        'online' => false,
        'message' => "Router tidak dapat dijangkau di {$ip}:{$port}"
    ]);
}

$ifaces = $r->print('/interface', ['=stats=true']);
$r->disconnect();

$upd = $koneksi->prepare("UPDATE tbl_routers SET status='Online', last_seen=NOW() WHERE id=?");
$upd->bind_param('i', $id);
$upd->execute();

// Bersihkan data lama (>7 hari) sekali jalan
$koneksi->query("DELETE FROM tbl_router_traffic WHERE created_at < (NOW() - INTERVAL 7 DAY)");

// Gunakan waktu MySQL agar konsisten dengan query riwayat
$now = $koneksi->query("SELECT NOW()")->fetch_row()[0];
$nowTs = strtotime($now);

$prevStmt = $koneksi->prepare(
    "SELECT rx_bytes, tx_bytes, created_at FROM tbl_router_traffic
     WHERE router_id = ? AND interface = ? ORDER BY created_at DESC LIMIT 1"
);
$insStmt = $koneksi->prepare(
    "INSERT INTO tbl_router_traffic (router_id, interface, rx_bytes, tx_bytes, rx_bps, tx_bps, created_at) VALUES (?,?,?,?,?,?,?)"
);

$result = [];
$running = 0;

foreach ($ifaces as $row) {
    $name = $row['name'] ?? '';
    if ($name === '' || isset($row['__error__'])) continue;

    $isRunning = bool_val($row['running'] ?? false) && !bool_val($row['disabled'] ?? false);
    if (!$isRunning) continue;
    $running++;

    $rx = (int) ($row['rx-byte'] ?? 0);
    $tx = (int) ($row['tx-byte'] ?? 0);

    $prevStmt->bind_param('is', $id, $name);
    $prevStmt->execute();
    $prev = $prevStmt->get_result()->fetch_assoc();

    $rxBps = 0;
    $txBps = 0;
    if ($prev) {
        $dt = $nowTs - strtotime($prev['created_at']);
        if ($dt < 1) $dt = 1;
        $drx = $rx - (int) $prev['rx_bytes'];
        $dtx = $tx - (int) $prev['tx_bytes'];
        if ($drx < 0) $drx = 0; // counter di-reset (reboot)
        if ($dtx < 0) $dtx = 0;
        $rxBps = (int) ($drx * 8 / $dt);
        $txBps = (int) ($dtx * 8 / $dt);
    }

    $insStmt->bind_param('issssss', $id, $name, $rx, $tx, $rxBps, $txBps, $now);
    $insStmt->execute();

    $result[] = [
        'name' => $name,
        'type' => $row['type'] ?? '',
        'rx_bps' => $rxBps,
        'tx_bps' => $txBps
    ];
}

respond_ok([
    'online' => true,
    'router' => ['id' => $id, 'name' => $router['name'], 'ip_address' => $router['ip_address']],
    'interfaces' => $result,
    'running' => $running,
    'ts' => $now
]);
