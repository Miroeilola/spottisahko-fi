#!/usr/bin/env node

const fetch = require('node-fetch');

async function fetchPrices() {
  const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const CRON_SECRET = process.env.CRON_SECRET;

  try {
    console.log(`[${new Date().toISOString()}] Starting price fetch...`);
    
    const response = await fetch(`${API_URL}/api/cron/fetch-prices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`[${new Date().toISOString()}] Price fetch completed:`, result);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching prices:`, error.message);
    process.exit(1);
  }
}

fetchPrices();