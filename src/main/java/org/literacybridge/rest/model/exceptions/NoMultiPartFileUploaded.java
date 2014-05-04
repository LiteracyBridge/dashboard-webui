package org.literacybridge.rest.model.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * THis is thrown when a REST api expects a mult-part
 */
@ResponseStatus(value= HttpStatus.BAD_REQUEST, reason="This API requires a multi-part file upload")
public class NoMultiPartFileUploaded extends RuntimeException{
}
