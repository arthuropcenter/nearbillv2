<?php
/**
 * NearBill v2 - Enkripsi password router
 * Password di DB tidak disimpan plaintext, tapi dienkripsi AES-256-CBC.
 * Kunci disimpan di luar webroot (<xampp>\nearbill_secret.php).
 * Lokasi XAMPP dideteksi otomatis agar support G:\xampp maupun C:\xampp.
 */

define('NEARBILL_SECRET_FILE', dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . 'nearbill_secret.php');
define('NEARBILL_SECRET_FILE_LEGACY', 'C:\\xampp\\nearbill_secret.php');

function nearbill_secret_key()
{
    // Migrasi dari path lama C:\xampp jika instalasi sekarang di G:\xampp
    foreach ([NEARBILL_SECRET_FILE, NEARBILL_SECRET_FILE_LEGACY] as $f) {
        if ($f && file_exists($f)) {
            require_once $f;
            if (defined('NEARBILL_SECRET_KEY') && NEARBILL_SECRET_KEY) {
                // Jika terbaca dari legacy tapi file utama belum ada, salin ke lokasi baru
                if ($f !== NEARBILL_SECRET_FILE && !file_exists(NEARBILL_SECRET_FILE)) {
                    @copy($f, NEARBILL_SECRET_FILE);
                }
                return NEARBILL_SECRET_KEY;
            }
        }
    }
    $key = bin2hex(random_bytes(32));
    $code = "<?php\n// Jangan dihapus - kunci enkripsi password router NearBill\ndefine('NEARBILL_SECRET_KEY', '" . $key . "');\n";
    file_put_contents(NEARBILL_SECRET_FILE, $code);
    return $key;
}

function encrypt_router_password($plain)
{
    $key = nearbill_secret_key();
    $iv = random_bytes(16);
    $cipher = openssl_encrypt($plain, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);
    return 'enc:' . base64_encode($iv . $cipher);
}

function decrypt_router_password($stored)
{
    if (!is_string($stored) || strpos($stored, 'enc:') !== 0) {
        return $stored;
    }
    $key = nearbill_secret_key();
    $raw = base64_decode(substr($stored, 4));
    if ($raw === false || strlen($raw) < 17) {
        return '';
    }
    $iv = substr($raw, 0, 16);
    $cipher = substr($raw, 16);
    return openssl_decrypt($cipher, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);
}
