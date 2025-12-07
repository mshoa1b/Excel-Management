const fetch = require('node-fetch');

const SHIPSTATION_API_KEY = process.env.SHIPSTATION_API_KEY;
const SHIPSTATION_API_SECRET = process.env.SHIPSTATION_API_SECRET;
const BASE_URL = 'https://ssapi.shipstation.com';

const getAuthHeader = () => {
  if (!SHIPSTATION_API_KEY || !SHIPSTATION_API_SECRET) {
    throw new Error('ShipStation API credentials are missing');
  }
  const authString = `${SHIPSTATION_API_KEY}:${SHIPSTATION_API_SECRET}`;
  return `Basic ${Buffer.from(authString).toString('base64')}`;
};

const createOrder = async (orderData) => {
  const response = await fetch(`${BASE_URL}/orders/createorder`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(orderData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ShipStation Create Order Failed: ${response.status} ${errorText}`);
  }

  return await response.json();
};

const createLabel = async (labelData) => {
  const response = await fetch(`${BASE_URL}/shipments/createlabel`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(labelData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ShipStation Create Label Failed: ${response.status} ${errorText}`);
  }

  return await response.json();
};

module.exports = {
  createOrder,
  createLabel
};
