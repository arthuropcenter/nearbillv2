<?php
require_once 'conn.php';
require_auth();
require_role(['AdminGM']);

$me = (int) $_SESSION['user_id'];
$myRole = current_role();

// ============ GET: daftar pengguna ============
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $search = trim($_GET['search'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $limit = max(1, min(100, (int) ($_GET['limit'] ?? 10)));
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $offset = ($page - 1) * $limit;

    $where = [];
    $params = [];
    $types = '';

    if ($search !== '') {
        $where[] = "(username LIKE ? OR fullname LIKE ? OR email LIKE ?)";
        $like = "%$search%";
        $params[] = $like; $params[] = $like; $params[] = $like;
        $types .= 'sss';
    }
    if ($status !== '') {
        $where[] = "status = ?";
        $params[] = $status;
        $types .= 's';
    }

    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $stmt = $koneksi->prepare("SELECT COUNT(*) AS total FROM tbl_users $whereSql");
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $total = (int) $stmt->get_result()->fetch_assoc()['total'];

    $sql = "SELECT id, username, fullname, user_type, status, phone, email, photo, last_login, creationdate
            FROM tbl_users $whereSql
            ORDER BY id ASC
            LIMIT $limit OFFSET $offset";
    $stmt = $koneksi->prepare($sql);
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    respond_ok([
        'data' => $rows,
        'total' => $total,
        'page' => $page,
        'limit' => $limit,
        'pages' => max(1, (int) ceil($total / $limit))
    ]);
}

// ============ POST ============
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $p = get_payload();
    $action = $_GET['action'] ?? '';
    $id = (int) ($_GET['id'] ?? 0);

    // ---------- Tambah pengguna ----------
    if ($action === '' && $id <= 0) {
        $username = trim($p['username'] ?? '');
        $fullname = trim($p['fullname'] ?? '');
        $password = $p['password'] ?? '';
        $user_type = $p['user_type'] ?? '';

        if ($username === '' || $password === '') {
            respond_error('Username dan password wajib diisi');
        }
        if (!in_array($user_type, STAFF_TYPES, true)) {
            respond_error('Role tidak valid');
        }

        $cek = $koneksi->prepare("SELECT id FROM tbl_users WHERE username = ?");
        $cek->bind_param('s', $username);
        $cek->execute();
        if ($cek->get_result()->num_rows > 0) {
            respond_error('Username sudah digunakan');
        }

        $email = trim($p['email'] ?? '');
        $phone = trim($p['phone'] ?? '');
        $status = in_array($p['status'] ?? '', ['Active', 'Inactive']) ? $p['status'] : 'Active';
        $hashed = password_hash($password, PASSWORD_DEFAULT);

        $sql = "INSERT INTO tbl_users (username, fullname, password, phone, email, user_type, status, creationdate)
                VALUES (?,?,?,?,?,?,?,NOW())";
        $stmt = $koneksi->prepare($sql);
        $stmt->bind_param('sssssss', $username, $fullname, $hashed, $phone, $email, $user_type, $status);
        if (!$stmt->execute()) {
            respond_error('Gagal menyimpan: ' . $stmt->error, 500);
        }

        respond_ok(['id' => $koneksi->insert_id, 'message' => 'Pengguna berhasil ditambahkan']);
    }

    // ---------- Update pengguna ----------
    if ($action === 'update' && $id > 0) {
        $stmt = $koneksi->prepare("SELECT * FROM tbl_users WHERE id = ?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $target = $stmt->get_result()->fetch_assoc();
        if (!$target) {
            respond_error('Pengguna tidak ditemukan', 404);
        }

        $fullname = trim($p['fullname'] ?? '');
        $user_type = $p['user_type'] ?? $target['user_type'];
        $email = trim($p['email'] ?? '');
        $phone = trim($p['phone'] ?? '');
        $status = in_array($p['status'] ?? '', ['Active', 'Inactive']) ? $p['status'] : $target['status'];

        if ($fullname === '') {
            respond_error('Nama lengkap wajib diisi');
        }
        if (!in_array($user_type, STAFF_TYPES, true)) {
            respond_error('Role tidak valid');
        }

        if ($id === $me && $user_type !== $target['user_type']) {
            respond_error('Tidak dapat mengubah role akun sendiri', 403);
        }
        if ($id === $me && $status !== 'Active' && $target['status'] === 'Active') {
            respond_error('Tidak dapat menonaktifkan akun sendiri', 403);
        }

        $sql = "UPDATE tbl_users SET fullname=?, user_type=?, phone=?, email=?, status=? WHERE id=?";
        $stmt = $koneksi->prepare($sql);
        $stmt->bind_param('sssssi', $fullname, $user_type, $phone, $email, $status, $id);
        if (!$stmt->execute()) {
            respond_error('Gagal menyimpan: ' . $stmt->error, 500);
        }

        if (!empty($p['new_password'])) {
            $hashed = password_hash($p['new_password'], PASSWORD_DEFAULT);
            $pw = $koneksi->prepare("UPDATE tbl_users SET password = ? WHERE id = ?");
            $pw->bind_param('si', $hashed, $id);
            $pw->execute();
        }

        if ($id === $me) {
            $_SESSION['user_type'] = $user_type;
            $_SESSION['username'] = $target['username'];
        }

        respond_ok(['message' => 'Pengguna berhasil diperbarui']);
    }

    // ---------- Hapus pengguna ----------
    if ($action === 'delete' && $id > 0) {
        if ($id === $me) {
            respond_error('Tidak dapat menghapus akun sendiri', 403);
        }

        $stmt = $koneksi->prepare("SELECT user_type FROM tbl_users WHERE id = ?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $target = $stmt->get_result()->fetch_assoc();
        if (!$target) {
            respond_error('Pengguna tidak ditemukan', 404);
        }

        $del = $koneksi->prepare("DELETE FROM tbl_users WHERE id = ?");
        $del->bind_param('i', $id);
        $del->execute();
        if ($del->affected_rows > 0) {
            respond_ok(['message' => 'Pengguna berhasil dihapus']);
        }
        respond_error('Pengguna tidak ditemukan', 404);
    }
}

http_response_code(405);
echo json_encode(['error' => 'Method tidak diizinkan']);
