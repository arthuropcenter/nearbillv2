<?php
require_once 'conn.php';
require_auth();

$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) respond_error('ID tidak valid');

// ============ GET: detail pelanggan ============
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $koneksi->prepare("SELECT * FROM tbl_customers WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $customer = $stmt->get_result()->fetch_assoc();

    if (!$customer) respond_error('Pelanggan tidak ditemukan', 404);

    // Transaksi terakhir pelanggan
    $trx = $koneksi->prepare("SELECT * FROM tbl_transactions WHERE user_id = ? ORDER BY id DESC LIMIT 10");
    $trx->bind_param('i', $id);
    $trx->execute();
    $customer['transactions'] = $trx->get_result()->fetch_all(MYSQLI_ASSOC);

    // Custom fields
    $cf = $koneksi->prepare("SELECT id, field_name, field_value FROM tbl_customers_fields WHERE customer_id = ?");
    $cf->bind_param('i', $id);
    $cf->execute();
    $customer['custom_fields'] = $cf->get_result()->fetch_all(MYSQLI_ASSOC);

    respond_ok(['customer' => $customer]);
}

// ============ PUT: update pelanggan ============
if ($_SERVER['REQUEST_METHOD'] === 'POST' && (($_GET['action'] ?? '') === 'update')) {
    $p = get_payload();

    $cek = $koneksi->prepare("SELECT * FROM tbl_customers WHERE id = ?");
    $cek->bind_param('i', $id);
    $cek->execute();
    if (!$cek->get_result()->fetch_assoc()) respond_error('Pelanggan tidak ditemukan', 404);

    $username = trim($p['username'] ?? '');
    if ($username === '') respond_error('Username wajib diisi');

    $email = trim($p['email'] ?? '');
    $fullname = trim($p['fullname'] ?? '');
    $phonenumber = trim($p['phonenumber'] ?? '');
    $pppoe_username = trim($p['pppoe_username'] ?? '');
    $pppoe_password = trim($p['pppoe_password'] ?? '');
    $pppoe_ip = trim($p['pppoe_ip'] ?? '');
    $address = trim($p['address'] ?? '');
    $city = trim($p['city'] ?? '');
    $district = trim($p['district'] ?? '');
    $state = trim($p['state'] ?? '');
    $zip = trim($p['zip'] ?? '');
    $coordinates = trim($p['coordinates'] ?? '');
    $ont_pon = trim($p['ont_pon'] ?? '');
    $ont_onu = trim($p['ont_onu'] ?? '');
    $account_type = in_array($p['account_type'] ?? '', ['Business', 'Personal']) ? $p['account_type'] : 'Personal';
    $service_type = in_array($p['service_type'] ?? '', ['Hotspot', 'PPPoE', 'VPN', 'Others']) ? $p['service_type'] : 'Others';
    $balance = max(0, (float) ($p['balance'] ?? 0));
    $auto_renewal = isset($p['auto_renewal']) ? (int) (bool) $p['auto_renewal'] : 1;
    $status = in_array($p['status'] ?? '', ['Active', 'Banned', 'Disabled', 'Inactive', 'Limited', 'Suspended']) ? $p['status'] : 'Active';

    // Update password hanya jika diisi
    $sql = "UPDATE tbl_customers SET username=?, email=?, fullname=?, phonenumber=?, pppoe_username=?, pppoe_password=?, pppoe_ip=?, address=?, city=?, district=?, state=?, zip=?, coordinates=?, ont_pon=?, ont_onu=?, account_type=?, service_type=?, balance=?, auto_renewal=?, status=? WHERE id=?";
    $stmt = $koneksi->prepare($sql);
    $stmt->bind_param(str_repeat('s', 17) . 'disi', $username, $email, $fullname, $phonenumber, $pppoe_username, $pppoe_password, $pppoe_ip, $address, $city, $district, $state, $zip, $coordinates, $ont_pon, $ont_onu, $account_type, $service_type, $balance, $auto_renewal, $status, $id);

    if (!$stmt->execute()) {
        respond_error('Gagal menyimpan: ' . $stmt->error, 500);
    }

    if (!empty($p['new_password'])) {
        $hashed = password_hash($p['new_password'], PASSWORD_DEFAULT);
        $pw = $koneksi->prepare("UPDATE tbl_customers SET password = ? WHERE id = ?");
        $pw->bind_param('si', $hashed, $id);
        $pw->execute();
    }

    respond_ok(['message' => 'Pelanggan berhasil diperbarui']);
}

// ============ DELETE: hapus pelanggan ============
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $stmt = $koneksi->prepare("DELETE FROM tbl_customers WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        respond_ok(['message' => 'Pelanggan berhasil dihapus']);
    }
    respond_error('Pelanggan tidak ditemukan', 404);
}

http_response_code(405);
echo json_encode(['error' => 'Method tidak diizinkan']);
