#!/usr/bin/env node

// Script to manually fetch and store real ENTSO-E prices
import { database } from '../src/lib/db.js';
import { entsoEClient } from '../src/lib/entso-e.js';

async function fetchAndStoreRealPrices() {
  try {
    console.log('🚀 Fetching real electricity prices from ENTSO-E...');
    
    // Connect to database
    await database.connect();
    const db = database.getDb();
    console.log('✅ Connected to SurrealDB');
    
    // Fetch today's prices
    const today = new Date();
    const prices = await entsoEClient.fetchDayAheadPrices(today);
    
    console.log(`📊 Fetched ${prices.length} price records`);
    
    if (prices.length === 0) {
      console.log('⚠️ No prices returned from ENTSO-E API');
      return;
    }
    
    // Store prices in database
    console.log('💾 Storing prices in database...');
    let storedCount = 0;
    
    for (const price of prices) {
      try {
        await db.create('electricity_price', {
          timestamp: new Date(price.timestamp),
          price_cents_kwh: price.price_cents_kwh,
          price_area: price.price_area,
          forecast: price.forecast
        });
        storedCount++;
      } catch (error) {
        // Ignore duplicate errors, just count successful inserts
        if (!error.message.includes('already exists')) {
          console.error('Error storing price:', error.message);
        }
      }
    }
    
    console.log(`✅ Successfully stored ${storedCount} price records`);
    console.log('🎯 Sample prices:');
    
    prices.slice(0, 5).forEach(price => {
      const time = new Date(price.timestamp).toLocaleTimeString('fi-FI');
      const type = price.forecast ? '🔮 Forecast' : '📈 Actual';
      console.log(`   ${time}: ${price.price_cents_kwh.toFixed(2)} c/kWh ${type}`);
    });
    
    console.log('\n🚀 Application now has real electricity price data!');
    console.log('🌐 Visit http://localhost:3000 to see real prices');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fetchAndStoreRealPrices();