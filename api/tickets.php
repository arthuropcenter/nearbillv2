<?php
require_once 'conn.php';
require_auth();

define('TICKET_STAFF', ['AdminGM', 'AdminCS', 'Teknisi']);
define('TICKET_CATEGORIES', ['Gangguan Koneksi', 'Koneksi Lambat', 'Tagihan', 'Instalasi', 'Lainnya']);

// ============ GET ============
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Staff: semua tiket
    if (isset($_GET['all'])) {
        require_role(TICKET_STAFF);
        $status = $_GET['status'] ?? '';
        $sql = "SELECT t.*, c.username AS cust_username, c.fullname AS cust_fullname, c.phonenumber AS cust_phone
            FROM tbl_tickets t
            LEFT JOIN tbl_customers c ON c.id = t.customer_id";
        if (in_array($status, ['open', 'in_progress', 'resolved', 'closed'], true)) {
            $sql .= " WHERE t.status = '$status'";
        }
        $sql .= " ORDER BY (t.status = 'open') DESC, t.id DESC LIMIT 300";
        respond_ok(['data' => $koneksi->query($sql)->fetch_all(MYSQLI_ASSOC)]);
    }

    // Pelanggan: tiket miliknya
    if (current_role() !== 'customer') {
        respond_error('Khusus akun pelanggan', 403);
    }
    $id = (int) $_SESSION['user_id'];
    $stmt = $koneksi->prepare("SELECT * FROM tbl_tickets WHERE customer_id = ? ORDER BY id DESC LIMIT 50");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    respond_ok(['data' => $stmt->get_result()->fetch_all(MYSQLI_ASSOC)]);
}

// ============ POST: buat tiket (pelanggan) ============
if ($_SERVER['REQUEST_METHOD'] === 'POST' && (($_GET['action'] ?? '') === '')) {
    if (current_role() !== 'customer') {
        respond_error('Khusus akun pelanggan', 403);
    }
    $id = (int) $_SESSION['user_id'];

    $p = get_payload();
    $category = trim($p['category'] ?? '');
    $subject = trim($p['subject'] ?? '');
    $description = trim($p['description'] ?? '');
    $priority = in_array($p['priority'] ?? '', ['low', 'medium', 'high'], true) ? $p['priority'] : 'medium';

    if ($category === '') $category = 'Lainnya';
    if (!in_array($category, TICKET_CATEGORIES, true)) respond_error('Kategori tidak valid');
    if ($subject === '') respond_error('Subjek wajib diisi');
    if (strlen($subject) > 150) respond_error('Subjek maksimal 150 karakter');
    if ($description === '') respond_error('Deskripsi keluhan wajib diisi');

    $stmt = $koneksi->prepare("INSERT INTO tbl_tickets (ticket_no, customer_id, category, subject, description, priority) VALUES ('',?,?,?,?,?)");
    $stmt->bind_param('issss', $id, $category, $subject, $description, $priority);
    if (!$stmt->execute()) {
        respond_error('Gagal menyimpan: ' . $stmt->error, 500);
    }
    $ticketId = $koneksi->insert_id;
    $koneksi->query("UPDATE tbl_tickets SET ticket_no = CONCAT('TKT-', LPAD($ticketId, 5, '0')) WHERE id = $ticketId");

    respond_ok(['id' => $ticketId, 'ticket_no' => 'TKT-' . str_pad($ticketId, 5, '0', STR_PAD_LEFT), 'message' => 'Keluhan terkirim']);
}

// ============ POST: perbarui tiket (staf) ============
if ($_SERVER['REQUEST_METHOD'] === 'POST' && (($_GET['action'] ?? '') === 'update')) {
    require_role(TICKET_STAFF);
    $ticketId = (int) ($_GET['id'] ?? 0);
    if ($ticketId <= 0) respond_error('ID tidak valid');

    $stmt = $koneksi->prepare("SELECT * FROM tbl_tickets WHERE id = ?");
    $stmt->bind_param('i', $ticketId);
    $stmt->execute();
    $t = $stmt->get_result()->fetch_assoc();
    if (!$t) respond_error('Tiket tidak ditemukan', 404);

    $p = get_payload();
    $status = $p['status'] ?? $t['status'];
    if (!in_array($status, ['open', 'in_progress', 'resolved', 'closed'], true)) respond_error('Status tidak valid');
    $staffNote = trim($p['staff_note'] ?? '');

    $staffId = (int) $_SESSION['user_id'];
    if ($staffNote !== '' || $status !== $t['status']) {
        $upd = $koneksi->prepare("UPDATE tbl_tickets SET status=?, staff_note=IF(?='', staff_note, ?), handled_by=?, handled_at=NOW() WHERE id=?");
        $upd->bind_param('sssii', $status, $staffNote, $staffNote, $staffId, $ticketId);
        $upd->execute();
    }

    respond_ok(['message' => 'Tiket diperbarui']);
}

http_response_code(405);
echo json_encode(['error' => 'Method tidak diizinkan']);
