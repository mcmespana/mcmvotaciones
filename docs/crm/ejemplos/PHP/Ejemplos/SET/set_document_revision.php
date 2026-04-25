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
// https://docs.suitecrm.com/developer/api/api-v4.1-methods/#_set_document_revision

// LIST OF EXAMPLES
// It is recommended to run the examples one at a time. To do this we can comment on the active example and uncomment another one.

// In addition, SET type calls modify the database so it is recommended:
// - Use the TEST environment to perform tests.
// - Be careful with what we do
// - Make sure all required fields are being entered


// EXAMPLE 1
// Sets the document revision test_image.jpg (existing in the assets folder) with version = <NUM_REVISION> in the document whose id = <ID>
// To create a document it is possible to activate example 8 of Examples/SET/set_entry.php

    // $fileName = 'test_image.jpg';
    // $file = 'Ejemplos/assets/'.$fileName;
    // $contents = file_get_contents($file);

    // $params = array(
    //     'document_revision' => array( 
    //         'id' => '<ID>',
    //         'file' => base64_encode($contents),
    //         'filename' => $fileName,
    //         'revision' => '<NUM_REVISION>',
    //     ),
    // );


// Execute the call to the corresponding API client function
$apiClient->setDocumentRevision($params);
