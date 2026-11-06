package com.aurel.owner;

import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;

@CapacitorPlugin(name = "OwnerDownloads")
public class OwnerDownloadsPlugin extends Plugin {
    @PluginMethod
    public void saveToDownloads(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.reject("Saving files to the device Downloads folder requires Android 10 or later.");
            return;
        }

        String filename = call.getString("filename");
        String mimeType = call.getString("mimeType");
        String dataBase64 = call.getString("dataBase64");
        if (filename == null || filename.trim().isEmpty()
            || filename.contains("/") || filename.contains("\\")
            || mimeType == null || mimeType.trim().isEmpty()
            || dataBase64 == null || dataBase64.isEmpty()) {
            call.reject("A valid filename, file type, and file content are required.");
            return;
        }

        Uri fileUri = null;
        try {
            byte[] data = Base64.decode(dataBase64, Base64.DEFAULT);
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
            values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/AUREL Owner");
            values.put(MediaStore.Downloads.IS_PENDING, 1);

            fileUri = getContext().getContentResolver().insert(
                MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                values
            );
            if (fileUri == null) {
                throw new IllegalStateException("Android could not create the downloaded file.");
            }

            try (OutputStream output = getContext().getContentResolver().openOutputStream(fileUri)) {
                if (output == null) {
                    throw new IllegalStateException("Android could not open the downloaded file.");
                }
                output.write(data);
            }

            ContentValues completed = new ContentValues();
            completed.put(MediaStore.Downloads.IS_PENDING, 0);
            getContext().getContentResolver().update(fileUri, completed, null, null);

            JSObject result = new JSObject();
            result.put("uri", fileUri.toString());
            call.resolve(result);
        } catch (Exception error) {
            if (fileUri != null) {
                getContext().getContentResolver().delete(fileUri, null, null);
            }
            call.reject("The file could not be saved to the device Downloads folder.", error);
        }
    }
}
