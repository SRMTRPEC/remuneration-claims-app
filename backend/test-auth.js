require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .ilike('staff_name', '%Mirra%');
  
  if (error) {
    console.error('Error fetching:', error);
    return;
  }
  
  console.log('Found staff:', data);
  if (data.length > 0) {
    const isValid = bcrypt.compareSync('password123', data[0].password_hash);
    console.log('Does password123 match?', isValid);
  }
}
check();
