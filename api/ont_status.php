<?php
require_once 'conn.php';
require_once 'crypto.php';
require_once 'OLT/Hioso.php';
require_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method tidak diizinkan']);
    exit;
}

$customerId = (int) ($_GET['customer_id'] ?? 0);
if ($customerId <= 0) respond_error('ID pelanggan tidak valid');

$stmt = $koneksi->prepare("SELECT id, username, fullname, ont_pon, ont_onu FROM tbl_customers WHERE id = ?");
$stmt->bind_param('i', $customerId);
$stmt->execute();
$cust = $stmt->get_result()->fetch_assoc();

if (!$cust) respond_error('Pelanggan tidak ditemukan', 404);

if (trim($cust['ont_pon']) === '' || trim($cust['ont_onu']) === '') {
    respond_ok([
        'configured' => false,
        'message' => 'ONU belum dikonfigurasi. Isi PON dan ONU pada data pelanggan.'
    ]);
}

$olt = $koneksi->query("SELECT * FROM tbl_olts WHERE enabled = 1 ORDER BY id ASC LIMIT 1")->fetch_assoc();
if (!$olt) {
    respond_ok([
        'configured' => false,
        'message' => 'Koneksi OLT belum dikonfigurasi di menu Pengaturan.'
    ]);
}

$ipPort = explode(':', $olt['ip_address']);
$ip = $ipPort[0];
$port = isset($ipPort[1]) ? (int) $ipPort[1] : (int) $olt['port'];

$h = new HiosoOLT();
$connected = $h->connect($ip, $port, $olt['username'], decrypt_router_password($olt['password']));

if (!$connected) {
    $h->disconnect();
    respond_ok([
        'configured' => true,
        'online' => false,
        'message' => "OLT tidak dapat dijangkau di {$ip}:{$port}"
    ]);
}

$status = $h->onuStatus($cust['ont_pon'], $cust['ont_onu']);
$h->disconnect();

$status['configured'] = true;
$status['olt'] = ['name' => $olt['name'], 'ip_address' => $olt['ip_address']];
$status['customer'] = [
    'id' => (int) $cust['id'],
    'username' => $cust['username'],
    'fullname' => $cust['fullname'],
    'pon' => $cust['ont_pon'],
    'onu' => $cust['ont_onu']
];

respond_ok($status);
