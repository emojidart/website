package com.emojisdartverein.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import androidx.core.content.pm.ShortcutInfoCompat;
import androidx.core.content.pm.ShortcutManagerCompat;
import androidx.core.graphics.drawable.IconCompat;

import com.getcapacitor.BridgeActivity;

import java.util.Collections;

public class MainActivity extends BridgeActivity {

    private static String pendingPath = null;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private int tries = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Robuste Brücke für den Messenger-Install-Button der Web-App.
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().addJavascriptInterface(new EmdNativeBridge(), "AndroidEMD");
        }


        if (isMessengerInstallIntent(getIntent())) {
            requestMessengerShortcut();
            clearToLauncherIntent();
            return;
        }

        if (isLauncherIntent(getIntent())) {
            pendingPath = null;
            clearToLauncherIntent();
            return;
        }

        captureIntent(getIntent());
        if (!TextUtils.isEmpty(pendingPath)) navigateWhenReady();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);

        if (isMessengerInstallIntent(intent)) {
            requestMessengerShortcut();
            clearToLauncherIntent();
            return;
        }

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

    private class EmdNativeBridge {
        @JavascriptInterface
        public void installMessengerShortcut() {
            runOnUiThread(() -> requestMessengerShortcut());
        }
    }

    private boolean isMessengerInstallIntent(Intent intent) {
        if (intent == null) return false;
        Uri data = intent.getData();
        return data != null
                && "emd".equalsIgnoreCase(data.getScheme())
                && "install-messenger".equalsIgnoreCase(data.getHost());
    }

    private void requestMessengerShortcut() {
        try {
            Intent shortcutIntent = new Intent(this, MainActivity.class);
            shortcutIntent.setAction("OPEN_MESSENGER_SHORTCUT");
            shortcutIntent.putExtra("path", "/chat-app?tab=chats");
            shortcutIntent.setData(Uri.parse("emd://shortcut/messenger"));
            shortcutIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

            ShortcutInfoCompat shortcut = new ShortcutInfoCompat.Builder(this, "emd_messenger")
                    .setShortLabel("EMD Messenger")
                    .setLongLabel("EMD Messenger")
                    .setIcon(IconCompat.createWithResource(this, R.mipmap.ic_launcher))
                    .setIntent(shortcutIntent)
                    .setLongLived(true)
                    .build();

            ShortcutManagerCompat.pushDynamicShortcut(this, shortcut);

            if (ShortcutManagerCompat.isRequestPinShortcutSupported(this)) {
                ShortcutManagerCompat.requestPinShortcut(this, shortcut, null);
            } else {
                ShortcutManagerCompat.addDynamicShortcuts(this, Collections.singletonList(shortcut));
                Toast.makeText(this, "EMD Messenger wurde zu den App-Verknüpfungen hinzugefügt.", Toast.LENGTH_LONG).show();
            }
        } catch (Exception e) {
            Toast.makeText(this, "EMD Messenger konnte nicht hinzugefügt werden.", Toast.LENGTH_LONG).show();
        }
    }

    private boolean isLauncherIntent(Intent intent) {
        if (intent == null) return true;

        String action = intent.getAction();
        if (Intent.ACTION_MAIN.equals(action)) return true;

        Uri data = intent.getData();
        boolean isKnownDeepLink = false;

        if (data != null && "emd".equalsIgnoreCase(data.getScheme())) {
            String host = data.getHost();
            isKnownDeepLink = "push".equalsIgnoreCase(host) || "shortcut".equalsIgnoreCase(host);
        }

        if (!TextUtils.isEmpty(action)
                && (action.startsWith("OPEN_PUSH_") || "OPEN_MESSENGER_SHORTCUT".equals(action))) {
            isKnownDeepLink = true;
        }

        return !isKnownDeepLink;
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

        boolean isDeepLink = false;
        String action = intent.getAction();

        if (!TextUtils.isEmpty(action)
                && (action.startsWith("OPEN_PUSH_") || "OPEN_MESSENGER_SHORTCUT".equals(action))) {
            isDeepLink = true;
        }

        Uri data = intent.getData();
        if (data != null && "emd".equalsIgnoreCase(data.getScheme())) {
            String host = data.getHost();
            if ("push".equalsIgnoreCase(host) || "shortcut".equalsIgnoreCase(host)) {
                isDeepLink = true;
            }
        }

        if (!isDeepLink) {
            pendingPath = null;
            return;
        }

        String path = intent.getStringExtra("path");
        String scope = intent.getStringExtra("scope");
        String roomId1 = intent.getStringExtra("room_id");
        String roomId2 = intent.getStringExtra("roomId");
        String rid = !TextUtils.isEmpty(roomId1) ? roomId1 : roomId2;

        if (TextUtils.isEmpty(path)) {
            if (!TextUtils.isEmpty(scope) && "team".equals(scope) && !TextUtils.isEmpty(rid)) {
                path = "/chat-app?tab=chats&scope=team&room_id=" + Uri.encode(rid);
            } else if (!TextUtils.isEmpty(scope)) {
                path = "/chat-app?tab=chats&scope=" + Uri.encode(scope);
            } else {
                path = "/chat-app?tab=chats";
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
                if (tries < 120) handler.postDelayed(this, 50);
                return;
            }

            String url = bridge.getServerUrl() + pendingPath;
            bridge.getWebView().loadUrl(url);
            pendingPath = null;
            clearToLauncherIntent();
        }
    };
}
