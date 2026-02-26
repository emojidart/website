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

    // Gruppierung (damit mehrere Nachrichten angezeigt werden statt nur 1)
    private static final String GROUP_KEY_CHAT = "emd_chat_group";
    private static final int SUMMARY_ID = 1001;

    // "MessagingStyle" Historie (in-memory, reicht für Laufzeit der App)
    private static final int MAX_LINES = 7;
    private static final java.util.LinkedHashMap<String, java.util.ArrayDeque<ChatLine>> HISTORY =
            new java.util.LinkedHashMap<String, java.util.ArrayDeque<ChatLine>>(16, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, java.util.ArrayDeque<ChatLine>> eldest) {
                    return size() > 30; // max 30 Konversationen im RAM
                }
            };

    private static class ChatLine {
        final String sender;
        final String text;
        final long ts;
        ChatLine(String sender, String text, long ts) {
            this.sender = sender;
            this.text = text;
            this.ts = ts;
        }
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {

        // ✅ Wenn Notifications generell deaktiviert sind -> nix machen (Android 13+ safe)
        NotificationManagerCompat nm = NotificationManagerCompat.from(this);
        if (!nm.areNotificationsEnabled()) {
            return;
        }

        Map<String, String> data = remoteMessage.getData();

        // ✅ EVENT-CARD: wenn type=event -> eigene Card anzeigen und fertig
        String type = get(data, "type");
        if ("event".equals(type)) {
            showEventCard(remoteMessage);
            return;
        }

        // =========================
        // DEFAULT: CHAT / WHATSAPP STYLE
        // + LINEUP + REMINDER (ohne Events anzufassen)
        // =========================

        // aus Push Data
        String conversation = get(data, "conversation"); // z.B. "⏰ Bitte Verfügbarkeit" oder Teamname
        String senderName   = get(data, "senderName");   // optional
        String message      = get(data, "message");      // optional
        String body         = get(data, "body");         // du verwendest das für reminder/lineup text
        String tag          = get(data, "tag");
        String notifIdStr   = get(data, "notif_id");

        String scope        = get(data, "scope");
        String roomId       = get(data, "room_id");
        String iconUrl      = get(data, "iconUrl");
        String clickUrl     = get(data, "clickUrl");

        if (TextUtils.isEmpty(conversation)) conversation = "Neue Nachricht";
        if (TextUtils.isEmpty(senderName)) senderName = "System";

        // Wichtig: Für Reminder/Lineup kommt Text oft in "body"
        String textToShow = firstNonEmpty(message, body);
        if (TextUtils.isEmpty(textToShow)) textToShow = "";

        int orange = ContextCompat.getColor(this, R.color.emd_orange);
        int notifId = safeInt(notifIdStr, stableIdFrom(tag));

        // Fallback clickUrl
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
        intent.setAction("OPEN_PUSH_" + notifId);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("path", clickUrl);
        intent.setData(Uri.parse("emd://push" + clickUrl));

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                notifId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        ensureChannel();

        // ====== Konversations-Schlüssel (damit je Chat/Team/Reminder getrennt) ======
        // Wenn du tag stabil pro match/team/player machst, ist das perfekt für Gruppierung.
        // Falls tag fehlt, nutze conversation+scope+roomId.
        String convoKey = !TextUtils.isEmpty(tag)
                ? tag
                : (conversation + "|" + nullToEmpty(scope) + "|" + nullToEmpty(roomId));

        // ====== Historie updaten ======
        long now = System.currentTimeMillis();
        addLine(convoKey, new ChatLine(senderName, textToShow, now));
        java.util.ArrayDeque<ChatLine> lines = getLines(convoKey);

        // ====== Personen für MessagingStyle ======
        Person me = new Person.Builder().setName("Ich").build();
        Person senderPerson = new Person.Builder().setName(senderName).build();

        NotificationCompat.MessagingStyle style = new NotificationCompat.MessagingStyle(me)
                .setConversationTitle(conversation)
                .setGroupConversation(true);

        // letzte MAX_LINES reinrendern
        for (ChatLine l : lines) {
            Person p = new Person.Builder().setName(l.sender).build();
            style.addMessage(l.text, l.ts, p);
        }

        // ====== Einzelnotification (zeigt Verlauf) ======
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(conversation)
                .setContentText(senderName + ": " + firstLine(textToShow))
                .setStyle(style)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setColor(orange)
                .setColorized(true)
                .setGroup(GROUP_KEY_CHAT);

        // Wenn tag gesetzt ist -> stable "thread" notification, sonst notifId
        if (!TextUtils.isEmpty(tag)) nm.notify(tag, notifId, builder.build());
        else nm.notify(notifId, builder.build());

        // ====== Summary (zeigt Zähler + Gruppierung) ======
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

    // =========================
    // EVENT CARD NOTIFICATION
    // (Events bleiben wie bei dir – erweitert um Premium Turnierstart)
    // =========================
    private void showEventCard(RemoteMessage remoteMessage) {
        NotificationManagerCompat nm = NotificationManagerCompat.from(this);
        if (!nm.areNotificationsEnabled()) return;

        Map<String, String> data = remoteMessage.getData();

        // ✅ PREMIUM: unterscheidet "match_start" vs normale Events
        String cardKind = get(data, "card_kind");

        String title     = get(data, "title");
        String eventName = get(data, "eventName");
        String when      = get(data, "when");
        String where     = get(data, "where");
        String details   = get(data, "details");
        String imageUrl  = get(data, "imageUrl");

        String tag       = get(data, "tag");
        String notifIdStr= get(data, "notif_id");
        String clickUrl  = get(data, "clickUrl");

        int orange = ContextCompat.getColor(this, R.color.emd_orange);
        int notifId = safeInt(notifIdStr, stableIdFrom(tag));

        if (TextUtils.isEmpty(title)) title = "📢 Veranstaltung";
        if (TextUtils.isEmpty(eventName)) eventName = "Neue Veranstaltung";
        if (TextUtils.isEmpty(when)) when = "";
        if (TextUtils.isEmpty(where)) where = "";
        if (TextUtils.isEmpty(details)) details = "";

        if (TextUtils.isEmpty(clickUrl)) clickUrl = "/veranstaltungen";
        if (!clickUrl.startsWith("/")) clickUrl = "/" + clickUrl;

        Intent intent = new Intent(this, MainActivity.class);
        intent.setAction("OPEN_PUSH_" + notifId);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("path", clickUrl);
        intent.setData(Uri.parse("emd://push" + clickUrl));

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                notifId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        ensureChannel();

        String meta = "";
        if (!TextUtils.isEmpty(when) && !TextUtils.isEmpty(where)) meta = when + " • " + where;
        else if (!TextUtils.isEmpty(when)) meta = when;
        else if (!TextUtils.isEmpty(where)) meta = where;

        Bitmap flyer = fetchBitmap(imageUrl);
        if (flyer != null) flyer = scaleDownForNotification(flyer, 1000, 600);

        // Small (collapsed)
        android.widget.RemoteViews small =
                new android.widget.RemoteViews(getPackageName(), R.layout.notification_event_card);

        small.setTextViewText(R.id.eventTitle, title);
        small.setTextViewText(R.id.eventName, eventName);
        small.setTextViewText(R.id.eventMeta, meta);
        small.setTextViewText(R.id.eventDetails, details);

        // Big (expanded)
        android.widget.RemoteViews big =
                new android.widget.RemoteViews(getPackageName(), R.layout.notification_event_card_big);

        big.setTextViewText(R.id.eventTitle, title);
        big.setTextViewText(R.id.eventName, eventName);
        big.setTextViewText(R.id.eventMeta, meta);
        big.setTextViewText(R.id.eventDetails, details);

        // ✅ PREMIUM MATCH START CARD (nur Turnierstart)
        // Erwartet im Push: card_kind=match_start, player1, player2, machine
        if ("match_start".equals(cardKind)) {
            String p1 = get(data, "player1");
            String p2 = get(data, "player2");
            String machine = get(data, "machine");

            // SMALL VIEW
            small.setViewVisibility(R.id.matchRow, android.view.View.VISIBLE);
            small.setViewVisibility(R.id.matchMeta, android.view.View.VISIBLE);

            small.setViewVisibility(R.id.eventName, android.view.View.GONE);
            small.setViewVisibility(R.id.eventMeta, android.view.View.GONE);
            small.setViewVisibility(R.id.eventDetails, android.view.View.GONE);

            small.setTextViewText(R.id.player1, p1);
            small.setTextViewText(R.id.player2, p2);
            small.setTextViewText(R.id.matchMeta, "🕹 Automat " + machine);

            // BIG VIEW
            big.setViewVisibility(R.id.matchRow, android.view.View.VISIBLE);
            big.setViewVisibility(R.id.matchMeta, android.view.View.VISIBLE);

            big.setViewVisibility(R.id.eventName, android.view.View.GONE);
            big.setViewVisibility(R.id.eventMeta, android.view.View.GONE);
            big.setViewVisibility(R.id.eventDetails, android.view.View.GONE);

            big.setTextViewText(R.id.player1, p1);
            big.setTextViewText(R.id.player2, p2);
            big.setTextViewText(R.id.matchMeta, "🕹 Automat " + machine);

            // Optional: Flyer in Match-Start NICHT anzeigen (clean)
            big.setViewVisibility(R.id.flyerImage, android.view.View.GONE);
        }

        if (flyer != null) {
            Bitmap thumb = scaleSquareCenterCrop(flyer, 128);
            Bitmap round = circleWithBorder(thumb, 6, 0xFFFFFFFF);

            small.setImageViewBitmap(R.id.eventImage, round);
            big.setImageViewBitmap(R.id.eventImage, round);

            // Flyer nur wenn vorhanden + nicht match_start (falls du magst)
            if (!"match_start".equals(cardKind)) {
                big.setImageViewBitmap(R.id.flyerImage, flyer);
                big.setViewVisibility(R.id.flyerImage, android.view.View.VISIBLE);
            }
        } else {
            small.setImageViewResource(R.id.eventImage, android.R.color.transparent);
            big.setImageViewResource(R.id.eventImage, android.R.color.transparent);
            big.setViewVisibility(R.id.flyerImage, android.view.View.GONE);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(eventName)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_EVENT)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setColor(orange)
                .setColorized(false)
                .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
                .setCustomContentView(small)
                .setCustomBigContentView(big);

        if (!TextUtils.isEmpty(tag)) nm.notify(tag, notifId, builder.build());
        else nm.notify(notifId, builder.build());
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);

        // ✅ Token lokal speichern
        try {
            android.content.SharedPreferences sp = getApplicationContext()
                    .getSharedPreferences("emd_push", MODE_PRIVATE);
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

    // ====== MessagingStyle helpers ======
    private static synchronized void addLine(String key, ChatLine line) {
        java.util.ArrayDeque<ChatLine> q = HISTORY.get(key);
        if (q == null) {
            q = new java.util.ArrayDeque<>();
            HISTORY.put(key, q);
        }
        q.addLast(line);
        while (q.size() > MAX_LINES) q.removeFirst();
    }

    private static synchronized java.util.ArrayDeque<ChatLine> getLines(String key) {
        java.util.ArrayDeque<ChatLine> q = HISTORY.get(key);
        if (q == null) return new java.util.ArrayDeque<>();
        return new java.util.ArrayDeque<>(q); // copy (thread-safe)
    }

    private static String firstNonEmpty(String a, String b) {
        if (!TextUtils.isEmpty(a)) return a;
        if (!TextUtils.isEmpty(b)) return b;
        return null;
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    private static String firstLine(String s) {
        if (s == null) return "";
        int i = s.indexOf('\n');
        if (i >= 0) return s.substring(0, i);
        return s;
    }

    // ====== Image helpers (deine bestehenden) ======
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

    // ✅ Flyer-Bild sauber verkleinern für Notification
    private static Bitmap scaleDownForNotification(Bitmap src, int maxW, int maxH) {
        int w = src.getWidth();
        int h = src.getHeight();

        if (w <= maxW && h <= maxH) return src;

        float ratio = Math.min((float) maxW / (float) w,
                (float) maxH / (float) h);

        int newW = Math.max(1, Math.round(w * ratio));
        int newH = Math.max(1, Math.round(h * ratio));

        return Bitmap.createScaledBitmap(src, newW, newH, true);
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
            Paint border = new Paint(Paint.ANTI_ALIAS_FLAG);
            border.setStyle(Paint.Style.STROKE);
            border.setStrokeWidth(borderPx);
            border.setColor(borderColor);

            float half = borderPx / 2f;
            canvas.drawOval(
                    new RectF(half, half, size - half, size - half),
                    border
            );
        }

        return out;
    }
}