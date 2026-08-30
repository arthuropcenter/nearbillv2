<?php
require_once 'conn.php';
require_once 'crypto.php';
require_auth();

// ============ GET: daftar router ============
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $res = $koneksi->query("SELECT * FROM tbl_routers ORDER BY id DESC");
    $rows = $res->fetch_all(MYSQLI_ASSOC);
    foreach ($rows as &$row) {
        $row['has_password'] = !empty($row['password']);
        $row['password'] = '';
    }
    unset($row);
    respond_ok(['data' => $rows]);
}

// ============ POST: tambah router ============
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $p = get_payload();
    $name = trim($p['name'] ?? '');
    $ip_address = trim($p['ip_address'] ?? '');
    $username = trim($p['username'] ?? '');
    $password = $p['password'] ?? '';
    $description = trim($p['description'] ?? '');
    $enabled = isset($p['enabled']) ? (int) (bool) $p['enabled'] : 1;

    if ($name === '' || $ip_address === '' || $username === '') {
        respond_error('Nama, IP Address, dan Username wajib diisi');
    }

    $password = encrypt_router_password($password);

    $stmt = $koneksi->prepare("INSERT INTO tbl_routers (name, ip_address, username, password, description, enabled) VALUES (?,?,?,?,?,?)");
    $stmt->bind_param('sssssi', $name, $ip_address, $username, $password, $description, $enabled);

    if (!$stmt->execute()) {
        respond_error('Gagal menyimpan: ' . $stmt->error, 500);
    }

    respond_ok(['id' => $koneksi->insert_id, 'message' => 'Router berhasil ditambahkan']);
}

http_response_code(405);
echo json_encode(['error' => 'Method tidak diizinkan']);
