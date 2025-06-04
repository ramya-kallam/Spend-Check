import React, { useEffect, useState } from 'react';
import { Button, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { startListening, stopListening, onSpeechResult } from '../../native/SpeechModuleBridge';
import { parseVoiceText } from '../api';

const VoiceInput = ({ onVoiceParsed }) => {
  const [speechText, setSpeechText] = useState('');
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    const subscription = onSpeechResult((text) => {
      setSpeechText(text);
      handleParsedText(text);
      setIsListening(false);
    });

    return () => {
      subscription.remove(); // cleanup
    };
  }, []);

  const handleParsedText = async (text) => {
    try {
      const parsed = await parseVoiceText(text);
      if (onVoiceParsed) {
        onVoiceParsed(parsed);
      }
    } catch (error) {
      console.error('Voice parsing failed:', error);
    }
  };
  
  const handleStart = () => {
    setSpeechText('');
    setIsListening(true);
    startListening();
  };

  const handleStop = () => {
    setIsListening(false);
    stopListening();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Expense via Voice</Text>

      <View style={styles.card}>
        <Text style={styles.label}>
          {speechText ? 'Recognized Text:' : 'Speak now to capture your expense...'}
        </Text>

        {isListening && (
          <ActivityIndicator size="large" color="#3f51b5" style={styles.loader} />
        )}

        <Text style={styles.speechText}>
          {speechText || (isListening ? 'Listening...' : '')}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <View style={styles.button}>
          <Button title="🎙️ Start Listening" onPress={handleStart} />
        </View>
        <View style={styles.button}>
          <Button title="✋ Stop Listening" onPress={handleStop}  />
        </View>
      </View>
    </View>
  );
};

export default VoiceInput;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f6f8fa',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
    color: '#555',
  },
  speechText: {
    fontSize: 18,
    color: '#111',
    fontWeight: '600',
    marginTop: 10,
  },
  loader: {
    marginTop: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: '#cce0ff',
  },
});
