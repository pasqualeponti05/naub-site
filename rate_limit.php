<?php
// Rate limiting su file, per IP — nessun database necessario.
// Ritorna true se la richiesta è consentita, false se il limite è stato superato.
function naub_check_rate_limit(string $ip, int $maxAttempts, int $windowSeconds): bool {
    $logFile = __DIR__ . '/contact_log.json';

    $fp = fopen($logFile, 'c+');
    if (!$fp) {
        return true; // se il file non è scrivibile non blocchiamo per un problema nostro
    }
    flock($fp, LOCK_EX);

    $raw = stream_get_contents($fp);
    $log = $raw ? json_decode($raw, true) : [];
    if (!is_array($log)) $log = [];

    $now = time();

    // Pulizia: rimuove i tentativi più vecchi della finestra temporale, per tutti gli IP
    foreach ($log as $key => $timestamps) {
        $log[$key] = array_values(array_filter((array)$timestamps, function($t) use ($now, $windowSeconds) {
            return ($now - $t) < $windowSeconds;
        }));
        if (empty($log[$key])) unset($log[$key]);
    }

    $attempts = $log[$ip] ?? [];
    $allowed  = count($attempts) < $maxAttempts;

    if ($allowed) {
        $attempts[] = $now;
        $log[$ip] = $attempts;
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($log));
        fflush($fp);
    }

    flock($fp, LOCK_UN);
    fclose($fp);

    return $allowed;
}
