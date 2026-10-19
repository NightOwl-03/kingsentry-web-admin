const express = require('express');
const cors = require('cors');
require('dotenv').config();
const supabase = require('./King_Sentry-main/supabase'); 

const app = express();
app.use(cors());
app.use(express.json()); 

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`King's Sentry Admin Server is running on http://localhost:${PORT}`);
});

app.get('/api/diseases', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('disease_dictionary') 
            .select('*');

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/diseases', async (req, res) => {
   
    const { disease_name, description, risk_id } = req.body; 
    
    try {
        const { data, error } = await supabase
            .from('disease_dictionary') 
            .insert([{ disease_name, description, risk_id }]);

        if (error) throw error;
        res.status(201).json({ message: "Successfully added new disease!", data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (authError) throw authError;
       
        const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('role, username')
            .eq('id', authData.user.id)
            .single();

        if (profileError) throw profileError;

        if (profileData.role !== 'admin') {
            return res.status(403).json({ error: "Access denied. Administrator accounts only." });
        }

        res.status(200).json({ 
            message: "Login successful!", 
            user: authData.user,
            profile: profileData
        });

    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

app.get('/api/dashboard/scans', async (req, res) => {
    try {
     
        const { data, error } = await supabase
            .from('scan_results')
            .select(`
                id,
                confidence_score,
                scan_timestamp,
                disease_dictionary ( disease_name )
            `)
            .order('scan_timestamp', { ascending: false }); 
        if (error) throw error;
        
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/dashboard/kpis', async (req, res) => {
    try {
        
        const { data, error } = await supabase
            .from('scan_results')
            .select(`disease_dictionary(disease_name)`);

        if (error) throw error;

        let total = data.length;
        let healthy = 0, spot = 0, blight = 0;

        data.forEach(scan => {
            
            const diseaseName = scan.disease_dictionary ? scan.disease_dictionary.disease_name : 'Healthy';
            
            if (diseaseName === 'Leaf Spot') spot++;
            else if (diseaseName === 'Leaf Blight') blight++;
            else healthy++;
        });

        res.status(200).json({ total, healthy, leafSpot: spot, leafBlight: blight });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});