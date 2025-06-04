
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import React, {useState, useEffect} from 'react';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons'; // Eye icon

const LoginScreen = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Toggle state

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(user => {
      if (user) {
        navigation.navigate('Home'); // Replace prevents going back to login
      }
    });

    return unsubscribe; // Cleanup on unmount
  }, []);

  const onLogin = () => {
    auth()
      .signInWithEmailAndPassword(email, password)
      .then(response => {
        Alert.alert('Login successful!');
        console.log('response :', response);
        navigation.navigate('Home'); // Use replace to prevent back navigation to login
      })
      .catch(error => {
        if (error.code === 'auth/wrong-password') {
          Alert.alert('Incorrect password!');
        } else if (error.code === 'auth/user-not-found') {
          Alert.alert('No account found with this email!');
        } else {
          Alert.alert('Login failed. Please try again.');
        }
        console.log('error :', error);
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.signup}>Login Screen</Text>

      {/* Email Input */}
      <TextInput
        placeholder="Email"
        style={styles.inputBox}
        value={email}
        onChangeText={value => setEmail(value)}
      />

      {/* Password Input with Eye Icon */}
      <View style={styles.passwordContainer}>
        <TextInput
          placeholder="Password"
          style={styles.inputBox}
          value={password}
          secureTextEntry={!showPassword} // Hide/Show password
          onChangeText={value => setPassword(value)}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}>
          <Icon name={showPassword ? 'visibility' : 'visibility-off'} size={24} color="black" />
        </TouchableOpacity>
      </View>

      {/* Login Button */}
      <TouchableOpacity onPress={onLogin} style={styles.register}>
        <Text style={styles.registerTitle}>Login</Text>
      </TouchableOpacity>

      {/* Redirect to Register */}
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.registerRedirectText}>New user? Register</Text>
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
    backgroundColor: '#007acc',
  },
  inputBox: {
    borderWidth: 1,
    borderColor: 'grey',
    paddingHorizontal: 12,
    borderRadius: 5,
    width: '90%',
    marginTop: 20,
    backgroundColor: '#fff',
    paddingRight: 40, // Space for eye icon
    color: "black"
  },
  passwordContainer: {
    width: '90%',
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 32,
  },
  register: {
    width: '90%',
    backgroundColor: '#cce0ff',
    padding: 12,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 40,
    color: "black"
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
  registerRedirectText: {
    marginTop: 15,
    color: 'black',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default LoginScreen;