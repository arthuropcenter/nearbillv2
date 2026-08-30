<?php
require_once 'conn.php';
require_once 'crypto.php';
require_auth();
require_role(STAFF_TYPES);

// ============ GET: daftar OLT ============
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $rows = $koneksi->query("SELECT * FROM tbl_olts ORDER BY id ASC")->fetch_all(MYSQLI_ASSOC);
    foreach ($rows as &$row) {
        $row['has_password'] = !empty($row['password']);
        $row['password'] = '';
    }
    unset($row);
    respond_ok(['data' => $rows]);
}

// ============ POST: tambah / update OLT ============
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = (int) ($_GET['id'] ?? 0);
    $action = $_GET['action'] ?? '';
    $p = get_payload();

    $name = trim($p['name'] ?? '');
    $ip_address = trim($p['ip_address'] ?? '');
    $port = max(1, (int) ($p['port'] ?? 23));
    $username = trim($p['username'] ?? '');
    $enabled = isset($p['enabled']) ? (int) (bool) $p['enabled'] : 1;
    $password = $p['password'] ?? null;

    if ($name === '' || $ip_address === '' || $username === '') {
        respond_error('Nama, IP Address, dan Username wajib diisi');
    }

    if ($id > 0 && $action === 'update') {
        if ($password !== null && $password !== '') {
            $password = encrypt_router_password($password);
            $stmt = $koneksi->prepare("UPDATE tbl_olts SET name=?, ip_address=?, port=?, username=?, password=?, enabled=? WHERE id=?");
            $stmt->bind_param('ssissii', $name, $ip_address, $port, $username, $password, $enabled, $id);
        } else {
            $stmt = $koneksi->prepare("UPDATE tbl_olts SET name=?, ip_address=?, port=?, username=?, enabled=? WHERE id=?");
            $stmt->bind_param('ssisii', $name, $ip_address, $port, $username, $enabled, $id);
        }
        if (!$stmt->execute()) {
            respond_error('Gagal menyimpan: ' . $stmt->error, 500);
        }
        respond_ok(['message' => 'OLT berhasil diperbarui']);
    }

    if ($password === null || $password === '') {
        respond_error('Password wajib diisi saat menambah OLT');
    }
    $password = encrypt_router_password($password);

    $stmt = $koneksi->prepare("INSERT INTO tbl_olts (name, ip_address, port, username, password, enabled) VALUES (?,?,?,?,?,?)");
    $stmt->bind_param('ssissi', $name, $ip_address, $port, $username, $password, $enabled);

    if (!$stmt->execute()) {
        respond_error('Gagal menyimpan: ' . $stmt->error, 500);
    }

    respond_ok(['id' => $koneksi->insert_id, 'message' => 'OLT berhasil ditambahkan']);
}

// ============ DELETE: hapus OLT ============
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if ($id <= 0) respond_error('ID tidak valid');

    $stmt = $koneksi->prepare("DELETE FROM tbl_olts WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        respond_ok(['message' => 'OLT berhasil dihapus']);
    }
    respond_error('OLT tidak ditemukan', 404);
}

http_response_code(405);
echo json_encode(['error' => 'Method tidak diizinkan']);
