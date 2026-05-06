import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { verifyOtp } from '../api/auth.js';
import { useAuthStore } from '../store/authStore.js';
import { shared, colors } from '../theme.js';
import type { AuthStackParamList } from '../navigation/types.js';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyOtp'>;

export function VerifyOtpScreen({ route }: Props) {
  const { phone } = route.params;
  const setTso = useAuthStore((s) => s.setTso);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleVerify() {
    setError('');
    setBusy(true);
    try {
      const res = await verifyOtp(phone, code);
      setTso(res.data.tso);
      // Root navigator will switch to AppStack automatically via isAuthenticated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={shared.title}>Enter OTP</Text>
      <Text style={styles.sub}>A 6-digit code was sent to {phone}.</Text>

      {error ? <Text style={shared.error}>{error}</Text> : null}

      <Text style={shared.label}>One-time PIN</Text>
      <TextInput
        style={shared.input}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="123456"
        placeholderTextColor={colors.muted}
        value={code}
        onChangeText={setCode}
      />

      <TouchableOpacity
        style={[shared.btn, busy && shared.btnDisabled]}
        onPress={handleVerify}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={shared.btnText}>Verify</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 24,
    justifyContent: 'center',
  },
  sub: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 20,
  },
});
