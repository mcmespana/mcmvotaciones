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
// https://docs.suitecrm.com/developer/api/api-v4.1-methods/#_set_entry


// LIST OF EXAMPLES
// It is recommended to run the examples one at a time. To do this we can comment on the active example and uncomment another one.

// In addition, SET type calls modify the database so it is recommended:
// - Use the TEST environment to perform tests.
// - Be careful with what we do
// - Make sure all required fields are being entered


// EXAMPLE 1
// Create a contact indicating the first and last name

    // $module = 'Contacts';
    // $data = array();
    // $data['first_name'] = 'Test';
    // $data['last_name'] = 'API';

// EXAMPLE 2
// Update emails with value <EMAIL_Nº> in contact with id = <ID>

    // $module = 'Contacts';
    // $data = array();
    // $data['id'] = '<ID>';
    // $data['email1'] = 'EMAIL_1@sinergiacrm.org';
    // $data['email2'] = 'EMAIL_2@sinergiacrm.org';
    // $data['email3'] = 'EMAIL_3@sinergiacrm.org';
    // $data['email4'] = 'EMAIL_4@sinergiacrm.org';

// EXAMPLE 3
// Create a contact indicating a creator user with id = <USER_ID> different from the user who connects to the API.
// It will be necessary:
// - Indicate the `id` of the user in the `created_by` field
// - Set `set_created_by` to `false`

    // $module = 'Contacts';
    // $data = array();
    // $data['first_name'] = 'Test';
    // $data['last_name'] = 'API';
    // $data['created_by'] = '<USER_ID>';
    // $data['set_created_by'] = false;


// EXAMPLE 4
// Create a registration and relate it to an event whose id = <EVENT_ID> and a contact whose id = <CONTACT_ID>

    // $module = 'stic_Registrations';
    // $data = array();        
    // $data['registration_date'] = '2023-10-02 22:00:00';  
    // $data['status'] = 'confirmed';
    // $data['participation_type'] = 'attended';
    // $data['attendees'] = 1;
    // $data['stic_registrations_contactscontacts_ida'] = '<CONTACT_ID>';
    // $data['stic_registrations_stic_eventsstic_events_ida'] = '<EVENT_ID>';
    // $data['assigned_user_id'] = 2;


// EXAMPLE 5 (Campo de tipo relacionado)
// Create a job offer with an interlocutor
// To store a value in a related field we have to indicate the value in the linked field (id_name).

    // $module = 'stic_Job_Offers';
    // $data = array();
    // $data['name'] = 'Oferta 1';
    // $data['description'] = 'Oferta 1';
    // // $data['interlocutor'] = '3361d7f3-b3f4-a638-d62b-630e3d9c33ec'; // Campo de tipo Relacionado (Lo podríamos omitir de este array)
    // $data['contact_id_c'] = '3361d7f3-b3f4-a638-d62b-630e3d9c33ec'; // Campo vinculado



// EXAMPLE 6    
// Create a reservation
// Dates must be configured in UTC (Coordinated Universal Time) and in database format (Y-m-d H:i:s)

    // $module = 'stic_Bookings';
    // $data = array();   
    
    // a) All-day reservation made by a user in the GMT+0 zone
    
        // $data['start_date'] = '2022-10-24 00:00:00'; 
        // $data['end_date'] = '2022-10-25 00:00:00';    
        // $data['assigned_user_id'] = 2;
        // $data['status'] = 'pending';
        // $data['all_day'] = 1;

    // b) All-day reservation made by a user in the GMT+2 zone
    
        // $data['start_date'] = '2022-10-23 22:00:00';  
        // $data['end_date'] = '2022-10-24 22:00:00';    
        // $data['assigned_user_id'] = 2;
        // $data['status'] = 'pending';
        // $data['all_day'] = 1;


    // c) Hourly reservation for October 11, 2023 from 11 a.m. to 12 p.m. by a user in the GMT+0 zone
    
        // $data['start_date'] = '2023-10-11 11:00:00';  
        // $data['end_date'] = '2023-10-11 12:00:00';    
        // $data['assigned_user_id'] = 2;
        // $data['status'] = 'pending';
        // $data['all_day'] = 0;


    // d) Hourly reservation for October 11, 2023 from 11 a.m. to 12 p.m. by a user in the GMT+2 zone
        // $data['start_date'] = '2023-10-11 09:00:00';  
        // $data['end_date'] = '2023-10-11 10:00:00';    
        // $data['assigned_user_id'] = 2;
        // $data['status'] = 'pending';
        // $data['all_day'] = 0;


// EXAMPLE 7
// Update the password of the private area with the value <PASSWORD> in the contact whose id = <ID>

    // $module = 'Contacts';
    // $data = array();
    // $data['id'] = '<ID>';
    // $data['stic_pa_password_c'] = '<PASSWORD>';


// EXAMPLE 8
// Create a document indicating the name and publication date

    // $module = 'Documents';
    // $data = array();
    // $data['document_name'] = 'Document_Test_API';
    // $data['date_input'] = '2023-10-11';


// EXAMPLE 9
// Update the Opted Out, Invalid and Opted properties of an email with ID = <ID>. This <ID> was obtained through EXAMPLE 9 of Examples/GET/get_relationships.php

    // $module = 'EmailAddresses';
    // $data = array();
    // $data['id'] = '<ID>';
    // $data['optOut'] = '1'; //para el caso de rehusado
    // $data['invalid_email'] = '1';
    // $data['confirm_opt_in'] = 'not-opt-in';    // not-opt-in | opt-in 


// EXAMPLE 10
// Create a product indicating a name, price, type and assigned_user_id

    // $module = 'AOS_Products';
    // $data = array();
    // $data['name'] = 'API Product';
    // $data['price'] = '1';
    // $data['type'] = 'Good';
    // $data['part_number'] = 'API_1';
    // $data['assigned_user_id'] = '<ASSIGNED_USER_ID>';


// EXAMPLE 11
// Create a work calendar record indicating the assigned user, the type and the dates according to the type

    // $module = 'stic_Work_Calendar';
    // $data = array();
    // $data['assigned_user_id'] = 2;

    // a) All day record
        // $data['type'] = 'vacation';
        // $data['start_date'] = '2024-08-11 22:00:00';

    // b) Not all day record
        // $data['type'] = 'working';
        // $data['start_date'] = '2024-08-12 22:00:00';
        // $data['end_date'] = '2024-08-13 22:00:00';


// EXAMPLE 12
// Update the opt-out and invalid properties of the primary email of a contact with id = <ID>
    // $module = 'Contacts';
    // $data = array();
    // $data['id'] = '<ID>';
    // $data['email_opt_out'] = '1'; // Rehusado
    // $data['invalid_email'] = '1'; // No valido

        
// Execute the call to the corresponding API client function
$apiClient->setEntry($module, $data);