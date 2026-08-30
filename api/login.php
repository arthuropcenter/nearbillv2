<?php
require_once 'conn.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Cek sesi yang masih aktif (untuk restore halaman setelah reload)
    if (!empty($_SESSION['user_id'])) {
        $id = (int) $_SESSION['user_id'];
        $type = $_SESSION['user_type'] ?? '';

        if ($type === 'customer') {
            $stmt = $koneksi->prepare("SELECT id, username, fullname, photo FROM tbl_customers WHERE id = ?");
            $stmt->bind_param('i', $id);
            $stmt->execute();
            $cust = $stmt->get_result()->fetch_assoc();
            if ($cust) {
                respond_ok(['user' => [
                    'id' => (int) $cust['id'],
                    'username' => $cust['username'],
                    'fullname' => $cust['fullname'],
                    'user_type' => 'customer',
                    'photo' => $cust['photo']
                ]]);
            }
        } else {
            $stmt = $koneksi->prepare("SELECT id, username, fullname, user_type, photo FROM tbl_users WHERE id = ?");
            $stmt->bind_param('i', $id);
            $stmt->execute();
            $user = $stmt->get_result()->fetch_assoc();
            if ($user) {
                respond_ok(['user' => $user]);
            }
        }
    }
    respond_error('Belum login', 401);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = get_payload();
    $username = trim($payload['username'] ?? '');
    $password = $payload['password'] ?? '';

    if ($username === '' || $password === '') {
        respond_error('Username dan password wajib diisi');
    }

    // 1. Cek akun staf (tbl_users)
    $stmt = $koneksi->prepare("SELECT * FROM tbl_users WHERE username = ?");
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    if ($user) {
        if ($user['status'] !== 'Active') {
            respond_error('Akun dinonaktifkan', 403);
        }

        $valid = password_verify($password, $user['password']) || $password === $user['password'];

        if (!$valid) {
            respond_error('Password salah', 401);
        }

        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['user_type'] = $user['user_type'];

        $upd = $koneksi->prepare("UPDATE tbl_users SET last_login = NOW() WHERE id = ?");
        $upd->bind_param('i', $user['id']);
        $upd->execute();

        respond_ok([
            'user' => [
                'id' => (int) $user['id'],
                'username' => $user['username'],
                'fullname' => $user['fullname'],
                'user_type' => $user['user_type'],
                'photo' => $user['photo']
            ]
        ]);
    }

    // 2. Cek akun customer (tbl_customers) - login menggunakan kredensial PPPoE
    $stmt = $koneksi->prepare("SELECT * FROM tbl_customers WHERE pppoe_username = ?");
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $cust = $stmt->get_result()->fetch_assoc();

    if ($cust) {
        if ($cust['status'] !== 'Active') {
            respond_error('Akun dinonaktifkan', 403);
        }

        if ($password !== $cust['pppoe_password']) {
            respond_error('Password salah', 401);
        }

        $_SESSION['user_id'] = $cust['id'];
        $_SESSION['username'] = $cust['username'];
        $_SESSION['user_type'] = 'customer';

        $upd = $koneksi->prepare("UPDATE tbl_customers SET last_login = NOW() WHERE id = ?");
        $upd->bind_param('i', $cust['id']);
        $upd->execute();

        respond_ok([
            'user' => [
                'id' => (int) $cust['id'],
                'username' => $cust['username'],
                'fullname' => $cust['fullname'],
                'user_type' => 'customer',
                'photo' => $cust['photo']
            ]
        ]);
    }

    respond_error('Username tidak ditemukan', 401);
}

http_response_code(405);
echo json_encode(['error' => 'Method tidak diizinkan']);
