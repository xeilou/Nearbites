const express = require('express');
const bcrypt = require('bcrypt');
const db = require('./db');
const { askGPT } = require('./ai.js');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs'); // Built-in Node module for file system operations

const app = express();

// ==========================================
// CLOUDINARY & MULTER CONFIGURATION
// ==========================================
// 1. Configure Cloudinary with the keys from your .env file
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Configure Multer to temporarily save uploaded files in an 'uploads' folder
const upload = multer({ dest: 'uploads/' });

// ==========================================
// FOOD CRUD - UPLOAD IMAGE
// ==========================================
// The 'upload.single("foodImage")' middleware catches the file from the frontend
app.post('/api/food/upload', upload.single('foodImage'), async (req, res) => {
    try {
        // Make sure a file was actually provided
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided.' });
        }

        // 3. Upload the temporary file to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'nearbites_food', // This creates a neat folder inside your Cloudinary account
        });

        // 4. Delete the temporary file from your local computer/server to save space
        fs.unlinkSync(req.file.path);

        // 5. Send the permanent Cloudinary URL back to the frontend!
        res.status(200).json({ 
            message: 'Image uploaded successfully!',
            imageUrl: result.secure_url 
        });

    } catch (error) {
        console.error('Error uploading image to Cloudinary:', error);
        res.status(500).json({ error: 'Failed to upload image.' });
    }
});

// ==========================================
// STORE CRUD - UPLOAD IMAGE
// ==========================================
app.post('/api/stores/upload', upload.single('storeImage'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image file provided.' });

        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'nearbites_stores', // Separate folder to keep things organized!
        });

        fs.unlinkSync(req.file.path);

        res.status(200).json({ 
            message: 'Store image uploaded successfully!',
            imageUrl: result.secure_url 
        });
    } catch (error) {
        console.error('Error uploading store image:', error);
        res.status(500).json({ error: 'Failed to upload store image.' });
    }
});

app.use(express.json());
app.use(express.static('public'));

// ==========================================
// USERS CRUD - CREATE (Public Sign Up & Admin Provisioning)
// ==========================================
app.post('/api/users/signup', async (req, res) => {
    try {
        const { email, password, username, userType } = req.body;
        const parsedType = Number(userType) || 1;

        // 2. Email Domain Validation Rule
        // Students (1) and Admins (3) MUST use the school email. Sellers (2) can use ANY email!
        if ((parsedType === 1 || parsedType === 3) && !email.includes('@lpunetwork')) {
            return res.status(403).json({ 
                error: 'Access denied. Students and Admins must use a valid school email.' 
            });
        }

        // 3. Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 4. Insert into the database
        const query = 'INSERT INTO `Users` (`email`, `password`, `username`, `userType`) VALUES (?, ?, ?, ?)';
        await db.execute(query, [email, hashedPassword, username, parsedType]);

        res.status(201).json({ message: 'User created successfully!' });
    } catch (error) {
        console.error('Error signing up user:', error);
        
        // Handle duplicate emails
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'This email is already registered.' });
        }
        
        res.status(500).json({ error: 'Failed to create user. Please check your data.' });
    }
});

// ==========================================
// USERS CRUD - READ (Login)
// ==========================================
app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Check if both email and password were provided
        if (!email || !password) {
            return res.status(400).json({ error: 'Please provide both email and password.' });
        }

        // 2. Search for the user in the database
        const query = 'SELECT * FROM `Users` WHERE `email` = ?';
        // db.execute returns an array where the first item contains our database rows
        const [rows] = await db.execute(query, [email]); 

        // If the array is empty, the user doesn't exist
        if (rows.length === 0) {
            // Security Best Practice: Use a generic error message
            return res.status(401).json({ error: 'Invalid email or password.' }); 
        }

        // Grab the actual user object from the rows array
        const user = rows[0];

        // 3. Compare the typed password with the hashed database password
        // bcrypt.compare() automatically handles the salt and hashing math for us!
        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!isPasswordMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // STRICT SUSPENSION CHECK
        if (user.isActive === 0) {
            return res.status(403).json({ error: '🚨 This account has been suspended by the platform administrator.' });
        }

        // 4. Success! Send back the user data so the frontend knows who logged in
        res.status(200).json({
            message: 'Login successful!',
            user: {
                userId: user.userId,
                username: user.username,
                email: user.email,
                userType: user.userType,
                hasCompletedOnboarding: user.hasCompletedOnboarding || 0,
                // MOVE THIS INSIDE THE USER OBJECT:
                mustChangePassword: user.mustChangePassword || 0 
            }
        });

    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'An error occurred during login. Please try again.' });
    }
});

// ==========================================
// USER CRUD - COMPLETE ONBOARDING FOREVER
// ==========================================
app.post('/api/users/complete-onboarding/:userId', async (req, res) => {
    try {
        const query = 'UPDATE `Users` SET `hasCompletedOnboarding` = 1 WHERE `userId` = ?';
        await db.execute(query, [req.params.userId]);
        res.status(200).json({ message: 'Onboarding marked as complete!' });
    } catch (error) {
        console.error("Onboarding DB Error:", error);
        res.status(500).json({ error: 'Failed to update onboarding status.' });
    }
});

// ==========================================
// USER CRUD - UPDATE (Profile & Admin Edit)
// ==========================================
app.put('/api/users/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { username, password, email, userType, isActive } = req.body;
        
        let updateFields = [];
        let values = [];

        // Dynamically build the SQL query based on what the frontend sent
        if (username) { updateFields.push('`username` = ?'); values.push(username); }
        if (email) { updateFields.push('`email` = ?'); values.push(email); }
        if (userType) { updateFields.push('`userType` = ?'); values.push(userType); }
        if (isActive !== undefined) { updateFields.push('`isActive` = ?'); values.push(isActive); }
        
        if (password) {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            updateFields.push('`password` = ?, `mustChangePassword` = 0');
            values.push(hashedPassword);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update.' });
        }

        const query = `UPDATE \`Users\` SET ${updateFields.join(', ')} WHERE \`userId\` = ?`;
        values.push(userId);

        await db.execute(query, values);
        res.status(200).json({ message: 'User updated successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update user.' });
    }
});

// ==========================================
// ADMIN CRUD - CREATE SELLER
// ==========================================
app.post('/api/admin/create-seller', async (req, res) => {
    try {
        const { email, password, username } = req.body;

        // 1. Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 2. Insert into the database with userType 2 (Seller)
        // Mark mustChangePassword = 1 so the seller is forced to change password on first login
        const query = 'INSERT INTO `Users` (`email`, `password`, `username`, `userType`, `mustChangePassword`) VALUES (?, ?, ?, 2, 1)';
        await db.execute(query, [email, hashedPassword, username]);

        res.status(201).json({ message: 'Seller account created successfully!', mustChangePassword: 1 });
    } catch (error) {
        console.error('Error creating seller:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'This email is already registered to another user.' });
        }
        res.status(500).json({ error: 'Failed to create seller account.' });
    }
});

// ==========================================
// STORES CRUD - CREATE
// ==========================================
app.post('/api/stores', async (req, res) => {
    try {
        // NEW: Added imageUrl
        const { storeManager, storeName, storeLocation, imageUrl } = req.body;

        if (!storeManager || !storeName || !storeLocation) {
            return res.status(400).json({ error: 'Store manager, name, and location are required.' });
        }

        const query = 'INSERT INTO `Stores` (`storeManager`, `storeName`, `storeLocation`, `imageUrl`) VALUES (?, ?, ?, ?)';
        await db.execute(query, [storeManager, storeName, storeLocation, imageUrl || null]);

        res.status(201).json({ message: 'Store successfully registered!' });
    } catch (error) {
        console.error('Error creating store:', error);
        res.status(500).json({ error: 'Failed to create store.' });
    }
});

// ==========================================
// FOOD CRUD - CREATE NEW FOOD (WITH AI NUTRITION)
// ==========================================
app.post('/api/food', async (req, res) => {
    try {
        let { servedAt, foodName, foodPrice, category, description, isQuickServe, tags, imageUrl, calories, carbs } = req.body;
        
        // 1. Two separate flags!
        let isCaloriesAiEstimated = 0; 
        let isCarbsAiEstimated = 0; 

        // 🤖 AI NUTRITION ESTIMATOR INTERCEPTOR
        if (!calories || !carbs) {
            console.log(`Asking AI to estimate missing macros for ${foodName}...`);
            try {
                const systemPrompt = `
                    You are a nutrition expert. Estimate the nutritional values for a campus food item. 
                    Respond ONLY with a valid JSON object containing "calories" (an integer) and "carbs" (an integer in grams). 
                    Do not include any other text or markdown formatting. 
                    Example: {"calories": 350, "carbs": 45}
                `;
                const userPrompt = `Food Name: ${foodName}\nCategory: ${category || 'Main Menu'}\nDesc: ${description || ''}`;

                const aiRes = await askGPT(systemPrompt, userPrompt);
                
                const jsonMatch = aiRes.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const aiData = JSON.parse(jsonMatch[0]);
                    
                    // 2. Only overwrite and flag if the specific field was blank!
                    if (!calories) {
                        calories = aiData.calories;
                        isCaloriesAiEstimated = 1;
                    }
                    if (!carbs) {
                        carbs = aiData.carbs;
                        isCarbsAiEstimated = 1;
                    }
                    
                    console.log(`🤖 AI injected: ${isCaloriesAiEstimated ? 'Calories ' : ''}${isCarbsAiEstimated ? 'Carbs' : ''}`);
                }
            } catch (e) {
                console.error("AI estimation failed. Defaulting to 0.", e);
                calories = calories || 0;
                carbs = carbs || 0;
            }
        }

        // 3. Update the INSERT statement to use the TWO new columns
        const insertFoodQuery = `
            INSERT INTO \`Food\` 
            (\`servedAt\`, \`foodName\`, \`foodPrice\`, \`category\`, \`description\`, \`isQuickServe\`, \`imageUrl\`, \`calories\`, \`isCaloriesAiEstimated\`, \`carbs\`, \`isCarbsAiEstimated\`) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.execute(insertFoodQuery, [
            servedAt, 
            foodName, 
            foodPrice, 
            category || 'Main Menu', 
            description || '', 
            isQuickServe || 0, 
            imageUrl || null, 
            calories || 0, 
            isCaloriesAiEstimated, // Save the calorie flag
            carbs || 0,
            isCarbsAiEstimated     // Save the carb flag
        ]);
        const newFoodId = result.insertId;

        // 3. ATTACH THE TAGS
        if (tags && Array.isArray(tags)) {
            for (let t of tags) {
                const tagStr = t.toLowerCase().trim();
                
                // Find or create the tag
                let [tagRows] = await db.execute('SELECT tagId FROM `Tags` WHERE tagName = ?', [tagStr]);
                let tagId;
                
                if (tagRows.length === 0) {
                    const [insertRes] = await db.execute('INSERT INTO `Tags` (tagName) VALUES (?)', [tagStr]);
                    tagId = insertRes.insertId;
                } else {
                    tagId = tagRows[0].tagId;
                }
                
                // Link tag to the newly created food item
                await db.execute('INSERT INTO `Food_Tags` (foodId, tagId) VALUES (?, ?)', [newFoodId, tagId]);
            }
        }

        res.status(201).json({ message: 'Food item created successfully!', foodId: newFoodId });

    } catch (error) {
        console.error('Error creating food:', error);
        res.status(500).json({ error: 'Failed to create food item.' });
    }
});

// ==========================================
// STORES CRUD - READ (Fetch stores for a specific Seller)
// ==========================================
app.get('/api/stores/seller/:userId', async (req, res) => {
    try {
        const sellerId = req.params.userId;
        // SELECT * grabs the storeName, location, isActive status, AND your new imageUrl!
        const query = 'SELECT * FROM `Stores` WHERE `storeManager` = ?';
        const [rows] = await db.execute(query, [sellerId]);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching stores:', error);
        res.status(500).json({ error: 'Failed to retrieve stores.' });
    }
});

// ==========================================
// STORES CRUD - READ SINGLE STORE (Public Front)
// ==========================================
app.get('/api/stores/details/:storeId', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT `storeId`, `storeName`, `storeLocation`, `imageUrl` FROM `Stores` WHERE `storeId` = ? AND `isActive` = 1', [req.params.storeId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Store not found or is suspended.' });
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch store details.' });
    }
});

// ==========================================
// STORE CRUD - UPDATE (Edit, Suspend, Image)
// ==========================================
app.put('/api/stores/:storeId', async (req, res) => {
    try {
        const { storeName, storeLocation, isActive, imageUrl } = req.body;
        let updateFields = [];
        let values = [];

        if (storeName) { updateFields.push('`storeName` = ?'); values.push(storeName); }
        if (storeLocation) { updateFields.push('`storeLocation` = ?'); values.push(storeLocation); }
        if (isActive !== undefined) { updateFields.push('`isActive` = ?'); values.push(isActive); }
        if (imageUrl !== undefined) { updateFields.push('`imageUrl` = ?'); values.push(imageUrl); }

        if (updateFields.length === 0) return res.status(400).json({ error: 'No fields to update.' });

        const query = `UPDATE \`Stores\` SET ${updateFields.join(', ')} WHERE \`storeId\` = ?`;
        values.push(req.params.storeId);

        await db.execute(query, values);
        res.status(200).json({ message: 'Store updated successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update store.' });
    }
});

// ==========================================
// STORE CRUD - DELETE (Wipes DB & Cloudinary)
// ==========================================
app.delete('/api/stores/:storeId', async (req, res) => {
    try {
        const targetId = req.params.storeId;

        // 1. Fetch the store's Image URL before deleting
        const [storeRows] = await db.execute('SELECT `imageUrl` FROM `Stores` WHERE `storeId` = ?', [targetId]);
        if (storeRows.length === 0) return res.status(404).json({ error: 'Store not found.' });
        const imageUrl = storeRows[0].imageUrl;

        // 2. Delete the DB record
        const [result] = await db.execute('DELETE FROM `Stores` WHERE `storeId` = ?', [targetId]);
        
        // 3. Delete from Cloudinary!
        if (imageUrl && imageUrl.includes('cloudinary')) {
            try {
                const parts = imageUrl.split('/');
                const filenameWithExt = parts.pop(); 
                const folderName = parts.pop();      
                const filename = filenameWithExt.split('.')[0]; 
                await cloudinary.uploader.destroy(`${folderName}/${filename}`);
                console.log('Store image vaporized from Cloudinary.');
            } catch (cloudErr) {
                console.error("Cloudinary store image deletion failed:", cloudErr);
            }
        }

        res.status(200).json({ message: 'Store deleted successfully!' });
    } catch (error) { res.status(500).json({ error: 'Failed to delete store.' }); }
});

// ==========================================
// FOOD CRUD - UPDATE
// ==========================================
app.put('/api/food/:foodId', async (req, res) => {
    try {
        const { foodName, description, foodPrice, isQuickServe, tags, category, variations, imageUrl, calories, carbs } = req.body;
        const foodId = req.params.foodId;

        // 1. Build a dynamic update query based on what was sent
        let updateFields = [
            '`foodName` = ?', '`description` = ?', '`foodPrice` = ?', 
            '`isQuickServe` = ?', '`category` = ?', '`calories` = ?', '`carbs` = ?'
        ];
        let values = [
            foodName, description || '', foodPrice, 
            isQuickServe, category || 'Main Menu', calories || 0, carbs || 0
        ];

        // Only update the image if a new one was actually uploaded
        if (imageUrl) {
            updateFields.push('`imageUrl` = ?');
            values.push(imageUrl);
        }

        // Add the foodId to the end of the values array for the WHERE clause
        values.push(foodId);

        const updateQuery = `UPDATE \`Food\` SET ${updateFields.join(', ')} WHERE \`foodId\` = ?`;
        await db.execute(updateQuery, values);

        // 2. Update Tags
        if (tags && Array.isArray(tags)) {
            await db.execute('DELETE FROM `Food_Tags` WHERE `foodId` = ?', [foodId]);
            for (let t of tags) {
                const tagStr = t.toLowerCase().trim();
                let [tagRows] = await db.execute('SELECT tagId FROM `Tags` WHERE tagName = ?', [tagStr]);
                let tagId;
                if (tagRows.length === 0) {
                    const [insertRes] = await db.execute('INSERT INTO `Tags` (tagName) VALUES (?)', [tagStr]);
                    tagId = insertRes.insertId;
                } else {
                    tagId = tagRows[0].tagId;
                }
                await db.execute('INSERT INTO `Food_Tags` (foodId, tagId) VALUES (?, ?)', [foodId, tagId]);
            }
        }

        // 3. Update Variations
        if (variations) {
            await db.execute('DELETE FROM `Food_Variations` WHERE `foodId` = ?', [foodId]);
            for (let v of variations) {
                if (v.name && v.price) {
                    await db.execute('INSERT INTO `Food_Variations` (`foodId`, `variationName`, `price`) VALUES (?, ?, ?)', [foodId, v.name, v.price]);
                }
            }
        }

        res.status(200).json({ message: 'Food item updated successfully.' });
    } catch (error) {
        console.error('Error updating food:', error);
        res.status(500).json({ error: 'Failed to update food item.' });
    }
});

// ==========================================
// FOOD CRUD - READ BY STORE
// ==========================================
app.get('/api/food/store/:storeId', async (req, res) => {
    try {
        const query = `
            SELECT 
                f.*, 
                (SELECT IFNULL(AVG(r.starRating), 0) FROM \`Reviews\` r WHERE r.foodId = f.foodId) as avgRating,
                (SELECT COUNT(r.reviewId) FROM \`Reviews\` r WHERE r.foodId = f.foodId) as reviewCount,
                GROUP_CONCAT(t.tagName SEPARATOR ',') as foodTags
            FROM \`Food\` f
            LEFT JOIN \`Food_Tags\` ft ON f.foodId = ft.foodId
            LEFT JOIN \`Tags\` t ON ft.tagId = t.tagId
            WHERE f.servedAt = ?
            GROUP BY f.foodId
        `;
        const [rows] = await db.execute(query, [req.params.storeId]);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching store menu:", error);
        res.status(500).json({ error: 'Failed to fetch food items.' });
    }
});

// ==========================================
// FOOD CRUD - READ SINGLE ITEM (For Product Page)
// ==========================================
app.get('/api/food/item/:foodId', async (req, res) => {
    try {
        const query = `
            SELECT 
                f.*, 
                s.storeName, 
                (SELECT IFNULL(AVG(r.starRating), 0) FROM \`Reviews\` r WHERE r.foodId = f.foodId) as avgRating,
                (SELECT COUNT(r.reviewId) FROM \`Reviews\` r WHERE r.foodId = f.foodId) as reviewCount,
                (SELECT GROUP_CONCAT(t.tagName SEPARATOR ',') 
                 FROM \`Food_Tags\` ft 
                 JOIN \`Tags\` t ON ft.tagId = t.tagId 
                 WHERE ft.foodId = f.foodId) as foodTags
            FROM \`Food\` f 
            JOIN \`Stores\` s ON f.servedAt = s.storeId 
            JOIN \`Users\` u ON s.storeManager = u.userId
            WHERE f.foodId = ? AND s.isActive = 1 AND u.isActive = 1
        `;
        const [rows] = await db.execute(query, [req.params.foodId]);
        
        if (rows.length === 0) return res.status(404).json({ error: 'Food not found or store is suspended.' });

        // Fetch Variations for this specific item (THIS WAS MISSING!)
        const [varRows] = await db.execute('SELECT `variationId`, `variationName`, `price` FROM `Food_Variations` WHERE `foodId` = ?', [req.params.foodId]);
        rows[0].variations = varRows;

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error("Error fetching single food item:", error);
        res.status(500).json({ error: 'Failed to fetch food details.' });
    }
});

// This route powers your homepage, search bar, and grab-and-go filters!
app.get('/api/food', async (req, res) => {
    try {
        // Grab query parameters from the URL (e.g., /api/food?search=burger&isQuickServe=1)
        const { search, isQuickServe } = req.query;
        
        // Start with a base query that grabs everything
        let query = 'SELECT * FROM `Food` WHERE 1=1';
        const values = [];

        // If the user typed something in the search bar
        if (search) {
            query += ' AND `foodName` LIKE ?';
            values.push(`%${search}%`); // The % symbols allow partial matches (e.g., "burg" finds "burger")
        }

        // If the user clicked the "Grab-and-go" filter
        if (isQuickServe !== undefined) {
            query += ' AND `isQuickServe` = ?';
            // Convert to a number (1 for true, 0 for false) to match our MySQL boolean structure
            values.push(isQuickServe === 'true' || isQuickServe === '1' ? 1 : 0);
        }

        // Execute the dynamic query
        const [rows] = await db.execute(query, values);
        
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching food items:', error);
        res.status(500).json({ error: 'Failed to retrieve the menu.' });
    }
});

// ==========================================
// FOOD CRUD - SMART FEED (Personalized Recommendations)
// ==========================================
app.get('/api/food/smart-feed/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        const [prefs] = await db.execute('SELECT * FROM `Preferences` WHERE `userId` = ?', [userId]);
        
        let userBudget = null;
        let userTags = [];
        let userDislikes = []; // NEW: Array for things they hate!

        prefs.forEach(p => {
            if (p.preferenceType === 'BUDGET') userBudget = parseFloat(p.maxBudget);
            if (p.preferenceType === 'TAG') userTags.push(p.description.toLowerCase());
            if (p.preferenceType === 'DISLIKE') userDislikes.push(p.description.toLowerCase()); // NEW!
        });

        // BULLETPROOF QUERY: Filters out Suspended Stores and Managers!
        // BULLETPROOF QUERY: Filters out Suspended Stores and Managers!
        const menuQuery = `
            SELECT 
                f.*, 
                s.storeName,
                (SELECT IFNULL(AVG(r.starRating), 0) FROM \`Reviews\` r WHERE r.foodId = f.foodId) as avgRating,
                (SELECT COUNT(r.reviewId) FROM \`Reviews\` r WHERE r.foodId = f.foodId) as reviewCount,
                (SELECT GROUP_CONCAT(t.tagName SEPARATOR ',') 
                 FROM \`Food_Tags\` ft 
                 JOIN \`Tags\` t ON ft.tagId = t.tagId 
                 WHERE ft.foodId = f.foodId) as foodTags
            FROM \`Food\` f
            JOIN \`Stores\` s ON f.servedAt = s.storeId
            JOIN \`Users\` u ON s.storeManager = u.userId
            WHERE s.isActive = 1 AND u.isActive = 1
        `;
        const [foods] = await db.execute(menuQuery); 
        if (foods.length === 0) return res.status(200).json({ recommended: [], all: [] });

        const rankedFoods = foods.map(food => {
            let score = 0;
            let matchReasons = [];
            const searchString = `${food.foodName} ${food.description} ${food.foodTags || ''}`.toLowerCase();

            if (userBudget && parseFloat(food.foodPrice) <= userBudget) {
                score += 10;
                matchReasons.push('Under Budget');
            }

            // Reward Likes
            userTags.forEach(tag => {
                if (searchString.includes(tag)) {
                    score += 20; 
                    matchReasons.push(`Matches: ${tag}`);
                }
            });

            // PENALIZE DISLIKES!
            userDislikes.forEach(dislike => {
                if (searchString.includes(dislike)) {
                    score -= 100; // Massive penalty so it drops to the bottom!
                    matchReasons.push(`Contains: ${dislike} (Avoid)`);
                }
            });

            // 🌟 REAL "Campus Favorite" Logic: Must have a high rating or lots of reviews!
            if (parseFloat(food.avgRating) >= 4.0 || parseInt(food.reviewCount) >= 3) {
                score += 15; // Give it a massive boost so it floats to the top
                matchReasons.push('Campus Favorite');
            } 
            
            // 🛑 The Fallback: If the user has zero preferences, just give items a tiny base score 
            // so the feed isn't empty, but DO NOT add a misleading tag!
            if (prefs.length === 0 && matchReasons.length === 0) {
                score += 1; 
            }

            return { ...food, matchScore: score, matchReasons: matchReasons };
        });

        rankedFoods.sort((a, b) => b.matchScore - a.matchScore);

        const recommended = prefs.length === 0 ? rankedFoods.slice(0, 5) : rankedFoods.filter(f => f.matchScore >= 10);
        
        res.status(200).json({
            budget: userBudget,
            tags: userTags,
            recommended: recommended,
            all: rankedFoods
        });

    } catch (error) {
        console.error('Smart feed error:', error);
        res.status(500).json({ error: 'Failed to generate personalized feed.' });
    }
});

// ==========================================
// FOOD CRUD - DELETE (Seller removes food & image)
// ==========================================
app.delete('/api/food/:foodId', async (req, res) => {
    try {
        const targetFoodId = req.params.foodId;

        // 1. Fetch the food item first to get its Image URL
        const [foodRows] = await db.execute('SELECT `imageUrl` FROM `Food` WHERE `foodId` = ?', [targetFoodId]);
        
        if (foodRows.length === 0) {
            return res.status(404).json({ error: 'Food item not found.' });
        }

        const imageUrl = foodRows[0].imageUrl;

        // 2. Delete the database record
        const query = 'DELETE FROM `Food` WHERE `foodId` = ?';
        await db.execute(query, [targetFoodId]);

        // 3. Delete the image from Cloudinary (if it exists)
        if (imageUrl && imageUrl.includes('cloudinary')) {
            try {
                // Cloudinary URLs look like: .../upload/v12345/nearbites_food/abcde.jpg
                // We need to extract: nearbites_food/abcde
                const parts = imageUrl.split('/');
                const filenameWithExt = parts.pop(); // "abcde.jpg"
                const folderName = parts.pop();      // "nearbites_food"
                const filename = filenameWithExt.split('.')[0]; // "abcde"
                
                const publicId = `${folderName}/${filename}`;
                
                // Tell Cloudinary to vaporize it
                await cloudinary.uploader.destroy(publicId);
                console.log(`Successfully deleted image from Cloudinary: ${publicId}`);
            } catch (cloudErr) {
                console.error("Cloudinary deletion failed, but DB record was deleted:", cloudErr);
            }
        }

        res.status(200).json({ message: 'Food item and image permanently removed.' });
    } catch (error) {
        console.error('Error deleting food:', error);
        res.status(500).json({ error: 'Failed to delete food item.' });
    }
});

// ==========================================
// PREFERENCES CRUD - CREATE (Save a new preference)
// ==========================================
app.post('/api/preferences', async (req, res) => {
    try {
        // ADDED 'description' to the destructured body!
        const { userId, preferenceType, tagId, ingredientId, maxBudget, description } = req.body;

        if (!userId || !preferenceType) {
            return res.status(400).json({ error: 'User ID and Preference Type are required.' });
        }

        // ADDED 'description' to the SQL Insert query!
        const query = `
            INSERT INTO \`Preferences\` 
            (\`userId\`, \`preferenceType\`, \`tagId\`, \`ingredientId\`, \`maxBudget\`, \`description\`) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        await db.execute(query, [
            userId, 
            preferenceType, 
            tagId || null, 
            ingredientId || null, 
            maxBudget || null,
            description || null
        ]);

        res.status(201).json({ message: 'Preference saved successfully!' });
    } catch (error) {
        console.error('Error saving preference:', error);
        res.status(500).json({ error: 'Failed to save preference.' });
    }
});

// ==========================================
// PREFERENCES CRUD - READ (Get user's profile settings)
// ==========================================
app.get('/api/preferences/:userId', async (req, res) => {
    try {
        const targetUserId = req.params.userId;

        // Fetch all preferences for this specific user
        const query = 'SELECT * FROM `Preferences` WHERE `userId` = ?';
        const [rows] = await db.execute(query, [targetUserId]);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching preferences:', error);
        res.status(500).json({ error: 'Failed to load user preferences.' });
    }
});

// ==========================================
// PREFERENCES CRUD - DELETE (Remove a preference)
// ==========================================
app.delete('/api/preferences/:preferenceId', async (req, res) => {
    try {
        const targetPrefId = req.params.preferenceId;

        const query = 'DELETE FROM `Preferences` WHERE `preferenceId` = ?';
        const [result] = await db.execute(query, [targetPrefId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Preference not found.' });
        }

        res.status(200).json({ message: 'Preference removed.' });
    } catch (error) {
        console.error('Error deleting preference:', error);
        res.status(500).json({ error: 'Failed to delete preference.' });
    }
});

// ==========================================
// REVIEWS CRUD - CREATE OR UPDATE (1 Per User)
// ==========================================
app.post('/api/reviews', async (req, res) => {
    try {
        const { userId, foodId, starRating } = req.body;

        if (!userId || !foodId || starRating === undefined) {
            return res.status(400).json({ error: 'Missing data.' });
        }

        // 1. Check if this user has already reviewed this exact food item
        const checkQuery = 'SELECT `reviewId` FROM `Reviews` WHERE `userId` = ? AND `foodId` = ?';
        const [existing] = await db.execute(checkQuery, [userId, foodId]);

        if (existing.length > 0) {
            // 2. If a review exists, UPDATE the stars
            const updateQuery = 'UPDATE `Reviews` SET `starRating` = ? WHERE `reviewId` = ?';
            await db.execute(updateQuery, [starRating, existing[0].reviewId]);
            return res.status(200).json({ message: 'Review updated successfully!' });
        } else {
            // 3. If no review exists, INSERT a new one
            const insertQuery = 'INSERT INTO `Reviews` (`userId`, `foodId`, `starRating`) VALUES (?, ?, ?)';
            await db.execute(insertQuery, [userId, foodId, starRating]);
            return res.status(201).json({ message: 'Review saved! Thank you.' });
        }

    } catch (error) { 
        console.error('Review Error:', error);
        res.status(500).json({ error: 'Failed to submit review.' }); 
    }
});

// ==========================================
// REVIEWS CRUD - READ (Get Reviews for a Food Item)
// ==========================================
app.get('/api/reviews/food/:foodId', async (req, res) => {
    try {
        const targetFoodId = req.params.foodId;

        // Fetch the reviews and optionally join the Users table to get the username of the reviewer
        const query = `
            SELECT r.reviewId, r.starRating, u.username 
            FROM \`Reviews\` r
            JOIN \`Users\` u ON r.userId = u.userId
            WHERE r.foodId = ?
        `;
        const [rows] = await db.execute(query, [targetFoodId]);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: 'Failed to load reviews.' });
    }
});

// ==========================================
// AI - 3. FOOD BUNDLE (Bulletproof Parsing & Flexible Pairs)
// ==========================================
app.post('/api/ai/recommend-bundle', async (req, res) => {
    try {
        const { userId, foodName, customBudget, goal, minStars } = req.body;
        if (!userId) return res.status(400).json({ error: 'User ID missing.' });

        const [prefs] = await db.execute('SELECT * FROM `Preferences` WHERE `userId` = ?', [userId]);
        let userBudget = customBudget || prefs.find(p => p.preferenceType === 'BUDGET')?.maxBudget;
        
        const prefTags = prefs.filter(p => p.preferenceType === 'TAG').map(p => p.description).join(', ');
        const dislikes = prefs.filter(p => p.preferenceType === 'DISLIKE').map(p => p.description).join(', ');
        
        const ratingThreshold = Number(minStars) || 0;

        const [menuItems] = await db.execute(`
            SELECT f.foodId, f.foodName, f.description, f.foodPrice, IFNULL(AVG(r.starRating), 0) AS averageRating 
            FROM \`Food\` f 
            LEFT JOIN \`Reviews\` r ON f.foodId = r.foodId 
            WHERE f.foodName != ?
            GROUP BY f.foodId
            HAVING averageRating >= ?
        `, [foodName, ratingThreshold]);

        if (menuItems.length === 0) return res.status(200).json({ food: foodName, recommendation: "Not enough items match your criteria to pair!" });
        
        const systemPrompt = `
            You are a culinary AI. Recommend 1 or 2 complementary items from the menu to pair with the Target Food: ${foodName}.
            
            PROFILE:
            - Craving: ${goal || 'Complement the meal'}
            - Preferences: ${prefTags || 'None'}
            - Budget: PHP ${userBudget || 'Unlimited'}
            - ALLERGIES / DISLIKES: ${dislikes || 'None'}
            
            RULES:
            1. NEVER recommend anything containing the user's Allergies/Dislikes.
            2. Pick 1 to 2 items from the provided menu array.
            3. Output valid JSON only.
            
            FORMAT EXACTLY LIKE THIS:
            {
              "foodIds": [integer, integer],
              "pitch": "Short pitch here"
            }
        `;
        
        const aiResponse = await askGPT(systemPrompt, `Menu: ${JSON.stringify(menuItems)}`);
        
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI did not return valid JSON.");
        const parsedData = JSON.parse(jsonMatch[0]);

        // BULLETPROOF ID PARSING: Catches singular, plural, and weird AI formatting!
        let rawIds = parsedData.foodIds || parsedData.foodId || parsedData.ids || [];
        if (!Array.isArray(rawIds)) rawIds = [rawIds];
        const validIds = rawIds.filter(id => !isNaN(id) && id !== null);

        let foodDetails = [];
        if (validIds.length > 0) {
            const placeholders = validIds.map(() => '?').join(',');
            const query = `SELECT f.foodId, f.foodName, f.foodPrice, f.imageUrl, s.storeName FROM \`Food\` f JOIN \`Stores\` s ON f.servedAt = s.storeId WHERE f.foodId IN (${placeholders})`;
            const [rows] = await db.execute(query, validIds);
            foodDetails = rows;
        }

        res.status(200).json({ food: foodName, recommendation: parsedData.pitch || "Great pairing!", foods: foodDetails });
    } catch (error) { 
        console.error("Pairing Error:", error);
        res.status(500).json({ error: 'Failed to generate pairing.' }); 
    }
});

// ==========================================
// AI FEATURES - CARBS & CALORIE ESTIMATION
// ==========================================
app.post('/api/ai/estimate-macros', async (req, res) => {
    try {
        // The frontend will send the food's name and description
        const { foodName, description } = req.body;

        if (!foodName) {
            return res.status(400).json({ error: 'Please provide the food name.' });
        }

        // 1. Give the AI strict instructions to return ONLY data (System Prompt)
        const systemPrompt = `
            You are an expert nutritional AI for the LPU-C Nearbites app.
            The user will provide a food name and an optional description. 
            Estimate the total carbohydrates (in grams) and total calories for one standard serving.
            You MUST respond with ONLY a valid JSON object. Do not include any other conversational text.
            Do NOT include markdown formatting like \`\`\`json.
            Example format: {"carbs": 45.5, "calories": 350}
        `;

        // 2. The user's specific food data
        const userPrompt = `Food: ${foodName}\nDescription: ${description || 'No description provided'}`;

        // 3. Send the request to your OpenRouter helper
        const aiResponseText = await askGPT(systemPrompt, userPrompt);

        // 4. Convert the AI's text response into a real JavaScript object
        const macros = JSON.parse(aiResponseText);

        // 5. Send the neat data back to the frontend
        res.status(200).json({
            food: foodName,
            estimatedCarbs: macros.carbs,
            estimatedCalories: macros.calories
        });

    } catch (error) {
        console.error('Error estimating macros:', error);
        res.status(500).json({ 
            error: 'Failed to estimate nutritional information. The AI may not have returned valid JSON.' 
        });
    }
});

// ==========================================
// AI - 2. WEEKLY MEAL PLANNER (No-Math Array Version)
// ==========================================
app.post('/api/ai/generate-meal-plan', async (req, res) => {
    try {
        const { userId, startDate, goal, schedule, customBudget, minStars } = req.body;
        if (!userId || !startDate) return res.status(400).json({ error: 'User ID and Start Date required.' });

        const [prefs] = await db.execute('SELECT * FROM `Preferences` WHERE `userId` = ?', [userId]);
        const prefTags = prefs.filter(p => p.preferenceType === 'TAG').map(p => p.description).join(', ');

        const ratingThreshold = Number(minStars) || 0;
        const menuQuery = `
            SELECT f.foodId, f.foodName, f.description, f.foodPrice, IFNULL(AVG(r.starRating), 0) AS averageRating 
            FROM \`Food\` f 
            LEFT JOIN \`Reviews\` r ON f.foodId = r.foodId 
            GROUP BY f.foodId
            HAVING averageRating >= ?
        `;
        const [foodItems] = await db.execute(menuQuery, [ratingThreshold]);
        
        if (foodItems.length === 0) {
            return res.status(400).json({ error: 'No food items meet this star rating to create a meal plan.' });
        }

        // We removed the JSON wrapper and math requirements!
        const systemPrompt = `
            You are a meal plan data generator.
            
            PROFILE:
            - Goal: ${goal || 'Balanced Diet'}
            - Tags: ${prefTags || 'None'}
            - Schedule: ${schedule}
            - Budget Target: PHP ${customBudget || 'Unlimited'}
            
            CRITICAL RULES:
            1. Look at the Schedule. You MUST generate exactly one JSON object for EVERY single meal requested.
            2. DO NOT calculate the total cost. I will do that. Just pick cheap items if the budget is low.
            3. REPEAT items if necessary to fill every single slot.
            4. Return ONLY a flat JSON array. NO wrappers, NO text.
            
            FORMAT EXACTLY LIKE THIS ARRAY:
            [
              {"dayOfWeek": 1, "mealType": "Breakfast", "foodId": 5},
              {"dayOfWeek": 1, "mealType": "Lunch", "foodId": 12},
              {"dayOfWeek": 2, "mealType": "Dinner", "foodId": 8}
            ]
        `;

        const aiResponseText = await askGPT(systemPrompt, `Menu: ${JSON.stringify(foodItems)}`);
        
        // Grab only the array using regex
        const jsonMatch = aiResponseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("AI did not return a valid JSON array.");

        const mealPlanData = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(mealPlanData) || mealPlanData.length === 0) throw new Error("Empty array returned.");

        const planQuery = 'INSERT INTO `MealPlans` (`userId`, `planName`, `startDate`) VALUES (?, ?, ?)';
        const [planResult] = await db.execute(planQuery, [userId, 'AI Generated Weekly Plan', startDate]);
        const newPlanId = planResult.insertId;

        let itemsAdded = 0;
        let manualCost = 0; // We do the math here now!

        for (const entry of mealPlanData) {
            const fId = entry.foodId || entry.food_id || entry.id || entry.food;
            const dOw = entry.dayOfWeek || entry.day_of_week || entry.day;
            const mType = entry.mealType || entry.meal_type || entry.type || entry.meal;

            if(fId && dOw && mType) {
                // Calculate the true cost using your backend database, not the AI
                const matchedFood = foodItems.find(f => f.foodId == fId);
                if (matchedFood) manualCost += Number(matchedFood.foodPrice);

                const entryQuery = 'INSERT INTO `MealPlanEntries` (`planId`, `foodId`, `dayOfWeek`, `mealType`) VALUES (?, ?, ?, ?)';
                await db.execute(entryQuery, [newPlanId, fId, dOw, mType]);
                itemsAdded++;
            }
        }

        if (itemsAdded === 0) {
            await db.execute('DELETE FROM `MealPlans` WHERE `planId` = ?', [newPlanId]);
            return res.status(500).json({ error: 'AI failed to format the schedule correctly. Please try again.' });
        }

        res.status(201).json({ message: `Plan generated! Estimated Total: ₱${manualCost.toFixed(2)}`, planId: newPlanId });
    } catch (error) {
        console.error('Error generating meal plan:', error);
        res.status(500).json({ error: 'AI failed to adhere to formatting. Try again.' });
    }
});

// ==========================================
// AI - 1. QUICK MEAL IDEA (Now Supports Combos & Allergies!)
// ==========================================
app.post('/api/ai/recommend-quick-meal', async (req, res) => {
    try {
        const { userId, customBudget, goal, minStars } = req.body;
        if (!userId) return res.status(400).json({ error: 'User ID is required.' });

        const [prefs] = await db.execute('SELECT * FROM `Preferences` WHERE `userId` = ?', [userId]);
        let userBudget = customBudget || prefs.find(p => p.preferenceType === 'BUDGET')?.maxBudget;
        
        // STRICT PREFERENCE EXTRACTION
        const prefTags = prefs.filter(p => p.preferenceType === 'TAG').map(p => p.description).join(', ');
        const dislikes = prefs.filter(p => p.preferenceType === 'DISLIKE').map(p => p.description).join(', ');

        const ratingThreshold = Number(minStars) || 0;
        
        const menuQuery = `
            SELECT f.foodId, f.foodName, f.description, f.foodPrice, IFNULL(AVG(r.starRating), 0) AS averageRating 
            FROM \`Food\` f 
            LEFT JOIN \`Reviews\` r ON f.foodId = r.foodId 
            GROUP BY f.foodId
            HAVING averageRating >= ?
        `;
        const [menu] = await db.execute(menuQuery, [ratingThreshold]);
        if (menu.length === 0) return res.status(200).json({ recommendation: "No food items meet this criteria right now." });

        const systemPrompt = `
            You are a culinary AI for LPU-C Nearbites.
            
            PROFILE:
            - Goal: ${goal || 'Anything delicious'}
            - Preferences/Likes: ${prefTags || 'None'}
            - Budget: PHP ${userBudget || 'Unlimited'}
            - ALLERGIES / DISLIKES: ${dislikes || 'None'}
            
            CRITICAL RULES:
            1. NEVER recommend anything containing the user's Allergies/Dislikes.
            2. Pick 1 to 3 items from the menu to create a complete meal combo (e.g., Main + Side/Drink).
            3. The TOTAL combined price MUST be <= PHP ${userBudget || 999999}.
            4. Output MUST be valid JSON.
            
            FORMAT EXACTLY LIKE THIS:
            {
              "foodIds": [<insert integer foodIds here as an array>],
              "pitch": "<insert your short explanation here>"
            }
        `;

        const aiResponseText = await askGPT(systemPrompt, `Menu: ${JSON.stringify(menu)}`);
        
        const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI did not return valid JSON.");
        const parsedData = JSON.parse(jsonMatch[0]);

        let foodDetails = [];
        if (parsedData.foodIds && parsedData.foodIds.length > 0) {
            // Safely query multiple food items at once!
            const placeholders = parsedData.foodIds.map(() => '?').join(',');
            const query = `SELECT f.foodId, f.foodName, f.foodPrice, f.imageUrl, s.storeName FROM \`Food\` f JOIN \`Stores\` s ON f.servedAt = s.storeId WHERE f.foodId IN (${placeholders})`;
            const [rows] = await db.execute(query, parsedData.foodIds);
            foodDetails = rows;
        }

        res.status(200).json({ budget: userBudget, recommendation: parsedData.pitch, foods: foodDetails });
    } catch (error) { res.status(500).json({ error: 'Failed to generate recommendation.' }); }
});

// ==========================================
// AI - 3. FOOD BUNDLE (Now Supports Pair Parameters!)
// ==========================================
app.post('/api/ai/recommend-bundle', async (req, res) => {
    try {
        const { userId, foodName, customBudget, goal, minStars } = req.body;
        if (!userId) return res.status(400).json({ error: 'User ID missing.' });

        const [prefs] = await db.execute('SELECT * FROM `Preferences` WHERE `userId` = ?', [userId]);
        let userBudget = customBudget || prefs.find(p => p.preferenceType === 'BUDGET')?.maxBudget;
        
        const prefTags = prefs.filter(p => p.preferenceType === 'TAG').map(p => p.description).join(', ');
        const dislikes = prefs.filter(p => p.preferenceType === 'DISLIKE').map(p => p.description).join(', ');
        
        const ratingThreshold = Number(minStars) || 0;

        const [menuItems] = await db.execute(`
            SELECT f.foodId, f.foodName, f.description, f.foodPrice, IFNULL(AVG(r.starRating), 0) AS averageRating 
            FROM \`Food\` f 
            LEFT JOIN \`Reviews\` r ON f.foodId = r.foodId 
            WHERE f.foodName != ?
            GROUP BY f.foodId
            HAVING averageRating >= ?
        `, [foodName, ratingThreshold]);

        if (menuItems.length === 0) return res.status(200).json({ food: foodName, recommendation: "Not enough items match your criteria to pair!" });
        
        const systemPrompt = `
            You are a culinary AI. Recommend 1 or 2 items to pair with: ${foodName}.
            
            PROFILE:
            - Craving: ${goal || 'Complement the meal'}
            - Preferences: ${prefTags || 'None'}
            - Budget: PHP ${userBudget || 'Unlimited'}
            - ALLERGIES / DISLIKES: ${dislikes || 'None'}
            
            RULES:
            1. NEVER recommend anything containing the user's Allergies/Dislikes.
            2. Pick 1 to 2 items (like a side and/or a beverage) <= PHP ${userBudget || 999999}.
            3. Output valid JSON only.
            
            FORMAT EXACTLY LIKE THIS:
            {
              "foodIds": [<insert integer foodIds here as an array>],
              "pitch": "<insert your short pitch here>"
            }
        `;
        
        const aiResponse = await askGPT(systemPrompt, `Menu: ${JSON.stringify(menuItems)}`);
        
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI did not return valid JSON.");
        const parsedData = JSON.parse(jsonMatch[0]);

        let foodDetails = [];
        if (parsedData.foodIds && parsedData.foodIds.length > 0) {
            const placeholders = parsedData.foodIds.map(() => '?').join(',');
            const query = `SELECT f.foodId, f.foodName, f.foodPrice, f.imageUrl, s.storeName FROM \`Food\` f JOIN \`Stores\` s ON f.servedAt = s.storeId WHERE f.foodId IN (${placeholders})`;
            const [rows] = await db.execute(query, parsedData.foodIds);
            foodDetails = rows;
        }

        res.status(200).json({ food: foodName, recommendation: parsedData.pitch, foods: foodDetails });
    } catch (error) { res.status(500).json({ error: 'Failed to generate pairing.' }); }
});

// ==========================================
// AI - 2. WEEKLY MEAL PLANNER (Now Supports Multi-Item Meals!)
// ==========================================
app.post('/api/ai/generate-meal-plan', async (req, res) => {
    try {
        const { userId, startDate, goal, schedule, customBudget, minStars } = req.body;
        if (!userId || !startDate) return res.status(400).json({ error: 'User ID and Start Date required.' });

        const [prefs] = await db.execute('SELECT * FROM `Preferences` WHERE `userId` = ?', [userId]);
        const prefTags = prefs.filter(p => p.preferenceType === 'TAG').map(p => p.description).join(', ');
        const dislikes = prefs.filter(p => p.preferenceType === 'DISLIKE').map(p => p.description).join(', ');

        const ratingThreshold = Number(minStars) || 0;
        const menuQuery = `
            SELECT f.foodId, f.foodName, f.description, f.foodPrice, IFNULL(AVG(r.starRating), 0) AS averageRating 
            FROM \`Food\` f 
            LEFT JOIN \`Reviews\` r ON f.foodId = r.foodId 
            GROUP BY f.foodId
            HAVING averageRating >= ?
        `;
        const [foodItems] = await db.execute(menuQuery, [ratingThreshold]);
        if (foodItems.length === 0) return res.status(400).json({ error: 'No food items meet this star rating to create a meal plan.' });

        const systemPrompt = `
            You are a backend API that generates meal plans. You MUST return a full JSON object.
            
            USER SETTINGS:
            - Goal: ${goal || 'Balanced Diet'}
            - Preferences: ${prefTags || 'None'}
            - Budget: PHP ${customBudget || 'Unlimited'}
            - ALLERGIES / DISLIKES: ${dislikes || 'None'}
            
            REQUIRED SCHEDULE:
            ${schedule}
            
            CRITICAL INSTRUCTIONS:
            1. NEVER recommend anything containing the user's Allergies/Dislikes.
            2. For EVERY SINGLE MEAL listed in the schedule, you can suggest 1 to 3 items (e.g., Main + Drink) by creating multiple JSON entries with the same dayOfWeek and mealType.
            3. Output ONLY valid JSON.
            
            JSON FORMAT EXACTLY LIKE THIS:
            {
              "calculatedTotalCost": <insert total number here>,
              "entries": [
                {"dayOfWeek": <insert day integer here>, "mealType": "<insert meal string here>", "foodId": <insert food integer here>}
              ]
            }
        `;

        const aiResponseText = await askGPT(systemPrompt, `Menu: ${JSON.stringify(foodItems)}`);
        
        const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI did not return a valid JSON object.");

        const parsedData = JSON.parse(jsonMatch[0]);
        const mealPlanData = parsedData.entries || parsedData.mealPlan || parsedData || []; 

        if (!Array.isArray(mealPlanData) || mealPlanData.length === 0) {
            throw new Error("AI did not format the entries array correctly.");
        }

        const planQuery = 'INSERT INTO `MealPlans` (`userId`, `planName`, `startDate`) VALUES (?, ?, ?)';
        const [planResult] = await db.execute(planQuery, [userId, 'AI Generated Weekly Plan', startDate]);
        const newPlanId = planResult.insertId;

        for (const entry of mealPlanData) {
            if(entry.foodId && entry.dayOfWeek && entry.mealType) {
                const entryQuery = 'INSERT INTO `MealPlanEntries` (`planId`, `foodId`, `dayOfWeek`, `mealType`) VALUES (?, ?, ?, ?)';
                await db.execute(entryQuery, [newPlanId, entry.foodId, entry.dayOfWeek, entry.mealType]);
            }
        }

        res.status(201).json({ message: `Plan generated! Estimated Total: ₱${parsedData.calculatedTotalCost || 'N/A'}`, planId: newPlanId });
    } catch (error) { res.status(500).json({ error: 'AI failed to adhere to strict JSON formatting. Try again.' }); }
});

// ==========================================
// SELLER FEATURES - PRODUCT RECOMMENDER (Top Rated)
// ==========================================
app.get('/api/sellers/store/:storeId/top-products', async (req, res) => {
    try {
        const storeId = req.params.storeId;

        // 1. A powerful SQL query that joins the Food and Reviews tables.
        // It counts the total reviews and calculates the true average star rating.
        const query = `
            SELECT 
                f.foodId, 
                f.foodName, 
                f.foodPrice,
                COUNT(r.reviewId) AS totalReviews, 
                IFNULL(AVG(r.starRating), 0) AS averageRating
            FROM \`Food\` f
            LEFT JOIN \`Reviews\` r ON f.foodId = r.foodId
            WHERE f.servedAt = ?
            GROUP BY f.foodId
            ORDER BY totalReviews DESC, averageRating DESC
            LIMIT 5
        `;

        // 2. Execute the query
        const [topProducts] = await db.execute(query, [storeId]);

        // 3. Send the ranked list back to the frontend
        res.status(200).json(topProducts);

    } catch (error) {
        console.error('Error fetching top products:', error);
        res.status(500).json({ error: 'Failed to load product recommendations for the dashboard.' });
    }
});

// ==========================================
// MEAL PLAN - READ (Fetch User's Latest Plan)
// ==========================================
app.get('/api/mealplans/user/:userId', async (req, res) => {
    try {
        const [plans] = await db.execute('SELECT * FROM `MealPlans` WHERE `userId` = ? ORDER BY `planId` DESC LIMIT 1', [req.params.userId]);
        if (plans.length === 0) return res.status(404).json({ error: 'No meal plan found.' });
        
        // NEW: We added f.foodId to the SELECT statement so the frontend can link to it!
        const query = `
            SELECT e.dayOfWeek, e.mealType, f.foodId, f.foodName, f.foodPrice, f.imageUrl, s.storeName 
            FROM \`MealPlanEntries\` e 
            JOIN \`Food\` f ON e.foodId = f.foodId
            JOIN \`Stores\` s ON f.servedAt = s.storeId
            WHERE e.planId = ? 
            ORDER BY 
                e.dayOfWeek ASC,
                CASE e.mealType 
                    WHEN 'Breakfast' THEN 1 
                    WHEN 'Lunch' THEN 2 
                    WHEN 'Snack' THEN 3 
                    WHEN 'Dinner' THEN 4 
                    ELSE 5 
                END ASC
        `;
        const [entries] = await db.execute(query, [plans[0].planId]);
        res.status(200).json({ plan: plans[0], entries });
    } catch (error) { 
        res.status(500).json({ error: 'Failed to fetch meal plan.' }); 
    }
});

// ==========================================
// ADMIN - GET ALL STORES
// ==========================================
app.get('/api/admin/stores', async (req, res) => {
    try {
        // Fetch all stores and join with the Users table to see who manages them
        const query = `
            SELECT s.*, u.username as managerName, u.email as managerEmail 
            FROM \`Stores\` s
            LEFT JOIN \`Users\` u ON s.storeManager = u.userId
            ORDER BY s.storeName ASC
        `;
        const [stores] = await db.execute(query);
        res.status(200).json(stores);
    } catch (error) {
        console.error('Error fetching admin stores:', error);
        res.status(500).json({ error: 'Failed to load stores.' });
    }
});

// ==========================================
// ADMIN - GET ALL USERS
// ==========================================
app.get('/api/admin/users', async (req, res) => {
    try {
        // We MUST explicitly select isActive!
        const [users] = await db.execute('SELECT `userId`, `username`, `email`, `userType`, `isActive` FROM `Users`');
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to load users.' });
    }
});

// ==========================================
// ADMIN - DELETE USER
// ==========================================
app.delete('/api/admin/users/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const query = 'DELETE FROM `Users` WHERE `userId` = ?';
        const [result] = await db.execute(query, [userId]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found.' });
        res.status(200).json({ message: 'User deleted.' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Nearbites Backend is running on port ${PORT}`);
});