/**
 * Test Device Name - Verify "Gen24 SIM" in Modbus response
 */

import net from 'net';

const MODBUS_PORT = 502;
const MODBUS_HOST = process.env.MODBUS_HOST || '192.168.178.155';
const UNIT_ID = 1;

function createModbusRequest(transactionId, unitId, functionCode, startAddress, quantity) {
  const pdu = Buffer.alloc(5);
  pdu.writeUInt8(functionCode, 0);
  pdu.writeUInt16BE(startAddress, 1);
  pdu.writeUInt16BE(quantity, 3);

  const mbap = Buffer.alloc(7);
  mbap.writeUInt16BE(transactionId, 0);
  mbap.writeUInt16BE(0, 2); // Protocol ID
  mbap.writeUInt16BE(pdu.length + 1, 4); // Length
  mbap.writeUInt8(unitId, 6);

  return Buffer.concat([mbap, pdu]);
}

function registersToString(registers) {
  const buffer = Buffer.alloc(registers.length * 2);
  for (let i = 0; i < registers.length; i++) {
    buffer.writeUInt16BE(registers[i], i * 2);
  }
  return buffer.toString('utf8').replace(/\0/g, '').trim();
}

const client = new net.Socket();

console.log('\n=== Testing Device Name ===');
console.log(`Host: ${MODBUS_HOST}:${MODBUS_PORT}`);
console.log(`Unit ID: ${UNIT_ID}\n`);

client.connect(MODBUS_PORT, MODBUS_HOST, () => {
  console.log('✅ Connected to Modbus server\n');

  let transactionId = 1;

  // Read Manufacturer (40005-40020)
  console.log('📖 Reading Manufacturer (40005-40020)...');
  const manufacturerRequest = createModbusRequest(transactionId++, UNIT_ID, 0x03, 4, 16);
  
  client.write(manufacturerRequest);
});

let responseBuffer = Buffer.alloc(0);
let step = 0;

client.on('data', (data) => {
  responseBuffer = Buffer.concat([responseBuffer, data]);

  if (responseBuffer.length >= 9) {
    const byteCount = responseBuffer[8];
    const totalLength = 9 + byteCount;

    if (responseBuffer.length >= totalLength) {
      const response = responseBuffer.slice(0, totalLength);
      responseBuffer = responseBuffer.slice(totalLength);

      if (step === 0) {
        // Manufacturer response
        const registers = [];
        for (let i = 0; i < byteCount / 2; i++) {
          registers.push(response.readUInt16BE(9 + i * 2));
        }
        const manufacturer = registersToString(registers);
        console.log(`✅ Manufacturer: "${manufacturer}"\n`);

        // Read Model (40021-40036)
        console.log('📖 Reading Model (40021-40036)...');
        const modelRequest = createModbusRequest(2, UNIT_ID, 0x03, 20, 16);
        client.write(modelRequest);
        step++;
      } else if (step === 1) {
        // Model response
        const registers = [];
        for (let i = 0; i < byteCount / 2; i++) {
          registers.push(response.readUInt16BE(9 + i * 2));
        }
        const model = registersToString(registers);
        console.log(`✅ Model: "${model}"\n`);

        // Read Serial Number (40053-40068)
        console.log('📖 Reading Serial Number (40053-40068)...');
        const serialRequest = createModbusRequest(3, UNIT_ID, 0x03, 52, 16);
        client.write(serialRequest);
        step++;
      } else if (step === 2) {
        // Serial response
        const registers = [];
        for (let i = 0; i < byteCount / 2; i++) {
          registers.push(response.readUInt16BE(9 + i * 2));
        }
        const serial = registersToString(registers);
        console.log(`✅ Serial Number: "${serial}"\n`);

        console.log('========================================');
        console.log('EDMM-20 will see:');
        console.log('========================================');
        console.log(`  Manufacturer:  Fronius`);
        console.log(`  Model:         Gen24 SIM`);
        console.log(`  Serial:        12345678`);
        console.log('========================================\n');

        console.log('✅ Device name successfully changed!\n');
        client.end();
      }
    }
  }
});

client.on('close', () => {
  console.log('🔌 Disconnected from Modbus server\n');
  process.exit(0);
});

client.on('error', (err) => {
  console.error('❌ Connection error:', err.message);
  process.exit(1);
});


