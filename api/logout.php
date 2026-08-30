<?php
require_once 'conn.php';

$_SESSION = [];
session_destroy();

respond_ok(['success' => true]);
