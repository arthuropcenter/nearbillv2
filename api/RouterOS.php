<?php
/**
 * RouterOS PHP API Client - mendukung login challenge-response (RouterOS 6.43+)
 * Digunakan untuk membaca daftar PPPoE aktif / non-aktif dari router MikroTik.
 */

class RouterOS
{
    private $socket;
    private $timeout = 6;

    public function connect($ip, $port, $user, $password)
    {
        $this->socket = @fsockopen($ip, $port, $errno, $errstr, $this->timeout);
        if (!$this->socket) {
            return false;
        }
        stream_set_timeout($this->socket, $this->timeout);
        return $this->login($user, $password);
    }

    private function login($user, $password)
    {
        // Metode baru (RouterOS 6.43+): kirim plaintext langsung
        $this->send('/login', '=name=' . $user, '=password=' . $password);
        $resp = $this->readSentence();
        if (!$this->sentenceIsError($resp) && !$this->sentenceHasRet($resp)) {
            return true;
        }

        // Fallback legacy (RouterOS < 6.43): challenge-response
        $ret = '';
        foreach ($resp as $word) {
            if (strpos($word, '=ret=') === 0) {
                $ret = substr($word, 5);
            }
        }
        if ($ret === '') {
            $this->send('/login');
            $resp = $this->readSentence();
            foreach ($resp as $word) {
                if (strpos($word, '=ret=') === 0) {
                    $ret = substr($word, 5);
                }
            }
        }
        if ($ret === '') {
            return false;
        }

        $md5 = md5(chr(0) . $password . pack('H*', $ret));
        $this->send('/login', '=name=' . $user, '=response=00' . $md5);
        $resp = $this->readSentence();
        return !$this->sentenceIsError($resp);
    }

    private function sentenceHasRet($sentence)
    {
        foreach ($sentence as $word) {
            if (strpos($word, '=ret=') === 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * Kirim perintah API, lalu baca baris (rows) sampai !done.
     * Contoh: $router->print('/ppp/active') => array baris
     *         $router->print('/interface', ['=stats=true']) => include statistik (rx-byte, tx-byte)
     */
    public function print($path, $words = [])
    {
        $this->send($path . '/print', ...$words);
        $rows = [];
        while (true) {
            $sentence = $this->readSentence();
            $tag = isset($sentence[0]) ? $sentence[0] : '';
            if ($tag === '!done') break;
            if ($tag === '!trap' || $tag === '!fatal') {
                return ['__error__' => implode(' ', array_slice($sentence, 1))];
            }
            if ($tag === '!re') {
                $row = [];
                foreach (array_slice($sentence, 1) as $word) {
                    if (strpos($word, '=') === 0) {
                        $parts = explode('=', substr($word, 1), 2);
                        $row[$parts[0]] = isset($parts[1]) ? $parts[1] : '';
                    }
                }
                $rows[] = $row;
            }
        }
        return $rows;
    }

    public function disconnect()
    {
        if ($this->socket) {
            @fclose($this->socket);
        }
    }

    // Untuk debug hanya
    public function rawCommand($path)
    {
        $this->send($path . '/print');
        $out = [];
        for ($i = 0; $i < 3; $i++) {
            $out[] = $this->readSentence();
        }
        return $out;
    }

    private function sentenceIsError($sentence)
    {
        foreach ($sentence as $word) {
            if (strpos($word, '!trap') === 0 || strpos($word, '!fatal') === 0) {
                return true;
            }
        }
        return false;
    }

    private function send(...$words)
    {
        foreach ($words as $word) {
            $this->writeWord($word);
        }
        fwrite($this->socket, chr(0));
    }

    private function writeWord($word)
    {
        $this->writeLength(strlen($word));
        fwrite($this->socket, $word);
    }

    private function writeLength($len)
    {
        if ($len < 0x80) {
            fwrite($this->socket, chr($len));
        } elseif ($len < 0x4000) {
            fwrite($this->socket, chr(0x80 | ($len >> 8)) . chr($len & 0xFF));
        } elseif ($len < 0x200000) {
            fwrite($this->socket, chr(0xC0 | ($len >> 16)) . chr(($len >> 8) & 0xFF) . chr($len & 0xFF));
        } elseif ($len < 0x10000000) {
            fwrite($this->socket, chr(0xE0 | ($len >> 24)) . chr(($len >> 16) & 0xFF) . chr(($len >> 8) & 0xFF) . chr($len & 0xFF));
        } else {
            fwrite($this->socket, chr(0xF0) . pack('N', $len));
        }
    }

    /**
     * Baca satu word, kembalikan [len, data] (len 0 = akhir kalimat).
     */
    private function readWord()
    {
        $b = @fread($this->socket, 1);
        if ($b === false || $b === '') {
            return false;
        }
        $len = ord($b);

        if (($len & 0x80) === 0) {
            // 1 byte: 0xxxxxxx
        } elseif (($len & 0xC0) === 0x80) {
            // 2 byte: 10xxxxxx
            $raw = fread($this->socket, 1);
            if (strlen($raw) < 1) return false;
            $len = (($len & 0x3F) << 8) | ord($raw);
        } elseif (($len & 0xE0) === 0xC0) {
            // 3 byte: 110xxxxx
            $raw = fread($this->socket, 2);
            if (strlen($raw) < 2) return false;
            $len = (($len & 0x1F) << 16) | (ord($raw[0]) << 8) | ord($raw[1]);
        } elseif (($len & 0xF0) === 0xE0) {
            // 4 byte: 1110xxxx
            $raw = fread($this->socket, 3);
            if (strlen($raw) < 3) return false;
            $len = (($len & 0x0F) << 24) | (ord($raw[0]) << 16) | (ord($raw[1]) << 8) | ord($raw[2]);
        } else {
            // 5 byte: 11110000
            $raw = fread($this->socket, 4);
            if (strlen($raw) < 4) return false;
            $len = (ord($raw[0]) << 24) | (ord($raw[1]) << 16) | (ord($raw[2]) << 8) | ord($raw[3]);
        }

        if ($len === 0) {
            return [0, ''];
        }
        $data = fread($this->socket, $len);
        return [$len, $data];
    }

    /**
     * Baca satu kalimat (!re / !done / !trap) sampai word kosong.
     */
    private function readSentence()
    {
        $sentence = [];
        while (true) {
            $w = $this->readWord();
            if ($w === false) {
                break;
            }
            list($len, $data) = $w;
            if ($len === 0) {
                break;
            }
            $sentence[] = $data;
        }
        return $sentence;
    }
}
