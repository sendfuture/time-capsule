const https = require("https");

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

// ⚠️ আপনার Resend API Key এবং ফায়ারবেস URL
const RESEND_API_KEY = "re_Y377Ah8u_7gfin2yU4uDY6e2GyYRBWJED";
const FIREBASE_HOST = "sendfuture-adaa7-default-rtdb.firebaseio.com";

function makeHttpsRequest(options, bodyData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const resBody = Buffer.concat(chunks).toString();
        resolve({ statusCode: res.statusCode, body: resBody });
      });
    });
    req.on("error", (err) => reject(err));
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
  }

  try {
    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body);

      // ----------------------------------------------------
      // 🤖 কেস ১: এটি নেটলিফাইয়ের অটোমেটেড ক্রন জব (কারণ এতে next_run আছে)
      // ----------------------------------------------------
      if (data.hasOwnProperty("next_run")) {
        // বাংলাদেশ টাইম জোন হ্যান্ডেল করা (GMT+6)
        const bdTime = new Date(new Date().getTime() + (6 * 60 * 60 * 1000));
        const todayStr = bdTime.toISOString().split('T')[0];
        const currentHour = String(bdTime.getUTCHours()).padStart(2, '0');
        const currentMinute = String(bdTime.getUTCMinutes()).padStart(2, '0');

        console.log(`[🤖 CRON RUNNING] Checking for Time: ${todayStr} | ${currentHour}:${currentMinute}`);

        const fbOptions = {
          hostname: FIREBASE_HOST,
          path: "/letters.json",
          method: "GET"
        };

        const fbResponse = await makeHttpsRequest(fbOptions);
        const letters = JSON.parse(fbResponse.body);

        if (!letters) {
          return { statusCode: 200, headers, body: "Database is empty." };
        }

        let sentCount = 0;

        for (let id in letters) {
          const letter = letters[id];

          // শুধুমাত্র ভ্যালিড চিঠি ফিল্টার করা (next_run ওয়ালা ডামি ডাটাগুলো বাদ যাবে)
          if (letter.email && !letter.isSent && letter.sendDate === todayStr && String(letter.sendHour) === currentHour && String(letter.sendMinute) === currentMinute) {
            console.log(`[MATCH FOUND] Dispatching email to: ${letter.email}`);
            
            const htmlEmailContent = getThemedHTML(letter.message, letter.templateType);
            const resendBody = JSON.stringify({
              from: "Future Capsule by Csm Mohasin Alam<future@mohasin.bro.bd>",
              to: [letter.email],
              subject: "📬 আপনার অতীত থেকে একটি চিঠি এসেছে!",
              html: htmlEmailContent
            });

            const resendOptions = {
              hostname: "api.resend.com",
              path: "/emails",
              method: "POST",
              headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(resendBody)
              }
            };

            const emailRes = await makeHttpsRequest(resendOptions, resendBody);
            console.log(`[RESEND API RESPONSE]:`, emailRes.body);

            // ডাটাবেসে চিঠির স্ট্যাটাস সেন্ট করা
            const patchBody = JSON.stringify({ isSent: true });
            const patchOptions = {
              hostname: FIREBASE_HOST,
              path: `/letters/${id}.json`,
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(patchBody)
              }
            };
            await makeHttpsRequest(patchOptions, patchBody);

            sentCount++;
          }
        }

        return { statusCode: 200, headers, body: `Cron job complete. Sent ${sentCount} letters.` };
      }

      // ----------------------------------------------------
      // 📩 কেস ২: ইউজার ফর্ম সাবমিট করেছে (কারণ এতে email ফিল্ড আছে)
      // ----------------------------------------------------
      if (data.hasOwnProperty("email")) {
        console.log("[USER FORM SUBMITTED]:", data.email);

        const fbPostBody = JSON.stringify({
          email: data.email,
          templateType: data.templateType,
          sendDate: data.sendDate,
          sendHour: String(data.sendHour).padStart(2, '0'),
          sendMinute: String(data.sendMinute).padStart(2, '0'),
          message: data.message,
          isSent: false,
          createdAt: new Date().toISOString()
        });

        const fbPostOptions = {
          hostname: FIREBASE_HOST,
          path: "/letters.json",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(fbPostBody)
          }
        };

        const saveResponse = await makeHttpsRequest(fbPostOptions, fbPostBody);
        console.log("[FIREBASE SAVE SUCCESS]:", saveResponse.body);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: "Capsule successfully locked!" })
        };
      }
    }

    return { statusCode: 405, headers, body: "Method Not Allowed" };

  } catch (error) {
    console.error("[CRITICAL ERROR]:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
