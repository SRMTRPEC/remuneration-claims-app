require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function reset() {
  const hash = bcrypt.hashSync('123456', 10);
  const { error } = await supabase
    .from('staff')
    .update({ password_hash: hash })
    .eq('staff_id', 'TRPTTTTT');
    
  if (error) console.error(error);
  else console.log('Successfully forced reset to 123456');
}
reset();
