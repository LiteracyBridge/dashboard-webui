package org.literacybridge.rest.model;

import org.literacybridge.stats.model.validation.ValidationError;

import java.util.List;

/**
 */
public class UsageUpdateResponse {
  String importId;
  boolean importFailed;
  List<ValidationError> validationErrors;

  public String getImportId() {
    return importId;
  }

  public void setImportId(String importId) {
    this.importId = importId;
  }

  public boolean isImportFailed() {
    return importFailed;
  }

  public void setImportFailed(boolean importFailed) {
    this.importFailed = importFailed;
  }

  public List<ValidationError> getValidationErrors() {
    return validationErrors;
  }

  public void setValidationErrors(List<ValidationError> validationErrors) {
    this.validationErrors = validationErrors;
  }
}
