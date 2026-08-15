// Creates (or promotes) an admin account. Admins are never created through the public
// /api/auth/register endpoint — this script is the intended path.
//
// Usage:
//   node scripts/createAdmin.js "Admin Name" admin@landora.co.ke somePassword123
//
// Running it again for an existing email just promotes that user to 'admin'.
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

async function main() {
  const [name, email, password] = process.argv.slice(2);
  if (!name || !email) {
    console.error('Usage: node scripts/createAdmin.js "Admin Name" admin@example.com [password]');
    process.exit(1);
  }

  await connectDB();

  let user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    user.role = 'admin';
    await user.save();
    console.log(`Promoted existing user ${email} to admin.`);
  } else {
    if (!password || password.length < 8) {
      console.error('A password of at least 8 characters is required to create a new admin.');
      process.exit(1);
    }
    user = new User({ name, email, role: 'admin' });
    await user.setPassword(password);
    await user.save();
    console.log(`Created admin user ${email}.`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
