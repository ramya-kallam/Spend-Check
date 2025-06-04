import {View, Button, StyleSheet} from 'react-native';
import React from 'react';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {WEBCLIENTID} from '../utils/constant';
import auth from '@react-native-firebase/auth';

const GoogleLogin = () => {
  GoogleSignin.configure({
    webClientId: WEBCLIENTID,
  });

  const onGoogleSignin = async () => {
    await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
    const {idToken} = await GoogleSignin.signIn();
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);
    return auth().signInWithCredential(googleCredential);
  };

  return (
    <View style={styles.container}>
      <Button title="Google Sign in" onPress={onGoogleSignin} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 20,
  },
});

export default GoogleLogin;