<?php
require_once 'conn.php';
require_auth();

// ============ GET: daftar bandwidth ============
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $res = $koneksi->query("SELECT * FROM tbl_bandwidth ORDER BY id DESC");
    respond_ok(['data' => $res->fetch_all(MYSQLI_ASSOC)]);
}

// ============ POST: tambah bandwidth ============
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $p = get_payload();
    $name_bw = trim($p['name_bw'] ?? '');
    $rate_down = (int) ($p['rate_down'] ?? 0);
    $rate_down_unit = in_array($p['rate_down_unit'] ?? '', ['Kbps', 'Mbps']) ? $p['rate_down_unit'] : 'Mbps';
    $rate_up = (int) ($p['rate_up'] ?? 0);
    $rate_up_unit = in_array($p['rate_up_unit'] ?? '', ['Kbps', 'Mbps']) ? $p['rate_up_unit'] : 'Mbps';
    $burst_limit = (int) ($p['burst_limit'] ?? 0);
    $burst_threshold = (int) ($p['burst_threshold'] ?? 0);
    $burst_time = (int) ($p['burst_time'] ?? 0);
    $priority = (int) ($p['priority'] ?? 8);
    $limit_at = (int) ($p['limit_at'] ?? 0);

    if ($name_bw === '' || $rate_down <= 0 || $rate_up <= 0) {
        respond_error('Nama, Rate Down, dan Rate Up wajib diisi');
    }

    $burst = "$burst_limit/$burst_threshold/$burst_time/$priority/$limit_at";

    $stmt = $koneksi->prepare("INSERT INTO tbl_bandwidth (name_bw, rate_down, rate_down_unit, rate_up, rate_up_unit, burst) VALUES (?,?,?,?,?,?)");
    $stmt->bind_param('sisiss', $name_bw, $rate_down, $rate_down_unit, $rate_up, $rate_up_unit, $burst);

    if (!$stmt->execute()) {
        respond_error('Gagal menyimpan: ' . $stmt->error, 500);
    }

    respond_ok(['id' => $koneksi->insert_id, 'message' => 'Bandwidth berhasil ditambahkan']);
}

http_response_code(405);
echo json_encode(['error' => 'Method tidak diizinkan']);
