const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'mta25256969';
  const hash = await bcrypt.hash(password, 10);
  console.log('Hash generado:', hash);
}

generateHash();
