<?php
require_once 'conn.php';
require_auth();
require_role(['AdminGM']);

$action = $_GET['action'] ?? ($_POST['action'] ?? '');
if ($action === '') $action = $_GET['type'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === '') {
    $action = 'summary';
}

/* ---------- helpers ---------- */

function monthly_series($koneksi, $table, $datecol, $amountcol)
{
    $map = [];
    $res = $koneksi->query("SELECT DATE_FORMAT($datecol, '%Y-%m') AS m, SUM($amountcol) AS t FROM $table WHERE $datecol IS NOT NULL GROUP BY m");
    while ($row = $res->fetch_assoc()) $map[$row['m']] = (float) $row['t'];
    return $map;
}

$user_id = (int) $_SESSION['user_id'];

/* ---------- manage: kategori ---------- */

if ($action === 'category' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $p = get_payload();
    $name = trim($p['name'] ?? '');
    $type = in_array($p['type'] ?? 'Lainnya', ['Operasional', 'Lainnya'], true) ? $p['type'] : 'Lainnya';
    if ($name === '') respond_error('Nama kategori wajib diisi');
    $koneksi->prepare('INSERT INTO tbl_expense_categories (name, type) VALUES (?, ?)')->execute([$name, $type]);
    respond_ok(['id' => (int) $koneksi->insert_id]);
}

if ($action === 'category' && $_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) respond_error('ID kategori tidak valid');
    $koneksi->prepare('DELETE FROM tbl_expense_categories WHERE id = ?')->execute([$id]);
    respond_ok(['ok' => true]);
}

/* ---------- manage: pengeluaran ---------- */

if ($action === 'expense' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $p = get_payload();
    $date = $p['expense_date'] ?? null;
    $amount = (float) ($p['amount'] ?? 0);
    if (!$date || $amount <= 0) respond_error('Tanggal dan jumlah wajib diisi');
    $catId = (int) ($p['category_id'] ?? 0) ?: null;
    $koneksi->prepare('INSERT INTO tbl_expenses (expense_date, category_id, description, amount, method, paid_to, expense_type, created_by) VALUES (?,?,?,?,?,?,?,?)')
        ->execute([$date, $catId, trim($p['description'] ?? ''), $amount, trim($p['method'] ?? ''), trim($p['paid_to'] ?? ''), $p['expense_type'] ?? 'Lainnya', $user_id]);
    respond_ok(['id' => (int) $koneksi->insert_id]);
}

if ($action === 'expense' && $_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) respond_error('ID tidak valid');
    $koneksi->prepare('DELETE FROM tbl_expenses WHERE id = ?')->execute([$id]);
    respond_ok(['ok' => true]);
}

/* ---------- manage: pemasukan ---------- */

if ($action === 'income' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $p = get_payload();
    $date = $p['pay_date'] ?? null;
    $amount = (float) ($p['amount'] ?? 0);
    if (!$date || $amount <= 0) respond_error('Tanggal dan jumlah wajib diisi');
    $koneksi->prepare('INSERT INTO tbl_fin_income (pay_no, bill_no, customer_ref, customer_name, pay_date, method, amount, note, created_by) VALUES (?,?,?,?,?,?,?,?,?)')
        ->execute([trim($p['pay_no'] ?? '') ?: null, trim($p['bill_no'] ?? '') ?: null, trim($p['customer_ref'] ?? '') ?: null, trim($p['customer_name'] ?? '') ?: null, $date, trim($p['method'] ?? '') ?: null, $amount, trim($p['note'] ?? '') ?: null, $user_id]);
    respond_ok(['id' => (int) $koneksi->insert_id]);
}

if ($action === 'income' && $_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) respond_error('ID tidak valid');
    $koneksi->prepare('DELETE FROM tbl_fin_income WHERE id = ?')->execute([$id]);
    respond_ok(['ok' => true]);
}

/* ---------- manage: tagihan ---------- */

if ($action === 'bill' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $p = get_payload();
    $period = $p['period'] ?? ''; // YYYY-MM
    $pm = $py = null;
    if (preg_match('/^(\d{4})-(\d{2})$/', $period, $m)) {
        $py = (int) $m[1];
        $pm = (int) $m[2];
    }
    $amount = (float) ($p['amount'] ?? 0);
    if ($amount <= 0) respond_error('Jumlah tagihan wajib diisi');
    $status = in_array($p['status'] ?? 'Belum Bayar', ['Lunas', 'Belum Bayar', 'Sebagian'], true) ? $p['status'] : 'Belum Bayar';

    $billNo = trim($p['bill_no'] ?? '');
    if ($billNo === '') {
        $compact = ($py && $pm) ? sprintf('%04d%02d', $py, $pm) : date('Ym');
        $custRef = trim($p['customer_ref'] ?? '');
        if ($custRef !== '') {
            $billNo = 'INV-' . $compact . '-' . $custRef;
        } else {
            $pref = 'INV-' . $compact . '-NH-C';
            $seq = (int) $koneksi->query("SELECT IFNULL(MAX(CAST(SUBSTRING(bill_no, " . (strlen($pref) + 1) . ") AS UNSIGNED)), 0) AS s FROM tbl_bills WHERE bill_no LIKE '" . $pref . "%'")->fetch_assoc()['s'];
            $billNo = $pref . str_pad($seq + 1, 4, '0', STR_PAD_LEFT);
        }
    }

    $koneksi->prepare('INSERT INTO tbl_bills (bill_no, customer_ref, customer_name, plan_ref, plan_name, period_month, period_year, amount, status, bill_date, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
        ->execute([$billNo, trim($p['customer_ref'] ?? '') ?: null, trim($p['customer_name'] ?? '') ?: null, trim($p['plan_ref'] ?? '') ?: null, trim($p['plan_name'] ?? '') ?: null, $pm, $py, $amount, $status, $p['bill_date'] ?? null, $user_id]);
    respond_ok(['id' => (int) $koneksi->insert_id, 'bill_no' => $billNo]);
}

if ($action === 'bill' && $_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) respond_error('ID tidak valid');
    $koneksi->prepare('DELETE FROM tbl_bills WHERE id = ?')->execute([$id]);
    respond_ok(['ok' => true]);
}

/* ---------- ubah jumlah tagihan (total saja) ---------- */

if ($action === 'update_bill' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $p = get_payload();
    $id = (int) ($p['id'] ?? 0);
    $amount = (float) ($p['amount'] ?? 0);
    if (!$id || $amount <= 0) respond_error('ID dan jumlah wajib diisi');
    $bill = $koneksi->prepare('SELECT * FROM tbl_bills WHERE id = ?');
    $bill->execute([$id]);
    $b = $bill->get_result()->fetch_assoc();
    if (!$b) respond_error('Tagihan tidak ditemukan');

    $koneksi->prepare('UPDATE tbl_bills SET amount = ? WHERE id = ?')->execute([$amount, $id]);

    $paidSum = (float) $koneksi->query("SELECT IFNULL(SUM(amount),0) AS t FROM tbl_fin_income WHERE bill_no = '" . $koneksi->real_escape_string($b['bill_no']) . "'")->fetch_assoc()['t'];
    $newStatus = $paidSum <= 0 ? 'Belum Bayar' : ($paidSum >= $amount ? 'Lunas' : 'Sebagian');
    $koneksi->prepare('UPDATE tbl_bills SET status = ? WHERE id = ?')->execute([$newStatus, $id]);
    respond_ok(['ok' => true, 'status' => $newStatus]);
}

/* ---------- generate tagihan otomatis per pelanggan aktif ---------- */

if ($action === 'generate_bills' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $p = get_payload();
    $start = trim($p['start_month'] ?? '');
    $end = trim($p['end_month'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}$/', $start) || !preg_match('/^\d{4}-\d{2}$/', $end)) {
        respond_error('Rentang bulan tidak valid (YYYY-MM)');
    }
    if ($start > $end) respond_error('Bulan awal tidak boleh setelah bulan akhir');

    // Pelanggan aktif = status Active + punya paket aktif (selaras menu Pelanggan Aktif)
    $custs = [];
    $res = $koneksi->query(
        "SELECT c.id, c.username, c.fullname, p.name_plan, p.price
         FROM tbl_customers c
         INNER JOIN tbl_plans p ON p.id = c.plan_id AND p.enabled = 1
         WHERE c.status = 'Active'
         ORDER BY c.id"
    );
    while ($row = $res->fetch_assoc()) $custs[] = $row;
    if (!$custs) respond_error('Tidak ada pelanggan aktif dengan paket');

    $months = [];
    $cur = $start;
    while ($cur <= $end) {
        $months[] = $cur;
        $cur = date('Y-m', strtotime($cur . '-01 +1 month'));
    }

    $generated = 0;
    $skipped = 0;
    $perMonth = [];
    foreach ($months as $m) {
        [$y, $mo] = array_map('intval', explode('-', $m));
        $cnt = 0;
        foreach ($custs as $c) {
            $ref = 'NH-C' . str_pad($c['id'], 4, '0', STR_PAD_LEFT);
            $billNo = sprintf('INV-%04d%02d-%s', $y, $mo, $ref);
            $chk = $koneksi->prepare('SELECT id FROM tbl_bills WHERE bill_no = ? OR (customer_ref = ? AND period_year = ? AND period_month = ?)');
            $chk->bind_param('ssii', $billNo, $ref, $y, $mo);
            $chk->execute();
            if ($chk->get_result()->fetch_assoc()) { $skipped++; continue; }
            $name = ($c['fullname'] !== '' && $c['fullname'] !== null) ? $c['fullname'] : $c['username'];
            $amount = (float) $c['price'];
            $ins = $koneksi->prepare('INSERT INTO tbl_bills (bill_no, customer_ref, customer_name, plan_ref, plan_name, period_month, period_year, amount, status, bill_date, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
            $ins->execute([$billNo, $ref, $name, (string) $c['id'], $c['name_plan'], $mo, $y, $amount, 'Belum Bayar', date('Y-m-d'), $user_id]);
            $generated++;
            $cnt++;
        }
        $perMonth[] = ['month' => $m, 'generated' => $cnt];
    }

    respond_ok(['generated' => $generated, 'skipped' => $skipped, 'perMonth' => $perMonth]);
}

if ($action === 'pay' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $p = get_payload();
    $billId = (int) ($p['bill_id'] ?? 0);
    $date = $p['pay_date'] ?? null;
    $amount = (float) ($p['amount'] ?? 0);
    if (!$billId || !$date || $amount <= 0) respond_error('Data pembayaran tidak lengkap');
    $bill = $koneksi->prepare('SELECT * FROM tbl_bills WHERE id = ?');
    $bill->execute([$billId]);
    $b = $bill->get_result()->fetch_assoc();
    if (!$b) respond_error('Tagihan tidak ditemukan');

    $stmt = $koneksi->prepare('INSERT INTO tbl_fin_income (bill_no, customer_ref, customer_name, pay_date, method, amount, note, created_by) VALUES (?,?,?,?,?,?,?,?)');
    $stmt->execute([$b['bill_no'], $b['customer_ref'], $b['customer_name'], $date, trim($p['method'] ?? 'Cash'), $amount, trim($p['note'] ?? ''), $user_id]);
    $incomeId = (int) $koneksi->insert_id;

    $paidSum = (float) $koneksi->query("SELECT IFNULL(SUM(amount),0) AS t FROM tbl_fin_income WHERE bill_no = '" . $koneksi->real_escape_string($b['bill_no']) . "'")->fetch_assoc()['t'];
    $newStatus = $paidSum >= (float) $b['amount'] ? 'Lunas' : 'Sebagian';
    $koneksi->prepare('UPDATE tbl_bills SET status = ? WHERE id = ?')->execute([$newStatus, $billId]);
    respond_ok(['id' => $incomeId, 'status' => $newStatus]);
}

/* ---------- GET: lists ---------- */

if ($action === 'categories') {
    $rows = [];
    $res = $koneksi->query('SELECT * FROM tbl_expense_categories ORDER BY type, name');
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    respond_ok(['data' => $rows]);
}

if ($action === 'expenses') {
    $month = $_GET['month'] ?? '';
    $q = 'SELECT e.*, c.name AS category_name, c.type AS category_type FROM tbl_expenses e LEFT JOIN tbl_expense_categories c ON c.id = e.category_id';
    $args = [];
    if ($month !== '' && preg_match('/^\d{4}-\d{2}$/', $month)) {
        $q .= ' WHERE DATE_FORMAT(e.expense_date, "%Y-%m") = ?';
        $args[] = $month;
    }
    $q .= ' ORDER BY e.expense_date DESC, e.id DESC LIMIT 500';
    $rows = [];
    $stmt = $koneksi->prepare($q);
    if ($args) $stmt->bind_param('s', ...$args);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    respond_ok(['data' => $rows]);
}

if ($action === 'income') {
    $month = $_GET['month'] ?? '';
    $q = 'SELECT * FROM tbl_fin_income';
    $args = [];
    if ($month !== '' && preg_match('/^\d{4}-\d{2}$/', $month)) {
        $q .= ' WHERE DATE_FORMAT(pay_date, "%Y-%m") = ?';
        $args[] = $month;
    }
    $q .= ' ORDER BY pay_date DESC, id DESC LIMIT 500';
    $stmt = $koneksi->prepare($q);
    if ($args) $stmt->bind_param('s', ...$args);
    $stmt->execute();
    $rows = [];
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    respond_ok(['data' => $rows]);
}

if ($action === 'bills') {
    $status = $_GET['status'] ?? '';
    $q = 'SELECT * FROM tbl_bills';
    $args = [];
    if ($status !== '' && in_array($status, ['Lunas', 'Belum Bayar', 'Sebagian'], true)) {
        $q .= ' WHERE status = ?';
        $args[] = $status;
    }
    $q .= ' ORDER BY period_year DESC, period_month DESC, id DESC LIMIT 1000';
    $stmt = $koneksi->prepare($q);
    if ($args) $stmt->bind_param('s', ...$args);
    $stmt->execute();
    $rows = [];
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    respond_ok(['data' => $rows]);
}

/* ---------- GET: summary (default) ---------- */

$totalIncome = (float) $koneksi->query('SELECT IFNULL(SUM(amount),0) AS t FROM tbl_fin_income')->fetch_assoc()['t'];
$totalExpense = (float) $koneksi->query('SELECT IFNULL(SUM(amount),0) AS t FROM tbl_expenses')->fetch_assoc()['t'];
$arOutstanding = (float) $koneksi->query("SELECT IFNULL(SUM(amount),0) AS t FROM tbl_bills WHERE status <> 'Lunas'")->fetch_assoc()['t'];

$cm = date('Y-m');
$monthIncome = (float) $koneksi->query("SELECT IFNULL(SUM(amount),0) AS t FROM tbl_fin_income WHERE DATE_FORMAT(pay_date,'%Y-%m') = '$cm'")->fetch_assoc()['t'];
$monthExpense = (float) $koneksi->query("SELECT IFNULL(SUM(amount),0) AS t FROM tbl_expenses WHERE DATE_FORMAT(expense_date,'%Y-%m') = '$cm'")->fetch_assoc()['t'];

$incomeByMonth = monthly_series($koneksi, 'tbl_fin_income', 'pay_date', 'amount');
$expenseByMonth = monthly_series($koneksi, 'tbl_expenses', 'expense_date', 'amount');

$months = array_unique(array_merge(array_keys($incomeByMonth), array_keys($expenseByMonth)));
sort($months);

$monthly = [];
foreach ($months as $m) {
    $monthly[] = [
        'month' => $m,
        'income' => $incomeByMonth[$m] ?? 0.0,
        'expense' => $expenseByMonth[$m] ?? 0.0,
        'net' => ($incomeByMonth[$m] ?? 0.0) - ($expenseByMonth[$m] ?? 0.0)
    ];
}

$categoryTotals = [];
$res = $koneksi->query('SELECT c.name, IFNULL(SUM(e.amount),0) AS total FROM tbl_expenses e LEFT JOIN tbl_expense_categories c ON c.id = e.category_id GROUP BY c.name ORDER BY total DESC');
while ($row = $res->fetch_assoc()) $categoryTotals[] = $row;

respond_ok([
    'totals' => [
        'income' => $totalIncome,
        'expense' => $totalExpense,
        'net' => $totalIncome - $totalExpense,
        'arOutstanding' => $arOutstanding
    ],
    'month' => [
        'label' => $cm,
        'income' => $monthIncome,
        'expense' => $monthExpense,
        'net' => $monthIncome - $monthExpense
    ],
    'monthly' => array_reverse($monthly),
    'categoryTotals' => $categoryTotals
]);
