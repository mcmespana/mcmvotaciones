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
// https://docs.suitecrm.com/developer/api/api-v4.1-methods/#_get_available_modules


// LIST OF EXAMPLES
// It is recommended to run the examples one at a time. To do this we can comment on the active example and uncomment another one.

// EXAMPLE 1
// Get all CRM modules

    // $params = array(
    //     'filter' => 'all', // Available options: 'default', 'mobile' y 'all'
    // );


// Execute the call to the corresponding API client function
$apiClient->getAvailableModules($params);