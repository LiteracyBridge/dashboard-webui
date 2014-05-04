package org.literacybridge.rest.api;

import com.google.common.collect.Collections2;
import com.google.common.collect.Lists;
import org.apache.commons.fileupload.FileItemIterator;
import org.apache.commons.fileupload.FileItemStream;
import org.apache.commons.fileupload.FileUploadException;
import org.apache.commons.fileupload.servlet.ServletFileUpload;
import org.apache.commons.lang.StringUtils;
import org.literacybridge.dashboard.model.syncOperations.UpdateProcessingState;
import org.literacybridge.dashboard.model.syncOperations.UsageUpdateRecord;
import org.literacybridge.dashboard.model.syncOperations.ValidationParameters;
import org.literacybridge.dashboard.services.UpdateRecordWriterService;
import org.literacybridge.rest.model.UsageUpdateRecordResponse;
import org.literacybridge.rest.model.UsageUpdateResponse;
import org.literacybridge.dashboard.processes.ContentUsageUpdateProcess;
import org.literacybridge.dashboard.services.S3Service;
import org.literacybridge.stats.model.DirectoryFormat;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.io.*;
import java.util.Date;
import java.util.List;

/**
 * REST APIs for uploading the usage stats to the dashboard.  This process will do several things:
 * <ol>
 *     <li>Processes the log files and stats files and upload them into the database</li>
 *     <li>Merge the log files with the last upload from a content-update</li>
 * </ol>
 *
 */
@Controller
@RequestMapping(value="/api/contentUpdate/**")
public class UsageUpdateController extends LiteracyBridgeController {
  public static final String CONTENT_UPDATE_NAME = "content_update";

  @Autowired
  private ContentUsageUpdateProcess contentUsageUpdateProcess;

  @Autowired
  private S3Service s3Service;

  @Autowired
  private UpdateRecordWriterService updateRecordWriterService;

  public UsageUpdateController() {
  }


  /**
   *   Strict -- Fail if there are any validation errors, or anything that does not seem right
   *   Force -- Update the DB, even if there are failures.
   *
   * @param request
   * @return
   * @throws IOException
   * @throws FileUploadException
   */
  @RequestMapping(value="/api/contentUpdate", method = RequestMethod.POST)
  public
  @ResponseBody
  UsageUpdateResponse postMethod(@RequestParam(value = "device",       required = false) String device,
                                @RequestParam(value = "updateName",   required = false) String updateName,
                                @RequestParam(value = "strict",       defaultValue = "false") boolean strict,
                                @RequestParam(value = "force",        defaultValue = "false") boolean force,
                                @RequestParam(value = "directoryFormat", required = false) Integer directoryFormat,
                                HttpServletRequest request) throws Exception {
    boolean isMultipart = ServletFileUpload.isMultipartContent(request);
    InputStream is = null;
    if (!isMultipart) {
      is = request.getInputStream();
    } else {
      // Create a new file upload handler
      ServletFileUpload upload = new ServletFileUpload();

      FileItemIterator iter = upload.getItemIterator(request);
      while (iter.hasNext()) {
        FileItemStream item = iter.next();
        if (!item.isFormField()) {

          is = item.openStream();

          if (updateName == null) {
            updateName = item.getFieldName();
          }
          break;
        }
      }
    }

    if (StringUtils.isEmpty(device)) {
      device = "UNKNOWN";
    }

    if (StringUtils.isEmpty(updateName)) {
      updateName = "UNKNOWN";
    }

    ValidationParameters  validationParameters = new ValidationParameters();
    validationParameters.setForce(force);
    validationParameters.setStrict(strict);
    if (directoryFormat != null) {
      validationParameters.setFormat(DirectoryFormat.fromVersion(directoryFormat));
    }

    ContentUsageUpdateProcess.UpdateUsageContext context = contentUsageUpdateProcess.processUpdateUpload(is, findTempDir(request), device, updateName, findFileTracker(request));
    context = contentUsageUpdateProcess.process(context, validationParameters);

    UsageUpdateResponse response = new UsageUpdateResponse();
    response.setImportId(context.getUpdateRecord().getExternalId());
    response.setValidationErrors(context.validationErrors);
    response.setImportFailed(context.getUpdateRecord().getState() == UpdateProcessingState.failed);
    return response;
  }


  @RequestMapping(value="/api/contentUpdate", method = RequestMethod.GET)
  public
  @ResponseBody
  List<UsageUpdateRecordResponse> listContentUpdates() throws Exception {
    return Lists.newArrayList(Collections2.transform(updateRecordWriterService.list(), UsageUpdateRecordResponse.FROM_RECORD));
  }


  @RequestMapping(value="/api/contentUpdate/{updateId}", method = RequestMethod.GET)
  @ResponseBody
  UsageUpdateRecordResponse getUsageUpdateRecord(@PathVariable("updateId") String updateId) {
    return UsageUpdateRecordResponse.FROM_RECORD.apply(updateRecordWriterService.findByExternalId(updateId));
  }

  @RequestMapping(value="/api/contentUpdate/{updateId}", method = RequestMethod.DELETE)
  @ResponseBody
  UsageUpdateRecordResponse deleteUsageUpdateRecord(@PathVariable("updateId") String updateId) throws IOException {
    UsageUpdateRecord record = updateRecordWriterService.findByExternalId(updateId);
    record.setDeletedTime(new Date());
    updateRecordWriterService.write(record);
    return UsageUpdateRecordResponse.FROM_RECORD.apply(record) ;
  }


}
