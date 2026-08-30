<?php
/**
 * NearBill v2 - Enkripsi password router
 * Password di DB tidak disimpan plaintext, tapi dienkripsi AES-256-CBC.
 * Kunci disimpan di luar webroot (C:\xampp\nearbill_secret.php).
 */

define('NEARBILL_SECRET_FILE', 'C:\\xampp\\nearbill_secret.php');

function nearbill_secret_key()
{
    if (file_exists(NEARBILL_SECRET_FILE)) {
        require_once NEARBILL_SECRET_FILE;
        if (defined('NEARBILL_SECRET_KEY') && NEARBILL_SECRET_KEY) {
            return NEARBILL_SECRET_KEY;
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
