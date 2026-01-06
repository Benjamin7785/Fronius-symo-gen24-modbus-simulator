/**
 * Shared type definitions and constants for Fronius Modbus Simulator
 */

// SunSpec Model IDs
export const SunSpecModels = {
  COMMON: 1,
  INVERTER_INT_SF: 103,
  NAMEPLATE: 120,
  BASIC_SETTINGS: 121,
  EXTENDED_MEASUREMENTS: 122,
  IMMEDIATE_CONTROLS: 123,
  STORAGE_CONTROL: 124,
  MPPT_EXTENSION: 160,
  DER_AC_MEASUREMENT: 701,
  DER_CAPACITY: 702,
  ENTER_SERVICE: 703,
  DER_AC_CONTROLS: 704,
  DER_VOLT_VAR: 705,
  DER_VOLT_WATT: 706,
  DER_LOW_VOLTAGE_TRIP: 707,
  DER_HIGH_VOLTAGE_TRIP: 708,
  DER_LOW_FREQ_TRIP: 709,
  DER_HIGH_FREQ_TRIP: 710,
  DER_FREQ_DROOP: 711,
  DER_WATT_VAR: 712,
  DER_STORAGE_CAPACITY: 713,
  METER: 211, // or 201 for int+SF
  END_BLOCK: 0xFFFF
};

// Operating States (Register 40108)
export const OperatingState = {
  OFF: 1,
  SLEEPING: 2,
  STARTING: 3,
  MPPT: 4,
  THROTTLED: 5,
  SHUTTING_DOWN: 6,
  FAULT: 7,
  STANDBY: 8
};

// Charge Status (Register 40355)
export const ChargeStatus = {
  OFF: 1,
  EMPTY: 2,
  DISCHARGING: 3,
  CHARGING: 4,
  FULL: 5,
  HOLDING: 6,
  TESTING: 7
};

// Data Types
export const DataType = {
  UINT16: 'uint16',
  INT16: 'int16',
  UINT32: 'uint32',
  INT32: 'int32',
  STRING: 'string',
  SUNSSF: 'sunssf',
  ENUM16: 'enum16',
  BITFIELD32: 'bitfield32'
};

// Register Access Types
export const AccessType = {
  READ_ONLY: 'R',
  READ_WRITE: 'RW'
};

// Modbus Function Codes
export const ModbusFunctionCode = {
  READ_HOLDING_REGISTERS: 0x03,
  WRITE_SINGLE_REGISTER: 0x06,
  WRITE_MULTIPLE_REGISTERS: 0x10
};

// Modbus Exception Codes
export const ModbusExceptionCode = {
  ILLEGAL_FUNCTION: 0x01,
  ILLEGAL_DATA_ADDRESS: 0x02,
  ILLEGAL_DATA_VALUE: 0x03,
  SLAVE_DEVICE_FAILURE: 0x04
};


