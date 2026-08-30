<?php
require_once 'conn.php';
require_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method tidak diizinkan']);
    exit;
}

if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    respond_error('File KML/KMZ gagal diunggah');
}

$file = $_FILES['file'];
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

// ============ Ambil isi XML (KML langsung / KMZ via tar) ============
function kmz_to_kml_path($file)
{
    $dir = sys_get_temp_dir() . '/kmz_' . uniqid('', true);
    if (!mkdir($dir, 0700, true)) return false;
    $cmd = 'tar -xf ' . escapeshellarg($file) . ' -C ' . escapeshellarg($dir);
    exec($cmd . ' 2>&1', $out, $code);
    if ($code !== 0) return false;

    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir));
    foreach ($it as $f) {
        if ($f->isFile() && strtolower($f->getExtension()) === 'kml') {
            return $f->getPathname();
        }
    }
    return false;
}

if ($ext === 'kmz') {
    $kmlPath = kmz_to_kml_path($file['tmp_name']);
    if (!$kmlPath) respond_error('KMZ tidak valid atau tidak berisi file KML');
    $xml = file_get_contents($kmlPath);
} elseif ($ext === 'kml') {
    $xml = file_get_contents($file['tmp_name']);
} else {
    respond_error('Format harus .kml atau .kmz');
}

if ($xml === false || trim($xml) === '') {
    respond_error('Isi file kosong atau tidak terbaca');
}

// ============ Parse KML ============
$dom = new DOMDocument();
if (!@$dom->loadXML($xml, LIBXML_NOCDATA)) {
    respond_error('File KML tidak valid');
}

$xpath = new DOMXPath($dom);
$places = $xpath->query('//*[local-name()="Placemark"]');
if ($places->length === 0) {
    respond_error('Tidak ada Placemark (titik) yang ditemukan di file ini');
}

function node_text($el, $name)
{
    $n = $el->getElementsByTagName($name);
    if ($n->length === 0) $n = $el->getElementsByTagNameNS('*', $name);
    if ($n->length === 0) return '';
    return trim($n->item(0)->textContent);
}

$defaultType = strtoupper(trim($_POST['node_type'] ?? ''));
if (!in_array($defaultType, ['ODC', 'ODP', 'PELANGGAN'], true)) $defaultType = '';
if ($defaultType === 'PELANGGAN') $defaultType = 'Pelanggan';

$toImport = [];
foreach ($places as $el) {
    $name = node_text($el, 'name');
    $coordsRaw = node_text($el, 'coordinates');
    if ($coordsRaw === '') continue;

    $parts = preg_split('/[\s,]+/', trim($coordsRaw));
    $nums = [];
    foreach ($parts as $p) {
        if ($p === '' || !is_numeric($p)) continue;
        $nums[] = (float) $p;
    }
    if (count($nums) < 2) continue;

    $lng = $nums[0];
    $lat = $nums[1];
    if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) continue;
    $coords = round($lat, 6) . ',' . round($lng, 6);

    if ($name === '') {
        $name = ($defaultType ?: 'ODP') . ' ' . (count($toImport) + 1);
    }

    $type = $defaultType;
    if ($type === '') {
        if (stripos($name, 'odc') !== false) $type = 'ODC';
        elseif (stripos($name, 'odp') !== false) $type = 'ODP';
        elseif (stripos($name, 'pelanggan') !== false || stripos($name, 'customer') !== false || stripos($name, 'user') !== false) $type = 'Pelanggan';
        else $type = 'ODP';
    }

    $address = node_text($el, 'description');
    if (strlen($address) > 255) $address = substr($address, 0, 255);

    $toImport[] = [
        'name' => $name,
        'type' => $type,
        'coords' => $coords,
        'address' => $address,
    ];
}

if (empty($toImport)) {
    respond_error('Tidak ada titik berkordinat yang valid di file ini');
}

// ============ Simpan (upsert berdasarkan nama) ============
$inserted = 0;
$updated = 0;
$check = $koneksi->prepare("SELECT id FROM tbl_nodes WHERE name = ?");
$ins = $koneksi->prepare("INSERT INTO tbl_nodes (node_type, name, coordinates, address) VALUES (?,?,?,?)");
$upd = $koneksi->prepare("UPDATE tbl_nodes SET node_type=?, coordinates=?, address=? WHERE id=?");

foreach ($toImport as $row) {
    $check->bind_param('s', $row['name']);
    $check->execute();
    $existing = $check->get_result()->fetch_assoc();

    if ($existing) {
        $upd->bind_param('sssi', $row['type'], $row['coords'], $row['address'], $existing['id']);
        if ($upd->execute()) $updated++;
    } else {
        $ins->bind_param('ssss', $row['type'], $row['name'], $row['coords'], $row['address']);
        if ($ins->execute()) $inserted++;
    }
}

respond_ok([
    'message' => "Import selesai: $inserted node baru, $updated node diperbarui",
    'inserted' => $inserted,
    'updated' => $updated,
]);
