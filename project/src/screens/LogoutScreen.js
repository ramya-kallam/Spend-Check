import { View, Text, Modal, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import React, { useState } from 'react';
import auth from '@react-native-firebase/auth';

const LogoutScreen = ({ navigation }) => {
  const [modalVisible, setModalVisible] = useState(true);

  const toggleModal = () => {
    setModalVisible(!modalVisible);
  };

  const onLogout = () => {
    auth()
      .signOut()
      .then(() => {
        Alert.alert('User signed out!');
        navigation.navigate('Login'); 
      })
      .catch(error => {
        console.log('error :', error);
        Alert.alert('Not able to logout!');
      });
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={toggleModal}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Do you want to logout?</Text>

          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setModalVisible(false); navigation.navigate('Home'); }} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>No, go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dark overlay
  },
  modalContent: {
    backgroundColor: '#007acc',  // Same as your container background
    width: '80%',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  logoutButton: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: '#cce0ff',  
    alignItems: 'center',
    borderRadius: 5,
    marginBottom: 10,
  },
  logoutText: {
    fontSize: 18,
    color: '#000',  
    fontWeight: 'bold',
  },
  closeButton: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: '#cce0ff', 
    alignItems: 'center',
    borderRadius: 5,
  },
  closeButtonText: {
    fontSize: 16,
    color: 'black',
    fontWeight: 'bold',
  },
});

export default LogoutScreen;
