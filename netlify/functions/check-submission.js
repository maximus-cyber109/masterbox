const axios = require('axios');

const GOOGLE_SHEETS_WEBHOOK = process.env.GOOGLE_SHEETS_WEBHOOK;

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    console.log('=== CHECK SUBMISSION (Google Sheet) ===');
    
    try {
        const { orderId, orderIncrementId } = JSON.parse(event.body || '{}');
        
        if (!orderId && !orderIncrementId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Order ID is required'
                })
            };
        }

        const searchOrderId = orderIncrementId || orderId;
        console.log('Checking if this order has been claimed:', searchOrderId);

        if (!GOOGLE_SHEETS_WEBHOOK) {
            console.log('⚠️ Google Sheets Webhook not configured - skipping duplicate check');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    hasSubmitted: false,
                    message: 'Duplicate check skipped - not configured'
                })
            };
        }

        // ✅ Check Google Sheet for this specific order ID
        try {
            const checkUrl = `${GOOGLE_SHEETS_WEBHOOK}?action=checkOrder&orderId=${encodeURIComponent(searchOrderId)}`;
            console.log('Checking Google Sheet:', checkUrl);

            const response = await axios.get(checkUrl, {
                timeout: 10000,
                validateStatus: (status) => status < 500
            });

            console.log('Google Sheet response:', response.data);

            if (response.data && response.data.exists) {
                console.log('❌ This order has already been claimed');
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        hasSubmitted: true,
                        submissionData: {
                            orderId: searchOrderId,
                            timestamp: response.data.timestamp || 'N/A',
                            specialties: response.data.specialties || 'Previously submitted'
                        }
                    })
                };
            } else {
                console.log('✅ This order has NOT been claimed yet');
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        hasSubmitted: false,
                        message: 'This order is eligible for MasterBox claim'
                    })
                };
            }

        } catch (sheetError) {
            console.error('Google Sheet check failed:', sheetError.message);
            // If check fails, allow submission (don't block user)
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    hasSubmitted: false,
                    message: 'Could not verify - allowing submission'
                })
            };
        }

    } catch (error) {
        console.error('=== CHECK SUBMISSION ERROR ===');
        console.error('Error:', error.message);
        
        // On error, allow submission
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                hasSubmitted: false,
                message: 'Error checking submission - allowing'
            })
        };
    }
};
