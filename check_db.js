require('dotenv').config();
const supabase = require('./backend/supabase');
async function check() {
  const { data, error } = await supabase.from('staff').select('*').limit(1);
  console.log(data);
}
check();
