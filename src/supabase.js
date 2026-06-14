import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://akvpmtbhsclmaqutvfzy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrdnBtdGJoc2NsbWFxdXR2Znp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNjE5MzYsImV4cCI6MjA5NjkzNzkzNn0.rzIarhsKDyOF0Zy09PxAtJSfT93HvyA0TCmkt2tijBM'

export const supabase = createClient(supabaseUrl, supabaseKey)