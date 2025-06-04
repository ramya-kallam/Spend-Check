import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const NotificationScreen = ({ route }) => {
  const { title, body, customInfo } = route.params || {};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold' },
  body: { fontSize: 16, marginTop: 10 },
  custom: { fontSize: 14, marginTop: 10, color: '#666' },
});

export default NotificationScreen;
