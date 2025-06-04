import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProgressBar } from 'react-native-paper';

const BudgetProgressTracker = ({ budgets, spent }) => {
  // Calculate progress and color based on spending
  const getProgressColor = (category) => {
    const limit = parseFloat(budgets[category]) || 0;
    const currentSpent = spent[category] || 0;
    const progress = limit > 0 ? currentSpent / limit : 0;

    if (progress <= 0.5) return '#4CAF50';  // Green
    if (progress <= 0.75) return '#FFC107'; // Yellow
    return '#F44336';  // Red
  };

  const getProgressPercentage = (category) => {
    const limit = parseFloat(budgets[category]) || 0;
    const currentSpent = spent[category] || 0;
    return limit > 0 ? Math.min(currentSpent / limit, 1) : 0;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Budget Progress</Text>
      {Object.keys(budgets).map((category) => {
        const limit = parseFloat(budgets[category]) || 0;
        const currentSpent = spent[category] || 0;

        return (
          <View key={category} style={styles.categoryContainer}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryName}>{category}</Text>
              <View style={styles.amountContainer}>
                <Text style={styles.spentText}>
                ₹{currentSpent.toFixed(2)} 
                </Text>
                <Text style={styles.limitText}>
                  / ₹{limit.toFixed(2)}
                </Text>
              </View>
            </View>
            <ProgressBar 
              progress={getProgressPercentage(category)}
              color={getProgressColor(category)}
              style={styles.progressBar}
            />
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  categoryContainer: {
    marginBottom: 15,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spentText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: 'bold',
  },
  limitText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 5,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
  },
});

export default BudgetProgressTracker;