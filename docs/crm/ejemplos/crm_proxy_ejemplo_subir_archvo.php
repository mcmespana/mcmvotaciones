<?php


declare(strict_types=1);

session_start();

header('Content-Type: application/json; charset=utf-8');

// CORS: normalmente no lo necesitas si el front está en el mismo dominio.
// Si lo llamas desde otro dominio, esto lo habilita de forma "reflejada".
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Vary: Origin');
  header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
  http_response_code(204);
  exit;
}

/** ===================== CONFIG ===================== **/

const CRM_URL  = 'https://crm.example.org/service/v4_1/rest.php';
const CRM_USER = '<CRM_USER>';
const CRM_PASS = '<CRM_PASSWORD>';


// Seguridad mínima: token compartido (no lo dejes como "1234", por tu bien)
const PROXY_TOKEN = '';

// Logs en tu servidor WordPress (no en el CRM)
const LOG_DIR_REL = '/wp-content/uploads/mat_form_logs';

// DNI field (custom)
const DNI_FIELD = 'stic_identification_number_c';

// Document config
const DOC_CATEGORY_ID = 'formacion_titulo_mat';
const DOC_STATUS      = 'Active';     // ajusta si tu CRM usa otro valor
const DOC_REVISION    = '1';
const DOC_DESCRIPTION = 'Subido automáticamente a través del formulario de monitores en el Wordpress de Comunica';

// Límites de archivo
const MAX_FILE_BYTES = 12_000_000; // 12 MB
const ALLOWED_MIME   = 'application/pdf';

// Timeouts (segundos)
const CONNECT_TIMEOUT = 15;
const DEFAULT_TIMEOUT = 40;
const UPLOAD_TIMEOUT  = 90;  // aunque sea feo, al menos no muere en 60s
/** ================================================== **/

/** ===================== Helpers ===================== **/
function wp_root_guess(): string {
  return rtrim($_SERVER['DOCUMENT_ROOT'] ?? __DIR__, '/');
}

function log_dir_abs(): string {
  return wp_root_guess() . LOG_DIR_REL;
}

function ensure_log_dir(): void {
  $dir = log_dir_abs();
  if (!is_dir($dir)) {
    @mkdir($dir, 0755, true);
  }
}

function write_log(string $tag, array $data): void {
  ensure_log_dir();
  $dir = log_dir_abs();
  $file = $dir . '/mat_' . date('Y-m-d') . '.log';

  // evita logs gigantes si se cuela algo raro
  $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  if ($json !== false && strlen($json) > 8000) {
    $json = substr($json, 0, 8000) . '...TRUNCATED';
  }

  $line = '[' . date('c') . "][$tag] " . ($json ?: 'LOG_ENCODE_ERROR') . PHP_EOL;
  @file_put_contents($file, $line, FILE_APPEND);
}

function respond(int $http, array $payload): void {
  http_response_code($http);
  echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function read_json_body(): array {
  $raw = file_get_contents('php://input');
  if (!$raw) return [];
  $j = json_decode($raw, true);
  return is_array($j) ? $j : [];
}

function sanitize_dni(string $dni): string {
  $dni = strtoupper(trim($dni));
  $dni = preg_replace('/[^0-9A-Z]/', '', $dni) ?? '';
  return $dni;
}

function safe_filename(string $name): string {
  $name = trim($name);
  $name = preg_replace('/[^\pL\pN\.\-\_\s]/u', '', $name) ?? '';
  $name = preg_replace('/\s+/', ' ', $name) ?? '';
  return $name;
}

/**
 * HTTP POST hacia CRM con cURL, devolviendo:
 * - http code
 * - headers/body
 * - timing info (curl_getinfo)
 */
function crm_http_post(array $postFields, int $timeoutSeconds): array {
  $ch = curl_init(CRM_URL);

  // IMPORTANTES:
  // - 'Expect:' evita el 100-continue que a veces mete delays absurdos en uploads.
  // - IPv4 forzado si tu host/CRM hacen cosas raras con IPv6.
  $headers = [
    'Content-Type: application/x-www-form-urlencoded',
    'Expect:',
    'Connection: keep-alive',
  ];

  curl_setopt_array($ch, [
    CURLOPT_POST            => true,
    CURLOPT_POSTFIELDS      => http_build_query($postFields),
    CURLOPT_RETURNTRANSFER  => true,
    CURLOPT_HEADER          => true,
    CURLOPT_TIMEOUT         => $timeoutSeconds,
    CURLOPT_CONNECTTIMEOUT  => CONNECT_TIMEOUT,
    CURLOPT_HTTPHEADER      => $headers,
    CURLOPT_HTTP_VERSION    => CURL_HTTP_VERSION_1_1,
    CURLOPT_IPRESOLVE       => CURL_IPRESOLVE_V4,
  ]);

  $resp = curl_exec($ch);
  $err  = curl_error($ch);
  $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $hdrSize = (int)curl_getinfo($ch, CURLINFO_HEADER_SIZE);
  $info = curl_getinfo($ch);

  curl_close($ch);

  if ($resp === false) {
    return [
      'ok' => false,
      'http' => 0,
      'error' => 'cURL error',
      'raw' => $err,
      'timing' => $info,
    ];
  }

  $headersOut = substr($resp, 0, $hdrSize);
  $bodyOut    = substr($resp, $hdrSize);

  return [
    'ok' => true,
    'http' => $code,
    'headers' => $headersOut,
    'body' => $bodyOut,
    'timing' => $info,
  ];
}

function crm_call(string $method, array $params, int $timeoutSeconds = DEFAULT_TIMEOUT): array {
  $post = [
    'method' => $method,
    'input_type' => 'JSON',
    'response_type' => 'JSON',
    'rest_data' => json_encode($params, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
  ];

  $r = crm_http_post($post, $timeoutSeconds);

  // Logging de timings sin filtrar datos sensibles (ni base64)
  $timing = $r['timing'] ?? null;
  write_log('crm_timing', [
    'method' => $method,
    'http' => $r['http'] ?? 0,
    'ok' => $r['ok'] ?? false,
    'timing' => [
      'namelookup_time' => $timing['namelookup_time'] ?? null,
      'connect_time' => $timing['connect_time'] ?? null,
      'appconnect_time' => $timing['appconnect_time'] ?? null,
      'pretransfer_time' => $timing['pretransfer_time'] ?? null,
      'starttransfer_time' => $timing['starttransfer_time'] ?? null,
      'total_time' => $timing['total_time'] ?? null,
      'primary_ip' => $timing['primary_ip'] ?? null,
    ]
  ]);

  $out = [
    'method' => $method,
    'http' => $r['http'] ?? 0,
  ];

  if (!($r['ok'] ?? false)) {
    $out['ok'] = false;
    $out['error'] = $r['error'] ?? 'HTTP error';
    $out['raw'] = $r['raw'] ?? '';
    $out['timing'] = $r['timing'] ?? null;
    return $out;
  }

  $body = (string)($r['body'] ?? '');
  $json = json_decode($body, true);

  if (!is_array($json)) {
    $out['ok'] = false;
    $out['error'] = 'Respuesta no-JSON del CRM';
    $out['raw'] = mb_substr($body, 0, 2000);
    $out['timing'] = $r['timing'] ?? null;
    return $out;
  }

  $out['ok'] = true;
  $out['data'] = $json;
  $out['timing'] = $r['timing'] ?? null;
  return $out;
}

function require_token(?string $token): void {
  $token = $token ?? '';
  if ($token === '' || !hash_equals(PROXY_TOKEN, $token)) {
    respond(403, ['ok' => false, 'error' => 'Token inválido o ausente']);
  }
}

function crm_login(): array {
  if (!empty($_SESSION['crm_session_id'])) {
    return ['ok' => true, 'session' => $_SESSION['crm_session_id'], 'cached' => true];
  }

  $params = [
    'user_auth' => [
      'user_name' => CRM_USER,
      'password'  => md5(CRM_PASS),
      'version'   => '1',
    ],
    'application_name' => 'WP MAT Form',
  ];

  $r = crm_call('login', $params, DEFAULT_TIMEOUT);
  if (!($r['ok'] ?? false)) return $r;

  $sid = $r['data']['id'] ?? '';
  if (!$sid) {
    return ['ok' => false, 'error' => 'Login sin session id', 'raw' => $r['data'] ?? null];
  }

  $_SESSION['crm_session_id'] = $sid;
  return ['ok' => true, 'session' => $sid, 'cached' => false];
}

function crm_lookup_contact_by_dni(string $dni, string $sid): array {
  // STIC: campo en contacts_cstm
  $query = "contacts_cstm." . DNI_FIELD . " = '" . addslashes($dni) . "'";

  $params = [
    'session' => $sid,
    'module_name' => 'Contacts',
    'query' => $query,
    'order_by' => '',
    'offset' => 0,
    'select_fields' => ['id', 'first_name', 'last_name'],
    'link_name_to_fields_array' => [],
    'max_results' => 2,
    'deleted' => 0,
  ];

  $r = crm_call('get_entry_list', $params, DEFAULT_TIMEOUT);
  if (!($r['ok'] ?? false)) return $r;

  $list = $r['data']['entry_list'] ?? [];
  if (!is_array($list) || count($list) === 0) {
    return ['ok' => true, 'found' => false];
  }
  if (count($list) > 1) {
    return ['ok' => false, 'error' => 'DNI duplicado: hay más de una persona con ese DNI'];
  }

  $first = $list[0] ?? null;
  if (!is_array($first)) {
    return ['ok' => false, 'error' => 'Formato inesperado entry_list'];
  }

  $id = $first['id'] ?? '';
  $nvl = $first['name_value_list'] ?? [];

  $fn = $nvl['first_name']['value'] ?? '';
  $ln = $nvl['last_name']['value'] ?? '';

  return [
    'ok' => true,
    'found' => (bool)$id,
    'contact' => [
      'id' => $id,
      'first_name' => $fn,
      'last_name' => $ln,
      'full_name' => trim($fn . ' ' . $ln),
    ],
  ];
}

/**
 * Tras un timeout en set_document_revision, intentamos verificar si el CRM creó la revision igualmente.
 */
function verify_revision_exists(string $sid, string $documentId, string $revision): array {
  // En SuiteCRM suele ser document_revisions.document_id / revision
  $query = "document_revisions.document_id = '" . addslashes($documentId) . "' AND document_revisions.revision = '" . addslashes($revision) . "'";

  $params = [
    'session' => $sid,
    'module_name' => 'DocumentRevisions',
    'query' => $query,
    'order_by' => '',
    'offset' => 0,
    'select_fields' => ['id', 'document_id', 'revision', 'filename'],
    'link_name_to_fields_array' => [],
    'max_results' => 1,
    'deleted' => 0,
  ];

  return crm_call('get_entry_list', $params, DEFAULT_TIMEOUT);
}

/** ===================== ROUTER ===================== **/
$action = $_GET['action'] ?? '';

if ($action === 'lookup') {
  $body = read_json_body();
  // require_token($body['token'] ?? null);

  $dni  = sanitize_dni((string)($body['dni'] ?? ''));
  if ($dni === '') respond(400, ['ok' => false, 'error' => 'DNI vacío']);

  $trace = [];

  $login = crm_login();
  $trace[] = ['step' => 'login', 'ok' => $login['ok'] ?? false, 'cached' => $login['cached'] ?? null];

  if (!($login['ok'] ?? false)) {
    write_log('lookup_login_fail', ['dni' => $dni, 'login' => $login]);
    respond(502, ['ok' => false, 'error' => 'Login CRM falló', 'detail' => $login, 'trace' => $trace]);
  }

  $sid = $login['session'];

  $res = crm_lookup_contact_by_dni($dni, $sid);
  $trace[] = ['step' => 'get_entry_list Contacts', 'ok' => $res['ok'] ?? false];

  if (!($res['ok'] ?? false)) {
    write_log('lookup_fail', ['dni' => $dni, 'res' => $res]);
    respond(502, ['ok' => false, 'error' => 'Lookup falló', 'detail' => $res, 'trace' => $trace]);
  }

  write_log('lookup_ok', ['dni' => $dni, 'found' => $res['found'] ?? false, 'contact' => $res['contact'] ?? null]);

  respond(200, [
    'ok' => true,
    'dni' => $dni,
    'found' => $res['found'],
    'contact' => $res['contact'] ?? null,
    'trace' => $trace
  ]);
}

if ($action === 'upload_mat') {
  // multipart/form-data
  //require_token($_POST['token'] ?? null);

  $dni = sanitize_dni((string)($_POST['dni'] ?? ''));
  $contactId = (string)($_POST['contact_id'] ?? '');

  if ($dni === '' || $contactId === '') {
    respond(400, ['ok' => false, 'error' => 'Falta dni o contact_id']);
  }

  if (empty($_FILES['mat_file'])) {
    respond(400, ['ok' => false, 'error' => 'Falta mat_file']);
  }

  $f = $_FILES['mat_file'];

  if (($f['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
    respond(400, ['ok' => false, 'error' => 'Error subiendo archivo', 'php_upload_error' => $f['error']]);
  }

  $size = (int)($f['size'] ?? 0);
  if ($size <= 0 || $size > MAX_FILE_BYTES) {
    respond(400, ['ok' => false, 'error' => 'Tamaño inválido o demasiado grande', 'max_bytes' => MAX_FILE_BYTES]);
  }

  $tmp = (string)($f['tmp_name'] ?? '');
  $mime = function_exists('mime_content_type') ? (string)@mime_content_type($tmp) : '';
  if ($mime !== '' && $mime !== ALLOWED_MIME) {
    respond(400, ['ok' => false, 'error' => 'El archivo debe ser PDF', 'mime' => $mime]);
  }

  $pdfBytes = @file_get_contents($tmp);
  if ($pdfBytes === false) {
    respond(500, ['ok' => false, 'error' => 'No se pudo leer el archivo temporal']);
  }

  $trace = [];

  // 1) login
  $login = crm_login();
  $trace[] = ['step' => 'login', 'ok' => $login['ok'] ?? false, 'cached' => $login['cached'] ?? null];
  if (!($login['ok'] ?? false)) {
    write_log('upload_login_fail', ['dni' => $dni, 'contact_id' => $contactId, 'login' => $login]);
    respond(502, ['ok' => false, 'error' => 'Login CRM falló', 'detail' => $login, 'trace' => $trace]);
  }
  $sid = $login['session'];

  // 2) Leer contacto (nombre)
  $getContact = crm_call('get_entry', [
    'session' => $sid,
    'module_name' => 'Contacts',
    'id' => $contactId,
    'select_fields' => ['first_name', 'last_name'],
    'link_name_to_fields_array' => [],
  ], DEFAULT_TIMEOUT);

  $trace[] = ['step' => 'get_entry Contacts', 'ok' => $getContact['ok'] ?? false];

  if (!($getContact['ok'] ?? false)) {
    write_log('upload_get_contact_fail', ['dni' => $dni, 'contact_id' => $contactId, 'res' => $getContact]);
    respond(502, ['ok' => false, 'error' => 'No se pudo leer el contacto', 'detail' => $getContact, 'trace' => $trace]);
  }

  $entry = $getContact['data']['entry_list'][0]['name_value_list'] ?? [];
  $firstName = (string)($entry['first_name']['value'] ?? '');
  $lastName  = (string)($entry['last_name']['value'] ?? '');
  $fullName  = trim($firstName . ' ' . $lastName);

  $docBaseName = safe_filename('MAT - ' . ($fullName ?: $dni));
  $fileName    = $docBaseName . '.pdf';

  // 3) Crear Document
  $createDoc = crm_call('set_entry', [
    'session' => $sid,
    'module_name' => 'Documents',
    'name_value_list' => [
      ['name' => 'document_name', 'value' => $docBaseName],
      ['name' => 'filename', 'value' => $fileName],
      ['name' => 'revision', 'value' => DOC_REVISION],
      ['name' => 'status', 'value' => DOC_STATUS],
      ['name' => 'category_id', 'value' => DOC_CATEGORY_ID],
      ['name' => 'description', 'value' => DOC_DESCRIPTION],
    ],
  ], DEFAULT_TIMEOUT);

  $trace[] = ['step' => 'set_entry Documents', 'ok' => $createDoc['ok'] ?? false, 'http' => $createDoc['http'] ?? null];

  if (!($createDoc['ok'] ?? false)) {
    write_log('upload_create_doc_fail', ['dni' => $dni, 'contact_id' => $contactId, 'res' => $createDoc]);
    respond(502, ['ok' => false, 'error' => 'No se pudo crear el documento', 'detail' => $createDoc, 'trace' => $trace]);
  }

  $docId = $createDoc['data']['id'] ?? '';
  if (!$docId) {
    write_log('upload_create_doc_no_id', ['dni' => $dni, 'contact_id' => $contactId, 'res' => $createDoc]);
    respond(502, ['ok' => false, 'error' => 'Documento creado sin id', 'detail' => $createDoc, 'trace' => $trace]);
  }

  // 4) Vincular Document a Contact
  $link = crm_call('set_relationship', [
    'session' => $sid,
    'module_name' => 'Contacts',
    'module_id' => $contactId,
    'link_field_name' => 'documents',
    'related_ids' => [$docId],
    'name_value_list' => [],
    'delete' => 0,
  ], DEFAULT_TIMEOUT);

  $trace[] = ['step' => 'set_relationship Contacts.documents -> Document', 'ok' => $link['ok'] ?? false, 'http' => $link['http'] ?? null];

  if (!($link['ok'] ?? false)) {
    write_log('upload_link_fail', ['dni' => $dni, 'contact_id' => $contactId, 'doc_id' => $docId, 'res' => $link]);
    respond(502, ['ok' => false, 'error' => 'No se pudo vincular documento-persona', 'detail' => $link, 'trace' => $trace]);
  }

  // 5) Subir revisión (el paso lento)
  // IMPORTANTE: aquí va timeout UPLOAD_TIMEOUT, y luego verificación post-timeout.
  $uploadRev = crm_call('set_document_revision', [
    'session' => $sid,
    'document_revision' => [
      'id' => $docId,
      'revision' => DOC_REVISION,
      'filename' => $fileName,
      'file_mime_type' => ALLOWED_MIME,
      'file' => base64_encode($pdfBytes),
    ],
  ], UPLOAD_TIMEOUT);

  $trace[] = ['step' => 'set_document_revision', 'ok' => $uploadRev['ok'] ?? false, 'http' => $uploadRev['http'] ?? null];

  if (!($uploadRev['ok'] ?? false)) {
    // Si es timeout (cURL error), intentamos verificar si el CRM creó la revision igualmente.
    $isCurlTimeout = (($uploadRev['error'] ?? '') === 'cURL error') && (stripos((string)($uploadRev['raw'] ?? ''), 'timed out') !== false);

    if ($isCurlTimeout) {
      write_log('upload_revision_timeout', [
        'dni' => $dni,
        'contact_id' => $contactId,
        'doc_id' => $docId,
        'detail' => $uploadRev
      ]);

      // Espera corta para que el CRM termine de guardar
      usleep(900000); // 0.9s

      $check = verify_revision_exists($sid, $docId, DOC_REVISION);
      $trace[] = ['step' => 'verify DocumentRevisions after timeout', 'ok' => $check['ok'] ?? false];

      if (($check['ok'] ?? false) && !empty($check['data']['entry_list'])) {
        $revId = $check['data']['entry_list'][0]['id'] ?? null;

        write_log('upload_verified_after_timeout', [
          'dni' => $dni,
          'contact_id' => $contactId,
          'doc_id' => $docId,
          'rev_id' => $revId,
          'filename' => $fileName,
        ]);

        respond(200, [
          'ok' => true,
          'note' => 'Revisión verificada tras timeout (el CRM respondió tarde).',
          'verified_after_timeout' => true,
          'dni' => $dni,
          'contact' => ['id' => $contactId, 'full_name' => $fullName],
          'document' => ['id' => $docId, 'document_name' => $docBaseName, 'filename' => $fileName],
          'revision' => ['id' => $revId],
          'trace' => $trace,
        ]);
      }

      // Si no se pudo verificar, devolvemos error con trazas.
      respond(502, [
        'ok' => false,
        'error' => 'Timeout subiendo revisión y no se pudo verificar en DocumentRevisions.',
        'detail' => $uploadRev,
        'verify_detail' => $check,
        'trace' => $trace,
      ]);
    }

    // No era timeout: error real.
    write_log('upload_revision_fail', ['dni' => $dni, 'contact_id' => $contactId, 'doc_id' => $docId, 'res' => $uploadRev]);
    respond(502, ['ok' => false, 'error' => 'No se pudo subir la revisión del documento', 'detail' => $uploadRev, 'trace' => $trace]);
  }

  $revId = $uploadRev['data']['id'] ?? null;

  write_log('upload_ok', [
    'dni' => $dni,
    'contact_id' => $contactId,
    'doc_id' => $docId,
    'rev_id' => $revId,
    'filename' => $fileName
  ]);

  respond(200, [
    'ok' => true,
    'dni' => $dni,
    'contact' => ['id' => $contactId, 'full_name' => $fullName],
    'document' => ['id' => $docId, 'document_name' => $docBaseName, 'filename' => $fileName],
    'revision' => ['id' => $revId],
    'verified_after_timeout' => false,
    'trace' => $trace,
  ]);
}

// Si llega aquí…
respond(404, ['ok' => false, 'error' => 'Acción no válida']);

