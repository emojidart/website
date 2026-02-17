// MainActivity.java
package com.emojisdartverein.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // Merkt sich DeepLink/Pfad, bis WebView/Bridge wirklich ready ist
    private static String pendingPath = null;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private int tries = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        captureIntent(getIntent());
        navigateWhenReady();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        captureIntent(intent);
        navigateWhenReady();
    }

    @Override
    public void onResume() { // ✅ MUSS public sein (BridgeActivity hat public)
        super.onResume();
        if (!TextUtils.isEmpty(pendingPath)) {
            navigateWhenReady();
        }
    }

    private void captureIntent(Intent intent) {
        if (intent == null) return;

        // ✅ bevorzugt: kompletter Pfad vom Server, z.B. "/chat-app?scope=team&room_id=<chat_room_uuid>"
        String path = intent.getStringExtra("path");

        // Fallback (alte Pushes)
        String scope = intent.getStringExtra("scope");

        // roomId alt/neu akzeptieren (room_id ist korrekt, roomId legacy)
        String roomId1 = intent.getStringExtra("room_id");
        String roomId2 = intent.getStringExtra("roomId");
        String rid = !TextUtils.isEmpty(roomId1) ? roomId1 : roomId2;

        if (TextUtils.isEmpty(path)) {
            if (!TextUtils.isEmpty(scope) && "team".equals(scope) && !TextUtils.isEmpty(rid)) {
                // ✅ WICHTIG: rid muss chat_room_id sein (nicht teams.id)
                path = "/chat-app?scope=team&room_id=" + Uri.encode(rid);
            } else if (!TextUtils.isEmpty(scope)) {
                path = "/chat-app?scope=" + Uri.encode(scope);
            } else {
                // Default
                path = "/chat-app";
            }
        }

        if (!TextUtils.isEmpty(path)) {
            if (!path.startsWith("/")) path = "/" + path;
            pendingPath = path;
        }
    }

    private void navigateWhenReady() {
        tries = 0;
        handler.removeCallbacks(navRunnable);
        handler.post(navRunnable);
    }

    private final Runnable navRunnable = new Runnable() {
        @Override
        public void run() {
            if (TextUtils.isEmpty(pendingPath)) return;

            tries++;

            // warten bis Capacitor Bridge + WebView da sind
            if (bridge == null || bridge.getWebView() == null || bridge.getServerUrl() == null) {
                if (tries < 100) { // ~5 Sekunden
                    handler.postDelayed(this, 50);
                }
                return;
            }

            String url = bridge.getServerUrl() + pendingPath;

            // ✅ navigieren
            bridge.getWebView().loadUrl(url);

            // ✅ consumed
            pendingPath = null;
        }
    };
}
