import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from './AuthContext';

const AuthExample: React.FC = () => {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Handle sign in
  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    
    setIsLoggingIn(true);
    const result = await signIn(email, password);
    setIsLoggingIn(false);
    
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to sign in');
    }
  };

  // Handle sign up
  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    
    setIsLoggingIn(true);
    const result = await signUp(email, password);
    setIsLoggingIn(false);
    
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to sign up');
    } else {
      Alert.alert('Success', 'Account created successfully');
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {user ? (
        // Logged in state
        <View style={styles.loggedInContainer}>
          <Text style={styles.welcomeText}>Welcome!</Text>
          <Text style={styles.emailText}>Logged in as: {user.email}</Text>
          <Button title="Sign Out" onPress={handleSignOut} />
        </View>
      ) : (
        // Logged out state
        <View style={styles.formContainer}>
          <Text style={styles.headerText}>Firebase Authentication</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <View style={styles.buttonContainer}>
            {isLoggingIn ? (
              <ActivityIndicator size="small" color="#0000ff" />
            ) : (
              <>
                <Button title="Sign In" onPress={handleSignIn} />
                <View style={styles.buttonSpacer} />
                <Button title="Sign Up" onPress={handleSignUp} />
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  buttonContainer: {
    marginTop: 16,
  },
  buttonSpacer: {
    height: 16,
  },
  loggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emailText: {
    fontSize: 16,
    marginBottom: 24,
  },
});

export default AuthExample;