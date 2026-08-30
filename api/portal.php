<?php
require_once 'conn.php';
require_auth();

if (current_role() !== 'customer') {
    respond_error('Khusus akun pelanggan', 403);
}

$id = (int) $_SESSION['user_id'];

$stmt = $koneksi->prepare("SELECT * FROM tbl_customers WHERE id = ?");
$stmt->bind_param('i', $id);
$stmt->execute();
$cust = $stmt->get_result()->fetch_assoc();

if (!$cust) respond_error('Pelanggan tidak ditemukan', 404);

// Data pelanggan yang aman (tanpa password)
$customer = [
    'id' => (int) $cust['id'],
    'username' => $cust['username'],
    'fullname' => $cust['fullname'],
    'phonenumber' => $cust['phonenumber'],
    'email' => $cust['email'],
    'address' => $cust['address'],
    'city' => $cust['city'],
    'district' => $cust['district'],
    'account_type' => $cust['account_type'],
    'service_type' => $cust['service_type'],
    'pppoe_username' => $cust['pppoe_username'],
    'pppoe_ip' => $cust['pppoe_ip'],
    'balance' => (float) $cust['balance'],
    'auto_renewal' => (int) $cust['auto_renewal'],
    'status' => $cust['status'],
    'ont_pon' => $cust['ont_pon'],
    'ont_onu' => $cust['ont_onu'],
    'coordinates' => $cust['coordinates'],
    'created_at' => $cust['created_at']
];

// Paket saat ini (dari plan_id)
$plan = null;
if (!empty($cust['plan_id'])) {
    $stmt = $koneksi->prepare("SELECT p.id, p.name_plan, p.price, p.type, p.validity, p.validity_unit,
        b.name_bw, b.rate_down, b.rate_down_unit, b.rate_up, b.rate_up_unit
        FROM tbl_plans p
        LEFT JOIN tbl_bandwidth b ON b.id = p.id_bw
        WHERE p.id = ?");
    $stmt->bind_param('i', $cust['plan_id']);
    $stmt->execute();
    $plan = $stmt->get_result()->fetch_assoc();
    if ($plan) $plan['price'] = (float) $plan['price'];
}

// Transaksi & masa aktif terakhir
$trx = $koneksi->prepare("SELECT * FROM tbl_transactions WHERE user_id = ? ORDER BY id DESC LIMIT 10");
$trx->bind_param('i', $id);
$trx->execute();
$transactions = $trx->get_result()->fetch_all(MYSQLI_ASSOC);

$last = $transactions[0] ?? null;
$active_until = $last ? $last['expiration'] : null;

$days_left = null;
if ($active_until) {
    $now = strtotime(date('Y-m-d'));
    $exp = strtotime($active_until);
    $days_left = (int) floor(($exp - $now) / 86400);
}

// Total terbayar bulan berjalan
$monthlyPaid = $koneksi->prepare("SELECT IFNULL(SUM(price),0) AS total FROM tbl_transactions
    WHERE user_id = ? AND recharged_on BETWEEN DATE_FORMAT(CURDATE(), '%Y-%m-01') AND LAST_DAY(CURDATE())");
$monthlyPaid->bind_param('i', $id);
$monthlyPaid->execute();
$paidThisMonth = (float) $monthlyPaid->get_result()->fetch_assoc()['total'];

respond_ok([
    'customer' => $customer,
    'plan' => $plan,
    'last' => $last,
    'active_until' => $active_until,
    'days_left' => $days_left,
    'paid_this_month' => $paidThisMonth,
    'transactions' => $transactions
]);
