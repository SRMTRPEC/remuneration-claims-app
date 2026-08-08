require('dotenv').config();
const supabase = require('./backend/supabase');

async function testJoin() {
  console.log('Testing Supabase join...');
  const { data, error } = await supabase
    .from('remuneration_claims')
    .select('claim_number, staff_id, staff(staff_type)')
    .limit(2);

  if (error) {
    console.error('Join Error:', error.message);
  } else {
    console.log('Join Success Data:', JSON.stringify(data, null, 2));
  }
}

testJoin();
