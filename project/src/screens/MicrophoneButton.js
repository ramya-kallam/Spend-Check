import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons'; // or use 'react-native-vector-icons/MaterialIcons'

export const MicrophoneButton = ({ disabled, handleButtonPressed, handleButtonReleased }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        disabled={disabled}
        style={[styles.button, disabled && styles.disabled]}
        onPressIn={handleButtonPressed}
        onPressOut={handleButtonReleased}
      >
        <MaterialIcons name="mic" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 16,
  },
  button: {
    backgroundColor: '#6200ee',
    padding: 16,
    borderRadius: 50,
  },
  disabled: {
    backgroundColor: '#aaa',
  },
});
