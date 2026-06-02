import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA6kHlmaspoUf3PqZNy7w85OPxsAK6AbZ8",
  authDomain: "sendfuture-adaa7.firebaseapp.com",
  projectId: "sendfuture-adaa7",
  storageBucket: "sendfuture-adaa7.firebasestorage.app",
  messagingSenderId: "284618017221",
  appId: "1:284618017221:web:912839031a30109110a3ac"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get current Bangladesh Time (GMT+6)
const bdTime = new Date(new Date().getTime() + (6 * 60 * 60 * 1000));
const todayStr = bdTime.toISOString().split('T')[0]; // YYYY-MM-DD

// Get current hour in HH format (e.g., "09", "14", "21")
const currentHour = String(bdTime.getUTCHours()).padStart(2, '0'); 

console.log(`[🤖 CRON RUNNING] Target Date: ${todayStr} | Target Hour: ${currentHour}:00`);

async function checkAndSendEmails() {
  try {
    const lettersRef = collection(db, "letters");
    
    // Query matching both Date AND Hour!
    const q = query(
      lettersRef, 
      where("sendDate", "==", todayStr), 
      where("sendHour", "==", currentHour),
      where("isSent", "==", false)
    );
    
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`Empty: এই ঘণ্টার (${currentHour}:00) জন্য কোনো চিঠি পাওয়া যায়নি।`);
      return;
    }

    console.log(`Found ${querySnapshot.size} letters for this hour!`);

    for (const document of querySnapshot.docs) {
      const data = document.data();
      const docRef = doc(db, "letters", document.id);

      const htmlEmailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Fira+Code&display=swap');
            body { font-family: 'Fira Code', monospace; background-color: #0a0a16; color: #d1d5db; padding: 20px; }
            .card { max-width: 600px; margin: 0 auto; background-color: #0f0f23; border: 1px solid #05d5fa; border-radius: 12px; padding: 30px; box-shadow: 0 0 20px rgba(5, 213, 250, 0.2); }
            .header { border-bottom: 1px solid rgba(5, 213, 250, 0.3); padding-bottom: 15px; margin-bottom: 20px; text-align: center; }
            .logo { color: #05d5fa; font-size: 24px; font-weight: bold; text-shadow: 0 0 8px rgba(5, 213, 250, 0.6); }
            .subtitle { color: #a200ff; font-size: 14px; margin-top: 5px; font-weight: bold; }
            .message-box { background-color: #141432; border-left: 4px solid #a200ff; padding: 20px; border-radius: 4px; line-height: 1.6; color: #ffffff; white-space: pre-wrap; font-size: 15px; margin-bottom: 25px; }
            .footer { text-align: center; color: #6b7280; font-size: 11px; border-top: 1px solid rgba(5, 213, 250, 0.1); padding-top: 15px; }
            .symbol-bar { color: rgba(5,213,250,0.4); font-size: 14px; margin-bottom: 8px; letter-spacing: 0.3em; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="logo">⏳ TIME_CAPSULE_CORE</div>
              <div class="subtitle">অতীত থেকে আসা একটি গোপন বার্তা</div>
            </div>
            <p style="color: #9ca3af; font-size: 14px;">প্রিয় ইউজার,</p>
            <p style="color: #cbd5e1; font-size: 14px; margin-bottom: 20px;">
              আপনি আপনার ঠিক করে দেওয়া সময় (নির্ধারিত ঘণ্টা: ${data.sendTime}) অনুযায়ী অতীত থেকে এই বার্তাটি পেয়েছেন:
            </p>
            <div class="message-box">${data.message}</div>
            <p style="color: #05d5fa; font-size: 13px; font-weight: bold; text-align: center;">"অতীতকে ভুলে যেও না, ভবিষ্যৎ তোমার হাতে।"</p>
            <div class="footer">
              <div class="symbol-bar">⚙️ ─── 💾 ─── 🔑 ─── ⏳ ─── 🔒 ─── 🛰️</div>
              <p>This is an automated transmission. Do not reply.</p>
              <p>&copy; 2026 CSM Neural Core.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "Time Capsule <onboarding@resend.dev>",
          to: [data.email],
          subject: "📬 আপনার অতীত থেকে একটি চিঠি এসেছে!",
          html: htmlEmailContent
        })
      });

      if (response.ok) {
        console.log(`Email successfully sent to: ${data.email}`);
        await updateDoc(docRef, { isSent: true });
      } else {
        const errData = await response.json();
        console.error("Resend API Error: ", errData);
      }
    }
  } catch (error) {
    console.error("Error running cron script: ", error);
  }
}

checkAndSendEmails();
