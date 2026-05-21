import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './store/authStore.js';
import { AuthStack } from './navigation/AuthStack.js';
import { AppStack } from './navigation/AppStack.js';
import { TagoraLoader } from './components/TagoraLoader.js';

export default function App() {
  const { isAuthenticated, hydrate } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      await hydrate();
      if (active) setHydrated(true);
    })();

    return () => {
      active = false;
    };
  }, [hydrate]);

  if (!hydrated) {
    return <TagoraLoader fullScreen />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {isAuthenticated ? <AppStack /> : <AuthStack />}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
