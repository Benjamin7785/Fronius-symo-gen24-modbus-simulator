/**
 * Compare Simulator with Real Fronius Inverter
 * Reads key registers from both to find differences
 */

import net from 'net';

const REAL_FRONIUS_IP = '192.168.178.24'; // Your physical inverter
const SIMULATOR_IP = '192.168.178.155';   // Our simulator
const MODBUS_PORT = 502;
const UNIT_ID = 1;

// Key registers to compare
const REGISTERS_TO_CHECK = [
  { name: 'SunSpec ID', address: 0, count: 2 },
  { name: 'Common Model', address: 2, count: 4 },
  { name: 'Manufacturer', address: 4, count: 16 },
  { name: 'Model', address: 20, count: 16 },
  { name: 'Options', address: 36, count: 8 },
  { name: 'Version', address: 44, count: 8 },
  { name: 'Serial', address: 52, count: 16 },
  { name: 'Device Address', address: 68, count: 1 },
  { name: 'Inverter Model Header', address: 69, count: 2 },
  { name: 'End Block', address: 369, count: 2 },
];

function createModbusRequest(transactionId, unitId, functionCode, startAddress, quantity) {
  const pdu = Buffer.alloc(5);
  pdu.writeUInt8(functionCode, 0);
  pdu.writeUInt16BE(startAddress, 1);
  pdu.writeUInt16BE(quantity, 3);

  const mbap = Buffer.alloc(7);
  mbap.writeUInt16BE(transactionId, 0);
  mbap.writeUInt16BE(0, 2);
  mbap.writeUInt16BE(pdu.length + 1, 4);
  mbap.writeUInt8(unitId, 6);

  return Buffer.concat([mbap, pdu]);
}

async function readDevice(ip, registers) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const results = {};
    let currentReg = 0;

    client.connect(MODBUS_PORT, ip, () => {
      sendNextRequest();
    });

    function sendNextRequest() {
      if (currentReg >= registers.length) {
        client.end();
        resolve(results);
        return;
      }

      const reg = registers[currentReg];
      const request = createModbusRequest(currentReg + 1, UNIT_ID, 0x03, reg.address, reg.count);
      client.write(request);
    }

    let responseBuffer = Buffer.alloc(0);

    client.on('data', (data) => {
      responseBuffer = Buffer.concat([responseBuffer, data]);

      if (responseBuffer.length >= 9) {
        const byteCount = responseBuffer[8];
        const totalLength = 9 + byteCount;

        if (responseBuffer.length >= totalLength) {
          const response = responseBuffer.slice(0, totalLength);
          responseBuffer = responseBuffer.slice(totalLength);

          const reg = registers[currentReg];
          const values = [];
          for (let i = 0; i < byteCount / 2; i++) {
            values.push(response.readUInt16BE(9 + i * 2));
          }
          results[reg.name] = values;

          currentReg++;
          sendNextRequest();
        }
      }
    });

    client.on('error', (err) => {
      reject(err);
    });

    client.setTimeout(5000);
    client.on('timeout', () => {
      client.end();
      reject(new Error('Connection timeout'));
    });
  });
}

function formatValues(values) {
  if (values.length <= 4) {
    return values.map(v => `0x${v.toString(16).padStart(4, '0')}`).join(' ');
  }
  // For strings, try to decode
  const buffer = Buffer.alloc(values.length * 2);
  for (let i = 0; i < values.length; i++) {
    buffer.writeUInt16BE(values[i], i * 2);
  }
  const str = buffer.toString('utf8').replace(/\0/g, '').trim();
  if (str) {
    return `"${str}"`;
  }
  return values.map(v => `0x${v.toString(16).padStart(4, '0')}`).join(' ');
}

console.log('\n========================================');
console.log('  Comparing Real Fronius vs Simulator');
console.log('========================================\n');

console.log('Reading real Fronius inverter at', REAL_FRONIUS_IP, '...');
const realData = await readDevice(REAL_FRONIUS_IP, REGISTERS_TO_CHECK);
console.log('✅ Real Fronius data collected\n');

console.log('Reading simulator at', SIMULATOR_IP, '...');
const simData = await readDevice(SIMULATOR_IP, REGISTERS_TO_CHECK);
console.log('✅ Simulator data collected\n');

console.log('========================================');
console.log('  Comparison Results');
console.log('========================================\n');

let differencesFound = false;

for (const reg of REGISTERS_TO_CHECK) {
  const realVals = realData[reg.name];
  const simVals = simData[reg.name];
  
  const match = JSON.stringify(realVals) === JSON.stringify(simVals);
  
  console.log(`\n${reg.name} (40${(reg.address + 1).toString().padStart(3, '0')}):`);
  console.log(`  Real:      ${formatValues(realVals)}`);
  console.log(`  Simulator: ${formatValues(simVals)}`);
  
  if (match) {
    console.log(`  ✅ MATCH`);
  } else {
    console.log(`  ❌ DIFFERENCE!`);
    differencesFound = true;
  }
}

console.log('\n========================================');
if (differencesFound) {
  console.log('❌ DIFFERENCES FOUND!');
  console.log('These differences might prevent EDMM-20 discovery.');
} else {
  console.log('✅ ALL VALUES MATCH!');
  console.log('The simulator matches your real Fronius.');
}
console.log('========================================\n');

process.exit(differencesFound ? 1 : 0);


