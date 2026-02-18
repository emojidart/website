package com.emojisdartverein.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // DeepLink/Pfad bis Bridge/WebView ready ist
    private static String pendingPath = null;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private int tries = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // ✅ Beim echten Launcher-Start niemals Push erzwingen
        if (isLauncherIntent(getIntent())) {
            pendingPath = null;
            clearToLauncherIntent(); // wipes old extras that can be reused by Android
            return;
        }

        captureIntent(getIntent());
        if (!TextUtils.isEmpty(pendingPath)) navigateWhenReady();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);

        // ✅ Wenn App über Icon / Task Switcher normal geöffnet wird -> kein Push erzwingen
        if (isLauncherIntent(intent)) {
            pendingPath = null;
            clearToLauncherIntent();
            return;
        }

        captureIntent(intent);
        if (!TextUtils.isEmpty(pendingPath)) navigateWhenReady();
    }

    @Override
    public void onResume() {
        super.onResume();
        if (!TextUtils.isEmpty(pendingPath)) navigateWhenReady();
    }

    /**
     * Launcher-Start ist in der Praxis oft ACTION_MAIN.
     * Categories können bei manchen Herstellern/Launchern fehlen oder anders sein.
     */
    private boolean isLauncherIntent(Intent intent) {
        if (intent == null) return true;

        String action = intent.getAction();
        if (Intent.ACTION_MAIN.equals(action)) return true;

        // Fallback: wenn kein klares Push-Signal da ist, behandeln wir es wie Launcher
        // (verhindert "alte Extras" => fälschlicher Push-Start)
        Uri data = intent.getData();
        boolean looksLikePush = false;

        if (data != null && "emd".equalsIgnoreCase(data.getScheme()) && "push".equalsIgnoreCase(data.getHost())) {
            looksLikePush = true;
        }
        if (!TextUtils.isEmpty(action) && action.startsWith("OPEN_PUSH_")) {
            looksLikePush = true;
        }

        return !looksLikePush;
    }

    private void clearToLauncherIntent() {
        try {
            Intent clean = new Intent(Intent.ACTION_MAIN);
            clean.addCategory(Intent.CATEGORY_LAUNCHER);
            clean.setPackage(getPackageName());
            setIntent(clean);
        } catch (Exception ignored) {}
    }

    private void captureIntent(Intent intent) {
        if (intent == null) return;

        // ✅ Push nur dann, wenn wir es wirklich sicher wissen:
        // - Action OPEN_PUSH_...
        // - oder emd://push/...
        boolean isPush = false;

        String action = intent.getAction();
        if (!TextUtils.isEmpty(action) && action.startsWith("OPEN_PUSH_")) {
            isPush = true;
        }

        Uri data = intent.getData();
        if (data != null) {
            if ("emd".equalsIgnoreCase(data.getScheme()) && "push".equalsIgnoreCase(data.getHost())) {
                isPush = true;
            }
        }

        // ✅ Kein Push -> nix tun (wichtig!)
        if (!isPush) {
            pendingPath = null;
            return;
        }

        // ✅ Nur bei echtem Push lesen wir Extras aus
        String pathExtra = intent.getStringExtra("path");
        String scopeExtra = intent.getStringExtra("scope");
        String roomId1 = intent.getStringExtra("room_id");
        String roomId2 = intent.getStringExtra("roomId");
        String rid = !TextUtils.isEmpty(roomId1) ? roomId1 : roomId2;

        String path = pathExtra;
        String scope = scopeExtra;

        if (TextUtils.isEmpty(path)) {
            if (!TextUtils.isEmpty(scope) && "team".equals(scope) && !TextUtils.isEmpty(rid)) {
                path = "/chat-app?scope=team&room_id=" + Uri.encode(rid);
            } else if (!TextUtils.isEmpty(scope)) {
                path = "/chat-app?scope=" + Uri.encode(scope);
            } else {
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

            if (bridge == null || bridge.getWebView() == null || bridge.getServerUrl() == null) {
                if (tries < 120) { // ~6 Sekunden
                    handler.postDelayed(this, 50);
                }
                return;
            }

            String url = bridge.getServerUrl() + pendingPath;
            bridge.getWebView().loadUrl(url);

            pendingPath = null;

            // ✅ nach Push säubern (damit nix hängen bleibt)
            clearToLauncherIntent();
        }
    };
}
