package com.emojisdartverein.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;

import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.RemoteInput;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class ReplyReceiver extends BroadcastReceiver {
    public static final String KEY_TEXT_REPLY = "emd_reply_text";
    private static final String TAG = "EMD_PUSH_REPLY";
    private static final String REPLY_URL =
            "https://emojisdartverein.com/api/push/chat-reply";

    @Override
    public void onReceive(Context context, Intent intent) {
        Bundle results = RemoteInput.getResultsFromIntent(intent);
        if (results == null) return;

        CharSequence replyValue = results.getCharSequence(KEY_TEXT_REPLY);
        if (replyValue == null) return;

        final String reply = replyValue.toString().trim();
        if (TextUtils.isEmpty(reply)) return;

        final String replyToken = intent.getStringExtra("reply_token");
        final int notifId = intent.getIntExtra("notif_id", -1);
        final String notifTag = intent.getStringExtra("notif_tag");

        if (TextUtils.isEmpty(replyToken)) {
            Log.e(TAG, "Missing reply_token");
            cancelNotification(context, notifTag, notifId);
            return;
        }

        final PendingResult pendingResult = goAsync();
        final Context appContext = context.getApplicationContext();

        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(REPLY_URL);
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(15000);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                connection.setRequestProperty("Accept", "application/json");

                JSONObject payload = new JSONObject();
                payload.put("reply_token", replyToken);
                payload.put("message", reply);

                byte[] bytes = payload.toString().getBytes(StandardCharsets.UTF_8);
                connection.setFixedLengthStreamingMode(bytes.length);

                try (OutputStream out = connection.getOutputStream()) {
                    out.write(bytes);
                    out.flush();
                }

                int status = connection.getResponseCode();
                if (status >= 200 && status < 300) {
                    Log.d(TAG, "Inline reply sent successfully");
                } else {
                    Log.e(TAG, "Inline reply failed with HTTP " + status);
                }
            } catch (Exception e) {
                Log.e(TAG, "Inline reply failed", e);
            } finally {
                if (connection != null) connection.disconnect();

                // Direct-Reply UI sicher abschließen; die App wird NICHT geöffnet.
                cancelNotification(appContext, notifTag, notifId);

                try {
                    pendingResult.finish();
                } catch (Exception ignored) {
                }
            }
        }, "emd-inline-reply").start();
    }

    private static void cancelNotification(Context context, String tag, int notifId) {
        if (notifId < 0) return;

        NotificationManagerCompat nm = NotificationManagerCompat.from(context);
        if (!TextUtils.isEmpty(tag)) {
            nm.cancel(tag, notifId);
        } else {
            nm.cancel(notifId);
        }
    }
}
