/**
 * This is a test script to check if the upload directories are writable.
 * Run with: node test-upload.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Create a test file if it doesn't exist
const testFilePath = path.join(__dirname, 'test-image.png');
if (!fs.existsSync(testFilePath)) {
    // Create a simple 10x10 transparent PNG
    const simpleImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFElEQVR42mP8z8BQz0AEYBxVSF+FABJABYRf/Q5PAAAAAElFTkSuQmCC', 'base64');
    fs.writeFileSync(testFilePath, simpleImageBuffer);
    console.log(`Created test image at ${testFilePath}`);
}

async function testUpload() {
    try {
        const form = new FormData();
        form.append('testImage', fs.createReadStream(testFilePath));
        
        console.log('Sending test upload request...');
        
        const response = await axios.post('http://localhost:5000/api/upload/test', form, {
            headers: {
                ...form.getHeaders()
            }
        });
        
        console.log('Upload successful!');
        console.log('Response:', response.data);
        
        // Now try to access the uploaded file
        const imageUrl = `http://localhost:5000${response.data.path}`;
        console.log('Trying to access the uploaded file at:', imageUrl);
        
        try {
            const imageResponse = await axios.get(imageUrl);
            console.log('Image is accessible! Status:', imageResponse.status);
        } catch (error) {
            console.error('Failed to access the uploaded image:', error.message);
        }
        
    } catch (error) {
        console.error('Upload test failed:');
        console.error('Status:', error.response?.status);
        console.error('Response:', error.response?.data);
        console.error('Error:', error.message);
    }
}

testUpload(); 