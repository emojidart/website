package com.emojisdartverein.app;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;

        String scope = intent.getStringExtra("scope");
        String roomId = intent.getStringExtra("roomId");

        if (scope != null && roomId != null) {
            String url = "/chat-app?scope=" + scope + "&roomId=" + roomId;
            bridge.getWebView().loadUrl(bridge.getServerUrl() + url);
        }
    }
}
