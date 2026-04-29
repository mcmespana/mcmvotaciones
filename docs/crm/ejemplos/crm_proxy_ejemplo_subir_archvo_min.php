<?php
// crm_proxy_min.php
header('Content-Type: application/json; charset=utf-8');

const CRM_URL  = 'https://TU_DOMINIO_SINERGIA/service/v4_1/rest.php';
const CRM_USER = 'TU_USUARIO';
const CRM_PASS = 'TU_PASSWORD';

function out($arr, $code=200){ http_response_code($code); echo json_encode($arr, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); exit; }

function crm_call($method, $params){
  $post = http_build_query([
    'method' => $method,
    'input_type' => 'JSON',
    'response_type' => 'JSON',
    'rest_data' => json_encode($params),
  ]);

  $ch = curl_init(CRM_URL);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $post);

  $raw = curl_exec($ch);
  $err = curl_error($ch);
  $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($raw === false) out(['ok'=>false,'error'=>'curl','detail'=>$err], 502);

  $json = json_decode($raw, true);
  if (!is_array($json)) out(['ok'=>false,'error'=>'non-json','http'=>$http,'raw'=>$raw], 502);

  return $json;
}

function login(){
  static $sid = null;
  if ($sid) return $sid;

  $res = crm_call('login', [
    'user_auth' => [
      'user_name' => CRM_USER,
      'password'  => md5(CRM_PASS),
      'version'   => '1',
    ],
    'application_name' => 'WP MAT minimal',
  ]);

  if (empty($res['id'])) out(['ok'=>false,'error'=>'login failed','crm'=>$res], 502);
  $sid = $res['id'];
  return $sid;
}

$action = $_GET['action'] ?? '';

if ($action === 'lookup') {
  $body = json_decode(file_get_contents('php://input'), true) ?: [];

  $dni = strtoupper(preg_replace('/[^0-9A-Z]/', '', (string)($body['dni'] ?? '')));
  if ($dni === '') out(['ok'=>false,'error'=>'dni vacío'], 400);

  $sid = login();

  // Busca por DNI (campo custom de Contacts en STIC)
  $res = crm_call('get_entry_list', [
    'session' => $sid,
    'module_name' => 'Contacts',
    'query' => "contacts_cstm.stic_identification_number_c = '" . addslashes($dni) . "'",
    'order_by' => '',
    'offset' => 0,
    'select_fields' => ['id','first_name','last_name'],
    'link_name_to_fields_array' => [],
    'max_results' => 2,
    'deleted' => 0,
  ]);

  $list = $res['entry_list'] ?? [];
  if (count($list) === 0) out(['ok'=>true,'found'=>false]);
  if (count($list) > 1) out(['ok'=>false,'error'=>'dni duplicado'], 409);

  $nvl = $list[0]['name_value_list'] ?? [];
  $id  = $list[0]['id'] ?? '';
  $fn  = $nvl['first_name']['value'] ?? '';
  $ln  = $nvl['last_name']['value'] ?? '';

  out(['ok'=>true,'found'=>true,'contact'=>[
    'id'=>$id,'first_name'=>$fn,'last_name'=>$ln,'full_name'=>trim("$fn $ln")
  ]]);
}

if ($action === 'upload_mat') {

  $dni = strtoupper(preg_replace('/[^0-9A-Z]/', '', (string)($_POST['dni'] ?? '')));
  $contactId = (string)($_POST['contact_id'] ?? '');
  if ($dni === '' || $contactId === '') out(['ok'=>false,'error'=>'faltan dni/contact_id'], 400);
  if (empty($_FILES['file']['tmp_name'])) out(['ok'=>false,'error'=>'falta file'], 400);

  $sid = login();

  // Lee nombre del contacto para construir el nombre del PDF
  $c = crm_call('get_entry', [
    'session' => $sid,
    'module_name' => 'Contacts',
    'id' => $contactId,
    'select_fields' => ['first_name','last_name'],
    'link_name_to_fields_array' => [],
  ]);

  $nvl = $c['entry_list'][0]['name_value_list'] ?? [];
  $fn  = $nvl['first_name']['value'] ?? '';
  $ln  = $nvl['last_name']['value'] ?? '';
  $full = trim("$fn $ln");

  $docName = "MAT - " . ($full ?: $dni);
  $fileName = $docName . ".pdf";

  $bytes = file_get_contents($_FILES['file']['tmp_name']);
  if ($bytes === false) out(['ok'=>false,'error'=>'no se pudo leer el archivo'], 500);

  // 1) Crear Document
  $doc = crm_call('set_entry', [
    'session' => $sid,
    'module_name' => 'Documents',
    'name_value_list' => [
      ['name'=>'document_name','value'=>$docName],
      ['name'=>'filename','value'=>$fileName],
      ['name'=>'revision','value'=>'1'],
      ['name'=>'category_id','value'=>'formacion_titulo_mat'],
      ['name'=>'description','value'=>'Subido automáticamente a través del formulario de monitores en el Wordpress de Comunica'],
      ['name'=>'status','value'=>'Active'],
    ]
  ]);

  $docId = $doc['id'] ?? '';
  if ($docId === '') out(['ok'=>false,'error'=>'no se creó document','crm'=>$doc], 502);

  // 2) Relacionar Contact -> Document (link field típico en Contacts: "documents")
  crm_call('set_relationship', [
    'session' => $sid,
    'module_name' => 'Contacts',
    'module_id' => $contactId,
    'link_field_name' => 'documents',
    'related_ids' => [$docId],
    'name_value_list' => [],
    'delete' => 0,
  ]);

  // 3) Subir archivo con set_document_revision
  $rev = crm_call('set_document_revision', [
    'session' => $sid,
    'document_revision' => [
      'id' => $docId,
      'revision' => '1',
      'filename' => $fileName,
      'file_mime_type' => 'application/pdf',
      'file' => base64_encode($bytes),
    ],
  ]);

  out([
    'ok'=>true,
    'contact'=>['id'=>$contactId,'full_name'=>$full],
    'document'=>['id'=>$docId,'document_name'=>$docName,'filename'=>$fileName],
    'revision'=>$rev
  ]);
}

out(['ok'=>false,'error'=>'acción inválida'], 404);
