<?php
require_once 'conn.php';
require_once 'crypto.php';
require_auth();

$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) respond_error('ID tidak valid');

// ============ GET: detail router ============
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $koneksi->prepare("SELECT * FROM tbl_routers WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $router = $stmt->get_result()->fetch_assoc();
    if (!$router) respond_error('Router tidak ditemukan', 404);
    $router['has_password'] = !empty($router['password']);
    $router['password'] = '';
    respond_ok(['router' => $router]);
}

// ============ POST action=update: update router ============
if ($_SERVER['REQUEST_METHOD'] === 'POST' && (($_GET['action'] ?? '') === 'update')) {
    $p = get_payload();
    $name = trim($p['name'] ?? '');
    $ip_address = trim($p['ip_address'] ?? '');
    $username = trim($p['username'] ?? '');
    $description = trim($p['description'] ?? '');
    $enabled = isset($p['enabled']) ? (int) (bool) $p['enabled'] : 1;
    $password = $p['password'] ?? null;

    if ($name === '' || $ip_address === '' || $username === '') {
        respond_error('Nama, IP Address, dan Username wajib diisi');
    }

    if ($password !== null && $password !== '') {
        $password = encrypt_router_password($password);
        $stmt = $koneksi->prepare("UPDATE tbl_routers SET name=?, ip_address=?, username=?, password=?, description=?, enabled=? WHERE id=?");
        $stmt->bind_param('sssssii', $name, $ip_address, $username, $password, $description, $enabled, $id);
    } else {
        $stmt = $koneksi->prepare("UPDATE tbl_routers SET name=?, ip_address=?, username=?, description=?, enabled=? WHERE id=?");
        $stmt->bind_param('ssssii', $name, $ip_address, $username, $description, $enabled, $id);
    }

    if (!$stmt->execute()) {
        respond_error('Gagal menyimpan: ' . $stmt->error, 500);
    }

    respond_ok(['message' => 'Router berhasil diperbarui']);
}

// ============ DELETE: hapus router ============
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $stmt = $koneksi->prepare("DELETE FROM tbl_routers WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        respond_ok(['message' => 'Router berhasil dihapus']);
    }
    respond_error('Router tidak ditemukan', 404);
}

http_response_code(405);
echo json_encode(['error' => 'Method tidak diizinkan']);
