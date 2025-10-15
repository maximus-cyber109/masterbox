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

    console.log('=== CHECK SUBMISSION ===');
    
    try {
        const { orderId, orderIncrementId } = JSON.parse(event.body || '{}');
        
        const checkOrderId = orderIncrementId || orderId;
        
        if (!checkOrderId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Order ID required'
                })
            };
        }

        // Normalize order ID (remove leading zeros)
        const normalizedOrderId = checkOrderId.toString().replace(/^0+/, '') || '0';
        console.log(`Checking: ${checkOrderId} (normalized: ${normalizedOrderId})`);

        // Check Google Sheets via webhook
        if (!GOOGLE_SHEETS_WEBHOOK) {
            console.log('⚠️ Google Sheets webhook not configured');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    hasSubmitted: false
                })
            };
        }

        const checkUrl = `${GOOGLE_SHEETS_WEBHOOK}?action=checkOrder&orderId=${encodeURIComponent(normalizedOrderId)}`;
        
        const response = await axios.get(checkUrl, {
            timeout: 10000,
            validateStatus: (status) => status < 500
        });

        if (response.data && response.data.exists) {
            console.log('❌ Already claimed');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    hasSubmitted: true,
                    duplicate: true,
                    submissionData: {
                        orderId: normalizedOrderId,
                        timestamp: new Date().toISOString(),
                        specialties: 'Previously claimed'
                    }
                })
            };
        }

        console.log('✅ Not claimed yet');
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                hasSubmitted: false
            })
        };

    } catch (error) {
        console.error('❌ Check error:', error.message);
        
        // Fail open - allow submission if check fails
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                hasSubmitted: false,
                warning: 'Could not verify submission status'
            })
        };
    }
};
