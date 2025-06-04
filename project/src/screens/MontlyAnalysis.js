import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Dimensions, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import auth from '@react-native-firebase/auth';
import axios from 'axios';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';

const API_BASE_URL = 'http://10.0.2.2:5000';

const MonthlyAnalysis = () => {
  // State variables
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [monthlyData, setMonthlyData] = useState({ months: [], categoryData: {} });
  const [totalSpent, setTotalSpent] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [categories, setCategories] = useState(['All Categories']);
  const [dateRange, setDateRange] = useState({
    startDate: subMonths(new Date(), 6), // Default to 6 months back
    endDate: new Date()
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateSelection, setActiveDateSelection] = useState(null); // 'start' or 'end'
  const [comparisonMode, setComparisonMode] = useState('month'); // 'month', 'category'

  // Color palette for charts
  const chartColors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
    '#FF9F40', '#8AC926', '#1982C4', '#6A4C93', '#F45B69'
  ];

  // Screen dimensions
  const screenWidth = Dimensions.get('window').width;
  
  // Fetch data when component mounts or when date range changes
  useEffect(() => {
    fetchMonthlyData();
  }, [dateRange]);

  // Handle date selection
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (activeDateSelection === 'start') {
        setDateRange({
          ...dateRange,
          startDate: startOfMonth(selectedDate)
        });
      } else {
        setDateRange({
          ...dateRange,
          endDate: endOfMonth(selectedDate)
        });
      }
    }
  };

  // Fetch monthly transaction data from API
  const fetchMonthlyData = async () => {
    try {
      setLoading(true);
      const user = auth().currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      
      // Format dates for API request
      const startDateStr = format(dateRange.startDate, 'yyyy-MM-dd');
      const endDateStr = format(dateRange.endDate, 'yyyy-MM-dd');
      
      const response = await axios.get(
        `${API_BASE_URL}/api/users/${user.uid}/transactions/monthly-analysis`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          params: {
            startDate: startDateStr,
            endDate: endDateStr
          }
        }
      );

      processTransactionData(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Process the transaction data
  const processTransactionData = useCallback((data) => {
    const { transactions, categorySummary } = data;
    
    // Extract unique categories from data
    const uniqueCategories = ['All Categories', ...Object.keys(categorySummary)];
    setCategories(uniqueCategories);
    
    // Process monthly data
    const monthlyTotals = {};
    const categoryMonthlyTotals = {};
    let total = 0;
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthYear = format(date, 'yyyy-MM');
      const monthName = format(date, 'MMM yyyy');
      
      const amount = parseFloat(transaction.amount);
      const category = transaction.category || 'Uncategorized';
      
      // Only process expenses (positive amounts)
      if (amount <= 0) return;
      
      total += amount;
      
      if (!monthlyTotals[monthYear]) {
        monthlyTotals[monthYear] = { 
          month: monthName,
          total: 0,
          rawMonth: monthYear 
        };
      }
      monthlyTotals[monthYear].total += amount;
      
      if (!categoryMonthlyTotals[category]) {
        categoryMonthlyTotals[category] = {};
      }
      
      if (!categoryMonthlyTotals[category][monthYear]) {
        categoryMonthlyTotals[category][monthYear] = 0;
      }
      
      categoryMonthlyTotals[category][monthYear] += amount;
    });
    
    // Sort months chronologically
    const sortedMonths = Object.values(monthlyTotals)
      .sort((a, b) => a.rawMonth.localeCompare(b.rawMonth));
    
    // Convert category totals to chart-friendly format
    const processedCategoryData = {};
    Object.keys(categoryMonthlyTotals).forEach((category, index) => {
      processedCategoryData[category] = {
        data: sortedMonths.map(month => {
          const monthYear = month.rawMonth;
          return categoryMonthlyTotals[category][monthYear] || 0;
        }),
        color: chartColors[index % chartColors.length]
      };
    });
    
    setMonthlyData({
      months: sortedMonths,
      categoryData: processedCategoryData
    });
    
    setTotalSpent(total);
  }, []);

  // Prepare data for the line chart
  const prepareLineChartData = useCallback(() => {
    if (!monthlyData.months || monthlyData.months.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [] }]
      };
    }

    const labels = monthlyData.months.map(m => m.month);
    
    if (selectedCategory === 'All Categories') {
      // Show total spending per month
      return {
        labels,
        datasets: [
          {
            data: monthlyData.months.map(m => m.total),
            color: () => '#36A2EB',
            strokeWidth: 2
          }
        ]
      };
    } else {
      // Show selected category spending per month
      return {
        labels,
        datasets: [
          {
            data: monthlyData.categoryData[selectedCategory]?.data || [],
            color: () => monthlyData.categoryData[selectedCategory]?.color || '#36A2EB',
            strokeWidth: 2
          }
        ]
      };
    }
  }, [monthlyData, selectedCategory]);

  // Prepare data for comparative bar chart (month vs month or category distribution)
  const prepareBarChartData = useCallback(() => {
    if (!monthlyData.months || monthlyData.months.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [] }]
      };
    }
    
    if (comparisonMode === 'month') {
      // Compare all months
      return {
        labels: monthlyData.months.map(m => m.month),
        datasets: [
          {
            data: monthlyData.months.map(m => m.total),
            colors: monthlyData.months.map((_, i) => () => chartColors[i % chartColors.length])
          }
        ]
      };
    } else {
      // Compare categories for selected month
      // Default to last month if no specific month is selected
      const lastMonthIndex = monthlyData.months.length - 1;
      const selectedMonth = monthlyData.months[lastMonthIndex]?.rawMonth;
      
      if (!selectedMonth) return { labels: [], datasets: [{ data: [] }] };
      
      const categoryNames = Object.keys(monthlyData.categoryData).slice(0, 5); // Top 5 categories
      const categoryValues = categoryNames.map(cat => {
        const monthIndex = monthlyData.months.findIndex(m => m.rawMonth === selectedMonth);
        return monthlyData.categoryData[cat]?.data[monthIndex] || 0;
      });
      
      return {
        labels: categoryNames,
        datasets: [
          {
            data: categoryValues,
            colors: categoryNames.map((_, i) => () => chartColors[i % chartColors.length])
          }
        ]
      };
    }
  }, [monthlyData, comparisonMode]);

  // Calculate month-over-month changes
  const calculateMoMChanges = useCallback(() => {
    if (!monthlyData.months || monthlyData.months.length <= 1) {
      return [];
    }
    
    return monthlyData.months.map((month, index) => {
      if (index === 0) {
        return {
          ...month,
          change: 0,
          changePercent: 0
        };
      }
      
      const prevMonth = monthlyData.months[index - 1];
      const change = month.total - prevMonth.total;
      const changePercent = prevMonth.total > 0 
        ? (change / prevMonth.total * 100)
        : 0;
        
      return {
        ...month,
        change,
        changePercent
      };
    });
  }, [monthlyData]);

  // Calculate average monthly spending
  const calculateAverageSpending = useCallback(() => {
    if (!monthlyData.months || monthlyData.months.length === 0) {
      return 0;
    }
    
    const sum = monthlyData.months.reduce((acc, month) => acc + month.total, 0);
    return sum / monthlyData.months.length;
  }, [monthlyData]);

  // Handle loading state
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.message}>Loading data...</Text>
      </View>
    );
  }

  // Handle error state
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorMessage}>Error: {error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={fetchMonthlyData}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lineChartData = prepareLineChartData();
  const barChartData = prepareBarChartData();
  const monthlyChanges = calculateMoMChanges();
  const averageSpending = calculateAverageSpending();

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
      {/* Date Range Selector */}
      <View style={styles.dateRangeContainer}>
        <Text style={styles.title}>Monthly Spending Analysis</Text>
        
        <View style={styles.dateRangeRow}>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => {
              setActiveDateSelection('start');
              setShowDatePicker(true);
            }}
          >
            <Text style={styles.dateButtonLabel}>From:</Text>
            <Text style={styles.dateButtonText}>
              {format(dateRange.startDate, 'MMM yyyy')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => {
              setActiveDateSelection('end');
              setShowDatePicker(true);
            }}
          >
            <Text style={styles.dateButtonLabel}>To:</Text>
            <Text style={styles.dateButtonText}>
              {format(dateRange.endDate, 'MMM yyyy')}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={activeDateSelection === 'start' ? dateRange.startDate : dateRange.endDate}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}
      </View>

      {/* Summary Metrics */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Spent</Text>
          <Text style={styles.metricValue}>${totalSpent.toFixed(2)}</Text>
        </View>
        
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Monthly Average</Text>
          <Text style={styles.metricValue}>${averageSpending.toFixed(2)}</Text>
        </View>
        
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Months</Text>
          <Text style={styles.metricValue}>{monthlyData.months.length}</Text>
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Category Filter</Text>
        <Picker
          selectedValue={selectedCategory}
          style={styles.picker}
          onValueChange={(itemValue) => setSelectedCategory(itemValue)}
        >
          {categories.map((category, index) => (
            <Picker.Item key={index} label={category} value={category} />
          ))}
        </Picker>
      </View>

      {/* Spending Trend Line Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>
          {selectedCategory === 'All Categories' 
            ? 'Total Monthly Spending Trend' 
            : `${selectedCategory} Spending Trend`}
        </Text>
        {monthlyData.months.length > 0 ? (
          <LineChart
            data={lineChartData}
            width={screenWidth - 40}
            height={220}
            yAxisLabel="$"
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
        ) : (
          <Text style={styles.message}>No data available for the selected date range.</Text>
        )}
      </View>

      {/* Comparison View Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, comparisonMode === 'month' && styles.activeTab]}
          onPress={() => setComparisonMode('month')}
        >
          <Text style={[styles.tabText, comparisonMode === 'month' && styles.activeTabText]}>
            Compare Months
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, comparisonMode === 'category' && styles.activeTab]}
          onPress={() => setComparisonMode('category')}
        >
          <Text style={[styles.tabText, comparisonMode === 'category' && styles.activeTabText]}>
            Compare Categories
          </Text>
        </TouchableOpacity>
      </View>

      {/* Comparison Bar Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>
          {comparisonMode === 'month' 
            ? 'Monthly Spending Comparison' 
            : 'Category Spending Comparison'}
        </Text>
        {monthlyData.months.length > 0 ? (
          <BarChart
            data={barChartData}
            width={screenWidth - 40}
            height={220}
            yAxisLabel="$"
            fromZero
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 }
            }}
            style={{ marginVertical: 8, borderRadius: 16 }}
          />
        ) : (
          <Text style={styles.message}>No data available for the selected date range.</Text>
        )}
      </View>

      {/* Monthly Change Cards */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Month-over-Month Changes</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {monthlyChanges.map((month, index) => (
            <View key={index} style={styles.monthCard}>
              <Text style={styles.monthName}>{month.month}</Text>
              <Text style={styles.monthTotal}>${month.total.toFixed(2)}</Text>
              {index > 0 && (
                <Text style={[
                  styles.monthChange,
                  month.changePercent > 0 
                    ? styles.negativeChange 
                    : styles.positiveChange
                ]}>
                  {month.changePercent > 0 ? '↑' : '↓'} 
                  {Math.abs(month.changePercent).toFixed(1)}%
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 40,
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
    marginBottom: 15,
    textAlign: 'center',
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
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  dateRangeContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dateRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  dateButtonLabel: {
    fontSize: 12,
    color: '#555',
    marginBottom: 5,
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginVertical: 10,
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '31%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: '#555',
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    margin: 20,
    marginTop: 10,
    marginBottom: 10,
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
  picker: {
    height: 50,
    width: '100%',
  },
  tabContainer: {
    flexDirection: 'row',
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
    padding: 16,
    minWidth: 120,
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
    fontWeight: 'bold',
  },
  positiveChange: {
    color: '#4CAF50',
  },
  negativeChange: {
    color: '#F44336',
  },
});

export default MonthlyAnalysis;