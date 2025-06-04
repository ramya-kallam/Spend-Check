import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BudgetProgressTracker from './BudgetProgressTracker';

const BudgetProgressScreen = ({ route }) => {
  const { budgets, spent } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Budget Progress Details</Text>
      <BudgetProgressTracker budgets={budgets} spent={spent} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default BudgetProgressScreen;