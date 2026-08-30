<?php
require_once 'conn.php';
require_auth();

$router = trim($_GET['router'] ?? '');
$plan = trim($_GET['plan'] ?? '');
$search = trim($_GET['search'] ?? '');
$limit = max(1, min(100, (int) ($_GET['limit'] ?? 10)));
$page = max(1, (int) ($_GET['page'] ?? 1));
$offset = ($page - 1) * $limit;

$where = ["t.expiration >= CURDATE()"];
$params = [];
$types = '';

if ($router !== '') {
    $where[] = "t.routers = ?";
    $params[] = $router;
    $types .= 's';
}
if ($plan !== '') {
    $where[] = "t.plan_name = ?";
    $params[] = $plan;
    $types .= 's';
}
if ($search !== '') {
    $where[] = "(t.username LIKE ? OR c.fullname LIKE ? OR c.phonenumber LIKE ?)";
    $like = "%$search%";
    $params[] = $like; $params[] = $like; $params[] = $like;
    $types .= 'sss';
}

$whereSql = 'WHERE ' . implode(' AND ', $where);

$stmt = $koneksi->prepare("SELECT COUNT(*) AS total FROM tbl_transactions t LEFT JOIN tbl_customers c ON c.id = t.user_id $whereSql");
if ($types) $stmt->bind_param($types, ...$params);
$stmt->execute();
$total = (int) $stmt->get_result()->fetch_assoc()['total'];

$sql = "SELECT t.id, t.username, t.user_id, t.plan_name, t.price, t.type, t.recharged_on, t.recharged_time,
        t.expiration, t.method, t.routers, c.fullname, c.phonenumber, c.service_type
        FROM tbl_transactions t
        LEFT JOIN tbl_customers c ON c.id = t.user_id
        $whereSql
        ORDER BY t.expiration ASC
        LIMIT $limit OFFSET $offset";

$stmt = $koneksi->prepare($sql);
if ($types) $stmt->bind_param($types, ...$params);
$stmt->execute();
$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

// Opsi filter
$routers = [];
$r = $koneksi->query("SELECT DISTINCT routers FROM tbl_transactions WHERE routers != ''");
while ($row = $r->fetch_assoc()) $routers[] = $row['routers'];

$plans = [];
$p = $koneksi->query("SELECT DISTINCT plan_name FROM tbl_transactions WHERE plan_name != ''");
while ($row = $p->fetch_assoc()) $plans[] = $row['plan_name'];

respond_ok([
    'data' => $rows,
    'total' => $total,
    'page' => $page,
    'limit' => $limit,
    'pages' => max(1, (int) ceil($total / $limit)),
    'filters' => ['routers' => $routers, 'plans' => $plans]
]);
