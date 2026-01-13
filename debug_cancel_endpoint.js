const fetch = require('node-fetch');

async function testCancel() {
    try {
        const response = await fetch("https://femiiniq-backend.onrender.com/booking/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                booking_code: "order_S2ypJdeethp7yu",
                reason: "Test cancellation"
            }),
        });

        const text = await response.text();
        console.log("Status:", response.status);
        console.log("Response Body Preview:", text.substring(0, 500));
    } catch (err) {
        console.error(err);
    }
}

testCancel();
