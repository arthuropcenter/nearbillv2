<?php
/**
 * Klien telnet untuk Hioso EPON OLT.
 * Hanya melakukan operasi READ (show) - tidak mengubah konfigurasi.
 */

class HiosoOLT
{
    private $socket;
    private $timeout = 8;
    private $user;
    private $pass;

    public function connect($ip, $port, $user, $pass)
    {
        $this->user = $user;
        $this->pass = $pass;
        $this->socket = @fsockopen($ip, $port, $errno, $errstr, $this->timeout);
        if (!$this->socket) {
            return false;
        }
        stream_set_timeout($this->socket, $this->timeout);
        return $this->login();
    }

    private function login()
    {
        $out = $this->readUntil(['login:', 'Login:', 'Username:', 'EPON#', 'EPON(', '>'], 5);
        if (preg_match('/login:|Username:/i', $out)) {
            fwrite($this->socket, $this->user . "\r\n");
            $out = $this->readUntil(['Password:', 'password:', 'EPON#', 'EPON('], 5);
            if (preg_match('/password:/i', $out)) {
                fwrite($this->socket, $this->pass . "\r\n");
            }
        }
        $out = $this->readUntil(['EPON#', 'EPON('], 5);
        return preg_match('/EPON\s*[#(]/', $out) === 1;
    }

    /**
     * Jalankan perintah CLI, kembalikan output (tanpa prompt).
     */
    public function command($cmd)
    {
        fwrite($this->socket, $cmd . "\r\n");
        return $this->readUntil(['EPON#', 'EPON(']);
    }

    /**
     * Masuk ke node EPON (configure terminal -> epon) bila perlu.
     */
    public function enterEponNode()
    {
        $out = $this->command('');
        if (preg_match('/\(epon/', $out)) {
            return true;
        }
        $out = $this->command('configure terminal');
        if (!preg_match('/\(config\)#/', $out)) {
            return false;
        }
        $out = $this->command('epon');
        return preg_match('/\(epon/', $out) === 1;
    }

    public function disconnect()
    {
        if ($this->socket) {
            @fwrite($this->socket, 'quit' . "\r\n");
            @fclose($this->socket);
        }
    }

    private function readUntil($patterns, $timeout = null)
    {
        $data = '';
        $end = microtime(true) + ($timeout ?: $this->timeout);
        while (microtime(true) < $end) {
            $chunk = @fread($this->socket, 4096);
            if ($chunk === false || $chunk === '') {
                if (feof($this->socket)) break;
                usleep(100000);
                continue;
            }
            $data .= $chunk;
            foreach ($patterns as $p) {
                if (strpos($data, $p) !== false) {
                    break 2;
                }
            }
        }
        return $data;
    }

    /**
     * Parsing baris tabel output "show pon <pon> onu <id>".
     */
    public static function parseOnuStatus($output)
    {
        $lines = explode("\n", $output);
        foreach ($lines as $line) {
            $line = rtrim($line);
            if ($line === '' || strpos($line, 'onuId') === 0 || strpos($line, '---') !== false || strpos($line, 'EPON') !== false) {
                continue;
            }
            $tokens = preg_split('/\s+/', trim($line));
            if (count($tokens) < 8) continue;

            return [
                'onu_id'  => $tokens[0],
                'mac'     => $tokens[1],
                'status'  => $tokens[2],
                'ports'   => $tokens[3],
                'chip_id' => $tokens[4],
                'version' => $tokens[5],
                'flags'   => $tokens[6],
                'auth'    => $tokens[7],
                'distance' => isset($tokens[8]) ? $tokens[8] : '',
                'uptime'  => count($tokens) > 9 ? implode(' ', array_slice($tokens, 9)) : ''
            ];
        }
        return null;
    }

    /**
     * Parsing "show optical-ddm onu <idx>".
     */
    public static function parseDdm($output)
    {
        $ddm = [];
        foreach (explode("\n", $output) as $line) {
            if (strpos($line, ':') === false) continue;
            $parts = explode(':', $line, 2);
            $key = trim($parts[0]);
            $val = trim($parts[1]);
            if ($key === '') continue;
            if (strpos($key, 'Temperature') !== false) $ddm['temperature'] = $val;
            elseif (strpos($key, 'Voltage') !== false) $ddm['voltage'] = $val;
            elseif (strpos($key, 'Current') !== false) $ddm['current'] = $val;
            elseif (strpos($key, 'TxPower') !== false) $ddm['tx_power'] = $val;
            elseif (strpos($key, 'RxPower') !== false) $ddm['rx_power'] = $val;
        }
        return $ddm ?: null;
    }

    /**
     * Ambil status lengkap sebuah ONU.
     * $pon contoh: "1/1", $onu contoh: "2"
     */
    public function onuStatus($pon, $onu)
    {
        $result = ['online' => false];

        if (!$this->enterEponNode()) {
            return ['error' => 'Gagal masuk node EPON'];
        }

        // 1) Status / keberadaan ONU
        $out = $this->command('show pon ' . $pon . ' onu ' . $onu);
        $status = self::parseOnuStatus($out);
        if ($status) {
            $result = array_merge($result, $status);
            $result['online'] = strtolower($status['status']) === 'up';
        } else {
            $result['status'] = 'Tidak ditemukan';
        }

        // 2) Optical DDM - format index bisa 0/<pon>:<onu> atau <pon>:<onu>
        $ddm = null;
        foreach (["0/$pon:$onu", "$pon:$onu"] as $idx) {
            $out = $this->command('show optical-ddm onu ' . $idx);
            $ddm = self::parseDdm($out);
            if ($ddm) break;
        }
        $result['ddm'] = $ddm;

        return $result;
    }
}
