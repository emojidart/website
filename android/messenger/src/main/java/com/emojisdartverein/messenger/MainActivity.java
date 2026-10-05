package com.emojisdartverein.messenger;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.view.WindowInsets;
import android.view.Window;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {

    private static final String HOST = "emojisdartverein.com";
    private static final String START_URL =
            "https://emojisdartverein.com/chat-app?source=messenger-app";

    private static final int FILE_CHOOSER_REQUEST = 7001;
    private static final int MICROPHONE_PERMISSION_REQUEST = 7002;

    private WebView webView;
    private ValueCallback<Uri[]> fileChooserCallback;
    private PermissionRequest pendingMicrophonePermissionRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.setStatusBarColor(Color.parseColor("#111820"));
        window.setNavigationBarColor(Color.parseColor("#050608"));
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

        /*
         * WICHTIG:
         * Den Systemleisten-Inset NICHT direkt als Padding auf die WebView setzen.
         * Fixed/sticky Elemente in der Webseite rechnen sonst weiterhin mit dem
         * vollen WebView-Viewport und landen auf Android 15 hinter der Navigation.
         *
         * Stattdessen bekommt ein nativer Root-Container das Bottom-Inset.
         * Dadurch wird die WebView selbst wirklich kleiner und CSS bottom:0 /
         * 100dvh endet oberhalb der Samsung-Navigationsleiste.
         */
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#050608"));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#050608"));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);

        FrameLayout.LayoutParams webViewParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        );
        root.addView(webView, webViewParams);
        setContentView(root);

        root.setOnApplyWindowInsetsListener((view, insets) -> {
            int bottom = 0;

            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                android.graphics.Insets navBars =
                        insets.getInsets(WindowInsets.Type.navigationBars());
                bottom = navBars.bottom;
            } else {
                @SuppressWarnings("deprecation")
                int legacyBottom = insets.getSystemWindowInsetBottom();
                bottom = legacyBottom;
            }

            view.setPadding(0, 0, 0, bottom);
            return insets;
        });
        root.requestApplyInsets();

        configureWebView();

        String launchUrl = getIntent() != null ? getIntent().getDataString() : null;
        if (launchUrl != null && isAllowedMessengerUrl(launchUrl)) {
            webView.loadUrl(launchUrl);
        } else {
            webView.loadUrl(START_URL);
        }
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();

        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);

        String currentUa = settings.getUserAgentString();
        settings.setUserAgentString(currentUa + " EMDMessenger/1.0");

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    if (request == null || request.getOrigin() == null) return;

                    Uri origin = request.getOrigin();
                    boolean allowedOrigin =
                            "https".equalsIgnoreCase(origin.getScheme())
                                    && HOST.equalsIgnoreCase(origin.getHost());

                    boolean asksForAudio = false;
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                            asksForAudio = true;
                            break;
                        }
                    }

                    if (!allowedOrigin || !asksForAudio) {
                        request.deny();
                        return;
                    }

                    if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.M
                            || checkSelfPermission(Manifest.permission.RECORD_AUDIO)
                            == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                        return;
                    }

                    pendingMicrophonePermissionRequest = request;
                    requestPermissions(
                            new String[]{Manifest.permission.RECORD_AUDIO},
                            MICROPHONE_PERMISSION_REQUEST
                    );
                });
            }

            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams
            ) {
                if (fileChooserCallback != null) {
                    fileChooserCallback.onReceiveValue(null);
                }

                fileChooserCallback = filePathCallback;

                Intent intent;
                try {
                    intent = fileChooserParams.createIntent();
                } catch (Exception e) {
                    intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*");
                }

                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException e) {
                    fileChooserCallback = null;
                    return false;
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleNavigation(url);
            }

            @Override
            public boolean shouldOverrideUrlLoading(
                    WebView view,
                    android.webkit.WebResourceRequest request
            ) {
                return handleNavigation(request.getUrl().toString());
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                startActivity(intent);
            } catch (Exception ignored) {
            }
        });

        webView.setOnLongClickListener(v -> false);
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            String[] permissions,
            int[] grantResults
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode != MICROPHONE_PERMISSION_REQUEST) return;

        PermissionRequest request = pendingMicrophonePermissionRequest;
        pendingMicrophonePermissionRequest = null;
        if (request == null) return;

        boolean granted =
                grantResults.length > 0
                        && grantResults[0] == PackageManager.PERMISSION_GRANTED;

        if (granted) {
            request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        } else {
            request.deny();
        }
    }

    private boolean handleNavigation(String url) {
        if (url == null || url.isEmpty()) return false;

        Uri uri = Uri.parse(url);
        String scheme = uri.getScheme();
        String host = uri.getHost();
        String path = uri.getPath() == null ? "" : uri.getPath();

        // Keep EMD inside the Messenger app.
        if (("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme))
                && HOST.equalsIgnoreCase(host)) {

            // Login flows in the standalone Messenger must return to Messenger,
            // not to the normal Vereinsapp home/profile.
            if (path.startsWith("/member-profile-app")
                    || path.startsWith("/guest-home")
                    || path.equals("/")) {
                webView.loadUrl(START_URL);
                return true;
            }

            return false;
        }

        // Open telephone, mail and external sites outside the Messenger app.
        try {
            Intent external = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            startActivity(external);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private boolean isAllowedMessengerUrl(String url) {
        try {
            Uri uri = Uri.parse(url);
            return "https".equalsIgnoreCase(uri.getScheme())
                    && HOST.equalsIgnoreCase(uri.getHost())
                    && uri.getPath() != null
                    && uri.getPath().startsWith("/chat-app");
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);

        String url = intent != null ? intent.getDataString() : null;
        if (url != null && isAllowedMessengerUrl(url)) {
            webView.loadUrl(url);
        } else {
            webView.loadUrl(START_URL);
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode != FILE_CHOOSER_REQUEST || fileChooserCallback == null) {
            return;
        }

        Uri[] result = null;

        if (resultCode == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                result = new Uri[count];
                for (int i = 0; i < count; i++) {
                    result[i] = data.getClipData().getItemAt(i).getUri();
                }
            } else if (data.getData() != null) {
                result = new Uri[]{data.getData()};
            }
        }

        fileChooserCallback.onReceiveValue(result);
        fileChooserCallback = null;
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            moveTaskToBack(true);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            CookieManager.getInstance().flush();
            webView.onResume();
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            CookieManager.getInstance().flush();
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
