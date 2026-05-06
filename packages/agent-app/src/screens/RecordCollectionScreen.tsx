import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createCollection } from '../api/collections.js';
import { shared, colors } from '../theme.js';
import type { AppStackParamList } from '../navigation/types.js';

type Props = NativeStackScreenProps<AppStackParamList, 'RecordCollection'>;

type Method = 'cash' | 'tsa' | 'tagora_pool';

export function RecordCollectionScreen({ route, navigation }: Props) {
  const { member, plan } = route.params;
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [amount, setAmount] = useState(plan ? String(plan.amount) : '');
  const [method, setMethod] = useState<Method>('cash');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function openCamera() {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Permission required', 'Camera access is needed to capture receipts.');
        return;
      }
    }
    setShowCamera(true);
  }

  async function takePicture() {
    if (!cameraRef) return;
    const photo = await cameraRef.takePictureAsync({ quality: 0.7 });
    if (photo) setPhotoUri(photo.uri);
    setShowCamera(false);
  }

  async function handleSubmit() {
    if (!plan) {
      Alert.alert('No active plan', 'This member has no active savings plan.');
      return;
    }
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setError('Enter a valid amount');
      return;
    }

    setError('');
    setBusy(true);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }

      await createCollection({
        planId: plan.planId,
        memberId: member.memberId,
        amount: parsed,
        method,
        idempotencyKey: `${plan.planId}-${Date.now()}`,
        lat,
        lng,
        photoUri: photoUri ?? undefined,
      });

      Alert.alert('Success', 'Collection recorded.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record collection');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={shared.screen} contentContainerStyle={styles.content}>
      <Text style={shared.title}>{member.name}</Text>
      <Text style={shared.muted}>{member.phone}</Text>
      {plan && (
        <Text style={[shared.muted, styles.planInfo]}>
          Plan: {plan.name} — target {plan.amount.toLocaleString()} / {plan.frequency}
        </Text>
      )}

      {error ? <Text style={shared.error}>{error}</Text> : null}

      <Text style={[shared.label, styles.mt]}>Amount collected</Text>
      <TextInput
        style={shared.input}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={colors.muted}
        value={amount}
        onChangeText={setAmount}
      />

      <Text style={shared.label}>Payment method</Text>
      <View style={styles.methodRow}>
        {([
          { value: 'cash' as const, label: 'Cash' },
          { value: 'tsa' as const, label: 'TSA' },
          { value: 'tagora_pool' as const, label: 'Tagora-Pool' },
        ]).map((m) => (
          <TouchableOpacity
            key={m.value}
            style={[styles.methodBtn, method === m.value && styles.methodBtnActive]}
            onPress={() => setMethod(m.value)}
          >
            <Text
              style={[styles.methodText, method === m.value && styles.methodTextActive]}
            >
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[shared.label, styles.mt]}>Receipt photo (optional)</Text>
      {showCamera ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            ref={(ref) => setCameraRef(ref)}
            facing="back"
          />
          <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
            <Text style={shared.btnText}>Capture</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowCamera(false)}>
            <Text style={[shared.muted, { textAlign: 'center', marginTop: 8 }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.preview} />
          ) : null}
          <TouchableOpacity style={styles.photoBtn} onPress={openCamera}>
            <Text style={styles.photoBtnText}>
              {photoUri ? 'Retake photo' : 'Open camera'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={[shared.btn, styles.mt, busy && shared.btnDisabled]}
        onPress={handleSubmit}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={shared.btnText}>Record Collection</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  mt: { marginTop: 8 },
  planInfo: { marginTop: 4, marginBottom: 16 },
  methodRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  methodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  methodBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  methodText: { color: colors.muted, fontWeight: '600' },
  methodTextActive: { color: colors.primary },
  preview: { width: '100%', height: 180, borderRadius: 8, marginBottom: 8 },
  photoBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  photoBtnText: { color: colors.primary, fontWeight: '600' },
  cameraContainer: { marginBottom: 12 },
  camera: { width: '100%', height: 260, borderRadius: 8 },
  captureBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
});
