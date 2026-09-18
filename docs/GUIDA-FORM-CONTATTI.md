# Guida: implementare il form di contatto per l'hosting

## 1. Situazione attuale

Il form in `#contatti` ([index.html:381](../index.html#L381)) oggi funziona così ([js/script.js:196-207](../js/script.js#L196-L207)):

- alla submit, JS costruisce un link `mailto:info@naub.it?subject=...&body=...`
- il browser apre il client di posta dell'utente (Outlook, Mail, Gmail desktop app...) con i campi precompilati
- l'utente deve premere "Invia" lui stesso nel proprio client

**Limiti di questo approccio:**
- su mobile/desktop senza client email configurato, non succede nulla o si apre una finestra vuota
- l'invio non è garantito: se l'utente chiude la finestra, il messaggio non parte
- non hai un salvataggio/log delle richieste ricevute

Per un form "vero" (che invia davvero, senza dipendere dal client email dell'utente) servono due pezzi:
1. **un endpoint che riceve i dati** (dove "arrivano" nome/email/messaggio)
2. **JS che invia i dati con `fetch`** invece di aprire `mailto:`

Il sito è statico (HTML/CSS/JS puro, nessun server Node/backend), quindi il punto 1 va scelto in base a **cosa offre l'hosting**.

---

## 2. Scelta dell'approccio in base all'hosting

### Opzione A — Script PHP + Resend (consigliata)

Aruba (e quasi tutti gli hosting condivisi italiani) include **PHP** anche nei piani base, senza bisogno di Node.js o database. Usiamo PHP solo come "ponte" verso [Resend](https://resend.com): un servizio di invio email transazionali con piano gratuito da 3000 email/mese, deliverability molto migliore della `mail()` nativa di PHP (niente rischio spam) e una dashboard con storico invii.

**Come funziona:**
1. carichi un file `contact.php` nella stessa cartella di `index.html` (via FTP o File Manager del pannello Aruba)
2. il form fa una `fetch('contact.php', {method:'POST', ...})`
3. `contact.php` legge i dati, li valida, e chiama l'API di Resend passando la chiave segreta **lato server** — il browser non la vede mai

**Perché non chiamare Resend direttamente dal JS del browser:** la API key è segreta. Se la mettessi nel JS, chiunque apra i DevTools potrebbe copiarla e usarla per spedire email a tuo nome o esaurire la tua quota gratuita. Passando da PHP la chiave resta sul server.

**Pro:** deliverability alta, dashboard con log degli invii, 3000 email/mese gratis, nessun account utente lato visitatore.
**Contro:** richiede una registrazione su resend.com e la verifica del tuo dominio (2 record DNS da aggiungere sul pannello Aruba) per inviare da un indirizzo tipo `no-reply@naub.it`.

### Opzione B — Servizio di terze parti (Formspree, Web3Forms, EmailJS)

Se non vuoi/puoi usare PHP (es. hosting solo file statici, o vuoi evitare di gestire uno script server-side), esistono servizi gratuiti che ricevono la POST del form e inoltrano l'email per te. Non serve nessun file server-side, solo modificare l'HTML.

**Pro:** zero codice server, funziona anche su hosting 100% statico o su Netlify/Vercel/GitHub Pages.
**Contro:** dipendi da un servizio esterno (piano gratuito con limiti mensili, es. 50-100 invii/mese); i dati del form passano dal loro server.

Consigliati (piano gratuito sufficiente per un sito vetrina):
- **Web3Forms** (web3forms.com) — nessuna registrazione complessa, solo una "access key", nessun account utente da creare per il form base
- **Formspree** (formspree.io) — molto diffuso, dashboard con storico messaggi
- **EmailJS** (emailjs.com) — invia direttamente dal browser via il tuo provider email (Gmail, Outlook...)

---

## 3. Implementazione — Opzione A (PHP + Resend)

### 3.0 Crea l'account Resend e verifica il dominio

1. registrati su [resend.com](https://resend.com) (gratis, 3000 email/mese)
2. dalla dashboard vai su **Domains → Add Domain** e inserisci `naub.it` (o il dominio che userai)
3. Resend ti mostra 2-3 record DNS (tipo TXT/MX per SPF/DKIM) da aggiungere: vai sul pannello DNS di Aruba (Gestione dominio → DNS) e incollali così come richiesto
4. dopo la propagazione (di solito pochi minuti/ore) il dominio risulta "Verified" — da quel momento puoi inviare da `no-reply@naub.it`
5. genera una **API key** da Resend (Settings → API Keys): questa è la chiave segreta da usare in `contact.php`

### 3.1 Crea `config.php` con la chiave segreta (NON va su Git)

```php
<?php
return [
    'resend_api_key' => 'INCOLLA_QUI_LA_TUA_API_KEY',
];
```

Salva questo file come `config.php` nella stessa cartella di `contact.php` e **caricalo solo via FTP/File Manager di Aruba**, senza mai committarlo su GitHub (anche se il repo è privato, è buona norma non far girare chiavi segrete su git). Aggiungi `config.php` al `.gitignore` del progetto.

### 3.2 Protezione anti-spam / anti-abuso

Per evitare che qualcuno (persona o bot) intasi la tua casella o esaurisca le 3000 email/mese gratuite, mettiamo **tre livelli di difesa**, tutti lato server (un client può sempre bypassare i controlli JS, quindi la vera protezione deve stare in `contact.php`):

1. **Honeypot** (già previsto): un campo nascosto che solo i bot compilano.
2. **Controllo tempo minimo di compilazione:** un bot spesso invia il form in meno di 1-2 secondi dal caricamento pagina; un umano no. Il form registra quando la pagina è stata caricata e `contact.php` rifiuta submit troppo rapide.
3. **Rate limit per IP:** massimo **3 richieste ogni ora** dallo stesso indirizzo IP. Non serve un database: basta un file JSON sul server che tiene traccia di IP + orario degli invii, con lock per evitare problemi in caso di richieste simultanee.

Crea `rate_limit.php` nella stessa cartella di `contact.php`:

```php
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
```

Poi crea un file `.htaccess` (sempre nella stessa cartella) per impedire che `contact_log.json` sia leggibile visitando direttamente il suo URL — altrimenti chiunque potrebbe vedere gli IP registrati:

```apache
<IfModule mod_authz_core.c>
  <Files "contact_log.json">
    Require all denied
  </Files>
</IfModule>
<IfModule !mod_authz_core.c>
  <Files "contact_log.json">
    Order allow,deny
    Deny from all
  </Files>
</IfModule>
```

(I due blocchi coprono sia Apache 2.4+ che versioni precedenti — su Aruba di norma è Apache 2.4, ma così la regola funziona comunque.)

### 3.3 Crea `contact.php` nella root del sito (stessa cartella di `index.html`)

```php
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
    'from'     => 'NAUB Sito <no-reply@naub.it>', // deve appartenere al dominio verificato su Resend
    'to'       => ['info@naub.it'],
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
```

**Nota sul mittente `no-reply@naub.it`:** deve appartenere al dominio che hai verificato su Resend (punto 3.0), altrimenti l'invio viene rifiutato con un errore dall'API.

### 3.4 Aggiorna il form in `index.html`

Aggiungi il campo honeypot **e** il campo nascosto per il controllo del tempo minimo, subito dentro `<form class="form-card" id="contactForm">`:

```html
<input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px;" aria-hidden="true">
<input type="hidden" name="formLoadedAt" id="cf-loaded-at">
```

`formLoadedAt` viene valorizzato via JS (vedi punto 3.5): è il timestamp di quando la pagina è stata caricata, usato da `contact.php` per scartare submit troppo rapide (bot).

Il resto del form (`name`, `email`, `message`) resta identico: gli `id`/`name` già presenti in [index.html:384-392](../index.html#L384-L392) vanno benissimo così come sono.

### 3.5 Sostituisci la logica in `js/script.js`

Rimpiazza il blocco attuale (righe 196-207) con una vera submit via `fetch`:

```javascript
// Contact form -> invio reale via contact.php
var form = document.getElementById('contactForm');

// Timestamp di caricamento pagina, usato dal server per scartare submit troppo rapide (bot)
document.getElementById('cf-loaded-at').value = Date.now();

var errorMessages = {
  too_fast: 'Invio troppo rapido, riprova tra qualche secondo.',
  too_many_requests: 'Hai raggiunto il numero massimo di richieste. Riprova più tardi o scrivici a info@naub.it.'
};

form.addEventListener('submit', function(e){
  e.preventDefault();

  var submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Invio in corso...';

  fetch('contact.php', {
    method: 'POST',
    body: new FormData(form)
  })
    .then(function(res){ return res.json(); })
    .then(function(data){
      if (data.ok) {
        form.hidden = true;
        document.getElementById('formSuccess').hidden = false;
      } else {
        throw new Error(data.error || 'send_failed');
      }
    })
    .catch(function(err){
      submitBtn.disabled = false;
      submitBtn.textContent = 'Invia richiesta';
      var msg = errorMessages[err.message] || 'Invio non riuscito. Riprova o scrivici direttamente a info@naub.it.';
      alert(msg);
    });
});
```

Aggiorna anche il testo in [index.html:395](../index.html#L395) ("Il pulsante apre il tuo client email...") perché non sarà più vero — sostituiscilo con qualcosa tipo "Ti risponderemo entro 24 ore lavorative all'indirizzo indicato."

### 3.6 Pubblicazione su Aruba

1. accedi al pannello Aruba (o al File Manager / FTP del piano hosting)
2. carica `index.html`, le cartelle `css/`, `js/`, `assets/`, e i nuovi `contact.php`, `rate_limit.php`, `.htaccess` nella cartella pubblica del dominio (di solito si chiama `public_html` o `httpdocs`)
3. carica `config.php` solo via FTP/File Manager: non deve mai finire nel repository Git, nemmeno privato
4. verifica che il dominio punti a quella cartella
5. testa il form dal sito online (in locale `contact.php` non funziona: serve un server PHP attivo, che sul tuo PC non c'è a meno di installare XAMPP/WAMP); `contact_log.json` viene creato automaticamente al primo invio, non serve caricarlo

---

## 4. Se le email finiscono in spam o l'invio fallisce

- **Dominio non verificato su Resend:** l'API risponde con un errore e `contact.php` restituirà `send_failed`. Controlla lo stato "Verified" in Resend → Domains.
- **`from` che non appartiene al dominio verificato:** Resend rifiuta l'invio. Deve essere sempre `qualcosa@naub.it` (o il dominio che hai verificato).
- **Vuoi vedere gli errori esatti:** la dashboard Resend (Logs) mostra ogni tentativo di invio con la risposta dell'API — utile per il debug senza dover leggere i log PHP di Aruba.
- **Superi le 3000 email/mese gratuite:** Resend passa a piani a pagamento (comunque economici); per un form di contatto di un sito vetrina è un limite molto difficile da raggiungere.

---

## 5. Riepilogo scelta rapida

| Situazione | Approccio consigliato |
|---|---|
| Hosting Aruba (o simile) con PHP incluso — **scelta consigliata** | **Opzione A** — `contact.php` + Resend |
| Hosting solo file statici / vuoi zero manutenzione server | **Opzione B** — Web3Forms o Formspree |
| Non vuoi registrarti su un servizio esterno | Variante di Opzione A con `mail()` nativa PHP al posto di Resend (deliverability inferiore, nessuna registrazione richiesta) |
