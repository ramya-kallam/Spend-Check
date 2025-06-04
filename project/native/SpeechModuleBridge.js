import { NativeModules, NativeEventEmitter } from 'react-native';

const { SpeechModule } = NativeModules;

const speechEvents = new NativeEventEmitter(SpeechModule);

export const startListening = () => SpeechModule.startListening();
export const stopListening = () => SpeechModule.stopListening();

export const onSpeechResult = (callback) => {
  return speechEvents.addListener('onSpeechResult', callback);
};
