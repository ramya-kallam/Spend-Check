// // import firebase from '@react-native-firebase/app';
// // import '@react-native-firebase/auth';
// // import { getAuth } from 'firebase/auth';
// // import { initializeApp } from "firebase/app";

// // const firebaseConfig = {
// //     apiKey: "AIzaSyDZVfbNiewG9r7LOgC6u6SqWIfxknaSanU",
// //     authDomain: "spendcheck-c5952.firebaseapp.com",
// //     projectId: "spendcheck-c5952",
// //     storageBucket: "spendcheck-c5952.firebasestorage.app",
// //     messagingSenderId: "52425531221",
// //     appId: "1:52425531221:android:0a0d9ae76051a0b0dd19dc",
// // };

// // // const firebaseConfig = {
// // //     apiKey: "AIzaSyBRUHTgzCLA0D1YhfVXDxSHuMu9YgievBo",
// // //     authDomain: "spendcheck-c5952.firebaseapp.com",
// // //     projectId: "spendcheck-c5952",
// // //     storageBucket: "spendcheck-c5952.firebasestorage.app",
// // //     messagingSenderId: "52425531221",
// // //     appId: "1:52425531221:web:fd629c289919f3fadd19dc",
// // //     measurementId: "G-G7LGQEG71B"
// // //   };
// // // if (!firebase.apps.length) {
// // //     firebase.initializeApp(firebaseConfig);
// // // }


// // // const app = initializeApp(firebaseConfig);

// // // export default firebase;

// // const app = initializeApp(firebaseConfig);

// // export default app;


// // firebase.js
// import { initializeApp } from 'firebase/app';
// import { getAuth } from 'firebase/auth';

// // Your Firebase config
// const firebaseConfig = {
//         apiKey: "AIzaSyDZVfbNiewG9r7LOgC6u6SqWIfxknaSanU",
//         authDomain: "spendcheck-c5952.firebaseapp.com",
//         projectId: "spendcheck-c5952",
//         storageBucket: "spendcheck-c5952.firebasestorage.app",
//         messagingSenderId: "52425531221",
//         appId: "1:52425531221:android:0a0d9ae76051a0b0dd19dc",
//     };

// // Initialize Firebase app
// const app = initializeApp(firebaseConfig);

// // Initialize Firebase Auth
// const auth = getAuth(app);

// export { auth };

import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';

export { firebase, auth };