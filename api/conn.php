<?php
/**
 * NearBill v2 - Koneksi database & helper API
 * Database: rt_rw (sama dengan nearbill v1)
 */

session_start();

date_default_timezone_set('Asia/Jakarta');

header('Content-Type: application/json');

// CORS: izinkan localhost dev + Vercel (*.vercel.app) untuk deploy
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = false;
if (in_array($origin, ['http://localhost:5173', 'http://127.0.0.1:5173'])) {
    $allowed = true;
} elseif (preg_match('#^https://.*\.vercel\.app$#', $origin)) {
    $allowed = true;
}
if ($allowed) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$koneksi = new mysqli('localhost', 'root', '', 'rt_rw');

if ($koneksi->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Koneksi database gagal']);
    exit;
}

/**
 * Wajib login. Jika belum login -> 401 dan hentikan.
 */
function require_auth()
{
    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Silakan login terlebih dahulu']);
        exit;
    }
    return (int) $_SESSION['user_id'];
}

/**
 * Ambil role sesi berjalan.
 */
function current_role()
{
    return $_SESSION['user_type'] ?? '';
}

const STAFF_TYPES = ['AdminCS', 'Teknisi', 'AdminGM', 'Report', 'Agent', 'Sales'];

/**
 * Cek apakah sesi berjalan adalah staf (bukan customer).
 */
function is_staff()
{
    return in_array(current_role(), STAFF_TYPES, true);
}

/**
 * Wajib salah satu role dari daftar. Jika tidak -> 403.
 */
function require_role(array $roles)
{
    if (!in_array(current_role(), $roles, true)) {
        http_response_code(403);
        echo json_encode(['error' => 'Akses ditolak']);
        exit;
    }
}

/**
 * Ambil payload JSON / POST.
 */
function get_payload()
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $_POST;
}

/**
 * Format angka Rupiah.
 */
function rupiah($angka)
{
    return number_format((float) $angka, 0, ',', '.');
}

/**
 * Helper response sukses.
 */
function respond_ok($data)
{
    echo json_encode($data);
    exit;
}

function respond_error($message, $code = 400)
{
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit;
}
