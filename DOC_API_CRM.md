# Documentación API SinergiaCRM - Guía de Conexión JavaScript

## 1. Datos de Conexión

| Concepto | Valor |
|----------|-------|
| **CRM** | SinergiaCRM v4.1 (basado en SuiteCRM) |
| **URL API** | `https://movimientoconsolacion.sinergiacrm.org/custom/service/v4_1_SticCustom/rest.php` |
| **Usuario** | `api_user` |
| **Contraseña** | `w780kAp6GeG&EEffJBe0iVa)` |
| **Formato** | Todas las llamadas son POST con parámetros `method`, `input_type`, `response_type` y `rest_data` |

---

## 2. Autenticación (Login)

Todas las operaciones requieren primero obtener un `session_id` mediante login.

```javascript
const API_URL = 'https://movimientoconsolacion.sinergiacrm.org/custom/service/v4_1_SticCustom/rest.php';

async function login() {
  const params = {
    user_auth: {
      user_name: 'api_user',
      password: 'w780kAp6GeG&EEffJBe0iVa)',
      encryption: 'PLAIN'
    },
    application: 'MiApp'
  };

  const formData = new URLSearchParams();
  formData.append('method', 'login');
  formData.append('input_type', 'JSON');
  formData.append('response_type', 'JSON');
  formData.append('rest_data', JSON.stringify(params));

  const response = await fetch(API_URL, {
    method: 'POST',
    body: formData
  });
  const result = await response.json();
  
  // result.id contiene el session_id para las siguientes llamadas
  return result.id;
}
```

**Respuesta exitosa:**
```json
{
  "id": "abc123sessionid",
  "module_name": "Users",
  "name_value_list": { ... }
}
```

---

## 3. Función genérica para llamadas a la API

```javascript
async function callAPI(sessionId, method, params) {
  const formData = new URLSearchParams();
  formData.append('method', method);
  formData.append('input_type', 'JSON');
  formData.append('response_type', 'JSON');
  formData.append('rest_data', JSON.stringify(params));

  const response = await fetch(API_URL, {
    method: 'POST',
    body: formData
  });
  return await response.json();
}
```

---

## 4. Obtener la lista de TODAS las personas (Contactos)

Se usa el método `get_entry_list`. La API devuelve resultados paginados, hay que iterar con `offset`.

```javascript
async function getAllContacts(sessionId) {
  let allContacts = [];
  let offset = 0;
  const maxResults = 200; // máximo por página
  let hasMore = true;

  while (hasMore) {
    const params = {
      session: sessionId,
      module_name: 'Contacts',
      query: '',           // sin filtro = todos
      order_by: 'last_name',
      offset: offset,
      select_fields: [
        'id',
        'first_name',
        'last_name',
        'email1',
        'phone_mobile',
        'birthdate',
        'stic_identification_number_c',
        'stic_gender_c',
        'ajmcm_etapa_c',
        'ajmcm_grupotemp_c',
        'ajmcm_monitor_de_c',
        'ajmcm_monitor_desde_c',
        'ajmcm_procendencia_c',
        'assigned_user_id',
        'assigned_user_name',          // Delegación local (nombre del usuario asignado)
        'stic_relationship_type_c'     // Tipo de relación con la entidad
      ],
      link_name_to_fields_array: [],
      max_results: maxResults,
      deleted: 0,
      favorites: ''
    };

    const result = await callAPI(sessionId, 'get_entry_list', params);
    
    if (result.entry_list && result.entry_list.length > 0) {
      allContacts = allContacts.concat(result.entry_list);
      offset += result.entry_list.length;
      hasMore = result.entry_list.length === maxResults;
    } else {
      hasMore = false;
    }
  }

  return allContacts;
}
```

### Formato de respuesta de `get_entry_list`:

```json
{
  "result_count": 200,
  "total_count": "1500",
  "next_offset": 200,
  "entry_list": [
    {
      "id": "abc-123-def-456",
      "module_name": "Contacts",
      "name_value_list": {
        "id": { "name": "id", "value": "abc-123-def-456" },
        "first_name": { "name": "first_name", "value": "Juan" },
        "last_name": { "name": "last_name", "value": "García López" },
        "assigned_user_name": { "name": "assigned_user_name", "value": "MCM Castellón" },
        "ajmcm_etapa_c": { "name": "ajmcm_etapa_c", "value": "COM" },
        "stic_relationship_type_c": { "name": "stic_relationship_type_c", "value": "^Voluntario^" }
      }
    }
  ]
}
```

### Helper para extraer campos de un registro:

```javascript
function extractFields(entry) {
  const fields = {};
  for (const [key, obj] of Object.entries(entry.name_value_list)) {
    fields[key] = obj.value;
  }
  return fields;
}
```

---

## 5. Filtrar contactos con query SQL

Para filtrar directamente en la API (más eficiente que traer todos y filtrar en JS):

```javascript
// Filtrar por campo estándar (tabla contacts)
query: "contacts.last_name LIKE '%García%'"

// Filtrar por campo personalizado (tabla contacts_cstm)
query: "contacts_cstm.ajmcm_etapa_c = 'MIC'"

// Filtrar monitores (que tengan relación tipo Voluntario)
query: "contacts_cstm.stic_relationship_type_c LIKE '%Voluntario%'"

// Combinaciones
query: "contacts_cstm.ajmcm_etapa_c = 'COM' AND contacts_cstm.ajmcm_procendencia_c = 'castellon'"
```

---

## 6. Delegación Local (campo "Asignado a")

La delegación local de cada persona está en el campo `assigned_user_id` / `assigned_user_name`.

| Campo | Descripción |
|-------|------------|
| `assigned_user_id` | ID del usuario CRM asignado (cada MCM Local tiene un usuario) |
| `assigned_user_name` | Nombre visible del usuario (ej: "MCM Castellón", "MCM Madrid") |

Además existe `ajmcm_procendencia_c` como campo auxiliar que indica el MCM Local de procedencia con estos valores, pero en principio cogemos del assigend_user_name

| Valor | Etiqueta |
|-------|----------|
| `benicarlovinaros` | MCM Benicarló-Vinaròs |
| `burriana` | MCM Burriana |
| `caravaca` | MCM Caravaca |
| `castellon` | MCM Castellón |
| `ciutadella` | MCM Ciutadella |
| `espinardo` | MCM Espinardo |
| `granada` | MCM Granada |
| `huetor` | MCM Huétor-Santillán |
| `alcora` | MCM L'Alcora |
| `madird` | MCM Madrid |
| `nules` | MCM Nules |
| `onda` | MCM Onda |
| `quintanar` | MCM Quintanar |
| `reus` | MCM Reus |
| `tortosa` | MCM Tortosa |
| `vila-real` | MCM Vila-real |
| `villacanas` | MCM Villacañas |
| `zaragoza` | MCM Zaragoza |
| `otros` | Otros |

---

## 7. Relación Personas (módulo `stic_Contacts_Relationships`)

> **Referencia:** https://wiki.sinergiatic.org/index.php?title=Estructura_de_datos:_m%C3%B3dulos_y_campos#Relaci%C3%B3n_Personas

El módulo **Relación Personas** (`stic_Contacts_Relationships`) es un módulo desarrollado por SinergiaCRM que gestiona las relaciones entre contactos (persona-persona). **NO es** `stic_personal_environment` (ese es otro módulo distinto para entorno personal/familiar).

El link field para conectar Contactos con este módulo es: **`stic_contacts_relationships_contacts`**

### 7.1 Obtener las Relaciones con Persona de un contacto

```javascript
async function getContactRelationships(sessionId, contactId) {
  const params = {
    session: sessionId,
    module_name: 'Contacts',
    module_id: contactId,
    link_field_name: 'stic_contacts_relationships_contacts',
    related_module_query: '',   // vacío = todas las relaciones
    related_fields: ['id', 'name'],
    related_module_link_name_to_fields_array: [],
    deleted: 0,
    order_by: '',
    offset: '',
    limit: ''
  };

  return await callAPI(sessionId, 'get_relationships', params);
}
```

### 7.2 Obtener el detalle de una Relación con Persona

Una vez tengas el `id` de un registro de `stic_Contacts_Relationships`, puedes obtener todos sus campos:

```javascript
async function getRelationshipDetail(sessionId, relationshipId) {
  const params = {
    session: sessionId,
    module_name: 'stic_Contacts_Relationships',
    id: relationshipId,
    select_fields: [],   // vacío = todos los campos
    link_name_to_fields_array: [],
    track_view: 0
  };

  return await callAPI(sessionId, 'get_entry', params);
}
```

### 7.3 Listar TODAS las Relaciones con Persona del sistema

También se puede consultar el módulo directamente con `get_entry_list`:

```javascript
async function getAllRelationships(sessionId) {
  let allRelationships = [];
  let offset = 0;
  const maxResults = 200;
  let hasMore = true;

  while (hasMore) {
    const params = {
      session: sessionId,
      module_name: 'stic_Contacts_Relationships',
      query: '',
      order_by: '',
      offset: offset,
      select_fields: [],  // todos los campos (o especificar los que necesites)
      link_name_to_fields_array: [],
      max_results: maxResults,
      deleted: 0,
      favorites: ''
    };

    const result = await callAPI(sessionId, 'get_entry_list', params);
    
    if (result.entry_list && result.entry_list.length > 0) {
      allRelationships = allRelationships.concat(result.entry_list);
      offset += result.entry_list.length;
      hasMore = result.entry_list.length === maxResults;
    } else {
      hasMore = false;
    }
  }

  return allRelationships;
}
```

### 7.4 Campos puente (almacenados en la Relación con Persona, NO en el Contacto)

Estos campos están dentro del registro de `stic_Contacts_Relationships`:

| Campo | Descripción | Valores |
|-------|-------------|---------|
| `ajmcm_monitor_desde_c` | Año desde que es monitor | Número (año) |
| `ajmcm_monitor_de_c` | Monitor de qué etapa | MIC, COM, LC, Apoyo, Otros |

### 7.5 Descubrir todos los campos del módulo

**MUY IMPORTANTE:** Para conocer todos los campos disponibles en `stic_Contacts_Relationships` (incluidos los campos personalizados y el campo de grupo), ejecuta:

```javascript
const fields = await callAPI(sessionId, 'get_module_fields', {
  session: sessionId,
  module_name: 'stic_Contacts_Relationships'
});
console.log(fields);
```

Esto te devolverá la definición completa de cada campo del módulo, incluyendo nombre, tipo, opciones de desplegable, etc.

---

## 8. Grupos MCM (módulo custom - pendiente de confirmar)

> **PENDIENTE:** El nombre exacto del módulo y los campos de Grupos MCM está pendiente de confirmar. La información conocida hasta ahora es:

- Existe un **módulo custom llamado "Grupos MCM"** (nombre técnico por confirmar)
- Los grupos están **asociados a través de la Relación con Persona** (`stic_Contacts_Relationships`), es decir, cada registro de Relación con Persona tiene un campo que enlaza con un grupo
- El flujo para obtener los grupos de una persona sería:
  1. Obtener el contacto
  2. Obtener sus relaciones con persona (`stic_contacts_relationships_contacts`)
  3. De cada relación, leer el campo que enlaza con el grupo MCM

### 8.1 Para descubrir el nombre del módulo y campo de grupos:

```javascript
// 1. Listar todos los módulos disponibles para encontrar el de Grupos MCM
const modules = await callAPI(sessionId, 'get_available_modules', {
  session: sessionId
});
// Buscar en modules.modules algo como "Grupos", "Groups", "ajmcm_groups", etc.
console.log(modules);

// 2. Una vez encontrado, listar sus campos
const groupFields = await callAPI(sessionId, 'get_module_fields', {
  session: sessionId,
  module_name: 'NOMBRE_MODULO_GRUPOS'  // reemplazar con el nombre real
});
console.log(groupFields);

// 3. También revisar los campos de stic_Contacts_Relationships
//    para encontrar el campo que enlaza con Grupos MCM
const relFields = await callAPI(sessionId, 'get_module_fields', {
  session: sessionId,
  module_name: 'stic_Contacts_Relationships'
});
console.log(relFields);
```

> **Cuando se confirme** el nombre del módulo de Grupos MCM y el campo de enlace, el código para obtener los grupos de un contacto será similar al patrón de `get_relationships` pero partiendo del registro de Relación con Persona.

---

## 9. Resumen: Estructura de datos Contacto > Relación > Grupo

```
Contacto (Contacts)
  │
  ├── assigned_user_name ────────── Delegación Local (directo en el contacto)
  ├── ajmcm_procendencia_c ──────── MCM Local de procedencia (directo en el contacto)
  ├── ajmcm_etapa_c ─────────────── Etapa MIC/COM/LC (directo en el contacto)
  │
  └── stic_contacts_relationships_contacts ──► Relación Personas (stic_Contacts_Relationships)
        │
        ├── ajmcm_monitor_desde_c ── Año desde que es monitor (campo puente)
        ├── ajmcm_monitor_de_c ───── Monitor de qué etapa (campo puente)
        ├── [otros campos del módulo por descubrir con get_module_fields]
        │
        └── [campo enlace a grupo] ──► Grupos MCM (módulo custom, nombre por confirmar)
              │
              └── name ── Nombre del grupo
```

---

## 10. Descubrir módulos y campos disponibles

Si necesitas explorar qué módulos y campos existen:

```javascript
// Listar todos los módulos disponibles
async function getModules(sessionId) {
  const params = { session: sessionId };
  return await callAPI(sessionId, 'get_available_modules', params);
}

// Listar todos los campos de un módulo
async function getModuleFields(sessionId, moduleName) {
  const params = {
    session: sessionId,
    module_name: moduleName
  };
  return await callAPI(sessionId, 'get_module_fields', params);
}

// Ejemplo: descubrir todos los campos del módulo de relaciones personales
const fields = await getModuleFields(sessionId, 'stic_Personal_Environment');
```

**Esto es muy útil** para descubrir el nombre exacto del campo de grupo dentro de las relaciones con persona.

---

## 11. Cerrar sesión (Logout)

```javascript
async function logout(sessionId) {
  const params = { session: sessionId };
  return await callAPI(sessionId, 'logout', params);
}
```

---

## 12. Flujo completo recomendado para el listado

```javascript
async function generarListado() {
  // 1. Login
  const sessionId = await login();
  
  // 2. Obtener TODOS los contactos con campos básicos
  const contacts = await getAllContacts(sessionId);
  
  // 3. Para cada contacto, obtener sus Relaciones con Persona
  for (const contact of contacts) {
    const id = contact.id;
    const data = extractFields(contact);
    
    // 3a. Obtener Relaciones con Persona (stic_Contacts_Relationships)
    const relationships = await getContactRelationships(sessionId, id);
    
    // 3b. Para cada relación, se puede obtener el detalle (campos puente, grupo asociado)
    const relDetails = [];
    if (relationships.entry_list) {
      for (const rel of relationships.entry_list) {
        const detail = await getRelationshipDetail(sessionId, rel.id);
        relDetails.push(extractFields(detail.entry_list[0]));
      }
    }
    
    // 3c. Construir línea del listado
    console.log(`${data.first_name} ${data.last_name} | Delegación: ${data.assigned_user_name} | Etapa: ${data.ajmcm_etapa_c}`);
    for (const rel of relDetails) {
      console.log(`  └─ Relación: ${rel.name} | Monitor de: ${rel.ajmcm_monitor_de_c || '-'}`);
    }
  }
  
  // 4. Logout
  await logout(sessionId);
}
```

### Consideraciones de rendimiento:
- Si hay muchos contactos (>500), las llamadas individuales de `get_relationships` por cada uno serán lentas
- Considera usar `link_name_to_fields_array` en `get_entry_list` para traer relaciones en una sola llamada por página
- Respeta la paginación: `max_results` tiene un tope (normalmente 200)
- Añade un pequeño delay entre llamadas para no saturar el servidor
- **Alternativa eficiente:** En lugar de iterar contacto por contacto, se puede hacer un `get_entry_list` directamente sobre `stic_Contacts_Relationships` para obtener TODAS las relaciones del sistema de golpe, y luego cruzar en memoria con los contactos

---

## 13. Referencia rápida de campos útiles para el listado

### Datos básicos de la persona:
| Campo | Descripción |
|-------|-------------|
| `first_name` | Nombre |
| `last_name` | Apellidos |
| `email1` | Email |
| `phone_mobile` | Teléfono móvil |
| `birthdate` | Fecha de nacimiento |
| `stic_identification_number_c` | DNI/NIE |
| `stic_gender_c` | Género |
| `stic_age_c` | Edad (calculada automáticamente) |

### Datos MCM:
| Campo | Descripción |
|-------|-------------|
| `ajmcm_etapa_c` | Etapa: MIC, COM, LC |
| `ajmcm_nivel_com_c` | Nivel COM |
| `ajmcm_grupotemp_c` | Grupo MCM (texto libre) |
| `ajmcm_procendencia_c` | MCM Local de procedencia |
| `assigned_user_name` | Delegación local (usuario asignado) |
| `stic_relationship_type_c` | Tipo de relación con la entidad |

### Datos de monitor (campos puente, viven en `stic_Contacts_Relationships`):
| Campo | Descripción | Nota |
|-------|-------------|------|
| `ajmcm_monitor_desde_c` | Año desde que es monitor | En la Relación con Persona |
| `ajmcm_monitor_de_c` | Monitor de qué etapa | En la Relación con Persona |

### Relaciones clave:
| Link field | Módulo relacionado | Qué devuelve |
|------------|-------------------|--------------|
| `stic_contacts_relationships_contacts` | `stic_Contacts_Relationships` | **Relaciones con Persona** (monitor, laico, etc.) |
| `stic_personal_environment_contacts` | Entorno personal | Relaciones familiares (hijo, padre, etc.) |
| `documents` | Documentos | Documentos vinculados |

### Grupos:
| Concepto | Estado |
|----------|--------|
| Módulo "Grupos MCM" | **Pendiente confirmar nombre** - custom module |
| Enlace con Relación Personas | El grupo se asocia a través de `stic_Contacts_Relationships` |

---

## 14. Documentación oficial de referencia

- **API SuiteCRM v4.1:** https://docs.suitecrm.com/developer/api/api-v4.1-methods/
- **Wiki SinergiaCRM (estructura datos):** https://wiki.sinergiatic.org/index.php?title=Estructura_de_datos:_m%C3%B3dulos_y_campos#Personas
- **Wiki SinergiaCRM (Relación Personas):** https://wiki.sinergiatic.org/index.php?title=Estructura_de_datos:_m%C3%B3dulos_y_campos#Relaci%C3%B3n_Personas

---

## APÉNDICE A: Ejemplo JavaScript del repositorio

> **Archivo:** `ejemplos_api_sinergiaCRM/Javascript/rest.js`

Este es el ejemplo oficial de SinergiaCRM para conectarse desde JavaScript:

```javascript
// SinergiaCRM URL
var api_url = "<SINERGIACRM_URL>/custom/service/v4_1_SticCustom/rest.php";

// CRM User
var user_name = '<CRM_USER>';

// User password
var password = '<CRM_USER_PASSWORD>';

// Login Params
var params = {
    user_auth:{
        user_name:user_name,
        password:password,
        encryption:'PLAIN'
    },
    application: 'SinergiaCRM RestAPI Example'
};
var jsonData = JSON.stringify(params);

// AJAX Request 
$.ajax(
    {
        url: api_url,
        type: "POST",
        dataType: "json",
        data: { 
            method: "login", 
            input_type: "JSON", 
            response_type: "JSON", 
            rest_data: jsonData 
        },
        success: function(result) {
                if(result.id) {
                    alert("sucessfully LOGIN Your session ID is : " + result.id);
                }
                else{
                    alert("Error");
                }
        },
        error: function(result) {
            alert("Error");
        }
    }
);
```

---

## APÉNDICE B: Ejemplos PHP del repositorio

### B.1 Estructura del cliente PHP

> **Archivo:** `ejemplos_api_sinergiaCRM/PHP/app.php`

```php
// CONFIG
$url = '<SINERGIACRM_URL>/custom/service/v4_1_SticCustom/rest.php';
$username = '<CRM_USER>';
$password = '<CRM_USER_PASSWORD>';
$language = 'es_ES';
$notifyOnSave = false;
$verbose = true;

// Crear cliente y login
include_once 'APIClient.php';
$apiClient = new APIClient($url, $verbose);
$apiClient->sessionId = $apiClient->login($username, $password, $language, $notifyOnSave);

// ... incluir el ejemplo que se quiera ejecutar ...
// include_once 'Ejemplos/GET/get_entry_list.php';

// Logout
$apiClient->logout();
```

### B.2 get_entry_list - Obtener lista de contactos

> **Archivo:** `ejemplos_api_sinergiaCRM/PHP/Ejemplos/GET/get_entry_list.php`

```php
// EJEMPLO 1: Primeros 10 contactos con campos básicos
$params = array(
    'module_name' => 'Contacts',
    'query' => "",
    'order_by' => '',
    'offset' => 0,
    'select_fields' => array(
        'id', 'name', 'last_name', 'email1', 
        'stic_age_c', 'stic_identification_type_c', 'stic_identification_number_c'
    ),
    'link_name_to_fields_array' => [],
    'max_results' => 10,
    'deleted' => 0,
    'favorites' => '',
);

// EJEMPLO 7: Filtrar por campo personalizado
$params = array(
    'module_name' => 'Contacts',
    'query' => "contacts_cstm.stic_language_c = 'spanish'", // filtro con campo custom
    'order_by' => '',
    'offset' => 0,
    'select_fields' => array('name'),
    'link_name_to_fields_array' => [],        
    'max_results' => 10,
    'deleted' => 0,
    'favorites' => '',
);

$apiClient->getEntryList($params);
```

### B.3 get_entry - Obtener un contacto por ID

> **Archivo:** `ejemplos_api_sinergiaCRM/PHP/Ejemplos/GET/get_entry.php`

```php
// Obtener datos de un contacto específico
$params = array(
    'module_name' => 'Contacts',
    'id' => '<ID>',
    'select_fields' => array(
        'name', 'last_name', 'email1', 
        'stic_age_c', 'stic_identification_type_c', 'stic_identification_number_c'
    ),
    'link_name_to_fields_array' => array(),
    'track_view' => 0,
);

// Con datos relacionados incluidos (ej: evento de una inscripción)
$params = array( 
    'module_name' => 'stic_Registrations', 
    'id' => '<ID>', 
    'select_fields' => array('name'),
    'link_name_to_fields_array' => array(
        array(
            'name' => 'stic_registrations_stic_events',
            'value' => array('id', 'name')
        )
    ),    
    'track_view' => 0,
);

$apiClient->getEntry($params);
```

### B.4 get_relationships - Obtener relaciones

> **Archivo:** `ejemplos_api_sinergiaCRM/PHP/Ejemplos/GET/get_relationships.php`

```php
// EJEMPLO 3: Grupos de Seguridad de un contacto
$params = array(
    'module_name' => 'Contacts',
    "module_id" => '<ID>', 
    "link_field_name" => "SecurityGroups",
    "related_module_query" => "",
    "related_fields" => array('id', 'name'),
    "related_module_link_name_to_fields_array" => array(),
    "deleted" => 0,
    "order_by" => '',
    "offset" => '', 
    "limit" => '',
);

// EJEMPLO 6: Hijos (entorno personal) de un contacto
$params = array(
    'module_name' => 'Contacts',
    "module_id" => '<ID>', 
    "link_field_name" => "stic_personal_environment_contacts",
    "related_module_query" => "relationship_type = 'son'",
    "related_fields" => array('id', 'name'),
    "related_module_link_name_to_fields_array" => array(),
    "deleted" => 0,
    "order_by" => '',
    "offset" => '', 
    "limit" => '',        
);

$apiClient->getRelationships($params);
```

### B.5 set_relationship - Crear relación entre contacto y Relación Personas

> **Archivo:** `ejemplos_api_sinergiaCRM/PHP/Ejemplos/SET/set_relationship.php`

```php
// Vincular un contacto con un registro de stic_Contacts_Relationships
$contact_id = '<CONTACT_ID>';
$contact_relation_id = '<CONTACT_RELATIONSHIP_ID>';
$params = array(
    'module_name' => 'Contacts',
    'module_id' => $contact_id,
    'link_field_name' => 'stic_contacts_relationships_contacts', 
    'related_ids' => [$contact_relation_id],
);

$apiClient->setRelationship($params);
```

### B.6 get_available_modules y get_module_fields - Descubrir estructura

> **Archivos:** `ejemplos_api_sinergiaCRM/PHP/Ejemplos/GET/get_available_modules.php` y `get_module_fields.php`

```php
// Listar todos los módulos
$params = array();
$apiClient->getAvailableModules($params);

// Listar campos de un módulo
$params = array('module_name' => 'stic_Contacts_Relationships');
$apiClient->getModuleFields($params);
```

---

## APÉNDICE C: Métodos disponibles en el API Client

> **Archivo:** `ejemplos_api_sinergiaCRM/PHP/APIClient.php`

| Método | API Method | Uso |
|--------|-----------|-----|
| `login($user, $pass, $lang)` | `login` | Autenticación, devuelve session_id |
| `logout()` | `logout` | Cerrar sesión |
| `getAvailableModules($params)` | `get_available_modules` | Listar módulos del CRM |
| `getModuleFields($params)` | `get_module_fields` | Listar campos de un módulo |
| `getLanguageDefinition($params)` | `get_language_definition` | Etiquetas y traducciones |
| `getEntryList($params)` | `get_entry_list` | Listar registros con filtros y paginación |
| `getEntry($params)` | `get_entry` | Obtener un registro por ID |
| `getRelationships($params)` | `get_relationships` | Obtener registros relacionados |
| `getDocumentRevision($params)` | `get_document_revision` | Detalle de revisión de documento |
| `getImage($params)` | `get_image` | Obtener foto de contacto |
| `setEntry($module, $data)` | `set_entry` | Crear/actualizar registro |
| `setRelationship($params)` | `set_relationship` | Crear relación entre registros |
| `setDocumentRevision($params)` | `set_document_revision` | Subir revisión de documento |
| `setImage($params)` | `set_image` | Subir imagen a un registro |

---

## APÉNDICE D: Listado de archivos de ejemplo en el repositorio

```
ejemplos_api_sinergiaCRM/
├── Javascript/
│   ├── app.html                    ← HTML que carga rest.js
│   └── rest.js                     ← Ejemplo login en JavaScript (jQuery)
├── PHP/
│   ├── APIClient.php               ← Clase cliente API completa
│   ├── app.php                     ← Punto de entrada (config + login + include ejemplo)
│   └── Ejemplos/
│       ├── GET/
│       │   ├── get_available_modules.php
│       │   ├── get_document_revision.php
│       │   ├── get_entry.php
│       │   ├── get_entry_list.php
│       │   ├── get_image.php
│       │   ├── get_language_definition.php
│       │   ├── get_module_fields.php
│       │   └── get_relationships.php
│       └── SET/
│           ├── set_document_revision.php
│           ├── set_entry.php
│           ├── set_image.php
│           └── set_relationship.php
├── crm_proxy_ejemplo_1.php         ← Ejemplo uso del proxy
├── crm_proxy_ejemplo_2.php
└── ...
```
