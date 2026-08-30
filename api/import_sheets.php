<?php
/**
 * NearBill v2 - Import data keuangan dari export Google Sheets (_import/*.csv)
 *
 * Jalankan via CLI:  php api/import_sheets.php [--reset]
 * atau via web (AdminGM):  /nearbillv2/api/import_sheets.php?reset=1
 *
 * File yang dibaca (di folder _import):
 *  - Master_Kategori.csv  -> tbl_expense_categories
 *  - Pengeluaran.csv      -> tbl_expenses
 *  - Tagihan.csv          -> tbl_bills
 *  - Pembayaran.csv       -> tbl_fin_income (kembalian -> tbl_expenses)
 */

if (PHP_SAPI === 'cli') {
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $_SERVER['HTTP_ORIGIN'] = '';
}

require_once __DIR__ . '/conn.php';

$is_cli = PHP_SAPI === 'cli';

if (!$is_cli) {
    require_auth();
    require_role(['AdminGM']);
}

$reset = $is_cli ? in_array('--reset', $argv, true) : (($_GET['reset'] ?? '') === '1');

$bulan_id = [
    'jan' => 1, 'feb' => 2, 'mar' => 3, 'apr' => 4, 'mei' => 5, 'jun' => 6,
    'jul' => 7, 'ags' => 8, 'agu' => 8, 'sep' => 9, 'okt' => 10, 'nov' => 11, 'des' => 12
];

function clean_num($s)
{
    if ($s === null || $s === '') return null;
    $s = preg_replace('/[^\d.,]/', '', (string) $s);
    if ($s === '' || $s === '.' || $s === ',') return null;
    if (strpos($s, ',') !== false && preg_match('/\.\d{2}$/', $s)) {
        $s = str_replace(',', '', $s); // 130,000.00 -> 130000.00
    } else {
        $s = str_replace(',', '', $s); // koma sebagai pemisah ribuan
    }
    return (float) $s;
}

function norm_date($s)
{
    global $bulan_id;
    if (!$s) return null;
    $s = trim($s);
    if (preg_match('/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/', $s, $m)) {
        $mm = $bulan_id[strtolower($m[2])] ?? null;
        if ($mm) {
            $yyyy = (int) $m[3] < 100 ? 2000 + (int) $m[3] : (int) $m[3];
            return sprintf('%04d-%02d-%02d', $yyyy, $mm, (int) $m[1]);
        }
    }
    if (preg_match('#^(\d{1,2})/(\d{1,2})/(\d{2,4})$#', $s, $m)) {
        $a = (int) $m[1];
        $b = (int) $m[2];
        $yyyy = (int) $m[3] < 100 ? 2000 + (int) $m[3] : (int) $m[3];
        if ($b > 12) return sprintf('%04d-%02d-%02d', $yyyy, $a, $b);   // M/D/YYYY
        if ($a > 12) return sprintf('%04d-%02d-%02d', $yyyy, $b, $a);   // D/M/YYYY
        return sprintf('%04d-%02d-%02d', $yyyy, $b, $a);                // ambigu -> DD/MM/YYYY
    }
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) return $s;
    $ts = strtotime($s);
    return $ts ? date('Y-m-d', $ts) : null;
}

function norm_method($s)
{
    $s = trim((string) $s);
    if ($s === '') return null;
    if (stripos($s, 'transfer') !== false || stripos($s, 'trans') !== false) return 'Transfer';
    if (stripos($s, 'cash') !== false) return 'Cash';
    if (stripos($s, 'edc') !== false) return 'EDC';
    return $s;
}

function parse_period($s)
{
    if (!$s) return [null, null];
    if (preg_match('#^(\d{1,2})/(\d{2,4})$#', trim($s), $m)) {
        $mm = (int) $m[1];
        $yy = (int) $m[2];
        if ($yy < 100) $yy += 2000;
        if ($mm >= 1 && $mm <= 12) return [$mm, $yy];
    }
    return [null, null];
}

function bill_period_from_no($billNo)
{
    if (preg_match('/INV-(\d{4})(\d{2})/', (string) $billNo, $m)) {
        return [(int) $m[2], (int) $m[1]];
    }
    return [null, null];
}

function read_csv($path)
{
    $rows = [];
    $h = fopen($path, 'r');
    if (!$h) return null;
    $first = true;
    while (($r = fgetcsv($h)) !== false) {
        if ($first) { $first = false; continue; }
        if (count(array_filter($r, fn($v) => trim((string) $v) !== '')) === 0) continue;
        $rows[] = $r;
    }
    fclose($h);
    return $rows;
}

$dir = __DIR__ . '/../_import';
$summary = ['categories' => 0, 'expenses' => 0, 'bills' => 0, 'income' => 0, 'refunds' => 0, 'skipped' => 0, 'errors' => []];

if ($reset) {
    $koneksi->query('DELETE FROM tbl_expenses');
    $koneksi->query('DELETE FROM tbl_bills');
    $koneksi->query('DELETE FROM tbl_fin_income');
    $koneksi->query('DELETE FROM tbl_expense_categories');
    $summary['errors'][] = 'reset: tabel keuangan dikosongkan';
}

$koneksi->begin_transaction();
try {
    $cats = [];
    $res = $koneksi->query('SELECT id, name FROM tbl_expense_categories');
    while ($row = $res->fetch_assoc()) $cats[$row['name']] = (int) $row['id'];

    $ensureCat = function ($name, $type = 'Lainnya') use (&$cats, $koneksi) {
        $name = trim((string) $name);
        if ($name === '') return null;
        $name = mb_convert_case($name, MB_CASE_TITLE, 'UTF-8');
        if (isset($cats[$name])) return $cats[$name];
        $type = in_array($type, ['Operasional', 'Lainnya'], true) ? $type : 'Lainnya';
        $koneksi->prepare('INSERT INTO tbl_expense_categories (name, type) VALUES (?, ?)')->execute([$name, $type]);
        $cats[$name] = (int) $koneksi->insert_id;
        return $cats[$name];
    };

    $stmtExp = $koneksi->prepare('INSERT INTO tbl_expenses (ref_no, expense_date, category_id, description, amount, method, paid_to, expense_type, created_by) VALUES (?,?,?,?,?,?,?,?,?)');
    $stmtBill = $koneksi->prepare('INSERT INTO tbl_bills (bill_no, customer_ref, customer_name, plan_ref, plan_name, period_month, period_year, amount, status, bill_date, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE customer_ref=VALUES(customer_ref), customer_name=VALUES(customer_name), plan_ref=VALUES(plan_ref), plan_name=VALUES(plan_name), period_month=VALUES(period_month), period_year=VALUES(period_year), amount=VALUES(amount), status=VALUES(status), bill_date=VALUES(bill_date)');
    $stmtInc = $koneksi->prepare('INSERT INTO tbl_fin_income (pay_no, bill_no, customer_ref, customer_name, pay_date, method, amount, note, created_by) VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE bill_no=VALUES(bill_no), customer_ref=VALUES(customer_ref), customer_name=VALUES(customer_name), pay_date=VALUES(pay_date), method=VALUES(method), amount=VALUES(amount), note=VALUES(note)');

    $customerNames = [];

    // Muat mapping ID Customer -> Nama dari CSV Customer terlebih dahulu
    // (CSV Pembayaran hanya berisi ID Customer, tanpa kolom nama)
    foreach (glob($dir . '/*.csv') as $cf) {
        if (stripos(basename($cf), 'customer') === false) continue;
        foreach (read_csv($cf) ?? [] as $r) {
            if (isset($r[0]) && trim($r[0]) !== '') {
                $customerNames[trim($r[0])] = trim($r[1] ?? '');
            }
        }
        break;
    }

    foreach (glob($dir . '/*.csv') as $f) {
        $name = basename($f);
        $rows = read_csv($f) ?? [];

        if (stripos($name, 'master_kategori') !== false) {
            foreach ($rows as $r) {
                if (!isset($r[0]) || trim($r[0]) === '') continue;
                $ensureCat($r[0], $r[1] ?? 'Lainnya');
                $summary['categories']++;
            }
            continue;
        }

        if (stripos($name, 'pengeluaran') !== false) {
            foreach ($rows as $r) {
                if (!isset($r[0]) || trim($r[0]) === '') continue;
                $refNo = trim(rtrim($r[0], "'"));
                $amount = clean_num($r[4] ?? null);
                if ($amount === null) { $summary['skipped']++; continue; }
                $catId = $ensureCat($r[2] ?? 'Lainnya', $r[7] ?? 'Lainnya');
                $stmtExp->execute([
                    $refNo,
                    norm_date($r[1] ?? null),
                    $catId,
                    trim($r[3] ?? ''),
                    $amount,
                    norm_method($r[5] ?? null),
                    trim($r[6] ?? ''),
                    in_array($r[7] ?? 'Lainnya', ['Operasional', 'Lainnya'], true) ? $r[7] : 'Lainnya',
                    $_SESSION['user_id'] ?? null
                ]);
                $summary['expenses']++;
            }
            continue;
        }

        if (stripos($name, 'tagihan') !== false) {
            foreach ($rows as $r) {
                if (!isset($r[0]) || trim($r[0]) === '') continue;
                $billNo = trim(rtrim($r[0], "'"));
                $amount = clean_num($r[6] ?? null);
                if ($amount === null) { $summary['skipped']++; continue; }
                $custRef = trim($r[1] ?? '');
                $custName = trim($r[2] ?? '');
                if ($custRef !== '' && $custName !== '') $customerNames[$custRef] = $custName;
                [$pm, $py] = bill_period_from_no($billNo);
                if ($pm === null) [$pm, $py] = parse_period($r[5] ?? null);
                $status = trim($r[7] ?? 'Belum Bayar');
                if (!in_array($status, ['Lunas', 'Belum Bayar', 'Sebagian'], true)) $status = 'Belum Bayar';
                $stmtBill->execute([
                    $billNo,
                    $custRef,
                    $custName,
                    trim($r[3] ?? ''),
                    trim($r[4] ?? ''),
                    $pm, $py,
                    $amount,
                    $status,
                    norm_date($r[8] ?? null),
                    $_SESSION['user_id'] ?? null
                ]);
                $summary['bills']++;
            }
            continue;
        }

        if (stripos($name, 'pembayaran') !== false) {
            foreach ($rows as $r) {
                if (!isset($r[0]) || trim($r[0]) === '') continue;
                $payNo = trim($r[0]);
                $payDate = norm_date($r[3] ?? null);
                $amount = clean_num($r[5] ?? null);
                if ($payDate === null || $amount === null) { $summary['skipped']++; continue; }
                $note = trim($r[6] ?? '');
                $custRef = trim($r[2] ?? '');
                $billNo = trim($r[1] ?? '');

                if ($note !== '' && (stripos($note, 'kembalian') !== false || stripos($note, 'refund') !== false)) {
                    $catId = $ensureCat('Lainnya');
                    $stmtExp->execute([
                        'REFUND-' . $payNo,
                        $payDate,
                        $catId,
                        'Kembalian pelanggan: ' . $note,
                        $amount,
                        norm_method($r[4] ?? null),
                        $custRef,
                        'Lainnya',
                        $_SESSION['user_id'] ?? null
                    ]);
                    $summary['refunds']++;
                    continue;
                }

                $stmtInc->execute([
                    $payNo,
                    $billNo,
                    $custRef,
                    $customerNames[$custRef] ?? '',
                    $payDate,
                    norm_method($r[4] ?? null),
                    $amount,
                    $note,
                    $_SESSION['user_id'] ?? null
                ]);
                $summary['income']++;
            }
            continue;
        }
    }

    $koneksi->commit();
} catch (Exception $e) {
    $koneksi->rollback();
    $summary['errors'][] = $e->getMessage();
    if ($is_cli) {
        echo "ERROR: " . $e->getMessage() . "\n";
        exit(1);
    }
    respond_error($e->getMessage(), 500);
}

if ($is_cli) {
    echo "Kategori   : {$summary['categories']}\n";
    echo "Pengeluaran: {$summary['expenses']} (refund: {$summary['refunds']})\n";
    echo "Tagihan    : {$summary['bills']}\n";
    echo "Pemasukan  : {$summary['income']}\n";
    echo "Skipped    : {$summary['skipped']}\n";
    foreach ($summary['errors'] as $err) echo "  ! $err\n";
    echo "Selesai.\n";
    exit(0);
}

respond_ok(['summary' => $summary]);
