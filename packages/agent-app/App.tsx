import { Component, ErrorInfo, ReactNode, useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './src/store/authStore';
import { AuthStack } from './src/navigation/AuthStack';
import { AppStack } from './src/navigation/AppStack';
import { TagoraLoader } from './src/components/TagoraLoader';

class RootErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message ?? 'Unknown error' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Root render crash:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.crashContainer}>
          <Text style={styles.crashTitle}>App failed to start</Text>
          <Text style={styles.crashBody}>{this.state.message}</Text>
          <Text style={styles.crashHint}>Please share this screen with support.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const { isAuthenticated, hydrate } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const watchdog = setTimeout(() => {
      if (active) {
        console.warn('Hydration timeout reached; continuing app startup');
        setHydrated(true);
      }
    }, 3500);

    (async () => {
      try {
        await hydrate();
      } catch (err) {
        // Never block initial navigation if secure-store hydration fails.
        console.error('Auth hydration failed:', err);
      } finally {
        if (active) setHydrated(true);
        clearTimeout(watchdog);
      }
    })();

    return () => {
      active = false;
      clearTimeout(watchdog);
    };
  }, [hydrate]);

  if (!hydrated) {
    return <TagoraLoader fullScreen />;
  }

  return (
    <RootErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer>
          {isAuthenticated ? <AppStack /> : <AuthStack />}
        </NavigationContainer>
      </SafeAreaProvider>
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  crashContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff7f7',
  },
  crashTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 12,
  },
  crashBody: {
    fontSize: 14,
    color: '#7f1d1d',
    marginBottom: 10,
  },
  crashHint: {
    fontSize: 12,
    color: '#9a3412',
  },
});
