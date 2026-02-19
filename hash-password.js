const bcrypt = require('bcryptjs');

const password = 'owner123';
const hash = bcrypt.hashSync(password, 10);

console.log('Password:', password);
console.log('Hash:', hash);
console.log('');
console.log('Copy hash ini ke MongoDB:');
console.log(hash);
