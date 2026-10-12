<?php
// Jaminan output selalu JSON valid:
// - buffer semua output, bersihkan sebelum respond (warning stray tidak ikut)
// - tangkap fatal error via shutdown handler agar tidak jadi body kosong
ob_start();
register_shutdown_function(function () {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR], true)) {
        while (ob_get_level() > 0) { @ob_end_clean(); }
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json');
        }
        error_log('[pppoe_sync] FATAL: ' . ($err['message'] ?? 'unknown') . ' in ' . ($err['file'] ?? '?') . ':' . ($err['line'] ?? '?'));
        echo json_encode(['error' => 'Sinkron gagal di server: ' . ($err['message'] ?? 'fatal error')]);
    }
});
// Jangan biarkan warning/notice merusak output JSON (masuk log saja)
ini_set('display_errors', '0');
ini_set('log_errors', '1');
require_once 'conn.php';
require_once 'crypto.php';
require_once 'RouterOS.php';
require_auth();

// Router lambat / banyak secret: beri waktu eksekusi lebih panjang
@set_time_limit(120);

/** Respond JSON yang pasti bersih dari output stray. */
function sync_respond($data, $code = 200) {
    while (ob_get_level() > 0) { @ob_end_clean(); }
    if ($code !== 200) http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

$p = get_payload();
$routerId = (int) ($p['router_id'] ?? 1);
$dryRun = !isset($p['dry_run']) || (bool) $p['dry_run'];
$addMissing = isset($p['add_missing']) && (bool) $p['add_missing'];
$fixUsername = isset($p['fix_username']) && (bool) $p['fix_username'];

$stmt = $koneksi->prepare("SELECT * FROM tbl_routers WHERE id = ?");
$stmt->bind_param('i', $routerId);
$stmt->execute();
$router = $stmt->get_result()->fetch_assoc();
if (!$router) sync_respond(['error' => 'Router tidak ditemukan'], 404);
error_log('[pppoe_sync] start router_id=' . $routerId . ' router=' . ($router['name'] ?? '?'));

$ipPort = explode(':', $router['ip_address']);
$ip = $ipPort[0];
$port = isset($ipPort[1]) ? (int) $ipPort[1] : 8728;

$r = new RouterOS();
if (!$r->connect($ip, $port, $router['username'], decrypt_router_password($router['password']))) {
    error_log('[pppoe_sync] connect GAGAL ke ' . $ip . ':' . $port);
    sync_respond(['error' => 'Login API router gagal (' . $ip . ':' . $port . ')'], 500);
}
error_log('[pppoe_sync] connect OK ke ' . $ip . ':' . $port);

// Ambil hanya field yang dibutuhkan agar payload kecil & sinkronisasi cepat
$secrets = $r->print('/ppp/secret', ['=.proplist=.id,name,profile,disabled,comment']);
$active = $r->print('/ppp/active', ['=.proplist=.name,.address']);
$r->disconnect();
error_log('[pppoe_sync] secrets=' . count((array) $secrets) . ' active=' . count((array) $active));

$secretByName = [];
foreach ((array) $secrets as $s) {
    if (!is_array($s) || empty($s['name'])) continue;
    $secretByName[$s['name']] = $s;
}
$activeNames = [];
foreach ((array) $active as $a) {
    if (!is_array($a) || empty($a['name'])) continue;
    $activeNames[$a['name']] = $a;
}

// Peta profil router -> paket di DB (cocokkan nama plan dengan profil PPPoE)
$planByProfile = [];
$planRes = $koneksi->query("SELECT id, name_plan FROM tbl_plans WHERE enabled = 1");
if ($planRes) {
    while ($row = $planRes->fetch_assoc()) {
        if (!isset($row['name_plan'])) continue;
        $planByProfile[strtolower(trim($row['name_plan']))] = (int) $row['id'];
    }
}

$customers = $koneksi
    ->query("SELECT * FROM tbl_customers WHERE pppoe_username IS NOT NULL AND pppoe_username != '' ORDER BY id")
    ->fetch_all(MYSQLI_ASSOC);

// ---- Deteksi perbaikan username (fixUsername) dengan scoring ----
// prioritas: nama eksak (100) > prefix nama (85) > fullname di comment (70) > username di comment (60)
// Index lowercase dibuat sekali agar tidak scan seluruh secret per customer.
$secretByLower = [];
foreach ($secretByName as $sname => $s) {
    $secretByLower[strtolower($sname)] = $sname;
}
$fixMap = [];
$fixCandidates = [];
if ($fixUsername) {
    foreach ($customers as $c) {
        $uname = trim($c['pppoe_username']);
        if ($uname === '') continue;
        $un = strtolower(trim($c['username']));
        $fn = strtolower(trim($c['fullname']));
        // Sudah cocok eksak -> tidak perlu scoring
        if (isset($secretByName[$uname]) || ($un !== '' && isset($secretByLower[$un])) || ($fn !== '' && isset($secretByLower[$fn]))) {
            continue;
        }
        $best = null;
        $bestScore = 0;
        foreach ($secretByLower as $sl => $sname) {
            $s = $secretByName[$sname];
            $cm = strtolower(trim($s['comment'] ?? ''));
            $score = 0;
            if ($fn !== '' && $sl === $fn) {
                $score = 100;
            } elseif (strlen($un) >= 3 && ($sl === $un || (strpos($sl, $un) === 0 || strpos($un, $sl) === 0))) {
                $score = 85;
            } elseif ($fn !== '' && $cm !== '' && (strpos($cm, $fn) !== false || strpos($fn, $cm) !== false)) {
                $score = 70;
            } elseif ($un !== '' && $cm !== '' && strpos($cm, $un) !== false) {
                $score = 60;
            }
            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $sname;
            }
        }
        if ($best && $bestScore >= 60 && $best !== $uname) {
            $fixMap[$c['id']] = $best;
            $fixCandidates[] = [
                'customer_id' => (int) $c['id'],
                'username' => $c['username'],
                'fullname' => $c['fullname'],
                'pppoe_lama' => $uname,
                'pppoe_baru' => $best
            ];
        }
    }
}

// Peta lowercase untuk pencocokan case-insensitive (MikroTik kadang beda kapital)
$secretByLower = [];
foreach ($secretByName as $sname => $s) {
    $secretByLower[strtolower($sname)] = $sname;
}
$activeByLower = [];
foreach ($activeNames as $aname => $a) {
    $activeByLower[strtolower($aname)] = $aname;
}

function resolve_router_name($effective, $map, $lowerMap) {
    if (isset($map[$effective])) return $effective;
    $lk = strtolower($effective);
    if (isset($lowerMap[$lk])) return $lowerMap[$lk];
    return null;
}

// ---- Status pelanggan (memakai username efektif setelah perbaikan) ----
// Status = status ADMIN (terdaftar & enabled di router), BUKAN online real-time.
// Online real-time hanya untuk info, tidak mengubah status Active/Inactive.
$statusChanges = [];
$notOnRouter = [];
$matchedOk = 0;
$alreadyInactive = 0;
$onlineNow = array_keys($activeNames);

foreach ($customers as $c) {
    $effective = isset($fixMap[$c['id']]) ? $fixMap[$c['id']] : trim($c['pppoe_username']);
    $resolvedSecret = resolve_router_name($effective, $secretByName, $secretByLower);
    $resolvedActive = resolve_router_name($effective, $activeNames, $activeByLower);
    $onRouter = $resolvedSecret !== null;
    $isOnline = $resolvedActive !== null;
    $isDisabled = $onRouter && (($secretByName[$resolvedSecret]['disabled'] ?? 'false') === 'true');
    // Terdaftar & enabled => Active, meskipun sedang offline. Hanya disabled / tidak ada di router => Inactive.
    $newStatus = ($onRouter && !$isDisabled) ? 'Active' : 'Inactive';

    if (!$onRouter) {
        $notOnRouter[] = [
            'customer_id' => (int) $c['id'],
            'username' => $c['username'],
            'fullname' => $c['fullname'],
            'pppoe_username' => $effective
        ];
    }

    if ($c['status'] !== $newStatus) {
        if (!$onRouter) {
            $alasan = 'Username PPPoE tidak ditemukan di router';
        } elseif ($isDisabled) {
            $alasan = 'Secret di-disable di router';
        } elseif ($isOnline) {
            $alasan = 'Terhubung di router';
        } else {
            $alasan = 'Terdaftar di router (sedang offline)';
        }
        $statusChanges[] = [
            'customer_id' => (int) $c['id'],
            'fullname' => $c['fullname'],
            'pppoe_username' => $effective,
            'status_lama' => $c['status'],
            'status_baru' => $newStatus,
            'online' => $isOnline,
            'alasan' => $alasan
        ];
    } else {
        if ($newStatus === 'Active') $matchedOk++;
        else $alreadyInactive++;
    }
}

// ---- User PPPoE di router yang belum ada di DB pelanggan (mengecualikan yang sudah "diambil alih" oleh perbaikan username) ----
$accounted = [];
foreach ($customers as $c) {
    $accounted[trim($c['pppoe_username'])] = true;
}
foreach ($fixCandidates as $fc) {
    $accounted[$fc['pppoe_baru']] = true;
}
$missingOnDb = [];
foreach ($secretByName as $sname => $s) {
    if (isset($accounted[$sname])) continue;
    $isActive = isset($activeNames[$sname]);
    $missingOnDb[] = [
        'name' => $sname,
        'profile' => $s['profile'] ?? '',
        'disabled' => ($s['disabled'] ?? 'false') === 'true',
        'comment' => $s['comment'] ?? '',
        'active' => $isActive,
        'address' => $isActive ? ($activeNames[$sname]['address'] ?? '') : ''
    ];
}

if (!$dryRun) {
    // 1. Update status pelanggan
    $upd = $koneksi->prepare("UPDATE tbl_customers SET status=? WHERE id=?");
    foreach ($statusChanges as $sc) {
        $upd->bind_param('si', $sc['status_baru'], $sc['customer_id']);
        $upd->execute();
    }

    // 2. Perbaiki pppoe_username bila diminta
    if ($fixUsername) {
        $upd2 = $koneksi->prepare("UPDATE tbl_customers SET pppoe_username=? WHERE id=?");
        foreach ($fixCandidates as $fc) {
            $upd2->bind_param('si', $fc['pppoe_baru'], $fc['customer_id']);
            $upd2->execute();
        }
    }

    // 3. Sinkronkan paket (plan_id) untuk semua pelanggan yang terdaftar di router
    $plansUpdated = 0;
    $updP = $koneksi->prepare("UPDATE tbl_customers SET plan_id=? WHERE id=?");
    foreach ($customers as $c) {
        $eff = isset($fixMap[$c['id']]) ? $fixMap[$c['id']] : trim($c['pppoe_username']);
        if (!isset($secretByName[$eff])) continue;
        $pid = $planByProfile[strtolower(trim($secretByName[$eff]['profile'] ?? ''))] ?? null;
        if (!$pid || (int) $c['plan_id'] === $pid) continue;
        $updP->bind_param('ii', $pid, $c['id']);
        if ($updP->execute()) $plansUpdated++;
    }

    // 4. Tambah pelanggan baru yang belum ada di DB bila diminta
    $added = 0;
    if ($addMissing) {
        $ins = $koneksi->prepare(
            "INSERT INTO tbl_customers
            (username, password, photo, pppoe_username, pppoe_password, pppoe_ip, fullname,
             address, city, district, state, zip, phonenumber, email, coordinates,
             account_type, balance, service_type, plan_id, status, created_by)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
        );
        foreach ($missingOnDb as $m) {
            if ($m['disabled']) continue;
            $fullname = trim(explode('|', $m['comment'])[0] ?? '');
            if ($fullname === '') $fullname = $m['name'];
            $username = $m['name'];
            $pw = '';
            $photo = '/user.default.jpg';
            $pppoeU = $m['name'];
            $pppoePw = '';
            $pppoeIp = $m['address'];
            $address = '';
            $city = $district = $state = '';
            $zip = '';
            $phone = '0';
            $email = '';
            $coords = '';
            $acct = 'Personal';
            $balance = 0;
            $svc = 'PPPoE';
            $pid = $planByProfile[strtolower(trim($m['profile']))] ?? null;
            $status = $m['active'] ? 'Active' : 'Inactive';
            $by = (int) $_SESSION['user_id'];

            $ins->bind_param(
                'ssssssssssssssssdssii',
                $username, $pw, $photo, $pppoeU, $pppoePw, $pppoeIp, $fullname,
                $address, $city, $district, $state, $zip, $phone, $email, $coords,
                $acct, $balance, $svc, $pid, $status, $by
            );
            if ($ins->execute()) $added++;
        }
    }

    // 5. Update status router online
    $updR = $koneksi->prepare("UPDATE tbl_routers SET status='Online', last_seen=NOW() WHERE id=?");
    $updR->bind_param('i', $routerId);
    $updR->execute();

    error_log('[pppoe_sync] selesai: status_updated=' . count($statusChanges) . ' online=' . count($onlineNow));
    sync_respond([
        'success' => true,
        'message' => 'Sinkronisasi selesai',
        'router' => $router['name'],
        'status_updated' => count($statusChanges),
        'usernames_fixed' => $fixUsername ? count($fixCandidates) : 0,
        'plans_updated' => $plansUpdated,
        'customers_added' => $addMissing ? $added : 0,
        'online_now' => array_values($onlineNow),
        'online_count' => count($onlineNow),
        'status_changes' => $statusChanges,
        'fix_candidates' => $fixUsername ? $fixCandidates : [],
        'added_customers' => $addMissing ? $missingOnDb : []
    ]);
}

sync_respond([
    'success' => true,
    'dry_run' => true,
    'router' => $router['name'],
    'identity' => $router['name'],
    'stats' => [
        'secret_total' => count($secrets),
        'secret_enabled' => count(array_filter($secrets, fn($s) => ($s['disabled'] ?? 'false') !== 'true')),
        'active_sessions' => count($active),
        'customers_total' => count($customers)
    ],
    'online_now' => array_values($onlineNow),
    'online_count' => count($onlineNow),
    'status_changes' => $statusChanges,
    'not_on_router' => $notOnRouter,
    'fix_candidates' => $fixCandidates,
    'missing_on_db' => $missingOnDb
]);
