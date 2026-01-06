/**
 * Verify SunSpec Compliance for EDMM-20
 * Checks all critical registers that EDMM-20 validates
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
  mbap.writeUInt16BE(0, 2);
  mbap.writeUInt16BE(pdu.length + 1, 4);
  mbap.writeUInt8(unitId, 6);

  return Buffer.concat([mbap, pdu]);
}

const client = new net.Socket();
const tests = [];
let currentTest = 0;

console.log('\n========================================');
console.log('  SunSpec Compliance Verification');
console.log('========================================\n');
console.log(`Host: ${MODBUS_HOST}:${MODBUS_PORT}`);
console.log(`Unit ID: ${UNIT_ID}\n`);

// Define all tests
tests.push({
  name: 'SunSpec ID',
  address: 0,
  count: 2,
  validate: (regs) => {
    const valid = regs[0] === 0x5375 && regs[1] === 0x6E53;
    return {
      valid,
      message: valid ? '✅ "SunS" (0x53756E53)' : `❌ Got 0x${regs[0].toString(16)} 0x${regs[1].toString(16)}`
    };
  }
});

tests.push({
  name: 'Common Model Header',
  address: 2,
  count: 2,
  validate: (regs) => {
    const idValid = regs[0] === 1;
    const lenValid = regs[1] === 65;
    return {
      valid: idValid && lenValid,
      message: `  ID=${regs[0]} ${idValid ? '✅' : '❌ (should be 1)'}, Length=${regs[1]} ${lenValid ? '✅' : '❌ (should be 65)'}`
    };
  }
});

tests.push({
  name: 'Inverter Model Header',
  address: 69,
  count: 2,
  validate: (regs) => {
    const idValid = regs[0] === 103;
    const lenValid = regs[1] === 50;
    return {
      valid: idValid && lenValid,
      message: `  ID=${regs[0]} ${idValid ? '✅' : '❌ (should be 103)'}, Length=${regs[1]} ${lenValid ? '✅' : '❌ (should be 50)'}`
    };
  }
});

tests.push({
  name: 'End Block Marker',
  address: 369,
  count: 2,
  validate: (regs) => {
    const idValid = regs[0] === 0xFFFF;
    const lenValid = regs[1] === 0;
    return {
      valid: idValid && lenValid,
      message: `  ID=0x${regs[0].toString(16)} ${idValid ? '✅' : '❌ (should be 0xFFFF)'}, Length=${regs[1]} ${lenValid ? '✅' : '❌ (should be 0)'}`
    };
  }
});

client.connect(MODBUS_PORT, MODBUS_HOST, () => {
  console.log('✅ Connected to Modbus server\n');
  runNextTest();
});

function runNextTest() {
  if (currentTest >= tests.length) {
    console.log('\n========================================');
    const allPassed = tests.every(t => t.result && t.result.valid);
    if (allPassed) {
      console.log('✅ ALL TESTS PASSED!');
      console.log('========================================');
      console.log('\nThe simulator is SunSpec compliant.');
      console.log('EDMM-20 should now discover it!\n');
    } else {
      console.log('❌ SOME TESTS FAILED');
      console.log('========================================\n');
    }
    client.end();
    return;
  }

  const test = tests[currentTest];
  console.log(`📖 ${test.name} (40${(test.address + 1).toString().padStart(3, '0')})...`);
  
  const request = createModbusRequest(currentTest + 1, UNIT_ID, 0x03, test.address, test.count);
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

      const registers = [];
      for (let i = 0; i < byteCount / 2; i++) {
        registers.push(response.readUInt16BE(9 + i * 2));
      }

      const test = tests[currentTest];
      test.result = test.validate(registers);
      console.log(test.result.message);
      console.log();

      currentTest++;
      runNextTest();
    }
  }
});

client.on('close', () => {
  console.log('🔌 Disconnected from Modbus server\n');
  process.exit(tests.every(t => t.result && t.result.valid) ? 0 : 1);
});

client.on('error', (err) => {
  console.error('❌ Connection error:', err.message);
  process.exit(1);
});


