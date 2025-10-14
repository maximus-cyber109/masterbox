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

    console.log('=== SUBMIT SPECIALTIES START ===');
    
    try {
        const submissionData = JSON.parse(event.body || '{}');
        
        const {
            email,
            firstname,
            lastname,
            customerId,
            specialties,
            orderId,
            orderEntityId,
            orderAmount,
            testMode
        } = submissionData;

        // Validate required fields
        if (!email || !specialties || !orderId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Missing required fields: email, specialties, or orderId'
                })
            };
        }

        console.log('Submission data:', {
            email,
            orderId,
            specialties: Array.isArray(specialties) ? specialties.join(', ') : specialties
        });

        // Prepare Google Sheets data
        const sheetData = {
            email: email,
            customer_id: customerId || 'N/A',
            firstname: firstname || 'N/A',
            lastname: lastname || 'N/A',
            specialties: Array.isArray(specialties) ? specialties.join(', ') : specialties,
            order_id: orderId,
            specialty_count: Array.isArray(specialties) ? specialties.length : 0,
            campaign: testMode ? 'TEST_PB_DAYS_OCT_2025' : 'PB_DAYS_OCT_2025',
            submission_id: `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        // ✅ Send to Google Sheets with increased timeout and retry
        if (!GOOGLE_SHEETS_WEBHOOK) {
            console.log('⚠️ Google Sheets Webhook not configured');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Google Sheets webhook not configured'
                })
            };
        }

        console.log('Sending to Google Sheets...');
        console.log('Google Sheets URL:', GOOGLE_SHEETS_WEBHOOK);

        // ✅ Retry logic with increased timeout
        let lastError;
        const maxRetries = 2;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Attempt ${attempt}/${maxRetries}...`);
                
                const response = await axios.post(GOOGLE_SHEETS_WEBHOOK, sheetData, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 30000, // ✅ Increased to 30 seconds
                    validateStatus: (status) => status < 500
                });

                console.log('✅ Google Sheets response:', response.status);
                console.log('Response data:', response.data);

                // Check if submission was successful
                if (response.data && response.data.success) {
                    console.log('✅ Submission successful!');
                    
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            success: true,
                            message: 'MasterBox claim successful!',
                            submissionId: sheetData.submission_id,
                            orderId: orderId
                        })
                    };
                } else if (response.data && response.data.duplicate) {
                    // Handle duplicate
                    console.log('⚠️ Duplicate submission detected');
                    return {
                        statusCode: 409,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            error: 'This order has already claimed a MasterBox',
                            duplicate: true
                        })
                    };
                } else {
                    throw new Error(response.data?.error || 'Google Sheets returned unsuccessful response');
                }

            } catch (error) {
                lastError = error;
                console.log(`Attempt ${attempt} failed:`, error.message);
                
                // If timeout and not last attempt, retry
                if (error.code === 'ECONNABORTED' && attempt < maxRetries) {
                    console.log('Timeout - retrying...');
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
                    continue;
                }
                
                // If it's the last attempt, throw
                if (attempt === maxRetries) {
                    throw error;
                }
            }
        }

        // If we get here, all retries failed
        throw lastError;

    } catch (error) {
        console.error('=== FUNCTION ERROR ===');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        
        // Handle specific errors
        if (error.code === 'ECONNABORTED') {
            return {
                statusCode: 504,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Request to Google Sheets timed out. Your submission may have been recorded. Please check your order status before trying again.',
                    timeout: true
                })
            };
        }

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Failed to submit. Please try again.',
                details: error.message
            })
        };
    }
};
