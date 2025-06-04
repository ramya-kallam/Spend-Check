import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Alert,
  } from 'react-native';
  import React, {useState} from 'react';
  import auth from '@react-native-firebase/auth';
  
  const SignUpScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
  
    const onRegister = () => {
      auth()
        .createUserWithEmailAndPassword(email, password)
        .then(() => {
          Alert.alert('User account created!');
        })
        .catch(error => {
          if (error.code === 'auth/email-already-in-use') {
            Alert.alert('That email address is already in use!');
          }
          if (error.code === 'auth/invalid-email') {
            Alert.alert('That email address is invalid!');
          }
          // Alert.alert(`${error}`);
        });
    };
  
    return (
      <View style={styles.container}>
        <Text style={styles.signup}>Sign Up Screen</Text>
        <TextInput
          placeholder="Email"
          style={styles.inputBox}
          value={email}
          onChangeText={value => setEmail(value)}
        />
        <TextInput
          placeholder="Password"
          style={styles.inputBox}
          value={password}
          onChangeText={value => setPassword(value)}
        />
        <TouchableOpacity onPress={onRegister} style={styles.register}>
          <Text style={styles.registerTitle}>Register</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  const styles = StyleSheet.create({
    container: {
      padding: 16,
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
    },
    inputBox: {
      borderWidth: 1,
      borderColor: 'grey',
      paddingHorizontal: 12,
      borderRadius: 5,
      width: '90%',
      marginTop: 20,
    },
    register: {
      width: '90%',
      backgroundColor: '#FCAF03',
      padding: 12,
      borderRadius: 30,
      alignItems: 'center',
      marginTop: 40,
    },
    registerTitle: {
      fontSize: 16,
      color: '#000000',
      fontWeight: '600',
    },
    signup: {
      fontSize: 20,
      color: '#000000',
      fontWeight: '600',
      marginBottom: 80,
    },
  });
  
  export default SignUpScreen;