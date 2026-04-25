<?php
/*
    Copyright (C) 2013 - 2023 SinergiaTIC Association

    This program is free software; you can redistribute it and/or modify it under
    the terms of the GNU Affero General Public License version 3 as published by the
    Free Software Foundation.

    This program is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
    FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
    details.

    You should have received a copy of the GNU Affero General Public License along with
    this program; if not, see http://www.gnu.org/licenses or write to the Free
    Software Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA
    02110-1301 USA.

    You can contact SinergiaTIC Association at email address info@sinergiacrm.org. 
*/


// Link to SuiteCRM documentation
// https://docs.suitecrm.com/developer/api/api-v4.1-methods/#_get_relationships


// LIST OF EXAMPLES
// It is recommended to run the examples one at a time. To do this we can comment on the active example and uncomment another one.

// EXAMPLE 1
// Get the id and name of the location related to the event whose id = <ID>

    // $params = array(
    //     'module_name' => 'stic_Events',
    //     "module_id" => '<ID>', 
    //     "link_field_name" => "stic_events_fp_event_locationsfp_event_locations_ida",
    //     "related_module_query" => "",
    //     "related_fields" => array(
    //         'id', 
    //         'name'),
    //     "related_module_link_name_to_fields_array" => array(),
    //     "deleted" => 0,
    //     "order_by" => '',
    //     "offset" => '', 
    //     "limit" => '',    
    // );


// EXAMPLE 2
// Get the id, name and last name of the contact related to the registration whose id = <ID>

    // $params = array(
    //     'module_name' => 'stic_Registrations',
    //     "module_id" => '<ID>',
    //     "link_field_name" => "stic_registrations_contactscontacts_ida",
    //     "related_module_query" => "",
    //     "related_fields" => array(
    //         'id', 
    //         'first_name', 
    //         'last_name'),
    //     "related_module_link_name_to_fields_array" => array(),
    //     "deleted" => 0,
    //     "order_by" => '',
    //     "offset" => '', 
    //     "limit" => '',    
    // );


// EXAMPLE 3
// Get the id and name of the security groups that relate to the contact whose id = <ID>

    // $params = array(
    //     'module_name' => 'Contacts',
    //     "module_id" => '<ID>', 
    //     "link_field_name" => "SecurityGroups",
    //     "related_module_query" => "",
    //     "related_fields" => array(
    //         'id', 
    //         'name'),
    //     "related_module_link_name_to_fields_array" => array(),
    //     "deleted" => 0,
    //     "order_by" => '',
    //     "offset" => '', 
    //     "limit" => '',
    // );


// EXAMPLE 4
// Get the id and name of the documents related to the contact whose id = <ID>
    // $params = array(
    //     'module_name' => 'Contacts',
    //     "module_id" => '<ID>', 
    //     "link_field_name" => "documents",
    //     "related_module_query" => "",
    //     "related_fields" => array(
    //         'id', 
    //         'name'
    //     ),
    //     "related_module_link_name_to_fields_array" => array(),
    //     "deleted" => 0,
    //     "order_by" => '',
    //     "offset" => '', 
    //     "limit" => '',
    // );


// EXAMPLE 5
// Starting from the scenario in which Events and Documents modules have a personalized relationship.
// Get the identifier of the document revision related to the event whose id = <ID>

    // $params = array(
    //     'module_name' => 'stic_Events',
    //     "module_id" => '<ID>', 
    //     "link_field_name" => "stic_events_documents_1documents_idb",
    //     "related_module_query" => "",
    //     "related_fields" => array(
    //         'document_revision_id'),
    //     "related_module_link_name_to_fields_array" => array(),
    //     "deleted" => 0,
    //     "order_by" => '',
    //     "offset" => '', 
    //     "limit" => '',        
    // );


// EXAMPLE 6
// Get the id and name of the children (filter on related_module_query) of the contact whose id = <ID>

    // $params = array(
    //     'module_name' => 'Contacts',
    //     "module_id" => '<ID>', 
    //     "link_field_name" => "stic_personal_environment_contacts",
    //     "related_module_query" => "relationship_type = 'son'",
    //     "related_fields" => array(
    //         'id', 
    //         'name'
    //     ),
    //     "related_module_link_name_to_fields_array" => array(),
    //     "deleted" => 0,
    //     "order_by" => '',
    //     "offset" => '', 
    //     "limit" => '',        
    // );


// EXAMPLE 7
// Get the id, name and status of the candidates in "interviewed" status of the contatc whose id = <ID>

    // $params = array(
    //     'module_name' => 'Contacts',
    //     "module_id" => '<ID>',         
    //     "link_field_name" => "stic_job_applications_contacts",
    //     "related_module_query" => "status = 'interviewed'",
    //     "related_fields" => array(
    //         'id', 
    //         'name',
    //         'status',
    //     ),
    //     "related_module_link_name_to_fields_array" => array(),
    //     "deleted" => 0,
    //     "order_by" => '',
    //     "offset" => '', 
    //     "limit" => '',    
    // );


// EXAMPLE 8
// Get the id and name of the registration in "confirmed" status (filter on related_module_query) of the event whose id = <ID>

    // $params = array(
    //     'module_name' => 'stic_Events',
    //     "module_id" => '<ID>', 
    //     "link_field_name" => "stic_registrations_stic_events",
    //     "related_module_query" => "status = 'confirmed'",
    //     "related_fields" => array(
    //         'id',
    //         'name',
    //     ),
    //     "related_module_link_name_to_fields_array" => array(),
    //     "deleted" => 0,
    //     "order_by" => '',
    //     "offset" => '', 
    //     "limit" => '',
    // );


// EXAMPLE 9
// Get the id of the email address ID related to a contact with ID = <ID>

    // $params = array(
    //     'module_name' => 'Contacts',
    //     "module_id" => '<ID>', 
    //     "link_field_name" => "email_addresses",
    //     "related_module_query" => "",
    //     "related_fields" => array(
    //         'id',
    //     ),
    //     "related_module_link_name_to_fields_array" => array(),
    //     "deleted" => 0,
    //     "order_by" => '',
    //     "offset" => '', 
    //     "limit" => '',
    // );

// Execute the call to the corresponding API client function
$apiClient->getRelationships($params);


