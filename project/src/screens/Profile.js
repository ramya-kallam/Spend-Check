import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [updatedName, setUpdatedName] = useState('');
  const [updatedPhone, setUpdatedPhone] = useState('');

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await firestore().collection('users').doc(currentUser.uid).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            setUser({
              uid: currentUser.uid,
              name: userData.name || 'User',
              email: userData.email || 'No email',
              phone: userData.phone || 'No phone',
              photo: currentUser.photoURL || 'https://via.placeholder.com/100',
            });
            setUpdatedName(userData.name);
            setUpdatedPhone(userData.phone);
          }
        } catch (error) {
          console.error('Error fetching user details:', error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateProfile = async () => {
    if (!updatedName.trim() || !/^[0-9]{10}$/.test(updatedPhone)) {
      Alert.alert('Error', 'Please enter a valid name and 10-digit phone number.');
      return;
    }

    try {
      await firestore().collection('users').doc(user.uid).update({
        name: updatedName,
        phone: updatedPhone,
      });

      await auth().currentUser.updateProfile({
        displayName: updatedName,
      });

      setUser((prev) => ({ ...prev, name: updatedName, phone: updatedPhone }));
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile.');
    }
  };

  if (!user) return <Text style={styles.loading}>Loading...</Text>;

  return (
    <View style={styles.container}>
      {/* Profile Picture & Basic Info */}
      <View style={styles.profileHeader}>
        <Image source={{ uri: user.photo }} style={styles.profilePic} />
        <View style={styles.userInfo}>
          {editing ? (
            <>
              <TextInput
                style={styles.input}
                value={updatedName}
                onChangeText={setUpdatedName}
                placeholder="Full Name"
              />
              <TextInput
                style={styles.input}
                value={updatedPhone}
                onChangeText={setUpdatedPhone}
                keyboardType="phone-pad"
                placeholder="Phone Number"
              />
            </>
          ) : (
            <>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.email}>{user.email}</Text>
              <Text style={styles.phone}>📞 {user.phone}</Text>
            </>
          )}
        </View>
      </View>

      {/* User Details Section */}
      <View style={styles.detailsContainer}>
        <Text style={styles.detailsTitle}>User Details</Text>
        <Text style={styles.detailText}>📧 Email: {user.email}</Text>
        <Text style={styles.detailText}>📞 Phone: {user.phone}</Text>
        <Text style={styles.detailText}>🔹 Member since: {new Date().toDateString()}</Text>
      </View>

      {/* Edit Button */}
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => (editing ? handleUpdateProfile() : setEditing(true))}
      >
        <Text style={styles.editButtonText}>{editing ? 'Save Changes' : 'Edit Profile'}</Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#00509e', // Dark blue background for consistency
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#007acc', // Medium blue for separation
    marginBottom: 20,
  },
  profilePic: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#cce0ff', // Light blue placeholder
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'black',
  },
  email: {
    fontSize: 16,
    color: '#00509e', 
    marginTop: 5,
  },
  phone: {
    fontSize: 16,
    color: '#00509e',
    marginTop: 5,
  },
  detailsContainer: {
    marginTop: 10,
    paddingVertical: 15,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 10,
  },
  detailText: {
    fontSize: 16,
    color: '#007acc', // Light blue text
    marginBottom: 5,
  },
  editButton: {
    marginTop: 20,
    backgroundColor: '#007acc', // Medium blue for button
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cce0ff', // Light blue border
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
    color: '#333',
    width: '100%',
  },
  loading: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
    color: 'white',
  },
});
