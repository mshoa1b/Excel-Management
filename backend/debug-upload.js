require('dotenv').config();
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

async function testEnquiryUpload() {
  try {
    // First create a test enquiry
    console.log('Step 1: Creating enquiry...');
    const enquiryData = {
      order_number: 'TEST-ORDER-' + Date.now(),
      platform: 'backmarket',
      description: 'Test enquiry for SFTP upload debugging',
      business_id: 1
    };

    const enquiryResponse = await fetch('http://localhost:5000/api/enquiries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJzdXBlcmFkbWluIiwiZW1haWwiOiJzdXBlcmFkbWluQGV4YW1wbGUuY29tIiwicm9sZV9pZCI6MSwiaWF0IjoxNzI4ODQxNzI1LCJleHAiOjE3Mjg4NDUzMjV9.eS-J3jkKLlJ7L4TY_J-ZJ4iJfwLNXj0k-sHJhq3C_dE' // You may need to get a valid token
      },
      body: JSON.stringify(enquiryData)
    });

    if (!enquiryResponse.ok) {
      const errorData = await enquiryResponse.text();
      console.log('Failed to create enquiry:', enquiryResponse.status, errorData);
      return;
    }

    const enquiry = await enquiryResponse.json();
    console.log('✅ Enquiry created:', enquiry.id);

    // Create a test file
    const testContent = 'This is a test file for debugging SFTP upload';
    fs.writeFileSync('./debug-test-file.txt', testContent);

    // Step 2: Upload file to the enquiry
    console.log('Step 2: Uploading file...');
    const formData = new FormData();
    formData.append('files', fs.createReadStream('./debug-test-file.txt'), 'debug-test-file.txt');

    const uploadResponse = await fetch(`http://localhost:5000/api/enquiries/${enquiry.id}/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJzdXBlcmFkbWluIiwiZW1haWwiOiJzdXBlcmFkbWluQGV4YW1wbGUuY29tIiwicm9sZV9pZCI6MSwiaWF0IjoxNzI4ODQxNzI1LCJleHAiOjE3Mjg4NDUzMjV9.eS-J3jkKLlJ7L4TY_J-ZJ4iJfwLNXj0k-sHJhq3C_dE',
        ...formData.getHeaders()
      },
      body: formData
    });

    console.log('Upload response status:', uploadResponse.status);
    const uploadResult = await uploadResponse.text();
    console.log('Upload result:', uploadResult);

    // Clean up
    fs.unlinkSync('./debug-test-file.txt');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testEnquiryUpload();