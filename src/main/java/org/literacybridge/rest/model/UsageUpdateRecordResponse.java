package org.literacybridge.rest.model;

import com.google.common.base.Function;
import org.literacybridge.dashboard.model.syncOperations.UpdateProcessingState;
import org.literacybridge.dashboard.model.syncOperations.UsageUpdateRecord;
import org.springframework.beans.BeanUtils;

import javax.annotation.Nullable;
import javax.persistence.Column;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import java.util.Date;

/**
 * Version of UsageUpdateRecord that will be returned through the REST API.  THis indirection
 * allows us to change DB implementation without affecting REST API, and allows us to hide things
 * like the Database IDs (and potentially S3 ids if we want to in the future).
 *
 */
public class UsageUpdateRecordResponse {

  public static final Function<UsageUpdateRecord, UsageUpdateRecordResponse> FROM_RECORD = new Function<UsageUpdateRecord, UsageUpdateRecordResponse>() {
    @Nullable
    @Override
    public UsageUpdateRecordResponse apply(@Nullable UsageUpdateRecord usageUpdateRecord) {
      UsageUpdateRecordResponse retVal = new UsageUpdateRecordResponse();
      BeanUtils.copyProperties(usageUpdateRecord, retVal);

      return retVal;
    }
  };

  Date startTime;

  Date deletedTime;

  String externalId;

  String s3Id;

  String message;

  UpdateProcessingState state;

  String updateName;

  String deviceName;

  String sha256;

  public Date getStartTime() {
    return startTime;
  }

  public void setStartTime(Date startTime) {
    this.startTime = startTime;
  }

  public Date getDeletedTime() {
    return deletedTime;
  }

  public void setDeletedTime(Date deletedTime) {
    this.deletedTime = deletedTime;
  }

  public String getExternalId() {
    return externalId;
  }

  public void setExternalId(String externalId) {
    this.externalId = externalId;
  }

  public String getS3Id() {
    return s3Id;
  }

  public void setS3Id(String s3Id) {
    this.s3Id = s3Id;
  }

  public String getMessage() {
    return message;
  }

  public void setMessage(String message) {
    this.message = message;
  }

  public UpdateProcessingState getState() {
    return state;
  }

  public void setState(UpdateProcessingState state) {
    this.state = state;
  }

  public String getUpdateName() {
    return updateName;
  }

  public void setUpdateName(String updateName) {
    this.updateName = updateName;
  }

  public String getDeviceName() {
    return deviceName;
  }

  public void setDeviceName(String deviceName) {
    this.deviceName = deviceName;
  }

  public String getSha256() {
    return sha256;
  }

  public void setSha256(String sha256) {
    this.sha256 = sha256;
  }
}
