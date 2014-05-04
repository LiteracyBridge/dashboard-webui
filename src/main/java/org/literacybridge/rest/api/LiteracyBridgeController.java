package org.literacybridge.rest.api;

import org.apache.commons.fileupload.servlet.FileCleanerCleanup;
import org.apache.commons.io.FileCleaningTracker;
import org.codehaus.jackson.map.ObjectMapper;
import org.codehaus.jackson.map.SerializationConfig;

import javax.servlet.ServletContext;
import javax.servlet.ServletRequest;
import javax.servlet.http.HttpServletRequest;
import java.io.File;

/**
 */
abstract public class LiteracyBridgeController {

  public static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

  static {
    OBJECT_MAPPER.configure(SerializationConfig.Feature.INDENT_OUTPUT, true);
  }

  public File findTempDir(HttpServletRequest request) {
    ServletContext context = request.getSession().getServletContext();
    return (File) context.getAttribute("javax.servlet.context.tempdir");
  }

  public FileCleaningTracker findFileTracker(HttpServletRequest request) {
    ServletContext context = request.getSession().getServletContext();
    return FileCleanerCleanup.getFileCleaningTracker(context);
  }
}
