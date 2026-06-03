const admin = require("firebase-admin");
const fetch = require("node-fetch");

// Firebase Admin initialization
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "sendfuture-adaa7"
  });
}
const db = admin.firestore();

// API Key direct code-e
const RESEND_API_KEY = "re_Y377Ah8u_7gfin2yU4uDY6e2GyYRBWJED"; 

exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers };

  try {
    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body);
      
      // Firestore-e data save kora
      await db.collection("letters").add({
        email: data.email,
        sendDate: data.sendDate,
        sendHour: String(data.sendHour).padStart(2, '0'),
        sendMinute: String(data.sendMinute).padStart(2, '0'),
        templateType: data.templateType,
        message: data.message,
        isSent: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: "Capsule stored!" })
      };
    }
    return { statusCode: 405, headers, body: "Method Not Allowed" };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
