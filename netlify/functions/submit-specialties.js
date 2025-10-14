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

        // ✅ STEP 1: Check Google Sheets for duplicate (normalize order ID)
        if (GOOGLE_SHEETS_WEBHOOK) {
            try {
                const normalizedOrderId = orderId.toString().replace(/^0+/, '') || '0';
                console.log('🔍 Checking duplicate:', normalizedOrderId);
                
                const checkUrl = `${GOOGLE_SHEETS_WEBHOOK}?action=checkOrder&orderId=${encodeURIComponent(normalizedOrderId)}`;
                
                const checkResponse = await axios.get(checkUrl, {
                    timeout: 10000,
                    validateStatus: (status) => status < 500
                });

                if (checkResponse.data && checkResponse.data.exists) {
                    console.log('❌ Order already claimed!');
                    return {
                        statusCode: 409,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            error: 'This order has already claimed a MasterBox',
                            duplicate: true
                        })
                    };
                }

                console.log('✅ Order eligible');

            } catch (checkError) {
                console.error('⚠️ Check failed:', checkError.message);
            }
        }

        // ✅ STEP 2: Submit to Google Sheets
        const sheetData = {
            email: email,
            customer_id: customerId || '',
            firstname: firstname || '',
            lastname: lastname || '',
            specialties: Array.isArray(specialties) ? specialties.join(', ') : specialties,
            specialty_count: Array.isArray(specialties) ? specialties.length : 0,
            campaign: testMode ? 'TEST_PB_DAYS_OCT_2025' : 'PB_DAYS_OCT_2025',
            order_id: orderId,
            submission_id: `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        console.log('Sending to Google Sheets');

        const sheetResponse = await axios.post(GOOGLE_SHEETS_WEBHOOK, sheetData, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
            validateStatus: (status) => status < 500
        });

        console.log('Sheet response:', sheetResponse.data);

        if (sheetResponse.data && sheetResponse.data.duplicate) {
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'This order has already claimed a MasterBox',
                    duplicate: true
                })
            };
        }

        if (!sheetResponse.data || !sheetResponse.data.success) {
            throw new Error(sheetResponse.data?.error || 'Google Sheets submission failed');
        }

        console.log('✅ Google Sheets success');

        // ✅ STEP 3: WebEngage User & Event
        const results = {
            sheets: true,
            webengage_user: false,
            webengage_event: false
        };

        const webengageUserId = customerId ? `magento_${customerId}` : email.replace(/[@.]/g, '_');
        
        try {
            console.log('Creating WebEngage user:', webengageUserId);
            await createOrUpdateWebEngageUser({
                userId: webengageUserId,
                email,
                firstname,
                lastname,
                customerId,
                submissionId: sheetData.submission_id,
                specialties: Array.isArray(specialties) ? specialties : [specialties],
                orderId,
                testMode
            });
            results.webengage_user = true;
            console.log('✅ WebEngage user created');

            console.log('Sending WebEngage event');
            await sendSimpleWebEngageEvent({
                email,
                firstname,
                lastname,
                specialties: Array.isArray(specialties) ? specialties : [specialties],
                orderId,
                orderAmount,
                submissionId: sheetData.submission_id,
                testMode
            });
            results.webengage_event = true;
            console.log('✅ WebEngage event sent');

        } catch (webengageError) {
            console.error('⚠️ WebEngage error:', webengageError.message);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'MasterBox claim successful!',
                submissionId: sheetData.submission_id,
                orderId: orderId,
                integrations: results
            })
        };

    } catch (error) {
        console.error('=== ERROR ===');
        console.error('Error:', error.message);
        
        if (error.code === 'ECONNABORTED') {
            return {
                statusCode: 504,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Request timed out. Check submission before retrying.',
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

async function createOrUpdateWebEngageUser(params) {
    const { userId, email, firstname, lastname, customerId, submissionId, specialties, orderId, testMode } = params;
    
    const licenseCode = process.env.WEBENGAGE_LICENSE_CODE;
    const apiKey = process.env.WEBENGAGE_API_KEY;
    
    if (!licenseCode || !apiKey) {
        throw new Error('WebEngage credentials not configured');
    }

    const apiUrl = `https://api.webengage.com/v1/accounts/${licenseCode}/users`;

    const userData = {
        userId,
        attributes: {
            we_email: email,
            we_first_name: firstname || 'N/A',
            we_last_name: lastname || 'N/A',
            magento_customer_id: customerId || null,
            pb_days_participant: true,
            pb_days_submission_id: submissionId,
            pb_days_specialties: specialties.join(', '),
            pb_days_specialty_count: specialties.length,
            pb_days_order_id: orderId || 'N/A',
            pb_days_campaign: testMode ? 'TEST_PB_DAYS_OCT_2025' : 'PB_DAYS_OCT_2025',
            pb_days_submission_date: new Date().toISOString(),
            source: 'PB_DAYS_MasterBox_Campaign',
            specialty_endodontist: specialties.includes('Endodontist'),
            specialty_prosthodontist: specialties.includes('Prosthodontist'),
            specialty_orthodontist: specialties.includes('Orthodontist'),
            specialty_oral_surgeon: specialties.includes('Oral And Maxillofacial Surgeon'),
            specialty_paedodontist: specialties.includes('Paedodontist'),
            specialty_periodontist: specialties.includes('Periodontist'),
            specialty_general_dentist: specialties.includes('General Dentist'),
            last_campaign_participation: testMode ? 'TEST_PB_DAYS_OCT_2025' : 'PB_DAYS_OCT_2025',
            last_interaction_date: new Date().toISOString(),
            test_mode: testMode || false
        }
    };

    const response = await axios.post(apiUrl, userData, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        timeout: 15000
    });

    return response.data;
}

async function sendSimpleWebEngageEvent(params) {
    const { email, firstname, lastname, specialties, orderId, orderAmount, submissionId, testMode } = params;
    
    try {
        if (testMode) {
            console.log('🧪 Test mode - logging event');
            console.log('📧 Email:', email);
            console.log('🎁 Specialties:', specialties.join(', '));
            return true;
        }

        const WEBENGAGE_LICENSE_CODE = process.env.WEBENGAGE_LICENSE_CODE;
        const WEBENGAGE_API_KEY = process.env.WEBENGAGE_API_KEY;
        
        if (!WEBENGAGE_LICENSE_CODE || !WEBENGAGE_API_KEY) {
            console.error('❌ WebEngage credentials missing');
            return false;
        }

        const payload = {
            userId: email,
            eventName: "PB_DAYS_MasterBox_Claimed",
            eventData: {
                specialties_list: specialties.join(', '),
                specialty_count: specialties.length,
                order_id: orderId || 'N/A',
                order_amount: parseInt(orderAmount) || 0,
                customer_name: `${firstname || ''} ${lastname || ''}`.trim() || 'Valued Customer',
                submission_id: submissionId,
                campaign: 'PB_DAYS_OCT_2025',
                company_name: "PinkBlue",
                campaign_dates: "October 15 – 17, 2025",
                support_contact: "support@pinkblue.com",
                website_url: "https://pinkblue.com"
            }
        };

        const endpoint = `https://api.webengage.com/v1/accounts/${WEBENGAGE_LICENSE_CODE}/events`;
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WEBENGAGE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log('✅ WebEngage event sent');
            return true;
        }

        console.log('⚠️ WebEngage status:', response.status);
        return false;

    } catch (error) {
        console.error('❌ WebEngage event error:', error.message);
        return false;
    }
}
