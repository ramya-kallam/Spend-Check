import {TextInput, Button} from 'react-native';
import React, {useState} from 'react';

const OTPScreen = props => {
  const [code, setCode] = useState('');
  console.log('code :', code);

  async function confirmCode(confirm) {
    console.log('confirm :', confirm);
    try {
      await confirm.confirm(code);
    } catch (error) {
      console.log('Invalid code.');
    }
  }

  return (
    <>
      <TextInput
        style={{borderWidth: 1, marginBottom: 20}}
        value={code}
        onChangeText={text => setCode(text)}
      />
      <Button title="Confirm Code" onPress={() => confirmCode(props.confirm)} />
    </>
  );
};

export default OTPScreen;