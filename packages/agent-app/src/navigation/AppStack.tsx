import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AssignmentsScreen } from '../screens/AssignmentsScreen.js';
import { ThriftSaverDetailsScreen } from '../screens/ThriftSaverDetailsScreen.js';
import { RecordCollectionScreen } from '../screens/RecordCollectionScreen.js';
import { CollectionsHistoryScreen } from '../screens/CollectionsHistoryScreen.js';
import { WithdrawalsScreen } from '../screens/WithdrawalsScreen.js';
import { NewWithdrawalScreen } from '../screens/NewWithdrawalScreen.js';
import { colors } from '../theme.js';
import type { AppStackParamList } from './types.js';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="Assignments"
        component={AssignmentsScreen}
        options={{ title: 'Thrift Savers' }}
      />
      <Stack.Screen
        name="ThriftSaverDetails"
        component={ThriftSaverDetailsScreen}
        options={{ title: 'Thrift Saver Details' }}
      />
      <Stack.Screen
        name="RecordCollection"
        component={RecordCollectionScreen}
        options={{ title: 'Record Collection' }}
      />
      <Stack.Screen
        name="CollectionsHistory"
        component={CollectionsHistoryScreen}
        options={{ title: 'Collections' }}
      />
      <Stack.Screen
        name="Withdrawals"
        component={WithdrawalsScreen}
        options={{ title: 'Withdrawals' }}
      />
      <Stack.Screen
        name="NewWithdrawal"
        component={NewWithdrawalScreen}
        options={{ title: 'New Withdrawal' }}
      />
    </Stack.Navigator>
  );
}
