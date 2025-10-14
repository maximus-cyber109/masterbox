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
        
        // ✅ Normalize: remove leading zeros
        const normalizedOrderId = searchOrderId.toString().replace(/^0+/, '') || '0';
        
        console.log('Checking:', searchOrderId, '(normalized:', normalizedOrderId + ')');

        if (!GOOGLE_SHEETS_WEBHOOK) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    hasSubmitted: false
                })
            };
        }

        try {
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
                        submissionData: {
                            orderId: searchOrderId,
                            timestamp: response.data.timestamp || 'N/A',
                            specialties: response.data.specialties || 'Previously submitted'
                        }
                    })
                };
            } else {
                console.log('✅ Eligible');
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        hasSubmitted: false
                    })
                };
            }

        } catch (error) {
            console.error('Check failed:', error.message);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    hasSubmitted: false
                })
            };
        }

    } catch (error) {
        console.error('Error:', error.message);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                hasSubmitted: false
            })
        };
    }
};
