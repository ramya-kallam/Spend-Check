import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from "react-native";
import { Picker } from "@react-native-picker/picker";
import dayjs from "dayjs";
import { getAuth, onAuthStateChanged } from "@react-native-firebase/auth";
import { getBudget, setBudget, getAllBudgets, sendBudgetReminder, getBudgetSummary} from "../api"; // Import API functions
import BudgetProgressTracker from "./BudgetProgressTracker";
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const categories = ["Food", "Transportation", "Entertainment", "Shopping", "Bills", "Healthcare"];

const BudgetScreen = ({navigation}) => {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [isEditable, setIsEditable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false); 
  const [userId, setUserId] = useState(null);
  const [budgets, setBudgets] = useState({});
  const [spent, setSpent] = useState({});

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });
  
    return unsubscribe; // Cleanup function to prevent memory leaks
  }, []);

  useEffect(() => {
    checkEditability();
    loadBudgetAndExpenses()
    loadBudgetForMonth()
  }, [selectedMonth, userId]);

  const checkEditability = () => {
    const currentMonth = dayjs().format("YYYY-MM");
    setIsEditable(selectedMonth >= currentMonth);
  };

  const loadBudgetAndExpenses = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Fetch spent amounts
      const response = await getBudgetSummary(userId, selectedMonth);
      console.log(response)
      if (response) {
        setSpent(response.spent || {});
        setBudgets((prev) => ({
          ...prev,
          ...response.budget?.budgets, // Ensure budgets are not overwritten
        }));
      }
    } catch (error) {
      console.error("Error fetching budget and spent amounts:", error);
      Alert.alert("Error", "Failed to load data. Please try again.");
    }
    setLoading(false);
  };

  const navigateToBudgetProgress = () => {
    navigation.navigate('BudgetProgress', {
      budgets: budgets,
      spent: spent
    });
  };

  const loadBudgetForMonth = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const response = await getBudget(userId, selectedMonth);
      console.log("Budget Response:", response);
  
      if (response.success) {
        setBudgets((prev) => ({
          ...prev,
          ...response.budget.budgets, // Ensure existing budgets are merged
        }));
        setIsFirstTime(false);
      } else {
        // Try fetching the most recent previous budget
        const previousMonthBudget = await fetchMostRecentBudget(userId, selectedMonth);
        if (previousMonthBudget) {
          setBudgets((prev) => ({
            ...prev,
            ...previousMonthBudget,
          }));
          setIsFirstTime(true);
        } else {
          setBudgets(initializeEmptyBudget());
          setIsFirstTime(true);
        }
      }
    } catch (error) {
      console.error("Error fetching budget:", error);
      setBudgets(initializeEmptyBudget());
      setIsFirstTime(true);
      Alert.alert("Error", "Failed to fetch budget. Please try again.");
    }
    setLoading(false);
  };
  
  
  const triggerBudgetReminder = async () => {
    try {
      await sendBudgetReminder();
      Alert.alert("Success", "Budget reminder sent!");
    } catch (error) {
      Alert.alert("Error", "Failed to send reminder.");
    }
  };

  // New helper function to fetch most recent budget
  const fetchMostRecentBudget = async (userId, currentMonth) => {
    try {
      // Get all budgets for the user
      const allBudgetsResponse = await getAllBudgets(userId);
      
      if (allBudgetsResponse.success) {
        const budgets = allBudgetsResponse.budgets;
        
        // Sort budget months in descending order
        const sortedMonths = Object.keys(budgets)
          .filter(month => month < currentMonth)
          .sort((a, b) => new Date(b) - new Date(a));
        
        // Return the most recent budget's limits
        return sortedMonths.length > 0 ? budgets[sortedMonths[0]].budgets : null;
      }
    } catch (error) {
      console.error("Error fetching all budgets:", error);
    }
    
    return null;
  };

  const initializeEmptyBudget = () => {
    let defaultBudget = {};
    categories.forEach(category => {
        defaultBudget[category] = "";  // Empty string allows easy user input
    });
    return defaultBudget;
  };

  const handleBudgetChange = (category, value) => {
    if (!isEditable) return; // Prevent changes if not editable
  
    setBudgets((prev) => ({
      ...prev,
      [category]: value.replace(/[^0-9.]/g, ""), // Allow only numbers and decimal
    }));
  };

  const saveBudgets = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      await setBudget(userId, selectedMonth, budgets);
      Alert.alert("Success", "Budget saved successfully!");
      setIsFirstTime(false); // Mark as saved after first-time setup
    } catch (error) {
      console.error("Error saving budget:", error);
      Alert.alert("Error", "Failed to save budget.");
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set Monthly Budget</Text>

      {/* Month Selector */}
      <Picker
        selectedValue={selectedMonth}
        onValueChange={(itemValue) => setSelectedMonth(itemValue)}
        style={[styles.picker, {color: 'black'}]}
      >
        {[...Array(12)].map((_, index) => {
          const month = dayjs().add(index - 6, "month").format("YYYY-MM");
          return <Picker.Item key={month} label={dayjs(month).format("MMMM YYYY")} value={month} />;
        })}
      </Picker>

      {/* Loading Indicator */}
      {loading && <ActivityIndicator size="large" color="#007bff" />}

      {/* Show "No Budget Found" Message for First-Time Users */}
      {isFirstTime && !loading && (
        <Text style={styles.infoText}>No budget found for this month. Set your limits below!</Text>
      )}

      {/* Budget List */}
      <FlatList
        data={categories}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.categoryRow}>
            <Text style={styles.categoryText}>{item}</Text>
            <TextInput
            style={[styles.input, !isEditable && styles.disabledInput]}
            placeholder="₹0.00"
            keyboardType="numeric"
            value={budgets[item] !== undefined ? budgets[item].toString() : ""}
            onChangeText={(value) => handleBudgetChange(item, value)}
            editable={isEditable}
          />

          </View>
        )}
      />

      {/* Save Button */}
      {/* {isEditable && !loading && <Button title="Save Budget" onPress={saveBudgets} />} */}
      
      <TouchableOpacity style={styles.buttonContainer} onPress={saveBudgets}>
  <Text style={styles.buttonText}>Save Budget</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.buttonContainer} onPress={navigateToBudgetProgress}>
  <Text style={styles.buttonText}>View Budget Progress</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.buttonContainer} onPress={triggerBudgetReminder}>
  <Text style={styles.buttonText}>Remind Me Later</Text>
</TouchableOpacity>

    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#00509e", // Bg
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#ffffff", // White title for contrast
  },
  picker: {
    height: 50,
    marginBottom: 10,
    backgroundColor: "#cce0ff", // Button background
    borderRadius: 10,
    color: "#007acc", // Main text
  },
  infoText: {
    fontSize: 14,
    color: "#ffcc00", // Bright for visibility
    textAlign: "center",
    marginBottom: 10,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#007acc", // Button-like card
    marginVertical: 5,
    borderRadius: 10,
    elevation: 2,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000000", // Main color
  },
  input: {
    width: 100,
    padding: 5,
    borderWidth: 1,
    borderRadius: 5,
    borderColor: "#007acc", // Main color
    textAlign: "right",
    backgroundColor: "#ffffff",
    color: "#007acc",
  },
  disabledInput: {
    backgroundColor: "#e0e0e0",
    color: "#777",
  },
  buttonContainer: {
    backgroundColor: "#cce0ff",
    borderRadius: 10,
    padding: 10,
    marginVertical: 5,
  },
  buttonText: {
    color: "#007acc",
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default BudgetScreen;
