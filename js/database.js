const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dunaoomufszcrezppuat.supabase.co';
const supabaseKey = 'sb_publishable_8pVOoYAp4V7VNmiA3Utziw_vP1m7vpM';
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };