const { initializeApp, getApps } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const admin = require('firebase-admin');
const { Resend } = require('resend');

// এনভায়রনমেন্ট ভ্যারিয়েবল থেকে ডেটা নেওয়া
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// ফায়ারবেস অ্যাডমিন ইনিশিয়ালাইজেশন
if (getApps().length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID || "time-capsule-csm",
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-xxxxx@xxxxx.iam.gserviceaccount.com"
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://time-capsule-csm-default-rtdb.firebaseio.com"
    });
}

const db = getDatabase();

exports.handler = async (event, context) => {
    // CORS প্রি-ফ্লাইট (OPTIONS) রিকোয়েস্ট হ্যান্ডেল করা
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "OK" };
    }

    try {
        // ১. ক্রন জব বা গেট রিকোয়েস্ট (চিঠি স্ক্যান করে পাঠানো)
        if (event.httpMethod === "GET") {
            const now = new Date();
            const dhakaOffset = 6 * 60 * 60 * 1000;
            const localTime = new Date(now.getTime() + dhakaOffset);
            
            const currentDate = localTime.toISOString().split('T')[0];
            const currentHour = String(localTime.getUTCHours()).padStart(2, '0');
            const currentMinute = String(localTime.getUTCMinutes()).padStart(2, '0');

            console.log(`[🤖 CRON] Scanning: ${currentDate} | ${currentHour}:${currentMinute}`);

            const ref = db.ref("letters");
            const snapshot = await ref.once("value");
            const letters = snapshot.val();

            if (!letters) {
                return { statusCode: 200, headers, body: JSON.stringify({ message: "No letters found." }) };
            }

            let sentCount = 0;

            for (let id in letters) {
                const letter = letters[id];
                if (!letter.isSent && letter.sendDate === currentDate && String(letter.sendHour) === currentHour && String(letter.sendMinute) === currentMinute) {
                    
                    if (resend) {
                        await resend.emails.send({
                            from: 'TimeCapsule <onboarding@resend.dev>',
                            to: letter.email,
                            subject: '📩 আপনার অতীতের পাঠানো একটি টাইম ক্যাপসুল চিঠি!',
                            html: `<div style="font-family:sans-serif;padding:20px;border:1px solid #00ffcc;background:#0a0a16;color:#fff;">
                                    <h2>🎂 ফিউচার টাইম ক্যাপসুল 🚀</h2>
                                    <p><b>থিম:</b> ${letter.templateType}</p>
                                    <hr style="border-color:#00ffcc;"/>
                                    <p style="font-size:16px;white-space:pre-wrap;">${letter.message}</p>
                                   </div>`
                        });
                    }

                    await db.ref(`letters/${id}`).update({ isSent: true });
                    sentCount++;
                }
            }

            return { statusCode: 200, headers, body: JSON.stringify({ message: `Scan done. Sent ${sentCount} letters.` }) };
        }

        // ২. ফ্রন্ট-এন্ড থেকে ফর্ম সাবমিট (POST রিকোয়েস্ট)
        if (event.httpMethod === "POST") {
            const data = JSON.parse(event.body);
            const ref = db.ref("letters");
            const newLetterRef = ref.push();
            await newLetterRef.set({
                email: data.email,
                templateType: data.templateType,
                sendDate: data.sendDate,
                sendHour: String(data.sendHour).padStart(2, '0'),
                sendMinute: String(data.sendMinute).padStart(2, '0'),
                message: data.message,
                isSent: false,
                createdAt: new Date().toISOString()
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
