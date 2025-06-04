import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  ActivityIndicator, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  ScrollView,
  TextInput
} from 'react-native';
import { getTransactions } from '../api';
import auth from '@react-native-firebase/auth';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

export default function ViewTransactions() {
  const navigation = useNavigation();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [expandedId, setExpandedId] = useState({});
  
  // Categories - you might want to fetch these from your backend
  const categories = [
    { label: 'All Categories', value: '' },
    { label: 'Food', value: 'Food' },
    { label: 'Transportation', value: 'Transportation' },
    { label: 'Shopping', value: 'Shopping' },
    { label: 'Entertainment', value: 'Entertainment' },
    { label: 'Utilities', value: 'Utilities' },
    { label: 'Housing', value: 'Housing' },
    // Add more categories as needed
  ];

  useFocusEffect(
    useCallback(() => {
      // Your fetchTransactions function here
      fetchTransactions();
    }, [])
  );

  const fetchTransactions = async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const currentUser = auth().currentUser;
      if (!currentUser) throw new Error('User not logged in');

      const userId = currentUser.uid;
      const data = await getTransactions(userId, filters);
      setTransactions(data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setError(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadBill = async (transactionId) => {
  const result = await pickImage(); // Open image picker
  const uploadedUrl = await uploadToCloudinary(result.uri); // Upload to cloud

  await fetch(`${your_api}/update-transaction`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      transactionId,
      bill: {
        url: uploadedUrl,
        uploadedAt: new Date().toISOString()
      }
    }),
  });

  alert('Bill uploaded successfully');
};

  const applyFilters = () => {
    const filters = {};
    
    if (selectedCategory) {
      filters.category = selectedCategory;
    }
    
    if (startDate) {
      filters.startDate = startDate.toISOString();
    }
    
    if (endDate) {
      filters.endDate = endDate.toISOString();
    }
    
    fetchTransactions(filters);
    setFilterModalVisible(false);
  };

  const resetFilters = () => {
    setSelectedCategory('');
    setStartDate(null);
    setEndDate(null);
    fetchTransactions({});
    setFilterModalVisible(false);
  };

  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity 
          style={styles.filterButton} 
          onPress={() => setFilterModalVisible(true)}
        >
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Active Filters Display */}
      {(selectedCategory || startDate || endDate) && (
        <View style={styles.activeFilters}>
          <Text style={styles.activeFiltersTitle}>Active Filters:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedCategory && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>Category: {selectedCategory}</Text>
              </View>
            )}
            {startDate && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>From: {formatDate(startDate)}</Text>
              </View>
            )}
            {endDate && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>To: {formatDate(endDate)}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.clearFiltersButton} onPress={resetFilters}>
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : transactions.length > 0 ? (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isExpanded = expandedId === item.id;
          
            return (
              <View style={styles.transactionItem}>
                <View style={styles.transactionHeader}>
                  <Text style={styles.category}>
                    {item.transactionType === 'Income' ? 'Income' : item.category}
                  </Text>
                  <Text style={[styles.amount, { color: item.transactionType === 'Income' ? 'green' : 'red' }]}>
                    ₹{item.amount}
                  </Text>
                </View>
          
                {item.notes && (
                  <Text style={styles.notes}>{item.notes}</Text>
                )}
          
                <View style={styles.transactionFooter}>
                  <Text style={styles.date}>{new Date(item.date).toDateString()}</Text>
                  {item.paymentMethod && (
                    <Text style={styles.paymentMethod}>{item.paymentMethod}</Text>
                  )}
                </View>
          
                {/* View More Button */}
                <View style={{ alignItems: 'flex-end' }}>
                <TouchableOpacity
                    onPress={() => navigation.navigate('TransactionDetails', { transaction: item })}
                    style={{ alignSelf: 'flex-end', padding: 8 }}
                  >
                    <Text style={{ color: '#007bff' }}>View</Text>
                </TouchableOpacity>

                </View>
          
                {/* Extra Details When Expanded */}
                {isExpanded && (
                <View style={styles.detailsContainer}>
                  <Text>Amount: ₹{item.amount}</Text>
                  <Text>Category: {item.bill?.category}</Text>
                  <Text>Date: {new Date(item.bill?.date?.seconds * 1000).toLocaleDateString()}</Text>
                  <Text>Type: {item.bill?.transactionType}</Text>
                  <Text>Notes: {item.notes || 'No notes added'}</Text>

                  {item.bill?.url ? (
                    <Image source={{ uri: item.bill.url }} style={styles.billImage} />
                  ) : (
                    <TouchableOpacity onPress={() => handleUploadBill(item.id)}>
                      <Text style={styles.uploadBill}>Upload Bill</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity onPress={() => handleEditTransaction(item)}>
                    <Text style={styles.editButton}>Edit</Text>
                  </TouchableOpacity>
                </View>

                )}
              </View>
            );
          }}
          
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.noTransactions}>No transactions found.</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={() => fetchTransactions({})}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter Transactions</Text>
            
            {/* Category Filter */}
            <Text style={styles.filterLabel}>Category</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedCategory}
                onValueChange={(itemValue) => setSelectedCategory(itemValue)}
                style={styles.picker}
              >
                {categories.map((cat) => (
                  <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
                ))}
              </Picker>
            </View>
            
            {/* Date Range Filter */}
            <Text style={styles.filterLabel}>Date Range</Text>
            <View style={styles.dateContainer}>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={startDate ? styles.dateText : styles.datePlaceholder}>
                  {startDate ? formatDate(startDate) : 'Start Date'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.dateRangeSeparator}>to</Text>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={endDate ? styles.dateText : styles.datePlaceholder}>
                  {endDate ? formatDate(endDate) : 'End Date'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Date Pickers */}
            {showStartDatePicker && (
              <DateTimePicker
                value={startDate || new Date()}
                mode="date"
                display="default"
                onChange={handleStartDateChange}
              />
            )}
            
            {showEndDatePicker && (
              <DateTimePicker
                value={endDate || new Date()}
                mode="date"
                display="default"
                onChange={handleEndDateChange}
              />
            )}
            
            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.resetButton]}
                onPress={resetFilters}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.applyButton]}
                onPress={applyFilters}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f8f8' 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
  },
  filterButton: {
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  filterButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  activeFilters: {
    padding: 10,
    backgroundColor: '#f0f7ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  activeFiltersTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#555',
  },
  filterTag: {
    backgroundColor: '#e1f5fe',
    padding: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#b3e5fc',
  },
  filterTagText: {
    fontSize: 12,
    color: '#0277bd',
  },
  clearFiltersButton: {
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#c62828',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#555',
  },
  error: { 
    color: 'red', 
    textAlign: 'center', 
    marginTop: 10,
    padding: 20, 
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noTransactions: { 
    textAlign: 'center', 
    fontSize: 16, 
    color: '#555',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  transactionItem: {
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  category: { 
    fontSize: 16, 
    fontWeight: 'bold',
    color: '#333',
  },
  amount: { 
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
  },
  notes: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  date: { 
    fontSize: 14, 
    color: '#888',
  },
  paymentMethod: {
    fontSize: 14,
    color: '#888',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#555',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  dateInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
  },
  dateText: {
    color: '#333',
  },
  datePlaceholder: {
    color: '#aaa',
  },
  dateRangeSeparator: {
    marginHorizontal: 10,
    color: '#555',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#555',
  },
  resetButton: {
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#ffe0b2',
  },
  resetButtonText: {
    color: '#f57c00',
  },
  applyButton: {
    backgroundColor: '#007bff',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  viewButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#e0f7fa',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  viewButtonText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  extraDetails: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  extraText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
  },
  
});