
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DatePicker from 'react-native-date-picker';
import auth from '@react-native-firebase/auth';
import { addTransaction } from '../api';
import { pick } from '@react-native-documents/picker';
import * as ImagePicker from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { launchCamera } from 'react-native-image-picker';
import { PermissionsAndroid, Platform } from 'react-native';
import VoiceInput from './VoiceInput';
import { uploadBillToServer, extractTransactionFromFile } from '../api';

export default function AddTransaction() {
  const navigation = useNavigation();
  
  const [transactionType, setTransactionType] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [date, setDate] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [billFile, setBillFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [billUrl, setBillUrl] = useState(null);
  const [description, setDescription] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  const finalCategory = category === 'Custom' ? customCategory : category;

  const predefinedCategories = [
    'Food & Dining', 'Transportation', 'Housing & Utilities', 'Shopping', 'Entertainment',
    'Health & Fitness', 'Education', 'Personal Care', 'Travel', 'Finance & Investment',
    'Gifts & Donations', 'Miscellaneous','custom'
  ];

  const paymentMethods = [
    'Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Other'
  ];

  const pickImage = async () => {
    console.log("Hi");
    try {
      const result = await ImagePicker.launchImageLibrary({
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 2000,
        maxWidth: 2000,
      });
  
      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Error', result.errorMessage);
        return;
      }
  
      if (result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setBillFile({
          uri: selectedImage.uri,
          name: selectedImage.fileName || `image_${Date.now()}.jpg`,
          type: selectedImage.type,
          size: selectedImage.fileSize,
        });
  
        // Call upload function
        const uploadedUrl = await uploadBillToCloudinary(selectedImage);
        console.log(uploadedUrl);
        if (uploadedUrl) setBillUrl(uploadedUrl);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };  

  
const requestCameraPermission = async () => {
  if (Platform.OS === "android") {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: "Camera Permission",
          message: "App needs access to your camera to take pictures.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn("Permission Error:", err);
      return false;
    }
  }
  return true; // iOS handles permissions automatically
};

const openCameraAndUpload = async () => {
  try {
    console.log("Requesting camera permission...");
    const hasPermission = await requestCameraPermission();

    if (!hasPermission) {
      Alert.alert("Permission Denied", "Camera permission is required.");
      return;
    }

    console.log("Opening camera...");

    const options = {
      mediaType: "photo",
      quality: 0.8,
      saveToPhotos: true,
    };

    const result = await launchCamera(options);

    if (result.didCancel) {
      console.log("User cancelled camera");
      return;
    }

    if (result.errorCode) {
      console.error("Camera Error:", result.errorMessage);
      Alert.alert("Error", "Failed to open camera.");
      return;
    }

    if (!result.assets || result.assets.length === 0) {
      console.log("No image captured");
      return;
    }

    const capturedImage = result.assets[0];

    console.log("Captured Image:", capturedImage);

    setBillFile({
      uri: capturedImage.uri,
      name: capturedImage.fileName || `image_${Date.now()}.jpg`,
      type: capturedImage.type || "image/jpeg",
      size: capturedImage.fileSize,
    });

    // Upload to Cloudinary
    const uploadedUrl = await uploadBillToCloudinary(capturedImage, "jpg");
    if (uploadedUrl) setBillUrl(uploadedUrl);
  } catch (error) {
    console.error("Error capturing image:", error);
    Alert.alert("Error", "Failed to capture image. Please try again.");
  }
};


  const pickDocument = async () => {
    try {
      console.log("Opening document picker...");
      const [pickResult] = await pick({
        mode: "import",
        allowedTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg"],
      });
      
      // Check if we have a valid result
      if (!pickResult) {
        console.log("No document selected");
        return;
      }
      
      console.log("Full pick result:", pickResult); // Log the entire object to see what's available
      
      // Determine MIME type from file extension if mimeType is undefined
      let fileType = "";
      let mimeType = pickResult.mimeType;
      
      // If mimeType is undefined, try to determine from file name
      if (!mimeType && pickResult.name) {
        const extension = pickResult.name.split('.').pop().toLowerCase();
        console.log(extension)
        if (extension === 'pdf') {
          mimeType = 'application/pdf';
        } else if (extension === 'jpg' || extension === 'jpeg') {
          mimeType = 'image/jpeg';
        } else if (extension === 'png') {
          mimeType = 'image/png';
        }
      }
      
      console.log("Determined MIME type:", mimeType);
      
      // Now determine file type based on MIME type
      if (mimeType === "application/pdf") {
        fileType = "pdf";
      } else if (mimeType === "image/jpeg") {
        fileType = "jpeg";
      } else if (mimeType === "image/png") {
        fileType = "png";
      } else if (mimeType === "image/jpg") {
        fileType = "jpg";
      } else {
        Alert.alert("Error", "Unsupported file type selected.");
        return;
      }
  
      setBillFile({
        uri: pickResult.uri,
        name: pickResult.name,
        type: mimeType, // Use our determined MIME type
        size: pickResult.size,
      });
  
      console.log("Picked document:", pickResult);
  
      // Call upload function & pass file type
      const uploadedUrl = await uploadBillToCloudinary(pickResult, fileType);
      if (uploadedUrl) setBillUrl(uploadedUrl);
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Error", "Failed to pick document. Please try again.");
    }
  };

  const removeBillFile = () => {
    setBillFile(null);
    setUploadProgress(0);
  };

  const uploadBillToCloudinary = async (file, fileType) => {
    if (!file) return null;
  
    try {
      setUploadProgress(10);
      const data = await uploadBillToServer(file);
  
      if (data.success) {
        setUploadProgress(100);
        setBillUrl(data.url);
        console.log(data.url);
  
        const extractionResult = await extractTransactionFromFile(data.url, fileType);
  
        if (extractionResult.success) {
          setTransactionType(extractionResult.transactionType);
          setAmount(extractionResult.amount?.toString() || '');
          if (extractionResult.transactionType === 'Expense') {
            setCategory(extractionResult.category || '');
          }
          Alert.alert('Success', 'Transaction details extracted successfully!');
        } else {
          Alert.alert('Error', 'Failed to extract details from the file.');
        }
  
        return data.url;
      } else {
        Alert.alert("Error", "Failed to upload file.");
        return null;
      }
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "Something went wrong.");
      return null;
    }
  };
  
  const handleAddTransaction = async () => {
    console.log("Adding transaction...");
  
    if (!amount || isNaN(amount) || !transactionType) {
      Alert.alert('Error', 'Please enter a valid amount and select a transaction type.');
      return;
    }
  
    if (transactionType === 'Expense' && !category.trim()) {
      Alert.alert('Error', 'Please select a category for the expense.');
      return;
    }
  
    try {
      setIsLoading(true);
  
      const currentUser = auth().currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to add transactions.');
        return;
      }
  
      const userId = currentUser.uid;
      const transactionId = `transaction_${Date.now()}`;
  
      
  
      // Create transaction object
      const transactionData = {
        id: transactionId,
        amount: parseFloat(amount),
        transactionType,
        category: transactionType === 'Expense' ? category : null,
        paymentMethod: transactionType === 'Expense' ? paymentMethod : null,
        date: date.toISOString(),
        notes: notes.trim() || null,
        createdAt: new Date().toISOString(),
        bill: billUrl ? { url: billUrl, uploadedAt: new Date().toISOString() } : null,
      };
  
      console.log("Transaction Data:", transactionData);
      
      await addTransaction(userId, transactionData);
  
      Alert.alert('Success', 'Transaction added successfully!');
      navigation.navigate('Home');
  
      // Reset form fields
      setAmount('');
      setTransactionType('');
      setCategory('');
      setNotes('');
      setPaymentMethod('');
      setDate(new Date());
      setBillFile(null);
      setUploadProgress(0);
  
      navigation.navigate('AddTransaction');
    } catch (error) {
      console.error('Error adding transaction:', error);
      Alert.alert('Error', 'Failed to add transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Add Transaction</Text>

      <Text style={styles.label}>Transaction Type</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={transactionType}
          onValueChange={(itemValue) => {
            setTransactionType(itemValue);
            if (itemValue === 'Income') {
              setCategory('');
              setPaymentMethod('');
            }
          }}
          style={[styles.picker, {color: 'black'}]}
        >
          <Picker.Item label="Select type" value="" />
          <Picker.Item label="Expense" value="Expense" />
          <Picker.Item label="Income" value="Income" />
        </Picker>
      </View>

      <Text style={styles.label}>Amount (₹)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="Enter amount"
        value={amount}
        onChangeText={setAmount}
      />

      {transactionType === 'Expense' && (
        <>
          <Text style={styles.label}>Category</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={category}
              onValueChange={(itemValue) => setCategory(itemValue)}
              style={[styles.picker, { color: 'black' }]}
            >
              <Picker.Item label="Select a category" value="" />
              {predefinedCategories.map((cat, index) => (
                <Picker.Item key={index} label={cat} value={cat} />
              ))}
            </Picker>
          </View>

          {category === 'Custom' && (
            <TextInput
              style={styles.input}
              placeholder="Enter custom category"
              value={customCategory}
              onChangeText={setCustomCategory}
            />
          )}
        </>
      )}


      <Text style={styles.label}>Transaction Date</Text>
      <TouchableOpacity onPress={() => setOpen(true)} style={styles.dateButton}>
        <Text style={styles.dateText}>{date.toDateString()}</Text>
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

      {transactionType === 'Expense' && (
        <>
          <Text style={styles.label}>Payment Method</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={paymentMethod}
              onValueChange={(itemValue) => setPaymentMethod(itemValue)}
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
        placeholder="Add notes about this transaction"
        value={notes}
        onChangeText={setNotes}
        multiline
      />
      <View>
        <VoiceInput
          onVoiceParsed={(parsed) => {
            if (parsed.success) {
              console.log(parsed.category)
              setTransactionType(parsed.transaction_type);
              setAmount(parsed.amount.toString());
              setCategory(parsed.category || '');
            }
          }}
        />
      </View>
      {/* Bill Upload Section */}
      <Text></Text>
      <Text style={styles.label}>Upload Bill (Optional)</Text>
      <View style={styles.uploadContainer}>
        <TouchableOpacity style={styles.uploadButton} onPress={openCameraAndUpload}>
          <Text style={styles.uploadButtonText}>Upload Image</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
          <Text style={styles.uploadButtonText}>Upload PDF</Text>
        </TouchableOpacity>
      </View>
      {billUrl && (
        <Text style={styles.uploadedText}>Uploaded URL: {billUrl}</Text>
      )}

      {billFile && (
        <View style={styles.filePreviewContainer}>
          <View style={styles.fileInfoContainer}>
            <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
              {billFile.name}
            </Text>
            <Text style={styles.fileSize}>
              {(billFile.size / 1024).toFixed(2)} KB
            </Text>
          </View>
          
          {billFile.type?.includes('image') && (
            <Image source={{ uri: billFile.uri }} style={styles.imagePreview} />
          )}
          
          {billFile.type?.includes('pdf') && (
            <View style={styles.pdfPreview}>
              <Text style={styles.pdfText}>PDF Document</Text>
            </View>
          )}
          
          {uploadProgress > 0 && uploadProgress < 100 && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
              <Text style={styles.progressText}>{Math.round(uploadProgress)}%</Text>
            </View>
          )}
          
          <TouchableOpacity style={styles.removeButton} onPress={removeBillFile}>
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.addButton, isLoading && styles.disabledButton]} 
        onPress={handleAddTransaction}
        disabled={isLoading}
      >
        <Text style={styles.addButtonText}>
          {isLoading ? 'Adding...' : 'Add Transaction'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#00509e',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  picker: {
    height: 50,
    width: '100%',
    backgroundColor: '#fff',
    padding: 15,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  uploadContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  uploadButton: {
    backgroundColor: '#cce0ff',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    flex: 0.48,
  },
  uploadButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  filePreviewContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  fileInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  fileName: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 5,
    marginBottom: 10,
    resizeMode: 'cover',
  },
  pdfPreview: {
    width: '100%',
    height: 100,
    borderRadius: 5,
    backgroundColor: '#f2f2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  pdfText: {
    fontSize: 18,
    color: '#666',
  },
  progressContainer: {
    height: 20,
    borderRadius: 5,
    backgroundColor: '#f2f2f2',
    marginVertical: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007bff',
  },
  progressText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 12,
    color: '#333',
  },
  removeButton: {
    backgroundColor: '#dc3545',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#cce0ff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  addButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});