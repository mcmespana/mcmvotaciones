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
// https://docs.suitecrm.com/developer/api/api-v4.1-methods/#_get_document_revision


// LIST OF EXAMPLES
// It is recommended to run the examples one at a time. To do this we can comment on the active example and uncomment another one.

// EXAMPLE 1
// Get the information related to the document version whose ID = <DOCUMENT_REVISION_ID>

    // $documentRevisionId = '<DOCUMENT_REVISION_ID>';
    // $params = array(
    //     'id' => $documentRevisionId,
    // );

    // Execute the call to the corresponding API client function
    // $result = $apiClient->getDocumentRevision($params);

// EXAMPLE 2 (It is necessary to activate EXAMPLE 1)
// GET the file mime type of the revision file and RENDER the received binary image

    // // In order to render the image correctly it is necessary to know the file_mime_type. 
    // // To collect this data we have to use the get_entry method with the ID of the same document version. 
    // $params = array(
    //     'module_name' => 'DocumentRevisions',
    //     'id' => $documentRevisionId,
    //     'select_fields' => array('file_mime_type'),
    //     'deleted' => 0,
    // );
    
    // // Execute the API client getEntry() function call
    // $resultMime = $apiClient->getEntry($params);

    // // Render the received binary image
    // $file = $result->document_revision->file ?? '';
    // $filename = $result->document_revision->filename ?? '';
    // $fileMimeType = $resultMime->entry_list[0]->name_value_list->file_mime_type->value ?? '';
    // echo '<br /><img src="data:' . $fileMimeType .';base64,' . $file .'" ><br />';
    // echo '<br /><a download="' . $filename .'" href="data:'. $fileMimeType .';base64,' . $file .'" title="Descargar" > Descargar Fichero</a><br />';

