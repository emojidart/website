package com.emojisdartverein.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class NotificationStore {
    private static final String PREFS = "emoj_push_store";
    private static final String KEY_PREFIX = "chat_";
    private static final int MAX_LINES = 8;

    public static synchronized JSONArray getLines(Context ctx, String chatKey) {
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String raw = sp.getString(KEY_PREFIX + chatKey, "[]");
        try {
            return new JSONArray(raw);
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    public static synchronized JSONArray addLine(Context ctx, String chatKey, long ts, String senderName, String body) {
        JSONArray arr = getLines(ctx, chatKey);

        JSONObject obj = new JSONObject();
        try {
            obj.put("ts", ts);
            obj.put("sender", senderName == null ? "" : senderName);
            obj.put("body", body == null ? "" : body);
        } catch (JSONException ignored) {}

        JSONArray next = new JSONArray();
        next.put(obj);

        // alte rein (neueste zuerst), bis MAX_LINES
        for (int i = 0; i < arr.length() && next.length() < MAX_LINES; i++) {
            try {
                next.put(arr.getJSONObject(i));
            } catch (JSONException ignored) {}
        }

        SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        sp.edit().putString(KEY_PREFIX + chatKey, next.toString()).apply();
        return next;
    }

    public static synchronized void clearChat(Context ctx, String chatKey) {
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        sp.edit().remove(KEY_PREFIX + chatKey).apply();
    }
}
