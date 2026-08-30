<?php
require_once 'conn.php';

require_auth();

$id = (int) $_SESSION['user_id'];
$type = $_SESSION['user_type'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($type === 'customer') {
        $stmt = $koneksi->prepare("SELECT id, username, fullname, photo, last_login, email, phonenumber FROM tbl_customers WHERE id = ?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $cust = $stmt->get_result()->fetch_assoc();

        if (!$cust) {
            respond_error('User tidak ditemukan', 404);
        }

        respond_ok(['user' => [
            'id' => (int) $cust['id'],
            'username' => $cust['username'],
            'fullname' => $cust['fullname'],
            'user_type' => 'customer',
            'photo' => $cust['photo'],
            'email' => $cust['email'],
            'phone' => $cust['phonenumber'],
            'last_login' => $cust['last_login']
        ]]);
    }

    $stmt = $koneksi->prepare("SELECT id, username, fullname, user_type, photo, email, phone, last_login, creationdate FROM tbl_users WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    if (!$user) {
        respond_error('User tidak ditemukan', 404);
    }

    respond_ok(['user' => $user]);
}

// ============ POST: ganti password sendiri ============
if ($_SERVER['REQUEST_METHOD'] === 'POST' && (($_GET['action'] ?? '') === 'password')) {
    if ($type === 'customer') {
        respond_error('Khusus akun staf', 403);
    }

    $p = get_payload();
    $current = $p['current_password'] ?? '';
    $new = $p['new_password'] ?? '';

    if ($current === '' || $new === '') {
        respond_error('Password lama dan baru wajib diisi');
    }
    if (strlen($new) < 4) {
        respond_error('Password baru minimal 4 karakter');
    }

    $stmt = $koneksi->prepare("SELECT password FROM tbl_users WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();

    if (!$row) {
        respond_error('User tidak ditemukan', 404);
    }

    if (!(password_verify($current, $row['password']) || $current === $row['password'])) {
        respond_error('Password lama salah', 401);
    }

    $hashed = password_hash($new, PASSWORD_DEFAULT);
    $upd = $koneksi->prepare("UPDATE tbl_users SET password = ? WHERE id = ?");
    $upd->bind_param('si', $hashed, $id);
    $upd->execute();

    respond_ok(['message' => 'Password berhasil diubah']);
}

http_response_code(405);
echo json_encode(['error' => 'Method tidak diizinkan']);
