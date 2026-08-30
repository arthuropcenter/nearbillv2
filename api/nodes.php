<?php
require_once 'conn.php';
require_auth();

/**
 * Normalisasi koordinat "lat, lng" dari berbagai format.
 * Kembalikan string "lat,lng" (2 desimal) atau '' bila tidak valid.
 */
function normalize_coordinates($raw)
{
    $raw = trim((string) $raw);
    if ($raw === '') return '';
    $parts = preg_split('/[,\s]+/', $raw);
    $nums = [];
    foreach ($parts as $p) {
        if ($p === '') continue;
        if (is_numeric($p)) $nums[] = (float) $p;
    }
    if (count($nums) < 2) return '';
    $lat = $nums[0];
    $lng = $nums[1];
    if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) return '';
    return round($lat, 6) . ',' . round($lng, 6);
}

// ============ GET: daftar node + customer berkoordinat ============
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $nodes = $koneksi->query("SELECT * FROM tbl_nodes ORDER BY node_type ASC, name ASC")->fetch_all(MYSQLI_ASSOC);

    $customers = $koneksi
        ->query("SELECT id, username, fullname, coordinates, status FROM tbl_customers WHERE coordinates IS NOT NULL AND coordinates != ''")
        ->fetch_all(MYSQLI_ASSOC);

    foreach ($customers as &$c) {
        $c['coordinates'] = normalize_coordinates($c['coordinates']);
        $c['fullname'] = $c['fullname'] ?: $c['username'];
    }
    unset($c);

    respond_ok(['nodes' => $nodes, 'customers' => $customers]);
}

// ============ POST: tambah node ============
if ($_SERVER['REQUEST_METHOD'] === 'POST' && (($_GET['action'] ?? '') !== 'update')) {
    $p = get_payload();
    $node_type = in_array($p['node_type'] ?? '', ['ODC', 'ODP', 'Pelanggan']) ? $p['node_type'] : 'ODP';
    $name = trim($p['name'] ?? '');
    $coordinates = normalize_coordinates($p['coordinates'] ?? '');
    $address = trim($p['address'] ?? '');
    $area = trim($p['area'] ?? '');
    $description = trim($p['description'] ?? '');

    if ($name === '') respond_error('Nama node wajib diisi');
    if ($coordinates === '') respond_error('Koordinat tidak valid (contoh: -6.200000, 106.816666)');

    $stmt = $koneksi->prepare("INSERT INTO tbl_nodes (node_type, name, coordinates, address, area, description) VALUES (?,?,?,?,?,?)");
    $stmt->bind_param('ssssss', $node_type, $name, $coordinates, $address, $area, $description);

    if (!$stmt->execute()) {
        respond_error('Gagal menyimpan: ' . $stmt->error, 500);
    }

    respond_ok(['id' => $koneksi->insert_id, 'message' => 'Node berhasil ditambahkan']);
}

// ============ POST action=update: update node ============
if ($_SERVER['REQUEST_METHOD'] === 'POST' && (($_GET['action'] ?? '') === 'update')) {
    $id = (int) ($_GET['id'] ?? 0);
    if ($id <= 0) respond_error('ID tidak valid');

    $p = get_payload();
    $node_type = in_array($p['node_type'] ?? '', ['ODC', 'ODP', 'Pelanggan']) ? $p['node_type'] : 'ODP';
    $name = trim($p['name'] ?? '');
    $coordinates = normalize_coordinates($p['coordinates'] ?? '');
    $address = trim($p['address'] ?? '');
    $area = trim($p['area'] ?? '');
    $description = trim($p['description'] ?? '');

    if ($name === '') respond_error('Nama node wajib diisi');
    if ($coordinates === '') respond_error('Koordinat tidak valid (contoh: -6.200000, 106.816666)');

    $stmt = $koneksi->prepare("UPDATE tbl_nodes SET node_type=?, name=?, coordinates=?, address=?, area=?, description=? WHERE id=?");
    $stmt->bind_param('ssssssi', $node_type, $name, $coordinates, $address, $area, $description, $id);

    if (!$stmt->execute()) {
        respond_error('Gagal menyimpan: ' . $stmt->error, 500);
    }

    respond_ok(['message' => 'Node berhasil diperbarui']);
}

// ============ DELETE: hapus node ============
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if ($id <= 0) respond_error('ID tidak valid');

    $stmt = $koneksi->prepare("DELETE FROM tbl_nodes WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        respond_ok(['message' => 'Node berhasil dihapus']);
    }
    respond_error('Node tidak ditemukan', 404);
}

http_response_code(405);
echo json_encode(['error' => 'Method tidak diizinkan']);
