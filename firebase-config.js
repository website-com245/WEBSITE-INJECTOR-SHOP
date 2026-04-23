// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBikwOco-WFuucTCKQR2a15V_wVXha5Y1Y",
    authDomain: "website-857ee.firebaseapp.com",
    databaseURL: "https://website-857ee-default-rtdb.firebaseio.com/",
    projectId: "website-857ee"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();