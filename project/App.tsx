import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { Alert } from 'react-native';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import firestore from '@react-native-firebase/firestore';
import { NativeModules } from 'react-native';
import { navigationRef, navigate } from './src/screens/NavigationService';

// Import your screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import AddTransaction from './src/screens/AddTransaction';
import LogoutScreen from './src/screens/LogoutScreen';
import ViewTransactions from './src/screens/ViewTransactions';
import CategoryAnalysis from './src/screens/CategoryAnalysis';
import MonthlyAnalysis from './src/screens/MontlyAnalysis';
import BudgetScreen from './src/screens/BudgetScreen';
import BudgetProgressScreen from './src/screens/BudgetProgressScreen';
import NotificationScreen from './src/screens/NotificationScreen'; 
import TransactionDetailsScreen from './src/screens/TransactionsDetails';
import EditTransactionScreen from './src/screens/EditTransactionScreen.js';
import RegistrationScreen from './src/screens/RegistrationScreen';
import Profile from './src/screens/Profile';

const Stack = createStackNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegistrationScreen} options={{ title: 'Registration Screen' }} />
  </Stack.Navigator>
);

const AppStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Dashboard', headerShown: false }} />
    <Stack.Screen name="Profile" component={Profile} options={{ title: 'YourProfile' }} />
    <Stack.Screen name="AddTransaction" component={AddTransaction} options={{ title: 'Add Transaction' }} />
    <Stack.Screen name="Logout" component={LogoutScreen} options={{ title: 'Logout' }} />
    <Stack.Screen name="ViewTransactions" component={ViewTransactions} options={{ title: 'View Transactions' }} />
    <Stack.Screen name="CategoryAnalysis" component={CategoryAnalysis} options={{ title: 'Spending by Category' }} />
    <Stack.Screen name="MonthlyAnalysis" component={MonthlyAnalysis} options={{ title: 'Monthly Spending' }} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="SetBudget" component={BudgetScreen} options={{ title: 'Set Budget' }} />
    <Stack.Screen name="Notification" component={NotificationScreen} options={{ title: 'Notification' }} />
    <Stack.Screen 
      name="BudgetProgress" 
      component={BudgetProgressScreen}
      options={{ title: 'Budget Progress' }}
    />
    <Stack.Screen name="TransactionDetails" component={TransactionDetailsScreen} />
    <Stack.Screen name="EditTransaction" component={EditTransactionScreen} />
  </Stack.Navigator>
);

const App = () => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(async (authUser) => {
      setUser(authUser);
      if (authUser) {
        await requestNotificationPermission();
        await setupFCMToken(authUser);
      }
    });
    return subscriber;
  }, []);

  type NotificationData = {
    type?: string;
    title?: string;
    body?: string;
    customInfo?: string;
  };
  
  const handleNotificationNavigation = (data: NotificationData) => {
    console.log('Notification tap data:', data);
    console.log(data.type)
    if (data.type === 'transaction') {
      console.log("hii")
      navigate('Notification', {
        title: data.title,
        body: data.body,
        customInfo: data.customInfo || '',
      });
    }
  };

  useEffect(() => {
    // When app is in background and user taps the notification
    const unsubscribe = messaging().onNotificationOpenedApp(remoteMessage => {
      if (remoteMessage?.data) {
        console.log("hello")
        handleNotificationNavigation(remoteMessage.data);
      }
    });
  
    // When app is opened from quit state by tapping the notification
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage?.data) {
          handleNotificationNavigation(remoteMessage.data);
        }
      });
  
    return unsubscribe;
  }, []);
  
  // Request Notification Permissions
  const requestNotificationPermission = async () => {
    try {
      const authStatus = await messaging().requestPermission({
        provisional: true,
      });
      if (authStatus === messaging.AuthorizationStatus.AUTHORIZED || authStatus === messaging.AuthorizationStatus.PROVISIONAL) {
        console.log('Notification permission granted.');
      } else {
        console.log('Notification permissions denied');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
    }
  };

  // Setup FCM Token Storage
  const setupFCMToken = async (authUser: FirebaseAuthTypes.User) => {
    try {
      const token = await messaging().getToken();
      console.log('NativeModules:', NativeModules);
      console.log('FCM Token:', token);

      // Store or update FCM token in Firestore
      await firestore()
        .collection('users')
        .doc(authUser.uid)
        .set({ fcmToken: token }, { merge: true });

      // Handle token refresh
      messaging().onTokenRefresh(async (newToken) => {
        console.log('New FCM Token:', newToken);
        await firestore()
          .collection('users')
          .doc(authUser.uid)
          .set({ fcmToken: newToken }, { merge: true });
      });
    } catch (error) {
      console.error('Error setting up FCM token:', error);
    }
  };

  // Listen for foreground notifications
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground notification received:', remoteMessage);
      await notifee.displayNotification({
        title: remoteMessage.notification?.title,
        body: remoteMessage.notification?.body,
        android: {
          channelId: 'default',
          importance: AndroidImportance.HIGH,
        },
      });
    });
    return unsubscribe;
  }, []);

  // Handle background messages
  useEffect(() => {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background message received:', remoteMessage);
      const channelId = await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
      });

      await notifee.displayNotification({
        title: remoteMessage.notification?.title,
        body: remoteMessage.notification?.body,
        android: {
          channelId,
          importance: AndroidImportance.HIGH,
        },
      });
    });
  }, []);
  
  return (
    <NavigationContainer ref={navigationRef}>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>

  );
};

export default App;
