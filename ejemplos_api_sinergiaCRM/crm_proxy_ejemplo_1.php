<?php
// crm_proxy.php — Proxy WordPress -> SinergiaCRM (busca por DNI y devuelve datos ordenados)

// ====== CONFIG ======
$CRM_URL = 'https://movimientoconsolacion.sinergiacrm.org/custom/service/v4_1_SticCustom/rest.php';
// Alternativa si hiciera falta:
// $CRM_URL = 'https://movimientoconsolacion.sinergiacrm.org/service/v4_1/rest.php';

$CRM_USER = 'api_user';
$CRM_PASS = 'w780kAp6GeG&EEffJBe0iVa)';

// (Opcional recomendado) Limitar a tu dominio WP (rellénalo si quieres)
// $ALLOWED_ORIGINS = ['https://tudominio.com', 'https://www.tudominio.com'];
$ALLOWED_ORIGINS = []; // vacío = permite cualquiera (para pruebas)

// ====== Helpers ======
function respond($data, $code = 200) {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data);
  exit;
}

function postToCRM($CRM_URL, $payload) {
  $ch = curl_init($CRM_URL);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($payload));
  curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
  curl_setopt($ch, CURLOPT_TIMEOUT, 30);
  $res = curl_exec($ch);
  $err = curl_error($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($res === false) {
    respond(['error' => 'Proxy cURL error', 'details' => $err], 502);
  }
  $json = json_decode($res, true);
  if (!is_array($json)) {
    respond(['error' => 'CRM response not JSON', 'raw' => $res], 502);
  }
  return [$json, $code ?: 200];
}

function normalizeMulti($v) {
  // multi-enum típico: ^A^,^B^
  $v = trim((string)$v);
  if ($v === '') return [];
  $v = str_replace('^', '', $v);
  $parts = array_map('trim', explode(',', $v));
  $parts = array_values(array_filter($parts, fn($x) => $x !== ''));
  return $parts;
}

// ====== CORS ======
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (!empty($ALLOWED_ORIGINS)) {
  if ($origin && in_array($origin, $ALLOWED_ORIGINS, true)) {
    header("Access-Control-Allow-Origin: $origin");
  }
} else {
  header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(['error' => 'Use POST'], 405);

// ====== INPUT ======
$raw = file_get_contents('php://input');
$in = json_decode($raw, true);
if (!is_array($in)) $in = $_POST;

$dni = trim((string)($in['dni'] ?? ''));
if ($dni === '') respond(['error' => 'Missing dni'], 400);
if (strlen($dni) > 32) respond(['error' => 'DNI too long'], 400);

// ====== DEFINICIÓN DE CAMPOS (ordenados) ======
// Estándar típico de Personas/Contacts (según wiki de SinergiaCRM) :contentReference[oaicite:1]{index=1}
// + tus campos custom.
$sections = [
  [
    'title' => 'Identificación',
    'fields' => [
      ['name'=>'salutation','label'=>'Saludo','type'=>'text'],
      ['name'=>'first_name','label'=>'Nombre','type'=>'text'],
      ['name'=>'last_name','label'=>'Apellidos','type'=>'text'],
      ['name'=>'stic_identification_number_c','label'=>'DNI/NIF','type'=>'text'],
      ['name'=>'birthdate','label'=>'Fecha de nacimiento','type'=>'text'],
      ['name'=>'account_name','label'=>'Organización','type'=>'text'],
      ['name'=>'title','label'=>'Puesto de trabajo','type'=>'text'],
      ['name'=>'department','label'=>'Departamento','type'=>'text'],
      ['name'=>'assigned_user_name','label'=>'Asignado a','type'=>'text'],
    ]
  ],
  [
    'title' => 'Contacto',
    'fields' => [
      ['name'=>'email1','label'=>'Email','type'=>'text'],
      ['name'=>'phone_mobile','label'=>'Móvil','type'=>'text'],
      ['name'=>'phone_home','label'=>'Tel. Casa','type'=>'text'],
      ['name'=>'phone_work','label'=>'Tel. Oficina','type'=>'text'],
      ['name'=>'phone_other','label'=>'Tel. Alternativo','type'=>'text'],
      ['name'=>'phone_fax','label'=>'Fax','type'=>'text'],
      ['name'=>'do_not_call','label'=>'No llamar','type'=>'checkbox'],
      ['name'=>'email_opt_out','label'=>'Rehusar Email','type'=>'checkbox'],
    ]
  ],
  [
    'title' => 'Dirección principal',
    'fields' => [
      ['name'=>'primary_address_street','label'=>'Calle','type'=>'text'],
      ['name'=>'primary_address_city','label'=>'Población','type'=>'text'],
      ['name'=>'primary_address_state','label'=>'Provincia','type'=>'text'],
      ['name'=>'primary_address_postalcode','label'=>'Código postal','type'=>'text'],
      ['name'=>'primary_address_country','label'=>'País','type'=>'text'],
    ]
  ],
  [
    'title' => 'Dirección alternativa',
    'fields' => [
      ['name'=>'alt_address_street','label'=>'Calle','type'=>'text'],
      ['name'=>'alt_address_city','label'=>'Población','type'=>'text'],
      ['name'=>'alt_address_state','label'=>'Provincia','type'=>'text'],
      ['name'=>'alt_address_postalcode','label'=>'Código postal','type'=>'text'],
      ['name'=>'alt_address_country','label'=>'País','type'=>'text'],
    ]
  ],
  [
    'title' => 'Consentimientos / base legal',
    'fields' => [
      ['name'=>'lawful_basis','label'=>'Base legal','type'=>'multiselect'],
      ['name'=>'lawful_basis_source','label'=>'Fuente base legal','type'=>'text'],
      ['name'=>'date_reviewed','label'=>'Fecha base legal revisada','type'=>'text'],
      ['name'=>'lead_source','label'=>'Toma de contacto','type'=>'text'],
      ['name'=>'stic_acquisition_channel_c','label'=>'Canal de adquisición','type'=>'text'],
      ['name'=>'stic_preferred_contact_channel_c','label'=>'Canal de contacto favorito','type'=>'text'],
    ]
  ],
  [
    'title' => 'Área privada (SinergiaTIC)',
    'fields' => [
      ['name'=>'stic_pa_username_c','label'=>'Usuario AP','type'=>'text'],
      ['name'=>'stic_pa_password_c','label'=>'Password AP','type'=>'masked'],
    ]
  ],
  [
    'title' => 'Tus campos (formación, etapas, etc.)',
    'fields' => [
      ['name'=>'ajmcm_numero_persona_c','label'=>'Nº Registro','type'=>'text'],
      ['name'=>'ajmcm_etapa_c','label'=>'Etapa','type'=>'text'],
      ['name'=>'ajmcm_tallas_c','label'=>'Talla','type'=>'text'],
      ['name'=>'ajmcm_panuelo_c','label'=>'Pañuelo','type'=>'text'],
      ['name'=>'ajmcm_acompanante_c','label'=>'Acompañante','type'=>'text'],
      ['name'=>'ajmcm_centro_educativo_c','label'=>'Centro educativo','type'=>'text'],
      ['name'=>'ajmcm_formacion_academica_c','label'=>'Formación Académica','type'=>'textarea'],
      ['name'=>'ajmcm_fa_c','label'=>'FA','type'=>'text'],
      ['name'=>'ajmcm_fa_year_c','label'=>'FA - Año y escuela','type'=>'text'],
      ['name'=>'ajmcm_nivel_com_c','label'=>'Nivel COM','type'=>'text'],
      ['name'=>'ajmcm_premonitores1_c','label'=>'Premonitores I','type'=>'text'],
      ['name'=>'ajmcm_premonitores2_c','label'=>'Premonitores II','type'=>'text'],
      ['name'=>'ajmcm_premonitores_year_c','label'=>'Año Premonis','type'=>'text'],
      ['name'=>'ajmcm_congreso_monis_c','label'=>'Congresos Monis','type'=>'multiselect'],
      ['name'=>'ajmcm_mat_c','label'=>'MAT','type'=>'text'],
      ['name'=>'ajmcm_mat_year_c','label'=>'Año MAT','type'=>'text'],
      ['name'=>'ajmcm_dat_c','label'=>'DAT','type'=>'text'],
      ['name'=>'ajmcm_dat_year_c','label'=>'Año DAT','type'=>'text'],
    ]
  ],
  [
    'title' => 'Salud (tus campos)',
    'fields' => [
      ['name'=>'ajmcm_datossalud_c','label'=>'Uso de datos sobre salud','type'=>'text'],
      ['name'=>'ajmcm_descripcion_enfermed_c','label'=>'Enfermedades','type'=>'textarea'],
      ['name'=>'ajmcm_descripcion_tratam_c','label'=>'Tratamientos','type'=>'textarea'],
      ['name'=>'ajmcm_descripcion_allergies__c','label'=>'Alergias','type'=>'textarea'],
      ['name'=>'ajmcm_descripcion_intoler_c','label'=>'Intolerancias','type'=>'textarea'],
      ['name'=>'ajmcm_descripcion_otros_c','label'=>'Otras patologías','type'=>'textarea'],
    ]
  ],
  [
    'title' => 'Autorizaciones / protección (tus campos)',
    'fields' => [
      ['name'=>'ajmcm_acepta_lopd_c','label'=>'Acepta LOPD','type'=>'text'],
      ['name'=>'ajmcm_cesionimagenes_interne_c','label'=>'Acepta cesión/publicación de imágenes (Internet/medios)','type'=>'text'],
      ['name'=>'ajmcm_menorwhatsapp_c','label'=>'Autoriza WhatsApp (menor)','type'=>'text'],
      ['name'=>'ajmcm_soloacasa_c','label'=>'Autoriza irse solo a casa','type'=>'text'],
      ['name'=>'ajmcm_actividadesout_c','label'=>'Autorización salidas locales','type'=>'text'],
      ['name'=>'ajmcm_form_intera_proteccion_c','label'=>'Form. Interna Prot. Menor','type'=>'checkbox'],
      ['name'=>'ajmcm_alimentos_c','label'=>'Manipulación de alimentos','type'=>'checkbox'],
      ['name'=>'ajmcm_eva_reconoce_c','label'=>'Evaluador Reconoce','type'=>'checkbox'],
    ]
  ],
  [
    'title' => 'Voluntariado (tus campos)',
    'fields' => [
      ['name'=>'ajmcm_vol_acuerdo_c','label'=>'Voluntariado: Acuerdo incorporación','type'=>'checkbox'],
      ['name'=>'ajmcm_vol_descripcion_c','label'=>'Voluntariado: Descripción actividad','type'=>'textarea'],
      ['name'=>'ajmcm_vol_programas_c','label'=>'Voluntariado: Programas','type'=>'textarea'],
    ]
  ],
  [
    'title' => 'Documentación / Archivos (tus campos)',
    'fields' => [
      ['name'=>'ajmcm_aut_participar_c','label'=>'[Archivo] Autorización para participar','type'=>'checkbox'],
      ['name'=>'ajmcm_cert_del_sex_c','label'=>'[Archivo] Cert Delitos Sexuales','type'=>'checkbox'],
      ['name'=>'ajmcm_aut_del_sex_file_c','label'=>'[Archivo] Doc Autorización Del. Sex','type'=>'checkbox'],
      ['name'=>'ajmcm_aut_del_sex_c','label'=>'Autorización Del. Sex Grupal','type'=>'checkbox'],
      ['name'=>'ajmcm_cert_files_c','label'=>'[Archivo] Otros certificados','type'=>'checkbox'],
      ['name'=>'ajmcm_compromiso_c','label'=>'[Archivo] Compliance · Compliance','type'=>'checkbox'],
      ['name'=>'ajmcm_mat_file_c','label'=>'[Archivo] Título MAT','type'=>'checkbox'],
      ['name'=>'ajmcm_dat_file_c','label'=>'[Archivo] Título DAT','type'=>'checkbox'],
    ]
  ],
];

// Para pedir al CRM todos estos campos, sacamos la lista única:
$select = [];
foreach ($sections as $s) foreach ($s['fields'] as $f) $select[$f['name']] = true;
$selectFields = array_keys($select);

// ====== LOGIN ======
$loginParams = [
  'user_auth' => [
    'user_name' => $CRM_USER,
    'password' => $CRM_PASS,
    'encryption' => 'PLAIN',
  ],
  'application' => 'WP DNI Proxy',
];

list($loginRes, $loginCode) = postToCRM($CRM_URL, [
  'method' => 'login',
  'input_type' => 'JSON',
  'response_type' => 'JSON',
  'rest_data' => json_encode($loginParams),
]);

$session = $loginRes['id'] ?? '';
if (!$session) respond(['error' => 'CRM login failed', 'details' => $loginRes], 401);

// ====== FIND ID BY DNI ======
$safeDni = str_replace("'", "\\'", $dni);
$query = "contacts_cstm.stic_identification_number_c = '".$safeDni."'";

list($listRes, $listCode) = postToCRM($CRM_URL, [
  'method' => 'get_entry_list',
  'input_type' => 'JSON',
  'response_type' => 'JSON',
  'rest_data' => json_encode([
    'session' => $session,
    'module_name' => 'Contacts',
    'query' => $query,
    'order_by' => '',
    'offset' => 0,
    'select_fields' => ['id'],
    'link_name_to_fields_array' => [],
    'max_results' => 1,
    'deleted' => 0
  ]),
]);

if (empty($listRes['entry_list'])) {
  respond(['found' => false, 'dni' => $dni]);
}

$id = $listRes['entry_list'][0]['id'] ?? null;
if (!$id) respond(['error' => 'No id returned', 'details' => $listRes], 502);

// ====== GET DATA (solo campos que vamos a mostrar) ======
list($entryRes, $entryCode) = postToCRM($CRM_URL, [
  'method' => 'get_entry',
  'input_type' => 'JSON',
  'response_type' => 'JSON',
  'rest_data' => json_encode([
    'session' => $session,
    'module_name' => 'Contacts',
    'id' => $id,
    'select_fields' => $selectFields, // explícito para no depender de "all fields"
    'link_name_to_fields_array' => [],
  ]),
]);

$entryList = $entryRes['entry_list'] ?? [];
if (empty($entryList)) {
  respond(['error' => 'get_entry returned empty', 'details' => $entryRes], 502);
}

$nv = $entryList[0]['name_value_list'] ?? [];
$values = [];
foreach ($nv as $k => $obj) {
  $values[$k] = is_array($obj) && array_key_exists('value', $obj) ? $obj['value'] : $obj;
}

// ====== BUILD RESPONSE ======
$outSections = [];
foreach ($sections as $s) {
  $items = [];
  foreach ($s['fields'] as $f) {
    $name = $f['name'];
    $label = $f['label'];
    $type = $f['type'];
    $raw = isset($values[$name]) ? (string)$values[$name] : '';
    $rawTrim = trim($raw);

    $display = $rawTrim;
    $empty = ($rawTrim === '' || $rawTrim === 'NULL');

    if ($type === 'checkbox') {
      // SuiteCRM suele devolver "1"/"0"
      if ($empty) { $display = ''; }
      else $display = ($rawTrim === '1' || strtolower($rawTrim) === 'true') ? 'Sí' : 'No';
    } elseif ($type === 'multiselect') {
      $arr = $empty ? [] : normalizeMulti($rawTrim);
      $display = $arr;
      $empty = empty($arr);
    } elseif ($type === 'masked') {
      if ($empty) $display = '';
      else $display = '••••••••';
    }

    $items[] = [
      'name' => $name,
      'label' => $label,
      'type' => $type,
      'empty' => $empty,
      'value' => $display,
    ];
  }

  $outSections[] = [
    'title' => $s['title'],
    'items' => $items,
  ];
}

respond([
  'found' => true,
  'dni' => $dni,
  'id' => $id,
  'sections' => $outSections,
]);
