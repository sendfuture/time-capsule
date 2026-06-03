const admin = require("firebase-admin");
const fetch = require("node-fetch");

// Firebase initialization
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "sendfuture-adaa7"
  });
}
const db = admin.firestore();

function getThemedHTML(message, templateType) {
  let config = {
    bg: "#0a0a16", cardBg: "#0f0f23", border: "#05d5fa", text: "#ffffff",
    accent: "#05d5fa", shadow: "rgba(5, 213, 250, 0.2)", banner: "📬 আপনার অতীত থেকে একটি চিঠি এসেছে!"
  };

  if (templateType === "birthday") {
    config = { bg: "#120516", cardBg: "#1f0b2a", border: "#ff007f", text: "#ffffff", accent: "#ff007f", shadow: "rgba(255, 0, 127, 0.2)", banner: "🎂 Happy Future Birthday to You! 🎉" };
  } else if (templateType === "crypto") {
    config = { bg: "#0b0f12", cardBg: "#11171d", border: "#f3ba2f", text: "#ffffff", accent: "#f3ba2f", shadow: "rgba(243, 186, 47, 0.2)", banner: "🪙 Future Crypto & Wealth Ledger" };
  } else if (templateType === "love") {
    config = { bg: "#1a080f", cardBg: "#2d121c", border: "#ff4d6d", text: "#ffffff", accent: "#ff4d6d", shadow: "rgba(255, 77, 109, 0.2)", banner: "❤️ Letter to My Future Soulmate" };
  } else if (templateType === "target" || templateType === "motivation") {
    config = { bg: "#020d0d", cardBg: "#051a1a", border: "#00ffcc", text: "#ffffff", accent: "#00ffcc", shadow: "rgba(0, 255, 204, 0.2)", banner: "🎯 Future Target & Motivation Core" };
  } else if (templateType === "custom_html") {
    return message;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Fira+Code&display=swap');
        body { font-family: 'Fira Code', monospace; background-color: ${config.bg}; color: #d1d5db; padding: 20px; margin:0; }
        .card { max-width: 600px; margin: 0 auto; background-color: ${config.cardBg}; border: 1px solid ${config.border}; border-radius: 12px; padding: 30px; box-shadow: 0 0 20px ${config.shadow}; }
        .header { border-bottom: 1px solid rgba(5, 213, 250, 0.2); padding-bottom: 20px; margin-bottom: 25px; text-align: center; }
        .logo { color: ${config.accent}; font-size: 20px; font-weight: bold; text-shadow: 0 0 8px ${config.shadow}; line-height: 1.4; }
        .message-box { background-color: #141432; border-left: 4px solid #a200ff; padding: 25px; border-radius: 4px; line-height: 1.6; color: ${config.text}; white-space: pre-wrap; font-size: 15px; margin-bottom: 25px; }
        .footer { text-align: center; color: #6b7280; font-size: 11px; border-top: 1px solid rgba(5, 213, 250, 0.1); padding-top: 20px; margin-top: 25px; }
        .symbol-bar { color: rgba(5,213,250,0.4); font-size: 14px; margin-bottom: 10px; letter-spacing: 0.3em; }
        .credit-link { color: #05d5fa; text-decoration: none; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header"><div class="logo">${config.banner}</div></div>
        <div class="message-box">${message}</div>
        <div class="footer">
          <div class="symbol-bar">⚙️ ─── 💾 ─── 🔑 ─── ⏳ ─── 🔒 ─── 🛰️</div>
          <p style="margin: 5px 0;">Developed with 💜 by <a href="https://github.com/sendfuture" target="_blank" class="credit-link">সিএসএম মহসিন আলম</a></p>
          <p style="color: #4b5563; font-size: 9px; margin: 5px 0 0 0;">&copy; 2026 CSM Neural Core. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

exports.handler = async (event, context) => {
  const bdTime = new Date(new Date().getTime() + (6 * 60 * 60 * 1000));
  const todayStr = bdTime.toISOString().split('T')[0]; 
  const currentHour = String(bdTime.getUTCHours()).padStart(2, '0'); 
  const currentMinute = String(bdTime.getUTCMinutes()).padStart(2, '0'); 

  console.log(`[🤖 CRON] Scanning: ${todayStr} | ${currentHour}:${currentMinute}`);

  try {
    const lettersRef = db.collection("letters");
    const snapshot = await lettersRef
      .where("sendDate", "==", todayStr)
      .where("sendHour", "==", currentHour)
      .where("sendMinute", "==", currentMinute)
      .where("isSent", "==", false)
      .get();

    if (snapshot.empty) {
      return { statusCode: 200, body: "No pending letters right now." };
    }

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const mainMessage = data.message || data.letter || "চিঠির টেক্সট পাওয়া যায়নি।";
      const templateType = data.templateType || "default";

      const htmlEmailContent = getThemedHTML(mainMessage, templateType);

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "Future Capsule by Csm Mohasin <onboarding@resend.dev>",
          to: [data.email],
          subject: "📬 আপনার অতীত থেকে একটি চিঠি এসেছে!",
          html: htmlEmailContent
        })
      });

      if (response.ok) {
        await doc.ref.update({ isSent: true });
      }
    }
    return { statusCode: 200, body: `Processed ${snapshot.size} letters.` };
  } catch (error) {
    return { statusCode: 500, body: error.message };
  }
};
