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
// https://docs.suitecrm.com/developer/api/api-v4.1-methods/#_get_entry_list


// LIST OF EXAMPLES
// It is recommended to run the examples one at a time. To do this we can comment on the active example and uncomment another one.

// EXAMPLE 1
// Get the first name, last name, email, age, document type and document identifier of the first 10 undeleted records from the Contacts module.

    // $params = array(
    //     'module_name' => 'Contacts',
    //     'query' => "",
    //     'order_by' => '',
    //     'offset' => 0,
    //     'select_fields' => array(
    //         'id',
    //         'name',
    //         'last_name',
    //         'email1', 
    //         'stic_age_c', 
    //         'stic_identification_type_c', 
    //         'stic_identification_number_c'
    //     ),
    //     'link_name_to_fields_array' => [],
    //     'max_results' => 10,
    //     'deleted' => 0,
    //     'favorites' => '',
    // );


// EXAMPLE 2
// Get the name, last name and email of the first 10 undeleted records from the Contacts module whose name is <NAME> and last name is <LAST_NAME>

    // $params = array(
    //     'module_name' => 'Contacts',
    //     'query' => "contacts.first_name LIKE '%<NAME>%' AND contacts.last_name LIKE '%<LAST_NAME>%'",
    //     'order_by' => '',
    //     'offset' => 0,
    //     'select_fields' => array(
    //         'name',
    //         'last_name',
    //         'email1', 
    //     ),
    //     'link_name_to_fields_array' => [],    
    //     'max_results' => 10,
    //     'deleted' => 0,
    //     'favorites' => '',
    // );


// EXAMPLE 3
// Get the name, last name, document type and document identifier of the first 10 undeleted records whose email is <EMAIL>

    // $params = array(
    //     'module_name' => 'Contacts',
    //     'query' => "contacts.id IN (SELECT bean_id FROM email_addr_bean_rel eabr JOIN email_addresses ea ON (eabr.email_address_id = ea.id) WHERE bean_module = 'Contacts' AND ea.email_address_caps = '<EMAIL>' AND eabr.deleted=0)",
    //     'order_by' => '',
    //     'offset' => 0,
    //     'select_fields' => array(
    //         'name',
    //         'last_name',
    //         'stic_identification_type_c', 
    //         'stic_identification_number_c'
    //     ),
    //     'link_name_to_fields_array' => [],        
    //     'max_results' => 10,
    //     'deleted' => 0,
    //     'favorites' => '',
    // );

    
// EXAMPLE 4
// Get the name, status, start and end date, price and description of the first 10 undeleted events whose status is Active or in Preparation.

    // $params = array(
    //     'module_name' => 'stic_Events',
    //     'query' => "stic_events.status LIKE '%active%' OR stic_events.status LIKE '%preparation%'",
    //     'order_by' => '',
    //     'offset' => 0,
    //     'select_fields' => array(
    //         'name',
    //         'status',
    //         'start_date',
    //         'end_date',
    //         'price',
    //         'description'
    //     ),
    //     'link_name_to_fields_array' => [],        
    //     'max_results' => 10,
    //     'deleted' => 0,
    //     'favorites' => '',
    // );


// EXAMPLE 5
// Get the name, description, address and postal code of the first 10 undeleted events

    // $params = array(
    //     'module_name' => 'stic_Events',
    //     'query' => "",
    //     'order_by' => '',
    //     'offset' => 0,
    //     'select_fields' => array(
    //         'name',
    //         'description',
    //     ),
    //     'link_name_to_fields_array' => array(
    //         array(
    //             'name' => 'stic_events_fp_event_locations',
    //             'value' => array(
    //                  'address',
    //                  'address_postalcode',
    //             )
    //         )
    //     ),              
    //     'max_results' => 10,    
    //     'deleted' => 0,
    //     'favorites' => '',
    // );


// EXAMPLE 6
// Get the name, start and end date, status, and resource name of reservations confirmed between a start and end date

    // $start_date = '2022-06-13 00:00:00';
    // $end_date = '2022-06-17 23:59:00';
    // $params = array(
    //     'module_name' => 'stic_Bookings',
    //     'query' => "stic_bookings.status = 'confirmed'
    //                 AND stic_bookings.start_date <= '". $end_date ."'
    //                 AND stic_bookings.end_date >= '". $start_date ."'
    //             ",
    //     'order_by' => '',
    //     'offset' => 0,
    //     'select_fields' => array(
    //         'name',
    //         'start_date',
    //         'end_date',
    //         'status',
    //     ),
    //     'link_name_to_fields_array' => array(
    //         array(
    //             'name' => 'stic_resources_stic_bookings',
    //             'value' => array(
    //                 'name',
    //             )
    //         )
    //     ),              
    //     'max_results' => 10,    
    //     'deleted' => 0,
    //     'favorites' => '',
    // );


// EXAMPLE 7 - Filter query with basic field and custom field
// Get the name of the persons with language = 'spanish'
    // $params = array(
    //     'module_name' => 'Contacts',
    //     // 'query' => "", // without filter
    //     // 'query' => "contacts.last_name = '<SURNAME>'", // filter with basic field
    //     'query' => "contacts_cstm.stic_language_c = 'spanish'", // filter with custom field
    //     'order_by' => '',
    //     'offset' => 0,
    //     'select_fields' => array(
    //         'name',
    //     ),
    //     'link_name_to_fields_array' => [],        
    //     'max_results' => 10,
    //     'deleted' => 0,
    //     'favorites' => '',
    // ); 

// Execute the call to the corresponding API client function
$apiClient->getEntryList($params);