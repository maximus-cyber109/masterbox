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

        // Validate
        if (!email || !specialties || !orderId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Missing required fields'
                })
            };
        }

        console.log('Submission:', { email, orderId, specialties });

        // ✅ CORRECT FIELD NAMES matching Google Script expectations
        const sheetData = {
            email: email,                                                    // B
            customer_id: customerId || '',                                   // C
            firstname: firstname || '',                                      // D
            lastname: lastname || '',                                        // E
            specialties: Array.isArray(specialties) ? specialties.join(', ') : specialties,  // F
            specialty_count: Array.isArray(specialties) ? specialties.length : 0,           // G
            campaign: testMode ? 'TEST_PB_DAYS_OCT_2025' : 'PB_DAYS_OCT_2025',            // H
            order_id: orderId,                                               // I
            submission_id: `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`  // J
        };

        if (!GOOGLE_SHEETS_WEBHOOK) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Google Sheets webhook not configured'
                })
            };
        }

        console.log('Sending to Google Sheets:', GOOGLE_SHEETS_WEBHOOK);
        console.log('Data:', sheetData);

        // Send with retry
        let lastError;
        const maxRetries = 2;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Attempt ${attempt}/${maxRetries}...`);
                
                const response = await axios.post(GOOGLE_SHEETS_WEBHOOK, sheetData, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 30000,
                    validateStatus: (status) => status < 500
                });

                console.log('✅ Response:', response.status, response.data);

                if (response.data && response.data.success) {
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
                    throw new Error(response.data?.error || 'Unsuccessful response');
                }

            } catch (error) {
                lastError = error;
                console.log(`Attempt ${attempt} failed:`, error.message);
                
                if (error.code === 'ECONNABORTED' && attempt < maxRetries) {
                    console.log('Timeout - retrying...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                }
                
                if (attempt === maxRetries) {
                    throw error;
                }
            }
        }

        throw lastError;

    } catch (error) {
        console.error('=== ERROR ===');
        console.error('Error:', error.message);
        
        if (error.code === 'ECONNABORTED') {
            return {
                statusCode: 504,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Request timed out. Check your submission before retrying.',
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
