import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../auth-context';
import { getSocket } from '../socket';
import { fetchTrip } from '../api';
import { TripDetail, TripAssignment, TripCompletedEvent } from '../types';

const GPS_INTERVAL_MS = 5000;

export default function TripScreen() {
  const { user, token, logout } = useAuth();
  const socket = getSocket();

  const [connected, setConnected] = useState(false);
  const [activeTrip, setActiveTrip] = useState<TripDetail | null>(null);
  const [loadingTrip, setLoadingTrip] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [lastFare, setLastFare] = useState<TripCompletedEvent | null>(null);

  const gpsTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // -------------------------------------------------------------------------
  // Conexión Socket.io
  // -------------------------------------------------------------------------
  useEffect(() => {
    function onConnect() {
      setConnected(true);
      console.log('[driver-app] Conectado al realtime');
    }
    function onDisconnect() {
      setConnected(false);
      console.log('[driver-app] Desconectado del realtime');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (!socket.connected) {
      socket.connect();
    } else {
      setConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket]);

  // -------------------------------------------------------------------------
  // Recepción de asignaciones de viaje
  // -------------------------------------------------------------------------
  useEffect(() => {
    async function onTripAssigned(data: TripAssignment) {
      console.log('[driver-app] Viaje asignado:', data);
      try {
        setLoadingTrip(true);
        const trip = await fetchTrip(data.tripId, token!);
        setActiveTrip(trip);
        setLastFare(null);
        Alert.alert('Nuevo viaje', 'Tienes un viaje asignado');
      } catch (err) {
        Alert.alert('Error', 'No se pudo cargar el viaje asignado');
      } finally {
        setLoadingTrip(false);
      }
    }

    function onTripCompleted(data: TripCompletedEvent) {
      console.log('[driver-app] Viaje completado:', data);
      setLastFare(data);
      setActiveTrip(null);
    }

    socket.on('trip:assigned', onTripAssigned);
    socket.on('trip:completed', onTripCompleted);

    return () => {
      socket.off('trip:assigned', onTripAssigned);
      socket.off('trip:completed', onTripCompleted);
    };
  }, [socket, token]);

  // -------------------------------------------------------------------------
  // Envío periódico de posición GPS
  // -------------------------------------------------------------------------
  useEffect(() => {
    async function startGps() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita acceso a la ubicación');
        return;
      }

      // Envío inmediato + intervalo
      sendPosition();
      gpsTimer.current = setInterval(sendPosition, GPS_INTERVAL_MS);
    }

    async function sendPosition() {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const { latitude, longitude } = loc.coords;

        // El vehículo se obtiene del viaje activo o se mantiene el último
        const vehicleId = activeTrip?.vehicle?.id;
        if (!vehicleId) return;

        socket.emit('vehicle:update', {
          id: vehicleId,
          currentLatitude: latitude,
          currentLongitude: longitude,
          status: activeTrip ? 'busy' : 'available',
        });
      } catch (err) {
        console.warn('[driver-app] Error GPS:', err);
      }
    }

    startGps();

    return () => {
      if (gpsTimer.current) {
        clearInterval(gpsTimer.current);
        gpsTimer.current = null;
      }
    };
  }, [socket, activeTrip]);

  // -------------------------------------------------------------------------
  // Acciones del conductor
  // -------------------------------------------------------------------------
  function handleComplete() {
    if (!activeTrip) return;

    Alert.alert(
      'Completar viaje',
      '¿Confirmas que el viaje ha finalizado? Se calculará la tarifa automáticamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Completar',
          onPress: async () => {
            setCompleting(true);
            socket.emit('trip:complete', { vehicleId: activeTrip.vehicle.id });
            // El estado se actualiza vía el evento 'trip:completed'
            setTimeout(() => setCompleting(false), 3000);
          },
        },
      ]
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Conductor</Text>
          <Text style={styles.headerSubtitle}>{user?.email}</Text>
        </View>
        <View style={styles.row}>
          <View style={[styles.badge, connected ? styles.badgeOn : styles.badgeOff]}>
            <Text style={styles.badgeText}>{connected ? 'En línea' : 'Sin conexión'}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: 20 }}>
        {/* Resumen de tarifa del último viaje */}
        {lastFare && (
          <View style={styles.fareCard}>
            <Text style={styles.fareTitle}>Viaje completado ✓</Text>
            <Text style={styles.fareAmount}>Bs {Number(lastFare.fareTotal).toFixed(2)}</Text>
            {lastFare.fareBreakdown ? (
              <View style={styles.fareBreakdown}>
                <Text style={styles.fareLine}>Base: Bs {lastFare.fareBreakdown.baseFare.toFixed(2)}</Text>
                <Text style={styles.fareLine}>Distancia: Bs {lastFare.fareBreakdown.distanceCost.toFixed(2)}</Text>
                <Text style={styles.fareLine}>Tiempo: Bs {lastFare.fareBreakdown.timeCost.toFixed(2)}</Text>
                {lastFare.fareBreakdown.geofenceSurcharge > 0 && (
                  <Text style={styles.fareLine}>Zona: Bs {lastFare.fareBreakdown.geofenceSurcharge.toFixed(2)}</Text>
                )}
              </View>
            ) : null}
          </View>
        )}

        {/* Cargando viaje */}
        {loadingTrip ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1e3a8a" />
            <Text style={styles.muted}>Cargando viaje...</Text>
          </View>
        ) : null}

        {/* Viaje activo */}
        {activeTrip ? (
          <View style={styles.tripCard}>
            <Text style={styles.tripBadge}>Viaje #{activeTrip.id}</Text>
            <Text style={styles.tripStatus}>{activeTrip.status}</Text>

            <View style={styles.tripPoint}>
              <Text style={styles.pointDot}>📍</Text>
              <View>
                <Text style={styles.pointLabel}>Origen</Text>
                <Text style={styles.pointText}>{activeTrip.tripRequest.originAddress || 'N/D'}</Text>
              </View>
            </View>

            <View style={styles.tripPoint}>
              <Text style={styles.pointDot}>🏁</Text>
              <View>
                <Text style={styles.pointLabel}>Destino</Text>
                <Text style={styles.pointText}>{activeTrip.tripRequest.destinationAddress || 'N/D'}</Text>
              </View>
            </View>

            {activeTrip.tripRequest.customer ? (
              <View style={styles.tripPoint}>
                <Text style={styles.pointDot}>👤</Text>
                <View>
                  <Text style={styles.pointLabel}>Cliente</Text>
                  <Text style={styles.pointText}>
                    {activeTrip.tripRequest.customer.name || 'Sin nombre'}
                    {activeTrip.tripRequest.customer.phone ? ` · ${activeTrip.tripRequest.customer.phone}` : ''}
                  </Text>
                </View>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.completeBtn, completing && styles.btnDisabled]}
              onPress={handleComplete}
              disabled={completing}
            >
              {completing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.completeBtnText}>Completar viaje</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          !loadingTrip && !lastFare ? (
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>🚕</Text>
              <Text style={styles.emptyTitle}>Esperando viajes</Text>
              <Text style={styles.muted}>
                Estás conectado. Cuando el despachador te asigne un viaje, aparecerá aquí.
              </Text>
            </View>
          ) : null
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 18,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: '#cbd5e1', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  badgeOn: { backgroundColor: '#22c55e' },
  badgeOff: { backgroundColor: '#ef4444' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  logoutText: { color: '#cbd5e1', fontSize: 14 },
  body: { flex: 1 },
  center: { alignItems: 'center', marginTop: 60 },
  muted: { color: '#64748b', fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 64 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginTop: 12 },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  tripBadge: {
    color: '#1e3a8a',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tripStatus: {
    color: '#f59e0b',
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 16,
    marginTop: 2,
  },
  tripPoint: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  pointDot: { fontSize: 24 },
  pointLabel: { color: '#64748b', fontSize: 12, textTransform: 'uppercase' },
  pointText: { color: '#0f172a', fontSize: 16, fontWeight: '500' },
  completeBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  btnDisabled: { opacity: 0.6 },
  completeBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  fareCard: {
    backgroundColor: '#d1fae5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  fareTitle: { color: '#065f46', fontSize: 14, fontWeight: '600' },
  fareAmount: { color: '#064e3b', fontSize: 32, fontWeight: 'bold', marginVertical: 8 },
  fareBreakdown: { marginTop: 8 },
  fareLine: { color: '#047857', fontSize: 13, marginBottom: 2 },
});
