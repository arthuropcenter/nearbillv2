<?php
require_once 'conn.php';
require_auth();

$now = date('Y-m-d');

// Pemasukan = buku keuangan (tbl_fin_income) + transaksi Mikhnon/router
// (kecuali tipe Balance, karena input manual/verifikasi sudah masuk fin_income)
function income_on_date($koneksi, $date)
{
    $fin = (float) $koneksi->query("SELECT IFNULL(SUM(amount),0) AS total FROM tbl_fin_income WHERE pay_date = '$date'")->fetch_assoc()['total'];
    $trx = (float) $koneksi->query("SELECT IFNULL(SUM(price),0) AS total FROM tbl_transactions WHERE recharged_on = '$date' AND type <> 'Balance'")->fetch_assoc()['total'];
    return $fin + $trx;
}

$today = income_on_date($koneksi, $now);
$yesterday_date = date('Y-m-d', strtotime('-1 day'));
$yesterday = income_on_date($koneksi, $yesterday_date);

$todayPercent = $yesterday > 0 ? round((($today - $yesterday) / $yesterday) * 100, 2) : 0;

// Income 7 hari
$income7 = [];
for ($i = 6; $i >= 0; $i--) {
    $d = date('Y-m-d', strtotime("-$i days"));
    $income7['labels'][] = date('d M', strtotime($d));
    $income7['values'][$d] = 0;
}
$res = $koneksi->query("SELECT pay_date, IFNULL(SUM(amount),0) AS total FROM tbl_fin_income WHERE pay_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY pay_date");
while ($row = $res->fetch_assoc()) {
    if (isset($income7['values'][$row['pay_date']])) {
        $income7['values'][$row['pay_date']] = (float) $row['total'];
    }
}
$res = $koneksi->query("SELECT recharged_on, IFNULL(SUM(price),0) AS total FROM tbl_transactions WHERE type <> 'Balance' AND recharged_on >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY recharged_on");
while ($row = $res->fetch_assoc()) {
    if (isset($income7['values'][$row['recharged_on']])) {
        $income7['values'][$row['recharged_on']] += (float) $row['total'];
    }
}
$income7['values'] = array_values($income7['values']);

// Income bulan ini & bulan lalu
$currentMonth = date('Y-m');
$lastMonth = date('Y-m', strtotime('first day of last month'));
$monthly = [$lastMonth => 0, $currentMonth => 0];
$res = $koneksi->query("SELECT DATE_FORMAT(pay_date, '%Y-%m') AS bulan, IFNULL(SUM(amount),0) AS total FROM tbl_fin_income WHERE DATE_FORMAT(pay_date, '%Y-%m') IN ('$currentMonth','$lastMonth') GROUP BY bulan");
while ($row = $res->fetch_assoc()) {
    $monthly[$row['bulan']] = (float) $row['total'];
}
$res = $koneksi->query("SELECT DATE_FORMAT(recharged_on, '%Y-%m') AS bulan, IFNULL(SUM(price),0) AS total FROM tbl_transactions WHERE type <> 'Balance' AND DATE_FORMAT(recharged_on, '%Y-%m') IN ('$currentMonth','$lastMonth') GROUP BY bulan");
while ($row = $res->fetch_assoc()) {
    $monthly[$row['bulan']] += (float) $row['total'];
}
$monthIncome = $monthly[$currentMonth];
$monthPercent = $monthly[$lastMonth] > 0 ? round((($monthly[$currentMonth] - $monthly[$lastMonth]) / $monthly[$lastMonth]) * 100, 2) : 0;

// Customer per bulan
$customersByMonth = ['labels' => [], 'values' => []];
$res = $koneksi->query("SELECT MONTH(created_at) AS bln, COUNT(*) AS total FROM tbl_customers GROUP BY MONTH(created_at) ORDER BY bln");
$cm = [];
while ($row = $res->fetch_assoc()) {
    $cm[(int) $row['bln']] = (int) $row['total'];
}
$namaBulan = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
for ($b = 1; $b <= 12; $b++) {
    $customersByMonth['labels'][] = $namaBulan[$b];
    $customersByMonth['values'][] = $cm[$b] ?? 0;
}

// Revenue per tahun (current vs previous)
$current_year = (int) date('Y');
$previous_year = $current_year - 1;
$revenues = [$current_year => 0, $previous_year => 0];
$res = $koneksi->query("SELECT YEAR(pay_date) AS thn, IFNULL(SUM(amount),0) AS total FROM tbl_fin_income WHERE YEAR(pay_date) IN ($current_year, $previous_year) GROUP BY thn");
while ($row = $res->fetch_assoc()) {
    $revenues[(int) $row['thn']] = (float) $row['total'];
}
$res = $koneksi->query("SELECT YEAR(recharged_on) AS thn, IFNULL(SUM(price),0) AS total FROM tbl_transactions WHERE type <> 'Balance' AND YEAR(recharged_on) IN ($current_year, $previous_year) GROUP BY thn");
while ($row = $res->fetch_assoc()) {
    $revenues[(int) $row['thn']] += (float) $row['total'];
}
$growth = $revenues[$previous_year] > 0 ? round((($revenues[$current_year] - $revenues[$previous_year]) / $revenues[$previous_year]) * 100, 2) : ($revenues[$current_year] > 0 ? 100 : 0);

// Pelanggan aktif / tidak aktif (berdasarkan status pelanggan, bukan transaksi)
$activeCustomers = (int) $koneksi->query("SELECT COUNT(*) AS total FROM tbl_customers WHERE status = 'Active'")->fetch_assoc()['total'];
$inactiveCustomers = (int) $koneksi->query("SELECT COUNT(*) AS total FROM tbl_customers WHERE status <> 'Active'")->fetch_assoc()['total'];
$totalCustomers = (int) $koneksi->query("SELECT COUNT(*) AS total FROM tbl_customers")->fetch_assoc()['total'];

// Status customer monitoring
$userMonitoring = ['active' => 0, 'expired' => 0, 'inactive' => 0, 'banned' => 0, 'limited' => 0];
$res = $koneksi->query("SELECT status, COUNT(*) AS total FROM tbl_customers GROUP BY status");
while ($row = $res->fetch_assoc()) {
    $key = strtolower($row['status']);
    if (isset($userMonitoring[$key])) {
        $userMonitoring[$key] = (int) $row['total'];
    }
}

// Order statistik per plan (transaksi)
$orderStats = ['plans' => [], 'values' => [], 'total' => 0];
$res = $koneksi->query("SELECT plan_name, COUNT(*) AS total FROM tbl_transactions GROUP BY plan_name ORDER BY total DESC");
while ($row = $res->fetch_assoc()) {
    $orderStats['plans'][] = $row['plan_name'];
    $orderStats['values'][] = (int) $row['total'];
    $orderStats['total'] += (int) $row['total'];
}

// Pelanggan per paket (berdasarkan plan_id pelanggan yang tersinkron dari router)
$planStats = ['plans' => [], 'values' => [], 'total' => 0];
$res = $koneksi->query(
    "SELECT COALESCE(p.name_plan, 'Tanpa Paket') AS nama, COUNT(c.id) AS total
     FROM tbl_customers c
     LEFT JOIN tbl_plans p ON p.id = c.plan_id
     GROUP BY p.name_plan, p.id
     ORDER BY total DESC"
);
while ($row = $res->fetch_assoc()) {
    $planStats['plans'][] = $row['nama'];
    $planStats['values'][] = (int) $row['total'];
    $planStats['total'] += (int) $row['total'];
}

// Daftar router untuk dropdown + statistik router pertama
$routers = [];
$res = $koneksi->query("SELECT id, name, ip_address, status FROM tbl_routers WHERE enabled = 1");
while ($row = $res->fetch_assoc()) {
    $routers[] = $row;
}

respond_ok([
    'incomeToday' => (float) $today,
    'incomeTodayPercent' => $todayPercent,
    'income7days' => $income7,
    'monthIncome' => (float) $monthIncome,
    'monthIncomePercent' => $monthPercent,
    'customersByMonth' => $customersByMonth,
    'revenueByYear' => [
        'currentYear' => $current_year,
        'previousYear' => $previous_year,
        'current' => $revenues[$current_year],
        'previous' => $revenues[$previous_year],
        'growth' => $growth
    ],
    'activeCustomers' => $activeCustomers,
    'inactiveCustomers' => $inactiveCustomers,
    'totalCustomers' => $totalCustomers,
    'userMonitoring' => $userMonitoring,
    'orderStats' => $orderStats,
    'planStats' => $planStats,
    'routers' => $routers,
    'user' => [
        'id' => (int) $_SESSION['user_id'],
        'username' => $_SESSION['username'] ?? '',
        'user_type' => $_SESSION['user_type'] ?? ''
    ]
]);
