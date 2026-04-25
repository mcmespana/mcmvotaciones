<?php
/**
 * crm_proxy_test2.php
 * Proxy SuiteCRM / Sinergia CRM v4_1
 * SOLO PRUEBAS
 */

ini_set('upload_max_filesize', '50M');
ini_set('post_max_size', '50M');
ini_set('memory_limit', '512M');
set_time_limit(300);

$CRM_ENDPOINT = 'https://movimientoconsolacion.sinergiacrm.org/custom/service/v4_1_SticCustom/rest.php';

/* CORS */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

/* OPTIONS */
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/* SOLO POST */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Only POST allowed']);
    exit;
}

/* Leer JSON */
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data || !isset($data['method'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid payload']);
    exit;
}

/* Convertir a form-urlencoded (OBLIGATORIO) */
$postFields = http_build_query([
    'method'        => $data['method'],
    'input_type'    => 'JSON',
    'response_type' => 'JSON',
    'rest_data'     => $data['rest_data'] ?? '{}',
]);

$ch = curl_init($CRM_ENDPOINT);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POSTFIELDS     => $postFields,
    CURLOPT_TIMEOUT        => 120,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2
]);

$response = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($response === false) {
    http_response_code(500);
    echo json_encode(['error' => curl_error($ch)]);
    curl_close($ch);
    exit;
}

curl_close($ch);

http_response_code($code);
header('Content-Type: application/json');
echo $response;
