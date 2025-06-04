import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore'; // or your existing Firestore import

const EditTransactionScreen = ({ route, navigation }) => {
  const { transaction } = route.params;
  const [amount, setAmount] = useState(String(transaction.amount));
  const [category, setCategory] = useState(transaction.bill?.category || '');
  const [transactionType, setTransactionType] = useState(transaction.bill?.transactionType || '');
  const [notes, setNotes] = useState(transaction.notes || '');
  const [date, setDate] = useState(transaction.bill?.date?.seconds ? new Date(transaction.bill.date.seconds * 1000).toISOString().split('T')[0] : '');

  const handleSave = async () => {
    try {
      const docRef = firestore().collection('users')
        .doc(transaction.userId) 
        .collection('transactions')
        .doc(transaction.id); 

      const updatedData = {
        amount: parseFloat(amount),
        notes,
        bill: {
          ...transaction.bill,
          category,
          transactionType,
          date: new Date(date), 
        },
      };

      await docRef.update(updatedData);
      Alert.alert('Success', 'Transaction updated successfully!');
      navigation.goBack(); 
    } catch (error) {
      console.error('Error updating transaction:', error);
      Alert.alert('Error', 'Failed to update transaction');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Amount</Text>
      <TextInput value={amount} onChangeText={setAmount} keyboardType="numeric" style={styles.input} />

      <Text style={styles.label}>Category</Text>
      <TextInput value={category} onChangeText={setCategory} style={styles.input} />

      <Text style={styles.label}>Transaction Type</Text>
      <TextInput value={transactionType} onChangeText={setTransactionType} style={styles.input} />

      <Text style={styles.label}>Notes</Text>
      <TextInput value={notes} onChangeText={setNotes} style={styles.input} />

      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput value={date} onChangeText={setDate} style={styles.input} />

      <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
};

export default EditTransactionScreen;

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  label: {
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#28a745',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
