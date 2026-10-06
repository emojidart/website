package com.emojisdartverein.app;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Environment;
import android.widget.Toast;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MessengerDownload")
public class MessengerDownloadPlugin extends Plugin {

    private static final String APK_URL =
            "https://emojisdartverein.com/downloads/emd-messenger.apk";

    @PluginMethod
    public void downloadApk(PluginCall call) {
        try {
            Context context = getContext();
            DownloadManager manager =
                    (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);

            if (manager == null) {
                call.reject("Android DownloadManager ist nicht verfügbar.");
                return;
            }

            String fileName = "emd-messenger-" + System.currentTimeMillis() + ".apk";

            DownloadManager.Request request =
                    new DownloadManager.Request(Uri.parse(APK_URL));

            request.setTitle("EMD Messenger");
            request.setDescription("EMD Messenger wird heruntergeladen …");
            request.setMimeType("application/vnd.android.package-archive");
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(true);
            request.setNotificationVisibility(
                    DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
            );
            request.setDestinationInExternalPublicDir(
                    Environment.DIRECTORY_DOWNLOADS,
                    fileName
            );

            long downloadId = manager.enqueue(request);

            getActivity().runOnUiThread(() ->
                    Toast.makeText(
                            getActivity(),
                            "EMD Messenger Download gestartet",
                            Toast.LENGTH_LONG
                    ).show()
            );

            JSObject result = new JSObject();
            result.put("downloadId", downloadId);
            call.resolve(result);

        } catch (Exception e) {
            call.reject("EMD Messenger Download konnte nicht gestartet werden.", e);
        }
    }
}
