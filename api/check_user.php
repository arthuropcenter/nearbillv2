<?php
require_once 'conn.php';

$username = trim($_GET['username'] ?? '');
if ($username === '') {
    respond_ok(['found' => false]);
}

// 1. Cek akun staf (tbl_users)
$stmt = $koneksi->prepare("SELECT id, username, fullname, user_type, status FROM tbl_users WHERE username = ?");
$stmt->bind_param('s', $username);
$stmt->execute();
$staff = $stmt->get_result()->fetch_assoc();

if ($staff) {
    respond_ok([
        'found' => true,
        'source' => 'staff',
        'id' => (int) $staff['id'],
        'username' => $staff['username'],
        'fullname' => $staff['fullname'],
        'role' => $staff['user_type'],
        'active' => $staff['status'] === 'Active'
    ]);
}

// 2. Cek akun customer (tbl_customers) - cocok dengan kredensial PPPoE
$stmt = $koneksi->prepare("SELECT id, username, fullname, status FROM tbl_customers WHERE pppoe_username = ?");
$stmt->bind_param('s', $username);
$stmt->execute();
$cust = $stmt->get_result()->fetch_assoc();

if ($cust) {
    respond_ok([
        'found' => true,
        'source' => 'customer',
        'id' => (int) $cust['id'],
        'username' => $cust['username'],
        'fullname' => $cust['fullname'],
        'role' => 'customer',
        'active' => $cust['status'] === 'Active'
    ]);
}

respond_ok(['found' => false]);
