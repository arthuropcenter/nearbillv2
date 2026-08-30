<?php
require_once 'conn.php';

define('ANN_STAFF', ['AdminGM', 'AdminCS']);

// ============ GET ============
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['all'])) {
        require_auth();
        require_role(ANN_STAFF);
        $rows = $koneksi->query("SELECT * FROM tbl_announcements ORDER BY id DESC")->fetch_all(MYSQLI_ASSOC);
        respond_ok(['data' => $rows]);
    }

    // Publik untuk pelanggan (hanya yang aktif)
    $rows = $koneksi->query("SELECT id, title, message, category, created_at FROM tbl_announcements WHERE active = 1 ORDER BY id DESC LIMIT 20")->fetch_all(MYSQLI_ASSOC);
    respond_ok(['data' => $rows]);
}

// ============ POST: tambah ============
if ($_SERVER['REQUEST_METHOD'] === 'POST' && (($_GET['action'] ?? '') === '')) {
    require_auth();
    require_role(ANN_STAFF);
    $p = get_payload();

    $title = trim($p['title'] ?? '');
    $message = trim($p['message'] ?? '');
    $category = in_array($p['category'] ?? '', ['info', 'maintenance', 'outage'], true) ? $p['category'] : 'info';
    $active = isset($p['active']) ? (int) (bool) $p['active'] : 1;
    $staffId = (int) $_SESSION['user_id'];

    if ($title === '') respond_error('Judul wajib diisi');

    $stmt = $koneksi->prepare("INSERT INTO tbl_announcements (title, message, category, active, created_by) VALUES (?,?,?,?,?)");
    $stmt->bind_param('sssii', $title, $message, $category, $active, $staffId);
    if (!$stmt->execute()) {
        respond_error('Gagal menyimpan: ' . $stmt->error, 500);
    }
    respond_ok(['id' => $koneksi->insert_id, 'message' => 'Pengumuman dibuat']);
}

// ============ POST: perbarui status/hapus ============
if ($_SERVER['REQUEST_METHOD'] === 'POST' && (($_GET['action'] ?? '') !== '')) {
    require_auth();
    require_role(ANN_STAFF);
    $action = $_GET['action'];
    $id = (int) ($_GET['id'] ?? 0);
    if ($id <= 0) respond_error('ID tidak valid');

    if ($action === 'toggle') {
        $stmt = $koneksi->prepare("UPDATE tbl_announcements SET active = 1 - active WHERE id = ?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        respond_ok(['message' => 'Status pengumuman diubah']);
    }

    if ($action === 'delete') {
        $stmt = $koneksi->prepare("DELETE FROM tbl_announcements WHERE id = ?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        respond_ok(['message' => 'Pengumuman dihapus']);
    }

    respond_error('Aksi tidak dikenal', 400);
}

http_response_code(405);
echo json_encode(['error' => 'Method tidak diizinkan']);
