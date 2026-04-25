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