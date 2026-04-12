const axios = require('axios');
require('dotenv').config();

async function testApi() {
  try {
    console.log('Testing /api/pegawai...');
    // We can't easily call the API route directly since it's a Next.js route
    // But we can check if the code in the route works
  } catch (err) {
    console.error(err);
  }
}

testApi();
