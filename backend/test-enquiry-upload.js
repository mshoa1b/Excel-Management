const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');

async function testEnquiryCreation() {
  try {
    // Create a test file
    const testFileName = 'test-file.txt';
    const testFilePath = `./${testFileName}`;
    fs.writeFileSync(testFilePath, 'This is a test file for enquiry upload');

    // Create FormData
    const formData = new FormData();
    formData.append('businessId', '1');
    formData.append('orderNumber', 'TEST-ORDER-' + Date.now());
    formData.append('subject', 'Test Enquiry SFTP');
    formData.append('description', 'Testing SFTP file upload functionality');
    formData.append('platform', 'BackMarket');
    formData.append('attachment', fs.createReadStream(testFilePath), testFileName);

    // Add some delay to ensure server is ready
    console.log('Sending enquiry creation request...');
    
    const response = await fetch('http://localhost:5000/api/enquiries', {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders()
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Enquiry created successfully!');
      console.log('Result:', result);
    } else {
      console.log('❌ Enquiry creation failed:');
      console.log('Status:', response.status);
      console.log('Error:', result);
    }

    // Clean up
    fs.unlinkSync(testFilePath);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Wait a bit for the server to be ready
setTimeout(testEnquiryCreation, 2000);