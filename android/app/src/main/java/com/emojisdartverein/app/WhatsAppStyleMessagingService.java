package com.emojisdartverein.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.net.Uri;
import android.os.Build;
import android.text.TextUtils;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.Person;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.drawable.IconCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;

public class WhatsAppStyleMessagingService extends FirebaseMessagingService {

    private static final String CHANNEL_ID = "chat";
    private static final String CHANNEL_NAME = "Chat";
    private static final String GROUP_KEY_CHAT = "emd_chat_group";
    private static final int SUMMARY_ID = 1001;

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {

        // ✅ Wenn Notifications generell deaktiviert sind -> nix machen (Android 13+ safe)
        NotificationManagerCompat nm = NotificationManagerCompat.from(this);
        if (!nm.areNotificationsEnabled()) {
            return;
        }

        Map<String, String> data = remoteMessage.getData();

        String conversation = get(data, "conversation");
        String senderName   = get(data, "senderName");
        String message      = get(data, "message");
        String body         = get(data, "body");
        String tag          = get(data, "tag");
        String notifIdStr   = get(data, "notif_id");

        String scope        = get(data, "scope");

        // ✅ room_id muss chat_room_id sein
        String roomId       = get(data, "room_id");

        String iconUrl      = get(data, "iconUrl");

        // ✅ server soll das mitsenden: "/chat-app?scope=team&room_id=..."
        String clickUrl     = get(data, "clickUrl");

        if (TextUtils.isEmpty(conversation)) conversation = "Neue Nachricht";
        if (TextUtils.isEmpty(senderName)) senderName = "System";
        if (TextUtils.isEmpty(message)) message = !TextUtils.isEmpty(body) ? body : "";

        int orange = ContextCompat.getColor(this, R.color.emd_orange);
        int notifId = safeInt(notifIdStr, stableIdFrom(tag));

        // Fallback wenn clickUrl fehlt
        if (TextUtils.isEmpty(clickUrl)) {
            if (!TextUtils.isEmpty(scope) && "team".equals(scope) && !TextUtils.isEmpty(roomId)) {
                clickUrl = "/chat-app?scope=team&room_id=" + Uri.encode(roomId);
            } else if (!TextUtils.isEmpty(scope)) {
                clickUrl = "/chat-app?scope=" + Uri.encode(scope);
            } else {
                clickUrl = "/chat-app";
            }
        }

        if (!clickUrl.startsWith("/")) clickUrl = "/" + clickUrl;

        Intent intent = new Intent(this, MainActivity.class);

        // ✅ EXTREM WICHTIG:
        // PendingIntents werden sonst recycelt → Extras (path) gehen verloren/alt
        intent.setAction("OPEN_PUSH_" + notifId);
        intent.setData(Uri.parse("emd://push/" + notifId));

        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        // ✅ NUR interner Pfad als Extra
        intent.putExtra("path", clickUrl);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                notifId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        ensureChannel();

        Bitmap raw = fetchBitmap(iconUrl);
        Bitmap round = null;
        if (raw != null) {
            Bitmap scaled = scaleSquareCenterCrop(raw, 128);
            round = circleWithBorder(scaled, 6, 0xFFFFFFFF);
        }

        Person user = new Person.Builder().setName("Du").build();
        Person.Builder senderBuilder = new Person.Builder().setName(senderName);
        if (round != null) senderBuilder.setIcon(IconCompat.createWithBitmap(round));
        Person sender = senderBuilder.build();

        NotificationCompat.MessagingStyle style = new NotificationCompat.MessagingStyle(user)
                .setConversationTitle(conversation)
                .addMessage(message, System.currentTimeMillis(), sender);

        NotificationCompat.Builder chatBuilder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(conversation)
                .setContentText(senderName + ": " + message)
                .setStyle(style)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setColor(orange)
                .setColorized(true)
                .setGroup(GROUP_KEY_CHAT)
                .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_CHILDREN);

        if (round != null) chatBuilder.setLargeIcon(round);

        if (!TextUtils.isEmpty(tag)) nm.notify(tag, notifId, chatBuilder.build());
        else nm.notify(notifId, chatBuilder.build());

        int unread = incrementUnreadCounter(getApplicationContext());
        NotificationCompat.Builder summary = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("EMD Vereinsapp")
                .setContentText(unread + " neue Nachrichten")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setColor(orange)
                .setColorized(true)
                .setGroup(GROUP_KEY_CHAT)
                .setGroupSummary(true);

        nm.notify(SUMMARY_ID, summary.build());
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);

        // ✅ Token lokal speichern (damit du ihn später easy an Supabase schicken kannst)
        try {
            android.content.SharedPreferences sp = getApplicationContext().getSharedPreferences("emd_push", MODE_PRIVATE);
            sp.edit().putString("fcm_token", token).apply();
        } catch (Exception ignored) {}
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.enableVibration(true);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    private static String get(Map<String, String> data, String key) {
        if (data == null) return null;
        String v = data.get(key);
        return v == null ? null : v.trim();
    }

    private static int safeInt(String s, int fallback) {
        try {
            if (s == null) return fallback;
            return Integer.parseInt(s);
        } catch (Exception e) {
            return fallback;
        }
    }

    private static int stableIdFrom(String tag) {
        if (TextUtils.isEmpty(tag)) return 2000;
        return 2000 + Math.abs(tag.hashCode() % 100000);
    }

    private static int incrementUnreadCounter(Context ctx) {
        android.content.SharedPreferences sp = ctx.getSharedPreferences("emd_push", MODE_PRIVATE);
        int cur = sp.getInt("unread_total", 0);
        int next = cur + 1;
        sp.edit().putInt("unread_total", next).apply();
        return next;
    }

    private Bitmap fetchBitmap(String urlStr) {
        try {
            if (TextUtils.isEmpty(urlStr)) return null;
            URL url = new URL(urlStr);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(2500);
            conn.setReadTimeout(2500);
            conn.setInstanceFollowRedirects(true);
            conn.connect();
            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) return null;

            InputStream is = conn.getInputStream();
            Bitmap bmp = BitmapFactory.decodeStream(is);
            is.close();
            conn.disconnect();
            return bmp;
        } catch (Exception e) {
            return null;
        }
    }

    private static Bitmap scaleSquareCenterCrop(Bitmap src, int size) {
        int w = src.getWidth();
        int h = src.getHeight();
        int min = Math.min(w, h);

        int x = (w - min) / 2;
        int y = (h - min) / 2;

        Bitmap cropped = Bitmap.createBitmap(src, x, y, min, min);
        return Bitmap.createScaledBitmap(cropped, size, size, true);
    }

    private static Bitmap circleWithBorder(Bitmap src, int borderPx, int borderColor) {
        int size = src.getWidth();
        Bitmap out = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(out);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        RectF rect = new RectF(0, 0, size, size);

        canvas.drawARGB(0, 0, 0, 0);
        paint.setColor(0xFFFFFFFF);
        canvas.drawOval(rect, paint);

        paint.setXfermode(new android.graphics.PorterDuffXfermode(android.graphics.PorterDuff.Mode.SRC_IN));
        canvas.drawBitmap(src, 0, 0, paint);
        paint.setXfermode(null);

        if (borderPx > 0) {
            Paint b = new Paint(Paint.ANTI_ALIAS_FLAG);
            b.setStyle(Paint.Style.STROKE);
            b.setStrokeWidth(borderPx);
            b.setColor(borderColor);
            float half = borderPx / 2f;
            canvas.drawOval(new RectF(half, half, size - half, size - half), b);
        }

        return out;
    }
}