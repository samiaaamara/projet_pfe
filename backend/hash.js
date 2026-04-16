const bcrypt = require('bcrypt');

async function run() {
  const hash = await bcrypt.hash('admin123', 10);
  console.log("ADMIN HASH:");
  console.log(hash);
}

run();