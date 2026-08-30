<?php
require_once 'conn.php';
require_auth();

// ============ GET: daftar pelanggan ============
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $search = trim($_GET['search'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $ont = isset($_GET['ont']);
    $limit = max(1, min(100, (int) ($_GET['limit'] ?? 10)));
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $offset = ($page - 1) * $limit;

    $where = [];
    $params = [];
    $types = '';

    if ($search !== '') {
        $where[] = "(username LIKE ? OR fullname LIKE ? OR phonenumber LIKE ? OR email LIKE ?)";
        $like = "%$search%";
        $params[] = $like; $params[] = $like; $params[] = $like; $params[] = $like;
        $types .= 'ssss';
    }
    if ($status !== '') {
        $where[] = "status = ?";
        $params[] = $status;
        $types .= 's';
    }
    if ($ont) {
        $where[] = "(ont_pon <> '' AND ont_onu <> '')";
    }

    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $stmt = $koneksi->prepare("SELECT COUNT(*) AS total FROM tbl_customers $whereSql");
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $total = (int) $stmt->get_result()->fetch_assoc()['total'];

    // Ambil transaksi terakhir per customer untuk info paket & masa aktif
    $sql = "SELECT c.*, p.name_plan AS plan_name,
        (SELECT plan_name FROM tbl_transactions t WHERE t.user_id = c.id ORDER BY t.id DESC LIMIT 1) AS last_plan,
        (SELECT expiration FROM tbl_transactions t WHERE t.user_id = c.id ORDER BY t.id DESC LIMIT 1) AS last_expiration,
        (SELECT recharged_on FROM tbl_transactions t WHERE t.user_id = c.id ORDER BY t.id DESC LIMIT 1) AS last_recharge
        FROM tbl_customers c
        LEFT JOIN tbl_plans p ON p.id = c.plan_id
        $whereSql
        ORDER BY c.id DESC
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

// ============ POST: tambah pelanggan ============
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $p = get_payload();

    $username = trim($p['username'] ?? '');
    $password = $p['password'] ?? '';
    $fullname = trim($p['fullname'] ?? '');

    if ($username === '' || $password === '') {
        respond_error('Username dan password wajib diisi');
    }

    // Cek username unik
    $cek = $koneksi->prepare("SELECT id FROM tbl_customers WHERE username = ?");
    $cek->bind_param('s', $username);
    $cek->execute();
    if ($cek->get_result()->num_rows > 0) {
        respond_error('Username sudah digunakan');
    }

    $email = trim($p['email'] ?? '');
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

    $hashed = password_hash($password, PASSWORD_DEFAULT);

    $sql = "INSERT INTO tbl_customers
        (username, password, fullname, email, phonenumber, pppoe_username, pppoe_password, pppoe_ip,
         address, city, district, state, zip, coordinates, ont_pon, ont_onu, account_type, service_type, balance,
         auto_renewal, status, created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";

    $stmt = $koneksi->prepare($sql);
    $created_by = (int) $_SESSION['user_id'];
    $stmt->bind_param(
        str_repeat('s', 18) . 'disi',
        $username, $hashed, $fullname, $email, $phonenumber, $pppoe_username, $pppoe_password, $pppoe_ip,
        $address, $city, $district, $state, $zip, $coordinates, $ont_pon, $ont_onu, $account_type, $service_type, $balance,
        $auto_renewal, $status, $created_by
    );

    if (!$stmt->execute()) {
        respond_error('Gagal menyimpan: ' . $stmt->error, 500);
    }

    // Simpan custom fields jika ada
    $customer_id = $koneksi->insert_id;
    if (!empty($p['custom_fields']) && is_array($p['custom_fields'])) {
        foreach ($p['custom_fields'] as $cf) {
            $fname = trim($cf['name'] ?? '');
            $fval = trim($cf['value'] ?? '');
            if ($fname === '') continue;
            $ins = $koneksi->prepare("INSERT INTO tbl_customers_fields (customer_id, field_name, field_value) VALUES (?,?,?)");
            $ins->bind_param('iss', $customer_id, $fname, $fval);
            $ins->execute();
        }
    }

    respond_ok(['id' => $customer_id, 'message' => 'Pelanggan berhasil ditambahkan']);
}

http_response_code(405);
echo json_encode(['error' => 'Method tidak diizinkan']);
