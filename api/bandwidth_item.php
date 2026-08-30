<?php
require_once 'conn.php';
require_auth();

$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) respond_error('ID tidak valid');

// ============ GET: detail bandwidth ============
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $koneksi->prepare("SELECT * FROM tbl_bandwidth WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $bw = $stmt->get_result()->fetch_assoc();
    if (!$bw) respond_error('Bandwidth tidak ditemukan', 404);

    // Parse kolom burst (burst_limit/burst_threshold/burst_time/priority/limit_at)
    $parts = explode('/', $bw['burst']);
    $bw['burst_limit'] = $parts[0] ?? '';
    $bw['burst_threshold'] = $parts[1] ?? '';
    $bw['burst_time'] = $parts[2] ?? '';
    $bw['priority'] = $parts[3] ?? '8';
    $bw['limit_at'] = $parts[4] ?? '';

    respond_ok(['bandwidth' => $bw]);
}

// ============ POST action=update: update bandwidth ============
if ($_SERVER['REQUEST_METHOD'] === 'POST' && (($_GET['action'] ?? '') === 'update')) {
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

    $stmt = $koneksi->prepare("UPDATE tbl_bandwidth SET name_bw=?, rate_down=?, rate_down_unit=?, rate_up=?, rate_up_unit=?, burst=? WHERE id=?");
    $stmt->bind_param('sisissi', $name_bw, $rate_down, $rate_down_unit, $rate_up, $rate_up_unit, $burst, $id);

    if (!$stmt->execute()) {
        respond_error('Gagal menyimpan: ' . $stmt->error, 500);
    }

    respond_ok(['message' => 'Bandwidth berhasil diperbarui']);
}

// ============ DELETE: hapus bandwidth ============
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $stmt = $koneksi->prepare("DELETE FROM tbl_bandwidth WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        respond_ok(['message' => 'Bandwidth berhasil dihapus']);
    }
    respond_error('Bandwidth tidak ditemukan', 404);
}

http_response_code(405);
echo json_encode(['error' => 'Method tidak diizinkan']);
