import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl!, supabaseKey!)

async function run() {
    console.log("Final check: Inserting a real row with room_id...")
    const { data, error } = await supabase.from('waiting_room').insert([{ 
        socket_id: 'test-' + Date.now(),
        chat_mode: 'text',
        room_id: 'debug-room-123'
    }]).select()

    if (error) {
        console.error("FAIL: Schema is still not right:", JSON.stringify(error, null, 2))
    } else {
        console.log("SUCCESS: Schema is 100% correct! Inserted room_id:", data[0].room_id)
        // Clean up
        await supabase.from('waiting_room').delete().eq('socket_id', data[0].socket_id)
    }
}

run()
