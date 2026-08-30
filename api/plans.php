<?php
require_once 'conn.php';
require_auth();

$res = $koneksi->query("SELECT p.*, b.name_bw, b.rate_down, b.rate_down_unit, b.rate_up, b.rate_up_unit
    FROM tbl_plans p
    LEFT JOIN tbl_bandwidth b ON b.id = p.id_bw
    WHERE p.enabled = 1
    ORDER BY p.id ASC");

respond_ok(['data' => $res->fetch_all(MYSQLI_ASSOC)]);
