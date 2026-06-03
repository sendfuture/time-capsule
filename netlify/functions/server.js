const admin = require("firebase-admin");
const fetch = require("node-fetch");

// ফায়ারবেস অ্যাডমিন ইনিশিয়ালাইজেশন
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "sendfuture-adaa7"
  });
}
const db = admin.firestore();

// চমৎকার থিমড ইমেইল টেমপ্লেট জেনারেটর
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
    config = { bg: "#1a0510", cardBg: "#2d0b1e", border: "#ff2a85", text: "#ffffff", accent: "#ff2a85", shadow: "rgba(255, 42, 133, 0.2)", banner: "❤️ Future Soulmate Ledger" };
  } else if (templateType === "target") {
    config = { bg: "#05160e", cardBg: "#0b261a", border: "#00ff66", text: "#ffffff", accent: "#00ff66", shadow: "rgba(0, 255, 102, 0.2)", banner: "🎯 Motivation & Target Core" };
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { background-color: ${config.bg}; margin: 0; padding: 20px; font-family: 'Courier New', Courier, monospace; }
        .card { max-width: 600px; margin: 0 auto; background-color: ${config.cardBg}; border: 2px solid ${config.border}; border-radius: 12px; padding: 30px; box-shadow: 0 0 20px ${config.shadow}; color: ${config.text}; }
        .banner { font-size: 18px; font-weight: bold; color: ${config.accent}; border-bottom: 1px solid rgba(5, 213, 250, 0.2); padding-bottom: 15px; margin-bottom: 20px; text-align: center; }
        .message { font-size: 15px; line-height: 1.6; white-space: pre-wrap; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 6px; border-left: 3px solid ${config.accent}; }
        .footer { text-align: center; margin-top: 25px; font-size: 11px; color: #6b7280; border-top: 1px solid rgba(5, 213, 250, 0.1); padding-top: 15px; }
        .symbol-bar { color: ${config.accent}; opacity: 0.5; margin-bottom: 8px; letter-spacing: 0.2em; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="banner">${config.banner}</div>
        <div class="message">${message}</div>
        <div class="footer">
          <div class="symbol-bar">⚙️ ─── 💾 ─── 🔑 ─── ⏳ ─── 🔒 ─── 🛰️</div>
          <p>System Maintained by সিএসএম মহসিন আলম</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

exports.handler = async (event, context) => {
  // শক্তিশালী CORS হেডার সেটিংস
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
  };

  // ব্রাউজারের OPTIONS (Preflight) রিকোয়েস্ট হ্যান্ডেল করা
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
  }

  try {
    // ১. ক্রন জব বা গেট রিকোয়েস্ট (চিঠি স্ক্যান করে পাঠানো)
    if (event.httpMethod === "GET") {
      const bdTime = new Date(new Date().getTime() + (6 * 60 * 60 * 1000));
      const todayStr = bdTime.toISOString().split('T')[0];
      const currentHour = String(bdTime.getUTCHours()).padStart(2, '0');
      const currentMinute = String(bdTime.getUTCMinutes()).padStart(2, '0');

      console.log(`[🤖 CRON] Scanning: ${todayStr} | ${currentHour}:${currentMinute}`);

      const lettersRef = db.collection("letters");
      const snapshot = await lettersRef
        .where("sendDate", "==", todayStr)
        .where("sendHour", "==", currentHour)
        .where("sendMinute", "==", currentMinute)
        .where("isSent", "==", false)
        .get();

      if (snapshot.empty) {
        return { statusCode: 200, headers, body: "No pending letters right now." };
      }

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const mainMessage = data.message || "চিঠির টেক্সট পাওয়া যায়নি।";
        const templateType = data.templateType || "default";

        const htmlEmailContent = getThemedHTML(mainMessage, templateType);

        if (process.env.RESEND_API_KEY) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              from: "Future Capsule <onboarding@resend.dev>",
              to: [data.email],
              subject: "📬 আপনার অতীত থেকে একটি চিঠি এসেছে!",
              html: htmlEmailContent
            })
          });
        }

        await doc.ref.update({ isSent: true });
      }

      return { statusCode: 200, headers, body: `Scan complete. Processed letters.` };
    }

    // ২. ফ্রন্ট-এন্ড থেকে ফর্ম সাবমিট (POST রিকোয়েস্ট)
    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body);
      
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
        body: JSON.stringify({ success: true, message: "Capsule stored successfully!" })
      };
    }

    return { statusCode: 405, headers, body: "Method Not Allowed" };

  } catch (error) {
    console.error("Error occurred:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
