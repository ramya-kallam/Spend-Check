import { View, TextInput, Button, StyleSheet, Alert } from 'react-native';
import React, { useState } from 'react';
import auth from '@react-native-firebase/auth';
import OTPScreen from './OTPScreen';

const PhoneSignIn = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [confirm, setConfirm] = useState(null);

  async function signInWithPhoneNumber() {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit phone number.');
      return;
    }
  
    try {
      const fullPhoneNumber = `+1${phoneNumber}`; 
      const confirmation = await auth().signInWithPhoneNumber(fullPhoneNumber);
      setConfirm(confirmation);
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
      console.error('Phone Sign-In Error:', error);
    }
  }  

  return (
    <View style={styles.container}>
      {confirm ? (
        <OTPScreen confirm={confirm} />
      ) : (
        <>
          <TextInput
            placeholder="Enter phone number"
            style={styles.input}
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
          <TouchableOpacity style={styles.otpButton}>
                  <Text style={styles.otpButtonText} onPress={signInWithPhoneNumber}>SEND OTP</Text>
                </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: 'grey',
    paddingHorizontal: 10,
    backgroundColor:'#fff',
    borderRadius: 5,
    width: '90%',
    marginBottom: 10,
  },
  otpButton: {
    backgroundColor: '#cce0ff',
    borderColor:"#007acc",
    borderWidth:2,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
    alignSelf: 'center',
  },
});

export default PhoneSignIn;

