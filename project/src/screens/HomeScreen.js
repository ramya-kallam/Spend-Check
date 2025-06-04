import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Appbar } from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { getTransactions } from '../api';
import auth from '@react-native-firebase/auth';

export default function Dashboard({ navigation }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);
  const [username, setUsername] = useState('');

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) throw new Error('User not logged in');
      setUsername(currentUser.displayName || 'User');

      const transactions = await getTransactions(currentUser.uid);
      const total = transactions.reduce((sum, t) => sum + t.amount, 0);
      setTotalSpent(total);
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header with Menu Icon */}
      <Appbar.Header style={styles.appBar}>
        <Appbar.Action 
          icon={props => <MaterialIcons name="menu" size={24} color="white" />}
          onPress={() => setModalVisible(true)}
        />
        <Appbar.Content title="SpendCheck" titleStyle={{ color: 'white', fontWeight: 'bold', fontSize:30 }} />
      </Appbar.Header>

      {/* Modal Menu */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Menu</Text>
            <TouchableOpacity onPress={() => { setModalVisible(false); navigation.navigate('AddTransaction'); }}>
              <Text style={styles.menuItem}>Add Transaction</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setModalVisible(false); navigation.navigate('ViewTransactions'); }}>
              <Text style={styles.menuItem}>View Transactions</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setModalVisible(false); navigation.navigate('CategoryAnalysis'); }}>
              <Text style={styles.menuItem}>Spending by Category</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {setModalVisible(false); navigation.navigate('SetBudget') }}>
              <Text style={styles.menuItem}>Set Budget</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {setModalVisible(false); navigation.navigate('Notification')}}>
              <Text style={styles.menuItem}>Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setModalVisible(false); navigation.navigate('Profile'); }}>
              <Text style={styles.menuItem}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setModalVisible(false); navigation.navigate('Logout'); }}>
              <Text style={styles.menuItem}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Main Content */}
      <View style={styles.container}>
        <Text style={styles.welcomeText}>Welcome, {username}!</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Total Money Spent</Text>
          <Text style={styles.amount}>₹{totalSpent.toFixed(2)}</Text>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('ViewTransactions')}>
            <Text style={styles.actionText}>View Transactions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('SetBudget')}>
            <Text style={styles.actionText}>Set Budget Goals</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#00509e', // Dark blue for bg
  },
  appBar: {
    backgroundColor: '#007acc', // Med blue
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#007acc', // Med blue
    padding: 20,
    borderRadius: 10,
    width: '90%',
    alignItems: 'center',
    marginBottom: 30,
  },
  cardTitle: {
    fontSize: 18,
    color: 'white',
  },
  amount: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: '#cce0ff', // light blue for buttons
    padding: 15,
    borderRadius: 10,
    width: '90%',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-start', // Align modal at top
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    paddingTop: 50,
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#F5F5F5', // Light Gray for neutral modal
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  menuItem: {
    fontSize: 18,
    color: '#333',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    width: '100%',
    textAlign: 'center',
  },
  closeButton: {
    fontSize: 18,
    color: '#007acc', // Muted Blue for interactive elements
    paddingTop: 20,
    textAlign: 'center',
  },
});

