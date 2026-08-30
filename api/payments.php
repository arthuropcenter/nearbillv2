<?php
require_once 'conn.php';
require_auth();

define('PAY_STAFF', ['AdminGM', 'AdminCS']);
define('PAY_UPLOAD_DIR', __DIR__ . '/../uploads/payments/');

// ============ GET: data pembayaran ============
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Staff: daftar semua konfirmasi
    if (isset($_GET['all'])) {
        require_role(PAY_STAFF);
        $status = $_GET['status'] ?? '';
        $allowed = ['pending', 'verified', 'rejected'];
        $sql = "SELECT p.*, c.username AS cust_username, c.fullname AS cust_fullname
            FROM tbl_payments p
            LEFT JOIN tbl_customers c ON c.id = p.customer_id";
        if (in_array($status, $allowed, true)) {
            $sql .= " WHERE p.status = '$status'";
        }
        $sql .= " ORDER BY p.id DESC LIMIT 200";
        respond_ok(['data' => $koneksi->query($sql)->fetch_all(MYSQLI_ASSOC)]);
    }

    // Pelanggan: data miliknya
    if (current_role() !== 'customer') {
        respond_error('Khusus akun pelanggan', 403);
    }
    $id = (int) $_SESSION['user_id'];

    $cust = $koneksi->prepare("SELECT c.balance, c.plan_id FROM tbl_customers c WHERE c.id = ?");
    $cust->bind_param('i', $id);
    $cust->execute();
    $row = $cust->get_result()->fetch_assoc();

    $planPrice = null;
    $planName = null;
    if ($row && !empty($row['plan_id'])) {
        $stmt = $koneksi->prepare("SELECT name_plan, price FROM tbl_plans WHERE id = ?");
        $stmt->bind_param('i', $row['plan_id']);
        $stmt->execute();
        $plan = $stmt->get_result()->fetch_assoc();
        if ($plan) {
            $planPrice = (float) $plan['price'];
            $planName = $plan['name_plan'];
        }
    }

    $list = $koneksi->prepare("SELECT * FROM tbl_payments WHERE customer_id = ? ORDER BY id DESC LIMIT 50");
    $list->bind_param('i', $id);
    $list->execute();
    $payments = $list->get_result()->fetch_all(MYSQLI_ASSOC);

    respond_ok([
        'balance' => $row ? (float) $row['balance'] : 0,
        'plan_price' => $planPrice,
        'plan_name' => $planName,
        'payments' => $payments
    ]);
}

// ============ POST: buat konfirmasi (pelanggan) ============
if ($_SERVER['REQUEST_METHOD'] === 'POST' && (($_GET['action'] ?? '') === '')) {
    if (current_role() !== 'customer') {
        respond_error('Khusus akun pelanggan', 403);
    }
    $id = (int) $_SESSION['user_id'];

    $p = get_payload();
    $amount = max(0, (float) ($p['amount'] ?? 0));
    $method = trim($p['method'] ?? 'Transfer Bank');
    $reference = trim($p['reference'] ?? '');
    $note = trim($p['note'] ?? '');

    if ($amount <= 0) respond_error('Jumlah pembayaran tidak valid');
    if ($method === '') respond_error('Metode pembayaran wajib diisi');

    // Bukti transfer (opsional)
    $proof = '';
    if (!empty($_FILES['proof']) && $_FILES['proof']['error'] === UPLOAD_ERR_OK) {
        if ($_FILES['proof']['size'] > 5 * 1024 * 1024) {
            respond_error('Ukuran bukti maksimal 5 MB');
        }
        $ext = strtolower(pathinfo($_FILES['proof']['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
            respond_error('Format bukti harus gambar (jpg/png/webp)');
        }
        if (!is_dir(PAY_UPLOAD_DIR)) {
            mkdir(PAY_UPLOAD_DIR, 0775, true);
        }
        $fname = 'pmt_' . $id . '_' . time() . '_' . mt_rand(1000, 9999) . '.' . $ext;
        if (!move_uploaded_file($_FILES['proof']['tmp_name'], PAY_UPLOAD_DIR . $fname)) {
            respond_error('Gagal menyimpan bukti pembayaran', 500);
        }
        $proof = 'uploads/payments/' . $fname;
    }

    $stmt = $koneksi->prepare("INSERT INTO tbl_payments (customer_id, amount, method, reference, note, proof_path) VALUES (?,?,?,?,?,?)");
    $stmt->bind_param('dsssss', $id, $amount, $method, $reference, $note, $proof);
    if (!$stmt->execute()) {
        respond_error('Gagal menyimpan: ' . $stmt->error, 500);
    }

    respond_ok(['id' => $koneksi->insert_id, 'message' => 'Konfirmasi pembayaran terkirim']);
}

// ============ POST: input manual pembayaran (staf helpdesk/admin) ============
if ($_SERVER['REQUEST_METHOD'] === 'POST' && (($_GET['action'] ?? '') === 'manual')) {
    require_role(PAY_STAFF);
    $p = get_payload();

    $customerId = (int) ($p['customer_id'] ?? 0);
    $amount = max(0, (float) ($p['amount'] ?? 0));
    $method = trim($p['method'] ?? 'Cash');
    $reference = trim($p['reference'] ?? '');
    $note = trim($p['note'] ?? '');

    if ($customerId <= 0) respond_error('Pilih pelanggan terlebih dahulu');
    if ($amount <= 0) respond_error('Jumlah pembayaran tidak valid');
    if ($method === '') $method = 'Cash';

    $c = $koneksi->prepare("SELECT c.username, c.fullname, c.plan_id, p.name_plan AS plan_name FROM tbl_customers c LEFT JOIN tbl_plans p ON p.id = c.plan_id WHERE c.id = ?");
    $c->bind_param('i', $customerId);
    $c->execute();
    $cust = $c->get_result()->fetch_assoc();
    if (!$cust) respond_error('Pelanggan tidak ditemukan', 404);

    $staffId = (int) $_SESSION['user_id'];

    // Catat pembayaran langsung lunas
    $ins = $koneksi->prepare("INSERT INTO tbl_payments (customer_id, amount, method, reference, note, status, verified_by, verified_at) VALUES (?,?,?,?,?,'verified',?,NOW())");
    $ins->bind_param('dsssii', $customerId, $amount, $method, $reference, $note, $staffId);
    if (!$ins->execute()) {
        respond_error('Gagal menyimpan: ' . $ins->error, 500);
    }
    $pmtId = $koneksi->insert_id;

    // Sinkron ke buku pemasukan keuangan (pay_no unik 6 digit agar tidak bentrok
    // dengan hasil import, ON DUPLICATE KEY mencegah duplikat saat diproses ulang)
    $finPayNo = 'PAY-' . str_pad($pmtId, 6, '0', STR_PAD_LEFT);
    $finRef = 'NH-C' . str_pad($customerId, 4, '0', STR_PAD_LEFT);
    $finName = $cust['fullname'] ?: $cust['username'];
    $finNote = 'Input manual #' . $pmtId;
    if ($reference !== '') $finNote .= ' | Ref: ' . $reference;
    $fin = $koneksi->prepare("INSERT INTO tbl_fin_income (pay_no, customer_ref, customer_name, pay_date, method, amount, note, created_by)
        VALUES (?,?,?,CURDATE(),?,?,?,?) ON DUPLICATE KEY UPDATE pay_no = pay_no");
    $fin->bind_param('ssssdsi', $finPayNo, $finRef, $finName, $method, $amount, $finNote, $staffId);
    $fin->execute();

    // Catat transaksi keuangan (tipe Balance) untuk laporan
    $invoice = 'INV-' . str_pad($pmtId, 6, '0', STR_PAD_LEFT);
    $planName = $cust['plan_name'] ?: 'Input Manual';
    $trxNote = 'Input manual #' . $pmtId . ' oleh staf';
    if ($reference !== '') $trxNote .= ' | Ref: ' . $reference;

    $trx = $koneksi->prepare("INSERT INTO tbl_transactions
        (invoice, username, user_id, plan_id, plan_name, price, recharged_on, recharged_time, expiration, time, method, routers, type, note, admin_id)
        VALUES (?,?,?,?,?,?,CURDATE(),CURTIME(),CURDATE(),'00:00:00',?,'MANUAL','Balance',?,?)");
    $amountStr = (string) $amount;
    $planId = (int) ($cust['plan_id'] ?? 0);
    $trx->bind_param('ssiissssi', $invoice, $cust['username'], $customerId, $planId, $planName, $amountStr, $method, $trxNote, $staffId);
    if (!$trx->execute()) {
        respond_error('Gagal mencatat transaksi: ' . $trx->error, 500);
    }

    // Tambah saldo pelanggan
    $bal = $koneksi->prepare("UPDATE tbl_customers SET balance = balance + ? WHERE id = ?");
    $bal->bind_param('di', $amount, $customerId);
    $bal->execute();

    respond_ok(['id' => $pmtId, 'message' => 'Pembayaran dicatat, saldo ditambahkan']);
}

// ============ POST: verifikasi / tolak (staf) ============
if ($_SERVER['REQUEST_METHOD'] === 'POST' && (($_GET['action'] ?? '') !== '')) {
    require_role(PAY_STAFF);
    $action = $_GET['action'];
    $pmtId = (int) ($_GET['id'] ?? 0);
    if ($pmtId <= 0) respond_error('ID tidak valid');

    $stmt = $koneksi->prepare("SELECT * FROM tbl_payments WHERE id = ?");
    $stmt->bind_param('i', $pmtId);
    $stmt->execute();
    $pmt = $stmt->get_result()->fetch_assoc();
    if (!$pmt) respond_error('Konfirmasi tidak ditemukan', 404);
    if ($pmt['status'] !== 'pending') respond_error('Konfirmasi sudah diproses');

    if ($action === 'verify') {
        $staffId = (int) $_SESSION['user_id'];

        // Catat transaksi (tipe Balance) untuk laporan
        $invoice = 'INV-' . str_pad($pmt['id'], 6, '0', STR_PAD_LEFT);
        $username = '';
        $c = $koneksi->prepare("SELECT username, fullname FROM tbl_customers WHERE id = ?");
        $c->bind_param('i', $pmt['customer_id']);
        $c->execute();
        $cust = $c->get_result()->fetch_assoc();
        $username = $cust ? $cust['username'] : '';

        $note = 'Konfirmasi #' . $pmt['id'];
        if ($pmt['reference'] !== '') $note .= ' | Ref: ' . $pmt['reference'];

        $trx = $koneksi->prepare("INSERT INTO tbl_transactions
            (invoice, username, user_id, plan_id, plan_name, price, recharged_on, recharged_time, expiration, time, method, routers, type, note, admin_id)
            VALUES (?,?,?,0,'Konfirmasi Pembayaran',?,CURDATE(),CURTIME(),CURDATE(),'00:00:00',?,'MANUAL','Balance',?,?)");
        $amountStr = (string) $pmt['amount'];
        $trx->bind_param('ssidssi', $invoice, $username, $pmt['customer_id'], $amountStr, $pmt['method'], $note, $staffId);
        if (!$trx->execute()) {
            respond_error('Gagal mencatat transaksi: ' . $trx->error, 500);
        }

        // Tambah saldo pelanggan
        $bal = $koneksi->prepare("UPDATE tbl_customers SET balance = balance + ? WHERE id = ?");
        $bal->bind_param('di', $pmt['amount'], $pmt['customer_id']);
        $bal->execute();

        $upd = $koneksi->prepare("UPDATE tbl_payments SET status='verified', verified_by=?, verified_at=NOW() WHERE id=?");
        $upd->bind_param('ii', $staffId, $pmtId);
        $upd->execute();

        // Sinkron ke buku pemasukan keuangan
        $finPayNo = 'PAY-' . str_pad($pmt['id'], 6, '0', STR_PAD_LEFT);
        $finRef = 'NH-C' . str_pad($pmt['customer_id'], 4, '0', STR_PAD_LEFT);
        $finName = ($cust && $cust['fullname']) ? $cust['fullname'] : $username;
        $finNote = 'Konfirmasi #' . $pmt['id'];
        if ($pmt['reference'] !== '') $finNote .= ' | Ref: ' . $pmt['reference'];
        $fin = $koneksi->prepare("INSERT INTO tbl_fin_income (pay_no, customer_ref, customer_name, pay_date, method, amount, note, created_by)
            VALUES (?,?,?,CURDATE(),?,?,?,?) ON DUPLICATE KEY UPDATE pay_no = pay_no");
        $fin->bind_param('ssssdsi', $finPayNo, $finRef, $finName, $pmt['method'], (float) $pmt['amount'], $finNote, $staffId);
        $fin->execute();

        respond_ok(['message' => 'Pembayaran diverifikasi, saldo ditambahkan']);
    }

    if ($action === 'reject') {
        $p = get_payload();
        $reason = trim($p['reason'] ?? '');
        $staffId = (int) $_SESSION['user_id'];

        $upd = $koneksi->prepare("UPDATE tbl_payments SET status='rejected', reject_reason=?, verified_by=?, verified_at=NOW() WHERE id=?");
        $upd->bind_param('sii', $reason, $staffId, $pmtId);
        $upd->execute();

        respond_ok(['message' => 'Konfirmasi ditolak']);
    }

    respond_error('Aksi tidak dikenal', 400);
}

http_response_code(405);
echo json_encode(['error' => 'Method tidak diizinkan']);
