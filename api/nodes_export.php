<?php
require_once 'conn.php';
require_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method tidak diizinkan']);
    exit;
}

$nodeType = strtoupper(trim($_GET['type'] ?? ''));
if (!in_array($nodeType, ['ODC', 'ODP'], true)) $nodeType = '';

$sql = "SELECT id, node_type, name, coordinates, address, area FROM tbl_nodes";
if ($nodeType !== '') $sql .= " WHERE node_type = '$nodeType'";
$sql .= " ORDER BY node_type ASC, name ASC";

$nodes = $koneksi->query($sql);

$name = $nodeType !== '' ? $nodeType : 'Node';

header('Content-Type: application/vnd.google-earth.kml+xml; charset=UTF-8');
header('Content-Disposition: attachment; filename="' . $name . '_NearBill.kml"');

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<kml xmlns="http://www.opengis.net/kml/2.2">' . "\n";
echo '<Document>' . "\n";
echo '<name>Jaringan ' . $name . ' - NearBill</name>' . "\n";

if ($nodes) {
    while ($n = $nodes->fetch_assoc()) {
        $parts = explode(',', $n['coordinates']);
        if (count($parts) < 2) continue;
        $lat = (float) $parts[0];
        $lng = (float) $parts[1];
        $desc = htmlspecialchars(($n['address'] ?: '') . ($n['area'] ? ' - ' . $n['area'] : ''), ENT_XML1, 'UTF-8');

        echo '<Placemark>' . "\n";
        echo '<name>' . htmlspecialchars($n['name'], ENT_XML1, 'UTF-8') . '</name>' . "\n";
        echo '<description>' . $desc . '</description>' . "\n";
        echo '<Point><coordinates>' . $lng . ',' . $lat . '</coordinates></Point>' . "\n";
        echo '</Placemark>' . "\n";
    }
}

echo '</Document>' . "\n";
echo '</kml>' . "\n";
