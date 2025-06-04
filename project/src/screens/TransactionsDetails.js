import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ScrollView, Modal, ActivityIndicator, TextInput
} from 'react-native';
import { WebView } from 'react-native-webview';
import firestore from '@react-native-firebase/firestore';
import { format } from 'date-fns';
import { Picker } from '@react-native-picker/picker';
import DatePicker from 'react-native-date-picker';
import auth from '@react-native-firebase/auth';

const TransactionDetailsScreen = ({ route }) => {
  const { transaction } = route.params;
  const bill = transaction.bill || {};
  const currentUserId = auth().currentUser.uid;


  const [showFullFile, setShowFullFile] = useState(false);
  const [isFilePDF, setIsFilePDF] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [billType, setBillType] = useState('Unknown file type');

  const [amount, setAmount] = useState(String(transaction.amount));
  const [category, setCategory] = useState(transaction.category || '');
  const [notes, setNotes] = useState(transaction.notes || '');
  const [paymentMethod, setPaymentMethod] = useState(transaction.paymentMethod || '');
  const [open, setOpen] = useState(false);

  const initialDate = transaction.date ? new Date(transaction.date) : new Date();
  const [date, setDate] = useState(initialDate);

  const predefinedCategories = [
    'Food & Dining', 'Transportation', 'Housing & Utilities', 'Shopping', 'Entertainment',
    'Health & Fitness', 'Education', 'Personal Care', 'Travel', 'Finance & Investment',
    'Gifts & Donations', 'Miscellaneous'
  ];

  const paymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Others'];

  useEffect(() => {
    if (bill.url) {
      checkFileType(bill.url);
    }
  }, [bill.url]);

  const checkFileType = async (url) => {
    try {
      setIsLoading(true);
      const response = await fetch(url, { method: 'HEAD' });
      let contentType = response.headers.get('Content-Type');

      if (!contentType || contentType === 'application/octet-stream') {
        const lowerUrl = url.toLowerCase();
        if (
          lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || lowerUrl.includes('.png') ||
          lowerUrl.includes('.gif') || lowerUrl.includes('.webp') || lowerUrl.includes('/image/')
        ) {
          contentType = 'image';
        } else {
          contentType = 'application/pdf';
        }
      }
      
      console.log(contentType)
      const isPDF = !contentType?.includes('image');
      setIsFilePDF(isPDF);
      setBillType(isPDF ? 'PDF Document' : 'Image File');
    } catch (error) {
      const lowerUrl = url.toLowerCase();
      if (
        lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') ||
        lowerUrl.includes('.png') || lowerUrl.includes('.gif') ||
        lowerUrl.includes('.webp')
      ) {
        setIsFilePDF(false);
        setBillType('Image File');
      } else {
        setIsFilePDF(true);
        setBillType('PDF Document');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      console.log("hello")
      console.log('User ID:', transaction.userId);
      console.log('Transaction ID:', transaction.id);

      const docRef = firestore()
        .collection('users')
        .doc(currentUserId)
        .collection('transactions')
        .doc(transaction.id);

      const updatedData = {
        amount: parseFloat(amount),
        category,
        notes,
        paymentMethod,
        date: date.toISOString(),
      };

      console.log(updatedData)
      await docRef.update(updatedData);
      console.log(firestore()
      .collection('users')
      .doc(currentUserId)
      .collection('transactions')
      .doc(transaction.id))
      alert('Changes saved successfully!');
    } catch (err) {
      console.error('Update failed:', err);
      alert('Failed to save changes');
    }
  };

  const renderFilePreview = () => {
    if (!bill.url) return <Text style={styles.label}>No Bill Uploaded</Text>;

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Determining file type...</Text>
        </View>
      );
    }

    return (
      <>
        <Text style={styles.label}>Bill:</Text>
        <TouchableOpacity onPress={() => setShowFullFile(true)}>
          {isFilePDF ? (
            <View style={styles.pdfPreviewContainer}>
              <Text style={styles.pdfPreviewText}>PDF Document</Text>
              <Text style={styles.viewFullText}>Tap to view</Text>
            </View>
          ) : (
            <>
              <Image source={{ uri: bill.url }} style={styles.image} />
              <Text style={styles.viewFullText}>Tap to view full image</Text>
              <Text style={styles.viewFullText}>{billType}</Text>
            </>
          )}
        </TouchableOpacity>
      </>
    );
  };

  const renderFullFileModal = () => (
    <Modal animationType="fade" transparent={true} visible={showFullFile} onRequestClose={() => setShowFullFile(false)}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {isFilePDF ? (
            <WebView
              source={{ uri: bill.url }}
              style={styles.fullPdf}
              startInLoadingState={true}
              renderLoading={() => <ActivityIndicator color="#007bff" size="large" style={styles.webViewLoader} />}
            />
          ) : (
            <Image source={{ uri: bill.url }} style={styles.fullImage} resizeMode="contain" />
          )}
          <TouchableOpacity style={styles.closeButton} onPress={() => setShowFullFile(false)}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Transaction Details</Text>

      <Text style={styles.label}>Transaction Type</Text>
      <View style={styles.disabledPickerContainer}>
        <Text style={styles.disabledPickerText}>{transaction.transactionType}</Text>
      </View>

      <Text style={styles.label}>Amount (₹)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      {transaction.transactionType === 'Expense' && (
        <>
          <Text style={styles.label}>Category</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={category}
              onValueChange={setCategory}
              style={styles.picker}
            >
              <Picker.Item label="Select a category" value="" />
              {predefinedCategories.map((cat, index) => (
                <Picker.Item key={index} label={cat} value={cat} />
              ))}
            </Picker>
          </View>
        </>
      )}

      <Text style={styles.label}>Transaction Date</Text>
      <TouchableOpacity onPress={() => setOpen(true)} style={styles.dateButton}>
        <Text style={styles.dateText}>{format(date, 'MMMM d, yyyy')}</Text>
      </TouchableOpacity>
      <DatePicker
        modal
        open={open}
        date={date}
        mode="date"
        onConfirm={(selectedDate) => {
          setOpen(false);
          setDate(selectedDate);
        }}
        onCancel={() => setOpen(false)}
      />

      {transaction.transactionType === 'Expense' && (
        <>
          <Text style={styles.label}>Payment Method</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={paymentMethod}
              onValueChange={setPaymentMethod}
              style={styles.picker}
            >
              <Picker.Item label="Select payment method" value="" />
              {paymentMethods.map((method, index) => (
                <Picker.Item key={index} label={method} value={method} />
              ))}
            </Picker>
          </View>
        </>
      )}

      <Text style={styles.label}>Notes (Optional)</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        placeholder="Add notes"
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      {renderFilePreview()}
      {renderFullFileModal()}

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontWeight: '600', fontSize: 16, marginBottom: 5 },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 10,
    padding: 10, fontSize: 16, marginBottom: 15, backgroundColor: '#fff',
  },
  notesInput: { height: 80 },
  disabledPickerContainer: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 10,
    backgroundColor: '#eee', padding: 10, marginBottom: 15,
  },
  disabledPickerText: { fontSize: 16, color: '#555' },
  pickerContainer: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 10,
    backgroundColor: '#fff', marginBottom: 15,
  },
  dateButton: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 10,
    padding: 10, alignItems: 'center', backgroundColor: '#fff', marginBottom: 15,
  },
  dateText: { fontSize: 16 },
  loadingContainer: {
    height: 200, justifyContent: 'center', alignItems: 'center', marginVertical: 12,
  },
  loadingText: { marginTop: 10, color: '#007bff' },
  image: { width: '100%', height: 200, borderRadius: 8, marginVertical: 12 },
  pdfPreviewContainer: {
    width: '100%', height: 200, backgroundColor: '#f0f0f0', borderRadius: 8,
    marginVertical: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd',
  },
  pdfPreviewText: { fontSize: 18, fontWeight: 'bold' },
  viewFullText: { textAlign: 'center', color: '#007bff', marginBottom: 12 },
  saveButton: {
    backgroundColor: '#28a745', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 20,
  },
  saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  modalContainer: {
    flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center',
  },
  modalContent: {
    width: '90%', height: '80%', backgroundColor: 'white',
    borderRadius: 10, padding: 15, alignItems: 'center',
  },
  fullImage: { width: '100%', height: '90%', borderRadius: 5 },
  fullPdf: { flex: 1, width: '100%', height: '90%' },
  webViewLoader: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  closeButton: {
    backgroundColor: '#007bff', paddingVertical: 10,
    paddingHorizontal: 20, borderRadius: 8, marginTop: 10,
  },
  closeButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

export default TransactionDetailsScreen;
