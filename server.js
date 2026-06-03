const fetch = require("node-fetch");

exports.handler = async (event, context) => {
    // ১. এই হেডারগুলো যেকোনো অবস্থাতেই রিটার্ন করতে হবে, নাহলে ব্রাউজার CORS এরর দিবে।
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
    };

    // ২. ব্রাউজারের Preflight রিকোয়েস্ট বাইপাস করা
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "OK" };
    }

    try {
        if (event.httpMethod === "POST") {
            const data = JSON.parse(event.body);

            // ৩. ফায়ারবেস রিয়েলটাইম ডাটাবেসের ডাইরেক্ট REST API লিংক 
            // (এখানে sendfuture-adaa7 আপনার প্রজেক্ট আইডি। শেষে .json থাকা বাধ্যতামূলক)
            const FIREBASE_URL = "https://sendfuture-adaa7-default-rtdb.firebaseio.com/letters.json";

            const response = await fetch(FIREBASE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: data.email,
                    templateType: data.templateType,
                    sendDate: data.sendDate,
                    sendHour: data.sendHour,
                    sendMinute: data.sendMinute,
                    message: data.message,
                    isSent: false,
                    createdAt: new Date().toISOString()
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error("ফায়ারবেস ডাটাবেস রিকোয়েস্ট ব্লক করেছে: " + errText);
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, message: "Capsule successfully locked!" })
            };
        }
        
        return { 
            statusCode: 405, 
            headers, 
            body: JSON.stringify({ success: false, error: "Method not allowed" }) 
        };

    } catch (error) {
        // ৪. সার্ভার ক্র্যাশ করলেও ব্রাউজারকে সুন্দরভাবে হেডারসহ এরর জানাবে
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};
