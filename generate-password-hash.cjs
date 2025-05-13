const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = await scrypt(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

hashPassword('admin123').then(hash => {
  console.log(hash);
});