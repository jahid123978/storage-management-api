const bcrypt = require('bcrypt');
const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;

const hashPin = async (pin) => {
  return await bcrypt.hash(pin, saltRounds);
};

const comparePin = async (pin, hash) => {
  return await bcrypt.compare(pin, hash);
};

module.exports = { hashPin, comparePin };
