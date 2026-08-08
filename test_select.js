require('dotenv').config();
const supabase = require('./backend/supabase');

async function testSelect() {
  const { data, error } = await supabase
    .from('remuneration_claims')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log(Object.keys(data[0] || {}));
  }
}

testSelect();
