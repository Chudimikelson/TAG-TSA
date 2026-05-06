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
import { login } from '../api/auth.js';
import { shared, colors } from '../theme.js';
import type { AuthStackParamList } from '../navigation/types.js';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    setError('');
    setBusy(true);
    try {
      await login(phone, password);
      navigation.replace('VerifyOtp', { phone });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Tagora TSO</Text>
      <Text style={shared.title}>Sign in</Text>

      {error ? <Text style={shared.error}>{error}</Text> : null}

      <Text style={shared.label}>Phone number</Text>
      <TextInput
        style={shared.input}
        keyboardType="phone-pad"
        placeholder="+2348012345678"
        placeholderTextColor={colors.muted}
        value={phone}
        onChangeText={setPhone}
        autoComplete="tel"
      />

      <Text style={shared.label}>Password</Text>
      <TextInput
        style={shared.input}
        secureTextEntry
        placeholder="Password"
        placeholderTextColor={colors.muted}
        value={password}
        onChangeText={setPassword}
        autoComplete="password"
      />

      <TouchableOpacity
        style={[shared.btn, busy && shared.btnDisabled]}
        onPress={handleLogin}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={shared.btnText}>Continue</Text>
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
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 8,
  },
});
