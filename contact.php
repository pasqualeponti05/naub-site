<?php
header('Content-Type: application/json; charset=utf-8');

// Solo richieste POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

// Honeypot anti-spam: campo nascosto che un bot compila, un umano no
if (!empty($_POST['website'])) {
    echo json_encode(['ok' => true]); // finge successo, ma non invia nulla
    exit;
}

// Tempo minimo di compilazione: un submit più rapido di 3s dal caricamento pagina è quasi certamente un bot
$loadedAt = (int) ($_POST['formLoadedAt'] ?? 0);
if ($loadedAt <= 0 || (time() - intdiv($loadedAt, 1000)) < 3) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'too_fast']);
    exit;
}

// Rate limit per IP: massimo 3 richieste ogni ora
require __DIR__ . '/rate_limit.php';
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if (!naub_check_rate_limit($ip, 3, 3600)) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => 'too_many_requests']);
    exit;
}

$name    = trim($_POST['name'] ?? '');
$email   = trim($_POST['email'] ?? '');
$message = trim($_POST['message'] ?? '');

if ($name === '' || $email === '' || $message === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'missing_fields']);
    exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid_email']);
    exit;
}

$config = require __DIR__ . '/config.php';
$apiKey = $config['resend_api_key'];

$subject = 'Nuova richiesta dal sito — ' . $name;
$body    = "Nome e brand: {$name}\nEmail: {$email}\n\nMessaggio:\n{$message}\n";

$payload = json_encode([
    'from'     => 'NAUB Sito <no-reply@mail.naub.it>', // deve appartenere al dominio verificato su Resend
    'to'       => ['amministrazione@naub.it'],
    'reply_to' => $email, // rispondendo dalla tua casella, scrivi direttamente al cliente
    'subject'  => $subject,
    'text'     => $body,
]);

$ch = curl_init('https://api.resend.com/emails');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $apiKey,
    'Content-Type: application/json',
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode >= 200 && $httpCode < 300) {
    echo json_encode(['ok' => true]);
} else {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'send_failed']);
}
