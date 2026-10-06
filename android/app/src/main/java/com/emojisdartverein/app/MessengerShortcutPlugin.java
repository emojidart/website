package com.emojisdartverein.app;

import android.content.Intent;
import android.content.pm.ShortcutInfo;
import android.content.pm.ShortcutManager;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.util.Log;
import android.widget.Toast;

import androidx.core.content.pm.ShortcutInfoCompat;
import androidx.core.content.pm.ShortcutManagerCompat;
import androidx.core.graphics.drawable.IconCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Collections;

@CapacitorPlugin(name = "MessengerShortcut")
public class MessengerShortcutPlugin extends Plugin {

    @PluginMethod
    public void install(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                Log.d("EMD_SHORTCUT", "Capacitor plugin install() called");
                Toast.makeText(getContext(), "EMD Messenger: Install wird gestartet…", Toast.LENGTH_SHORT).show();

                Intent shortcutIntent = new Intent(getContext(), MainActivity.class);
                shortcutIntent.setAction("OPEN_MESSENGER_SHORTCUT");
                shortcutIntent.putExtra("path", "/chat-app?tab=chats");
                shortcutIntent.setData(Uri.parse("emd://shortcut/messenger"));
                shortcutIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

                boolean requested = false;

                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    ShortcutManager manager = getContext().getSystemService(ShortcutManager.class);
                    if (manager != null && manager.isRequestPinShortcutSupported()) {
                        ShortcutInfo shortcutInfo = new ShortcutInfo.Builder(getContext(), "emd_messenger")
                                .setShortLabel("EMD Messenger")
                                .setLongLabel("EMD Messenger")
                                .setIcon(Icon.createWithResource(getContext(), R.mipmap.ic_launcher))
                                .setIntent(shortcutIntent)
                                .build();

                        requested = manager.requestPinShortcut(shortcutInfo, null);
                        Log.d("EMD_SHORTCUT", "Native requestPinShortcut returned: " + requested);
                    }
                }

                if (!requested) {
                    ShortcutInfoCompat shortcut = new ShortcutInfoCompat.Builder(getContext(), "emd_messenger")
                            .setShortLabel("EMD Messenger")
                            .setLongLabel("EMD Messenger")
                            .setIcon(IconCompat.createWithResource(getContext(), R.mipmap.ic_launcher))
                            .setIntent(shortcutIntent)
                            .setLongLived(true)
                            .build();

                    ShortcutManagerCompat.pushDynamicShortcut(getContext(), shortcut);

                    if (ShortcutManagerCompat.isRequestPinShortcutSupported(getContext())) {
                        requested = ShortcutManagerCompat.requestPinShortcut(getContext(), shortcut, null);
                        Log.d("EMD_SHORTCUT", "Compat requestPinShortcut returned: " + requested);
                    }

                    if (!requested) {
                        ShortcutManagerCompat.addDynamicShortcuts(
                                getContext(),
                                Collections.singletonList(shortcut)
                        );
                    }
                }

                JSObject result = new JSObject();
                result.put("requested", requested);
                call.resolve(result);

                if (requested) {
                    Toast.makeText(
                            getContext(),
                            "Bitte „EMD Messenger“ zum Startbildschirm hinzufügen.",
                            Toast.LENGTH_LONG
                    ).show();
                } else {
                    Toast.makeText(
                            getContext(),
                            "Launcher unterstützt die direkte Abfrage nicht. Halte das App-Symbol gedrückt – dort findest du „EMD Messenger“.",
                            Toast.LENGTH_LONG
                    ).show();
                }
            } catch (Exception e) {
                Log.e("EMD_SHORTCUT", "Capacitor plugin shortcut install failed", e);
                call.reject("Messenger shortcut install failed", e);
                Toast.makeText(getContext(), "EMD Messenger konnte nicht hinzugefügt werden.", Toast.LENGTH_LONG).show();
            }
        });
    }
}
