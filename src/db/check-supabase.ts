import '../env-bootstrap';

async function checkSupabaseTables() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        console.log('❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env');
        return;
    }

    try {
        const res = await fetch(supabaseUrl + '/rest/v1/', {
            headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
            },
        });

        if (!res.ok) {
            console.log('❌ Failed to connect to Supabase REST API:', res.status, res.statusText);
            return;
        }

        const data = (await res.json()) as any;
        const tables = Object.keys(data?.definitions || {});

        const expected = [
            'profiles',
            'user_settings',
            'keywords',
            'user_prompts',
            'global_prompt_templates',
            'payment_records',
            'pipeline_runs',
        ];

        console.log('\nSupabase Schema Status:');
        console.log('----------------------------------------------------');
        for (const t of expected) {
            if (tables.includes(t)) {
                console.log(`✅ Table "${t}" exists.`);
            } else {
                console.log(`⏳ Table "${t}" not found yet.`);
            }
        }
        console.log('----------------------------------------------------\n');
    } catch (err: any) {
        console.log('❌ Error querying Supabase REST API:', err.message);
    }
}

checkSupabaseTables();

