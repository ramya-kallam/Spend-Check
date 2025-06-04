import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';

class NotificationService {
  // Request notification permissions
  async requestNotificationPermission() {
    if (Platform.OS === 'ios') {
      // iOS-specific permission request
      await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
    } else if (Platform.OS === 'android') {
      // Android permission request
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Authorization status:', authStatus);
      }
    }
  }

  // Get and save FCM token
  async getFCMToken() {
    const token = await messaging().getToken();
    await AsyncStorage.setItem('fcmToken', token);
    return token;
  }

  // Schedule local budget reminder notifications
  async scheduleBudgetReminders() {
    // Clear existing notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Schedule reminders for budget setting
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Budget Reminder 📊",
        body: "Set your monthly budget limits for this month!",
        data: { screen: 'BudgetScreen' },
      },
      trigger: {
        day: 1,    // 1st of the month
        hour: 9,   // 9 AM
        minute: 0,
        repeats: true
      }
    });

    // Additional reminder mid-month
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Budget Check 💡",
        body: "How are you tracking against your monthly budget?",
        data: { screen: 'ExpenseScreen' },
      },
      trigger: {
        day: 15,   // 15th of the month
        hour: 12,  // Noon
        minute: 0,
        repeats: true
      }
    });
  }

  // Handle foreground messages
  async handleForegroundMessages() {
    return messaging().onMessage(async remoteMessage => {
      // Handle foreground message display
      await Notifications.presentNotificationAsync({
        title: remoteMessage.notification?.title,
        body: remoteMessage.notification?.body,
      });
    });
  }

  // Check if budget is set for current month
  async checkBudgetStatus() {
    const currentMonth = dayjs().format('YYYY-MM');
    
    try {
      const budgetResponse = await getBudget(userId, currentMonth);
      
      if (!budgetResponse.success) {
        // Budget not set, trigger local notification
        await Notifications.presentNotificationAsync({
          title: "Budget Reminder",
          body: "You haven't set a budget for this month. Set it now!",
        });
      }
    } catch (error) {
      console.error('Budget check failed', error);
    }
  }

  // Background message handler (for Android)
  setupBackgroundHandler() {
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      // Handle background messages
      console.log('Background message received', remoteMessage);
    });
  }
}

// Export as singleton
export default new NotificationService();