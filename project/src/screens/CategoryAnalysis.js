import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';
import auth from '@react-native-firebase/auth';
import axios from 'axios';

const API_BASE_URL = 'http://10.0.2.2:5000';

const CategoryAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [activeTab, setActiveTab] = useState('categories'); 

  // Color palette for charts
  const chartColors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
    '#FF9F40', '#8AC926', '#1982C4', '#6A4C93', '#F45B69'
  ];

  useEffect(() => {
    if (activeTab === 'categories') {
      fetchCategoryData();
    } else {
      fetchMonthlyData();
    }
  }, [activeTab]);

  const fetchCategoryData = async () => {
    try {
      setLoading(true);
      const user = auth().currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      const response = await axios.get(
        `${API_BASE_URL}/api/users/${user.uid}/transactions`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const transactions = response.data;
      processTransactionData(transactions);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchMonthlyData = async () => {
    if (!categoryData || categoryData.length === 0) {
      await fetchCategoryData(); // Ensure category data is loaded first
    }
  
    try {
      setLoading(true);
      const user = auth().currentUser;
      if (!user) throw new Error('User not authenticated');
  
      const token = await user.getIdToken();
      const response = await axios.get(
        `${API_BASE_URL}/api/users/${user.uid}/transactions`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
  
      const transactions = response.data;
      processMonthlyData(transactions);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };  

  const processTransactionData = (transactions) => {
    // Group transactions by category and calculate totals
    const categoryTotals = {};
    let total = 0;

    transactions.forEach(transaction => {
      const category = transaction.category || 'Uncategorized';
      const amount = parseFloat(transaction.amount);
      
      // For expense tracking, we'll treat positive amounts as expenses
      if (amount > 0) {
        categoryTotals[category] = (categoryTotals[category] || 0) + amount;
        total += amount;
      }
    });

    // Transform data for charts
    const processedData = Object.keys(categoryTotals).map((category, index) => {
      const amount = categoryTotals[category];
      const percentage = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
      
      return {
        name: category,
        amount,
        percentage: parseFloat(percentage),
        color: chartColors[index % chartColors.length],
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      };
    });

    // Sort by amount (highest first)
    processedData.sort((a, b) => b.amount - a.amount);
    
    setCategoryData(processedData);
    setTotalSpent(total);
  };

  const processMonthlyData = (transactions) => {
    if (!categoryData || categoryData.length === 0) {
      return; // Ensure categoryData is available before proceeding
    }
  
    const monthlyTotals = {};
    const categoryMonthlyTotals = {};
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = new Date(date.getFullYear(), date.getMonth(), 1)
        .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  
      const amount = parseFloat(transaction.amount);
      const category = transaction.category || 'Uncategorized';
  
      if (amount <= 0) return;
  
      if (!monthlyTotals[monthYear]) {
        monthlyTotals[monthYear] = { 
          month: monthName,
          total: 0,
          rawMonth: monthYear 
        };
      }
      monthlyTotals[monthYear].total += amount;
  
      if (!categoryMonthlyTotals[monthYear]) {
        categoryMonthlyTotals[monthYear] = {};
      }
      if (!categoryMonthlyTotals[monthYear][category]) {
        categoryMonthlyTotals[monthYear][category] = 0;
      }
      categoryMonthlyTotals[monthYear][category] += amount;
    });
  
    const sortedMonthly = Object.values(monthlyTotals)
      .sort((a, b) => a.rawMonth.localeCompare(b.rawMonth));
  
    // Ensure categoryData exists before slicing
    if (!categoryData || categoryData.length === 0) {
      return;
    }
  
    const topCategories = categoryData
      .slice(0, 5) // Make sure categoryData is not undefined before slicing
      .map(cat => cat.name);
  
    const categoryDataProcessed = {};
    topCategories.forEach(category => {
      categoryDataProcessed[category] = {
        data: sortedMonthly.map(month => {
          const monthYear = month.rawMonth;
          return categoryMonthlyTotals[monthYear]?.[category] || 0;
        }),
        color: chartColors[topCategories.indexOf(category) % chartColors.length]
      };
    });
  
    setMonthlyData({
      months: sortedMonthly,
      categories: categoryDataProcessed
    });
  };
  
  const screenWidth = Dimensions.get('window').width;

  // Prepare data for bar chart (categories)
  const barChartData = {
    labels: categoryData.slice(0, 6).map(item => item.name), // Show top 6 categories
    datasets: [
      {
        data: categoryData.slice(0, 6).map(item => item.amount),
        colors: categoryData.slice(0, 6).map(item => () => item.color)
      }
    ]
  };

  // Moved the prepareCategoryLineData function outside prepareMonthlyChartData
  const prepareCategoryLineData = () => {
    if (!monthlyData.months || !monthlyData.categories) return null;
    
    const months = monthlyData.months.map(m => m.month);
    const datasets = [];
    
    Object.entries(monthlyData.categories).forEach(([category, data], index) => {
      datasets.push({
        data: data.data,
        color: () => data.color,
        strokeWidth: 2,
        legend: category
      });
    });

    return {
      labels: months,
      datasets,
      legend: Object.keys(monthlyData.categories)
    };
  };

  // Prepare data for line chart (monthly trends)
  const prepareMonthlyChartData = () => {
    if (!monthlyData.months || monthlyData.months.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [] }]
      };
    }
    
    return {
      labels: monthlyData.months.map(m => m.month),
      datasets: [
        {
          data: monthlyData.months.map(m => m.total),
          color: () => '#36A2EB',
          strokeWidth: 2
        }
      ]
    };
  };

  const categoryLineData = prepareCategoryLineData();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.message}>Loading data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorMessage}>Error: {error}</Text>
      </View>
    );
  }

  const renderCategoryAnalysis = () => {
    if (categoryData.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.message}>No transaction data available.</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Spending by Category</Text>
        <Text style={styles.subtitle}>Total Spent: ₹{totalSpent.toFixed(2)}</Text>
  
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Distribution (%)</Text>
          <PieChart
            data={categoryData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="percentage"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
  
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Top Categories (₹)</Text>
          <BarChart
            data={barChartData}
            width={screenWidth - 60}
            height={220}
            yAxisLabel="₹"
            fromZero
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16}
            }}
            style={{ marginVertical: 8, borderRadius: 16 }}
          />
        </View>
  
        <View style={styles.legendContainer}>
          {categoryData.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.colorBox, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>
                {item.name}: ₹{item.amount.toFixed(2)} ({item.percentage}%)
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderMonthlyAnalysis = () => {
    if (!monthlyData.months || monthlyData.months.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.message}>No monthly data available.</Text>
        </View>
      );
    }

    const monthlyChartData = prepareMonthlyChartData();

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Monthly Spending Trends</Text>
        <Text style={styles.subtitle}>
          {monthlyData.months.length > 0 
            ? `${monthlyData.months[0].month} to ${monthlyData.months[monthlyData.months.length-1].month}`
            : ''}
        </Text>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Total Monthly Spending</Text>
          <LineChart
            data={monthlyChartData}
            width={screenWidth - 40}
            height={220}
            yAxisLabel="₹"
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(36, 162, 235, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: "6",
                strokeWidth: "2",
                stroke: "#ffa726"
              }
            }}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16
            }}
          />
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Monthly Breakdown</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {monthlyData.months.map((month, index) => (
              <View key={index} style={styles.monthCard}>
                <Text style={styles.monthName}>{month.month}</Text>
                <Text style={styles.monthTotal}>₹{month.total.toFixed(2)}</Text>
                {index > 0 && (
                  <Text style={[
                    styles.monthChange,
                    month.total > monthlyData.months[index-1].total 
                      ? styles.negativeChange 
                      : styles.positiveChange
                  ]}>
                    {month.total > monthlyData.months[index-1].total ? '↑' : '↓'} 
                    {Math.abs(((month.total - monthlyData.months[index-1].total) / 
                    monthlyData.months[index-1].total * 100) || 0).toFixed(1)}%
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'categories' && styles.activeTab]}
          onPress={() => setActiveTab('categories')}
        >
          <Text style={[styles.tabText, activeTab === 'categories' && styles.activeTabText]}>
            Categories
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'monthly' && styles.activeTab]}
          onPress={() => setActiveTab('monthly')}
        >
          <Text style={[styles.tabText, activeTab === 'monthly' && styles.activeTabText]}>
            Monthly Trends
          </Text>
        </TouchableOpacity>
      </View>
      
      {activeTab === 'categories' ? renderCategoryAnalysis() : renderMonthlyAnalysis()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#cce0ff',
    height: '100%',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#555',
  },
  message: {
    marginTop: 20,
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  legendContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 40, 
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 10,
    marginHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontWeight: '500',
    color: '#777',
  },
  activeTabText: {
    color: '#4285F4',
    fontWeight: 'bold',
  },
  monthCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 10,
    minWidth: 100,
    marginRight: 10,
    alignItems: 'center',
  },
  monthName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  monthTotal: {
    fontSize: 16,
    marginTop: 5,
  },
  monthChange: {
    fontSize: 12,
    marginTop: 5,
  },
  positiveChange: {
    color: '#4CAF50',
  },
  negativeChange: {
    color: '#F44336',
  },
});

export default CategoryAnalysis;