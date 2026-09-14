import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
} from 'react-native';
import { AuthProvider, useAuth } from './src/auth-context';
import { getSocket } from './src/socket';
import { createTripRequest, fetchMyTripRequests } from './src/api';
import { TripRequestDetail } from './src/types';

function MainScreen() {
  const { user, token, logout } = useAuth();
  const socket = getSocket();

  const [connected, setConnected] = useState(false);
  const [activeRequest, setActiveRequest] = useState<TripRequestDetail | null>(null);
  const [originAddress, setOriginAddress] = useState('Av. 16 de Julio #1490 (El Prado)');
  const [destinationAddress, setDestinationAddress] = useState('Calle 21 de Calacoto #8500');
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [myRequests, setMyRequests] = useState<TripRequestDetail[]>([]);

  // Telemetría en vivo del vehículo asignado
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
      console.log('[client-app] Conectado al realtime');
    }
    function onDisconnect() {
      setConnected(false);
      console.log('[client-app] Desconectado del realtime');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (!socket.connected) {
      socket.connect();
    } else {
      setConnected(true);
    }

    // Escuchar asignación y cambios de viaje
    socket.on('trip:assigned', (data: any) => {
      if (activeRequest && data.tripRequestId === activeRequest.id) {
        Alert.alert('¡Taxi Asignado!', 'Un conductor va en camino a tu ubicación.');
        socket.emit('room:join', `trip:${data.tripId}`);
      }
    });

    socket.on('vehicle:location_changed', (data: any) => {
      setDriverLocation({ lat: data.lat, lng: data.lng });
    });

    socket.on('trip:status_changed', (data: any) => {
      if (data.status === 'ARRIVED') {
        Alert.alert('¡Tu taxi ha llegado!', 'El conductor te está esperando en el punto de recogida.');
      } else if (data.status === 'COMPLETED') {
        Alert.alert('Viaje completado', `Gracias por viajar con nosotros. Tarifa: Bs ${Number(data.fareTotal).toFixed(2)}`);
        setActiveRequest(null);
        setDriverLocation(null);
      }
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('trip:assigned');
      socket.off('vehicle:location_changed');
      socket.off('trip:status_changed');
    };
  }, [socket, activeRequest]);

  // Cargar historial inicial de solicitudes
  useEffect(() => {
    if (token) {
      fetchMyTripRequests(token).then((list) => {
        setMyRequests(list);
        const pending = list.find((r) => r.status === 'PENDING' || r.status === 'ACCEPTED');
        if (pending) setActiveRequest(pending);
      }).catch(console.warn);
    }
  }, [token]);

  async function handleRequestRide() {
    if (!originAddress.trim()) {
      Alert.alert('Datos requeridos', 'Por favor ingresa la dirección de recogida');
      return;
    }

    if (!token) return;

    try {
      setLoadingRequest(true);
      const newReq = await createTripRequest(
        {
          originAddress,
          originLat: -16.5034, // La Paz Centro (El Prado)
          originLng: -68.1312,
          destinationAddress,
          destinationLat: -16.5412, // Calacoto
          destinationLng: -68.0874,
        },
        token
      );

      setActiveRequest(newReq);
      setMyRequests((prev) => [newReq, ...prev]);
      Alert.alert('Solicitud enviada', 'Buscando el móvil más cercano...');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo solicitar el viaje');
    } finally {
      setLoadingRequest(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1d4ed8" />
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>RadioTaxi Pasajero</Text>
          <Text style={styles.headerSubtitle}>{user?.email}</Text>
        </View>
        <View style={styles.row}>
          <View style={[styles.badge, connected ? styles.badgeOn : styles.badgeOff]}>
            <Text style={styles.badgeText}>{connected ? 'En línea' : 'Offline'}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Tarjeta de Viaje Activo */}
        {activeRequest ? (
          <View style={styles.activeCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardBadge}>Solicitud Activa #{activeRequest.id}</Text>
              <Text style={styles.statusText}>{activeRequest.status}</Text>
            </View>

            <View style={styles.pointRow}>
              <Text style={styles.pointIcon}>📍</Text>
              <View>
                <Text style={styles.pointLabel}>PUNTO DE RECOGIDA</Text>
                <Text style={styles.pointValue}>{activeRequest.originAddress}</Text>
              </View>
            </View>

            <View style={styles.pointRow}>
              <Text style={styles.pointIcon}>🏁</Text>
              <View>
                <Text style={styles.pointLabel}>DESTINO</Text>
                <Text style={styles.pointValue}>{activeRequest.destinationAddress || 'Por definir'}</Text>
              </View>
            </View>

            {driverLocation && (
              <View style={styles.driverLiveBox}>
                <Text style={styles.driverLiveTitle}>📡 Taxi acercándose en tiempo real:</Text>
                <Text style={styles.driverLiveCoords}>
                  GPS: {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
                </Text>
              </View>
            )}

            <View style={styles.waitingNotice}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={styles.waitingText}>
                {activeRequest.status === 'PENDING'
                  ? 'Despachador asignando el taxi más cercano...'
                  : 'Vehículo en camino a tu ubicación.'}
              </Text>
            </View>
          </View>
        ) : (
          /* Formulario de Solicitud */
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>¿A dónde vas hoy?</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>📍 Punto de recogida (Origen)</Text>
              <TextInput
                style={styles.input}
                value={originAddress}
                onChangeText={setOriginAddress}
                placeholder="Ej. Calle Murillo #450"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>🏁 Destino final</Text>
              <TextInput
                style={styles.input}
                value={destinationAddress}
                onChangeText={setDestinationAddress}
                placeholder="Ej. Av. Ballivián Calle 12"
              />
            </View>

            <View style={styles.fareEstimateBox}>
              <Text style={styles.estimateLabel}>Tarifa Estimada (BOB):</Text>
              <Text style={styles.estimateValue}>Bs 18.00 - Bs 22.00</Text>
            </View>

            <TouchableOpacity
              style={[styles.requestBtn, loadingRequest && styles.btnDisabled]}
              onPress={handleRequestRide}
              disabled={loadingRequest}
            >
              {loadingRequest ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.requestBtnText}>🚕 Pedir RadioTaxi Ahora</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Historial Reciente */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Mis viajes recientes</Text>
          {myRequests.length === 0 ? (
            <Text style={styles.emptyText}>No tienes viajes registrados aún.</Text>
          ) : (
            myRequests.slice(0, 5).map((req) => (
              <View key={req.id} style={styles.historyItem}>
                <View>
                  <Text style={styles.historyDest}>{req.destinationAddress || 'Destino general'}</Text>
                  <Text style={styles.historyDate}>{new Date(req.requestedAt).toLocaleDateString()}</Text>
                </View>
                <Text style={[styles.historyStatus, req.status === 'COMPLETED' ? styles.statusSuccess : styles.statusMuted]}>
                  {req.status}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AuthScreen() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('Atención', 'Por favor ingresa correo y contraseña');
      return;
    }

    try {
      setLoading(true);
      if (isRegister) {
        await register(email, password, name, phone);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.authContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#1e40af" />
      <View style={styles.authCard}>
        <Text style={styles.authLogo}>🚕</Text>
        <Text style={styles.authTitle}>RadioTaxi Pasajero</Text>
        <Text style={styles.authSubtitle}>{isRegister ? 'Crea tu cuenta de cliente' : 'Ingresa a tu cuenta'}</Text>

        {isRegister && (
          <>
            <TextInput
              style={styles.authInput}
              placeholder="Nombre completo"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.authInput}
              placeholder="Teléfono celular"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </>
        )}

        <TextInput
          style={styles.authInput}
          placeholder="Correo electrónico"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.authInput}
          placeholder="Contraseña"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.authBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.authBtnText}>{isRegister ? 'Registrarme' : 'Iniciar Sesión'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsRegister(!isRegister)} style={{ marginTop: 16 }}>
          <Text style={styles.switchAuthText}>
            {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate aquí'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function RootApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return user ? <MainScreen /> : <AuthScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <RootApp />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  authContainer: { flex: 1, backgroundColor: '#1e3a8a', justifyContent: 'center', padding: 24 },
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  authCard: { backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', elevation: 4 },
  authLogo: { fontSize: 56, marginBottom: 8 },
  authTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  authSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 20 },
  authInput: { width: '100%', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  authBtn: { width: '100%', backgroundColor: '#2563eb', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  authBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  switchAuthText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  header: { backgroundColor: '#1d4ed8', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: '#bfdbfe', fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeOn: { backgroundColor: '#22c55e' },
  badgeOff: { backgroundColor: '#ef4444' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  logoutBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  logoutText: { color: '#bfdbfe', fontSize: 13 },
  content: { padding: 20 },
  formCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 2, marginBottom: 24 },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#cbd5e1' },
  fareEstimateBox: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  estimateLabel: { fontSize: 13, color: '#1e40af', fontWeight: '600' },
  estimateValue: { fontSize: 16, color: '#1d4ed8', fontWeight: 'bold' },
  requestBtn: { backgroundColor: '#2563eb', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 12 },
  btnDisabled: { opacity: 0.6 },
  requestBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  activeCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 3, marginBottom: 24 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardBadge: { color: '#2563eb', fontWeight: 'bold', fontSize: 16 },
  statusText: { backgroundColor: '#fef3c7', color: '#b45309', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 12, fontWeight: 'bold' },
  pointRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  pointIcon: { fontSize: 20 },
  pointLabel: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  pointValue: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  driverLiveBox: { backgroundColor: '#ecfdf5', borderRadius: 12, padding: 12, marginVertical: 8, borderWidth: 1, borderColor: '#a7f3d0' },
  driverLiveTitle: { fontSize: 12, fontWeight: 'bold', color: '#065f46' },
  driverLiveCoords: { fontSize: 12, color: '#047857', marginTop: 2 },
  waitingNotice: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f1f5f9', padding: 12, borderRadius: 10, marginTop: 8 },
  waitingText: { fontSize: 12, color: '#334155', flex: 1 },
  historySection: { marginTop: 8 },
  historyTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  emptyText: { fontSize: 13, color: '#94a3b8' },
  historyItem: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  historyDest: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  historyDate: { fontSize: 11, color: '#64748b', marginTop: 2 },
  historyStatus: { fontSize: 11, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusSuccess: { backgroundColor: '#dcfce7', color: '#15803d' },
  statusMuted: { backgroundColor: '#f1f5f9', color: '#64748b' },
});
