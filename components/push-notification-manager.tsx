import { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, XCircle } from 'lucide-react';
import {
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '../lib/push-notifications';
import { supabase } from '../lib/supabase';

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      setRegistration(reg);
      const subscription = await reg.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Fehler beim Prüfen des Abonnements:', error);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      let reg = registration;
      if (!reg) {
        reg = await registerServiceWorker();
        setRegistration(reg);
      }

      if (!reg) {
        throw new Error('Service Worker konnte nicht registriert werden');
      }

      const perm = await requestNotificationPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        alert('Benachrichtigungen wurden nicht erlaubt');
        return;
      }

      const subscription = await subscribeToPushNotifications(reg);

      if (!subscription) {
        throw new Error('Abonnement fehlgeschlagen');
      }

      const subscriptionData = subscription.toJSON();

      await supabase.from('push_subscriptions').insert({
        endpoint: subscription.endpoint,
        p256dh: subscriptionData.keys?.p256dh || '',
        auth: subscriptionData.keys?.auth || '',
      });

      setIsSubscribed(true);
      alert('Benachrichtigungen erfolgreich aktiviert!');
    } catch (error) {
      console.error('Fehler beim Aktivieren der Benachrichtigungen:', error);
      alert('Fehler beim Aktivieren der Benachrichtigungen');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      if (!registration) {
        throw new Error('Keine Service Worker Registrierung gefunden');
      }

      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        throw new Error('Kein Abonnement gefunden');
      }

      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', subscription.endpoint);

      await unsubscribeFromPushNotifications(registration);

      setIsSubscribed(false);
      alert('Benachrichtigungen erfolgreich deaktiviert');
    } catch (error) {
      console.error('Fehler beim Deaktivieren der Benachrichtigungen:', error);
      alert('Fehler beim Deaktivieren der Benachrichtigungen');
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-2">
          <XCircle className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-bold">Push-Benachrichtigungen nicht verfügbar</h3>
        </div>
        <p className="text-gray-600 text-sm">
          Dein Browser oder Gerät unterstützt keine Push-Benachrichtigungen. Bitte verwende einen modernen Browser
          oder installiere die App auf deinem Gerät.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-bold">Push-Benachrichtigungen</h3>
        </div>
        <p className="text-gray-600 text-sm">
          Erhalte wichtige Updates zu Turnieren, Spielen und Vereinsnachrichten direkt auf dein Gerät
        </p>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {isSubscribed ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <p className="font-semibold text-sm">
                {isSubscribed ? 'Benachrichtigungen aktiviert' : 'Benachrichtigungen deaktiviert'}
              </p>
              <p className="text-xs text-gray-600">
                {isSubscribed
                  ? 'Du erhältst Push-Benachrichtigungen'
                  : 'Aktiviere Benachrichtigungen, um Updates zu erhalten'}
              </p>
            </div>
          </div>
        </div>

        {permission === 'denied' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              Benachrichtigungen wurden blockiert. Bitte erlaube Benachrichtigungen in deinen Browser-Einstellungen.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {!isSubscribed ? (
            <button
              onClick={handleSubscribe}
              disabled={loading || permission === 'denied'}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Bell className="w-4 h-4" />
              {loading ? 'Aktiviere...' : 'Benachrichtigungen aktivieren'}
            </button>
          ) : (
            <button
              onClick={handleUnsubscribe}
              disabled={loading}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <BellOff className="w-4 h-4" />
              {loading ? 'Deaktiviere...' : 'Benachrichtigungen deaktivieren'}
            </button>
          )}
        </div>

        <div className="text-xs text-gray-500 space-y-1 pt-2">
          <p>💡 Tipp: Installiere die App auf deinem Startbildschirm für das beste Erlebnis</p>
          <p>📱 iOS: Teilen → Zum Home-Bildschirm</p>
          <p>🤖 Android: Menü → App installieren</p>
        </div>
      </div>
    </div>
  );
}
