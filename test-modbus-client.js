/**
 * Simple Modbus TCP Client Test
 * Tests if the simulator responds correctly to Modbus requests
 */

import net from 'net';

const MODBUS_PORT = 502;
const MODBUS_HOST = process.env.MODBUS_HOST || 'localhost'; // Simulator running locally
const UNIT_ID = 1;

function createModbusRequest(transactionId, unitId, functionCode, startAddress, quantity) {
  const pdu = Buffer.alloc(5);
  pdu.writeUInt8(functionCode, 0);
  pdu.writeUInt16BE(startAddress, 1);
  pdu.writeUInt16BE(quantity, 3);
  
  const mbap = Buffer.alloc(7);
  mbap.writeUInt16BE(transactionId, 0);  // Transaction ID
  mbap.writeUInt16BE(0, 2);              // Protocol ID (0 for Modbus)
  mbap.writeUInt16BE(pdu.length + 1, 4); // Length
  mbap.writeUInt8(unitId, 6);            // Unit ID
  
  return Buffer.concat([mbap, pdu]);
}

function testModbusConnection() {
  console.log(`\n=== Testing Modbus TCP Connection ===`);
  console.log(`Host: ${MODBUS_HOST}:${MODBUS_PORT}`);
  console.log(`Unit ID: ${UNIT_ID}\n`);

  const client = net.createConnection({ port: MODBUS_PORT, host: MODBUS_HOST }, () => {
    console.log('✅ Connected to Modbus server');
    
    // Test 1: Read SunSpec ID (register 40001, address 0)
    console.log('\n📖 Test 1: Reading SunSpec ID (40001-40002)...');
    const request1 = createModbusRequest(1, UNIT_ID, 0x03, 0, 2);
    client.write(request1);
  });

  let responseBuffer = Buffer.alloc(0);
  let testNumber = 1;

  client.on('data', (data) => {
    responseBuffer = Buffer.concat([responseBuffer, data]);
    
    // Check if we have a complete response
    if (responseBuffer.length >= 6) {
      const length = responseBuffer.readUInt16BE(4);
      const totalLength = 6 + length;
      
      if (responseBuffer.length >= totalLength) {
        const response = responseBuffer.slice(0, totalLength);
        responseBuffer = responseBuffer.slice(totalLength);
        
        // Parse response
        const transactionId = response.readUInt16BE(0);
        const protocolId = response.readUInt16BE(2);
        const unitId = response.readUInt8(6);
        const functionCode = response.readUInt8(7);
        
        console.log(`\n✅ Response received:`);
        console.log(`   Transaction ID: ${transactionId}`);
        console.log(`   Protocol ID: ${protocolId}`);
        console.log(`   Unit ID: ${unitId}`);
        console.log(`   Function Code: 0x${functionCode.toString(16).padStart(2, '0')}`);
        
        if (functionCode === 0x03) {
          const byteCount = response.readUInt8(8);
          console.log(`   Byte Count: ${byteCount}`);
          console.log(`   Data:`);
          
          for (let i = 0; i < byteCount / 2; i++) {
            const value = response.readUInt16BE(9 + i * 2);
            const address = i;
            console.log(`      Register ${40001 + address}: ${value} (0x${value.toString(16).padStart(4, '0')})`);
          }
        } else if (functionCode & 0x80) {
          const exceptionCode = response.readUInt8(8);
          console.log(`   ❌ Exception Code: ${exceptionCode}`);
        }
        
        // Next test
        testNumber++;
        
        if (testNumber === 2) {
          console.log('\n📖 Test 2: Reading Common Model (40003-40006)...');
          const request2 = createModbusRequest(2, UNIT_ID, 0x03, 2, 4);
          client.write(request2);
        } else if (testNumber === 3) {
          console.log('\n📖 Test 3: Reading Manufacturer (40005-40020)...');
          const request3 = createModbusRequest(3, UNIT_ID, 0x03, 4, 16);
          client.write(request3);
        } else {
          console.log('\n✅ All tests completed successfully!');
          client.end();
        }
      }
    }
  });

  client.on('end', () => {
    console.log('\n🔌 Disconnected from Modbus server');
  });

  client.on('error', (err) => {
    console.error(`\n❌ Connection error: ${err.message}`);
    process.exit(1);
  });

  client.on('timeout', () => {
    console.error('\n❌ Connection timeout');
    client.end();
    process.exit(1);
  });

  client.setTimeout(5000);
}

// Run the test
testModbusConnection();

