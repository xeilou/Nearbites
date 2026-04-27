const express = require('express');
const bcrypt = require('bcrypt');
const db = require('./db');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs'); // Built-in Node module for file system operations
const { askGPT } = require('./ai'); // Add this near your other requires

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

app.use(express.json());
app.use(express.static('public'));

// ==========================================
// USERS CRUD - CREATE (Public Sign Up)
// ==========================================
app.post('/api/users/signup', async (req, res) => {
    try {
        // 1. We removed 'userId' from here!
        const { email, password, username, userType } = req.body;

        // 2. Email Domain Validation Rule
        if (!email.endsWith('@lpunetwork.edu.ph')) {
            return res.status(403).json({ 
                error: 'Access denied. Only valid school emails can sign up here.' 
            });
        }

        // 3. Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 4. Insert into the database (Removed userId from the query!)
        const query = 'INSERT INTO `Users` (`email`, `password`, `username`, `userType`) VALUES (?, ?, ?, ?)';
        await db.execute(query, [email, hashedPassword, username, userType || 1]);

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

        // 4. Success! Send back the user data so the frontend knows who logged in
        // Note: NEVER send the hashed password back to the frontend!
        res.status(200).json({
            message: 'Login successful!',
            user: {
                userId: user.userId,
                username: user.username,
                email: user.email,
                userType: user.userType
            },
            mustChangePassword: !!user.mustChangePassword
        });

    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'An error occurred during login. Please try again.' });
    }
});

// ==========================================
// USERS CRUD - UPDATE (Change Username/Password)
// ==========================================
app.put('/api/users/:userId', async (req, res) => {
    try {
        // 1. Grab the user's ID from the URL link itself (e.g., /api/users/101)
        const targetUserId = req.params.userId;
        
        // 2. Grab the new data the frontend wants to save
        const { username, password, mustChangePassword } = req.body;

        // Make sure they actually sent something to update
        if (!username && !password && mustChangePassword === undefined) {
            return res.status(400).json({ error: 'Please provide a new username, password, or mustChangePassword flag to update.' });
        }

        // 3. Prepare our dynamic SQL query based on what was sent
        let query = 'UPDATE `Users` SET ';
        const values = [];

        if (username) {
            query += '`username` = ? ';
            values.push(username);
        }

        if (password) {
            // If they are updating both, we need a comma in our SQL syntax
            if (username) query += ', '; 
            
            query += '`password` = ? ';
            // Always remember to hash the new password for security!
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            values.push(hashedPassword);
        }

        if (mustChangePassword !== undefined) {
            if (username || password) query += ', ';
            query += '`mustChangePassword` = ? ';
            values.push(mustChangePassword ? 1 : 0);
        }

        // Add the WHERE clause so we only update this specific user
        query += 'WHERE `userId` = ?';
        values.push(targetUserId);

        // 4. Execute the update
        const [result] = await db.execute(query, values);

        // Check if the user actually existed in the database
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json({ message: 'User updated successfully!' });

    } catch (error) {
        console.error('Error updating user:', error);
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
        const { storeManager, storeName, storeLocation } = req.body;

        if (!storeManager || !storeName || !storeLocation) {
            return res.status(400).json({ error: 'Store manager, name, and location are required.' });
        }

        const query = 'INSERT INTO `Stores` (`storeManager`, `storeName`, `storeLocation`) VALUES (?, ?, ?)';
        await db.execute(query, [storeManager, storeName, storeLocation]);

        res.status(201).json({ message: 'Store successfully registered!' });
    } catch (error) {
        console.error('Error creating store:', error);
        res.status(500).json({ error: 'Failed to create store.' });
    }
});

// ==========================================
// STORES CRUD - READ (Fetch stores for a specific Seller)
// ==========================================
app.get('/api/stores/seller/:userId', async (req, res) => {
    try {
        const sellerId = req.params.userId;
        const query = 'SELECT * FROM `Stores` WHERE `storeManager` = ?';
        const [rows] = await db.execute(query, [sellerId]);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching stores:', error);
        res.status(500).json({ error: 'Failed to retrieve stores.' });
    }
});

// ==========================================
// FOOD CRUD - CREATE (Add new food item)
// ==========================================
app.post('/api/food', async (req, res) => {
    try {
        // 1. We removed 'foodId' here because the database generates it automatically!
        const { 
            servedAt, 
            foodName, 
            description, 
            foodPrice, 
            isQuickServe, 
            carbs, 
            calories, 
            imageUrl 
        } = req.body;

        // 2. We removed 'foodId' from the required check
        if (!servedAt || !foodName || !description || !foodPrice) {
            return res.status(400).json({ error: 'Please provide all required food details.' });
        }

        // 3. We removed 'foodId' from the SQL query
        const query = `
            INSERT INTO \`Food\` 
            (\`servedAt\`, \`foodName\`, \`description\`, \`foodPrice\`, \`isQuickServe\`, \`carbs\`, \`calories\`, \`imageUrl\`) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // 4. Execute the query
        await db.execute(query, [
            servedAt, 
            foodName, 
            description, 
            foodPrice, 
            isQuickServe || 0,
            carbs || 0.00, 
            calories || 0.00, 
            imageUrl || null
        ]);

        res.status(201).json({ message: 'Food item successfully added to the menu!' });

    } catch (error) {
        console.error('Error adding food:', error);
        res.status(500).json({ error: 'Failed to add food item to the database.' });
    }
});

// ==========================================
// FOOD CRUD - READ (Get Menu, Search, & Filters)
// ==========================================
// Fetch foods served at a specific store
app.get('/api/food/store/:storeId', async (req, res) => {
    try {
        const storeId = req.params.storeId;
        const query = 'SELECT * FROM `Food` WHERE `servedAt` = ?';
        const [rows] = await db.execute(query, [storeId]);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching store foods:', error);
        res.status(500).json({ error: 'Failed to retrieve store menu.' });
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
// FOOD CRUD - UPDATE (Seller Menu Updates)
// ==========================================
app.put('/api/food/:foodId', async (req, res) => {
    try {
        const targetFoodId = req.params.foodId;
        const { foodName, description, foodPrice, isQuickServe } = req.body;

        // Build a dynamic update query based on what the seller changed
        let query = 'UPDATE `Food` SET ';
        const values = [];
        const updates = [];

        if (foodName) { updates.push('`foodName` = ?'); values.push(foodName); }
        if (description) { updates.push('`description` = ?'); values.push(description); }
        if (foodPrice) { updates.push('`foodPrice` = ?'); values.push(foodPrice); }
        if (isQuickServe !== undefined) { updates.push('`isQuickServe` = ?'); values.push(isQuickServe); }

        // If nothing was sent to update, stop here
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No data provided to update.' });
        }

        query += updates.join(', ') + ' WHERE `foodId` = ?';
        values.push(targetFoodId);

        const [result] = await db.execute(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Food item not found.' });
        }

        res.status(200).json({ message: 'Menu item updated successfully!' });
    } catch (error) {
        console.error('Error updating food:', error);
        res.status(500).json({ error: 'Failed to update menu item.' });
    }
});

// ==========================================
// FOOD CRUD - SMART FEED (Personalized Recommendations)
// ==========================================
app.get('/api/food/smart-feed/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // 1. Fetch the user's specific preferences
        const [prefs] = await db.execute('SELECT * FROM `Preferences` WHERE `userId` = ?', [userId]);
        
        let userBudget = null;
        let userTags = [];

        prefs.forEach(p => {
            if (p.preferenceType === 'BUDGET') userBudget = parseFloat(p.maxBudget);
            if (p.preferenceType === 'TAG') userTags.push(p.description.toLowerCase());
            // Note: In a future update, we can split TAG into LIKE and DISLIKE to penalize scores!
        });

        // 2. Fetch the entire active menu
        const [foods] = await db.execute('SELECT * FROM `Food`');

        // 3. The Match Scoring Engine
        const rankedFoods = foods.map(food => {
            let score = 0;
            let matchReasons = [];
            const searchString = `${food.foodName} ${food.description}`.toLowerCase();

            // Rule A: Is it under budget?
            if (userBudget && parseFloat(food.foodPrice) <= userBudget) {
                score += 10;
                matchReasons.push('Under Budget');
            }

            // Rule B: Does it match their flavor profile/tags?
            userTags.forEach(tag => {
                if (searchString.includes(tag)) {
                    score += 20; // High priority for exact taste matches
                    matchReasons.push(`Matches: ${tag}`);
                }
            });

            return { 
                ...food, 
                matchScore: score, 
                matchReasons: matchReasons 
            };
        });

        // 4. Sort the menu from highest score to lowest
        rankedFoods.sort((a, b) => b.matchScore - a.matchScore);

        // 5. Split the results into "Highly Recommended" and "The Rest"
        const recommended = rankedFoods.filter(f => f.matchScore >= 10);
        
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
// FOOD CRUD - DELETE (Seller removes food)
// ==========================================
app.delete('/api/food/:foodId', async (req, res) => {
    try {
        const targetFoodId = req.params.foodId;

        const query = 'DELETE FROM `Food` WHERE `foodId` = ?';
        const [result] = await db.execute(query, [targetFoodId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Food item not found.' });
        }

        res.status(200).json({ message: 'Food item removed from the menu.' });
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
        // preferenceType could be 'DIET', 'ALLERGY', or 'BUDGET'
        const { userId, preferenceType, tagId, ingredientId, maxBudget } = req.body;

        if (!userId || !preferenceType) {
            return res.status(400).json({ error: 'User ID and Preference Type are required.' });
        }

        const query = `
            INSERT INTO \`Preferences\` 
            (\`userId\`, \`preferenceType\`, \`tagId\`, \`ingredientId\`, \`maxBudget\`) 
            VALUES (?, ?, ?, ?, ?)
        `;

        await db.execute(query, [
            userId, 
            preferenceType, 
            tagId || null, 
            ingredientId || null, 
            maxBudget || null
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
// REVIEWS CRUD - CREATE (Leave a Star Review)
// ==========================================
app.post('/api/reviews', async (req, res) => {
    try {
        const { userId, foodId, starRating } = req.body;

        // Validation to ensure all required fields are provided
        if (!userId || !foodId || starRating === undefined) {
            return res.status(400).json({ error: 'User ID, Food ID, and Star Rating are required.' });
        }

        // Insert the review into the database
        const query = 'INSERT INTO `Reviews` (`userId`, `foodId`, `starRating`) VALUES (?, ?, ?)';
        await db.execute(query, [userId, foodId, starRating]);

        res.status(201).json({ message: 'Thank you for your review!' });
    } catch (error) {
        console.error('Error saving review:', error);
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
// AI FEATURES - FOOD BUNDLE RECOMMENDATION
// ==========================================
app.post('/api/ai/recommend-bundle', async (req, res) => {
    try {
        const { foodName } = req.body;

        if (!foodName) {
            return res.status(400).json({ error: 'Please provide a food name.' });
        }

        // 1. NEW: Fetch the actual menu from the database!
        // We exclude the food they clicked on so it doesn't pair a burger with a burger.
        const [menuItems] = await db.execute('SELECT `foodName`, `description` FROM `Food` WHERE `foodName` != ?', [foodName]);
        
        // If the menu is empty (except for the item itself), handle it gracefully
        if (menuItems.length === 0) {
             return res.status(200).json({ 
                 food: foodName, 
                 recommendation: "There aren't enough items on the menu to recommend a pairing right now! Check back later." 
             });
        }
        
        const menuString = JSON.stringify(menuItems);

        // 2. UPGRADED: Strict System Prompt locking the AI to your database
        const systemPrompt = `
            You are an expert culinary AI assistant for the LPU-C Nearbites application. 
            The user wants a pairing for a specific food. 
            I will provide you with the current menu of available items.
            You MUST recommend ONE beverage or side dish that pairs well with the user's food, 
            and your recommendation MUST be chosen STRICTLY from the provided menu list.
            Keep your response short, engaging, and explain briefly why they pair well together.
            Do not use markdown formatting. If nothing on the menu pairs perfectly, just pick the best possible option available.
        `;

        // 3. UPGRADED: Pass the menu to the AI along with the food name
        const userPrompt = `Target Food: ${foodName}\n\nAvailable Menu to choose from: ${menuString}`;

        // 4. Send the request to OpenRouter!
        const aiResponse = await askGPT(systemPrompt, userPrompt);

        // 5. Send the AI's brilliant, database-aware idea back to the frontend
        res.status(200).json({ 
            food: foodName,
            recommendation: aiResponse 
        });

    } catch (error) {
        console.error('Error generating bundle recommendation:', error);
        res.status(500).json({ error: 'Failed to generate recommendation.' });
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
// AI FEATURES - WEEKLY MEAL PLANNER
// ==========================================
app.post('/api/ai/generate-meal-plan', async (req, res) => {
    try {
        const { userId, startDate } = req.body;

        if (!userId || !startDate) {
            return res.status(400).json({ error: 'User ID and Start Date are required.' });
        }

        // 1. Get the menu so the AI knows what food is actually available
        const [foodItems] = await db.execute('SELECT `foodId`, `foodName`, `description` FROM `Food`');
        const menuString = JSON.stringify(foodItems);

        // 2. Get the user's preferences (diet, budget, etc.)
        const [preferences] = await db.execute('SELECT * FROM `Preferences` WHERE `userId` = ?', [userId]);
        const prefString = JSON.stringify(preferences);

        // 3. Give the AI strict instructions to act as a planner
        const systemPrompt = `
            You are an expert meal planner for the LPU-C Nearbites app.
            I will provide you with the current menu and the user's preferences.
            Create a 7-day meal plan using ONLY the food items from the provided menu.
            Return ONLY a valid JSON array of objects. Do not use markdown blocks.
            Format exactly like this:
            [
              {"dayOfWeek": 1, "mealType": "Lunch", "foodId": 5},
              {"dayOfWeek": 1, "mealType": "Beverage", "foodId": 12}
            ]
        `;

        const userPrompt = `Menu: ${menuString}\nUser Preferences: ${prefString}`;

        // 4. Send to OpenRouter / Qwen
        const aiResponseText = await askGPT(systemPrompt, userPrompt);
        
        // Parse the AI's text into a real JavaScript array
        const mealPlanData = JSON.parse(aiResponseText);

        // 5. Save the overarching Meal Plan to the database
        const planQuery = 'INSERT INTO `MealPlans` (`userId`, `planName`, `startDate`) VALUES (?, ?, ?)';
        const [planResult] = await db.execute(planQuery, [userId, 'AI Generated Weekly Plan', startDate]);
        const newPlanId = planResult.insertId; // Grab the newly generated planId

        // 6. Save every single meal entry to the database
        for (const entry of mealPlanData) {
            const entryQuery = 'INSERT INTO `MealPlanEntries` (`planId`, `foodId`, `dayOfWeek`, `mealType`) VALUES (?, ?, ?, ?)';
            await db.execute(entryQuery, [newPlanId, entry.foodId, entry.dayOfWeek, entry.mealType]);
        }

        res.status(201).json({ 
            message: 'Weekly meal plan successfully generated and saved!',
            planId: newPlanId,
            totalMealsAssigned: mealPlanData.length
        });

    } catch (error) {
        console.error('Error generating meal plan:', error);
        res.status(500).json({ error: 'Failed to generate meal plan. The AI may have misunderstood the menu format.' });
    }
});

// ==========================================
// AI FEATURES - BUDGET PREFERENCE (UPDATED)
// ==========================================
app.post('/api/ai/recommend-by-budget', async (req, res) => {
    try {
        const { userId, customBudget } = req.body;

        if (!userId) return res.status(400).json({ error: 'User ID is required.' });

        let userBudget = customBudget; // Use the typed budget if they provided one!

        // If they left it blank, fallback to their profile budget
        if (!userBudget) {
            const queryPref = 'SELECT `maxBudget` FROM `Preferences` WHERE `userId` = ? AND `maxBudget` IS NOT NULL LIMIT 1';
            const [prefs] = await db.execute(queryPref, [userId]);
            if (prefs.length === 0) {
                return res.status(404).json({ error: 'No budget provided and no saved preference found.' });
            }
            userBudget = prefs[0].maxBudget;
        }

        const queryMenu = 'SELECT `foodName`, `description`, `foodPrice` FROM `Food`';
        const [menu] = await db.execute(queryMenu);
        const menuString = JSON.stringify(menu);

        const systemPrompt = `
            You are a helpful, budget-conscious culinary AI for LPU-C Nearbites.
            The user has a strict maximum budget of PHP ${userBudget}.
            I will provide you with the current menu and prices.
            Recommend a great meal combination or a single hearty item that stays strictly UNDER or EQUAL TO their budget.
            Briefly explain why it's a great choice and tell them the total estimated cost. Keep it short.
        `;

        const aiResponseText = await askGPT(systemPrompt, `Menu: ${menuString}`);

        res.status(200).json({ budget: userBudget, recommendation: aiResponseText });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate budget recommendation.' });
    }
});

// ==========================================
// MEAL PLAN - READ (Fetch User's Latest Plan)
// ==========================================
app.get('/api/mealplans/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // 1. Get the most recent plan this user generated
        const [plans] = await db.execute('SELECT * FROM `MealPlans` WHERE `userId` = ? ORDER BY `planId` DESC LIMIT 1', [userId]);
        
        if (plans.length === 0) {
            return res.status(404).json({ error: 'No meal plan found. Generate one with the AI!' });
        }
        
        const planId = plans[0].planId;

        // 2. Fetch all the food entries for that plan
        const query = `
            SELECT e.dayOfWeek, e.mealType, f.foodName, f.foodPrice 
            FROM \`MealPlanEntries\` e
            JOIN \`Food\` f ON e.foodId = f.foodId
            WHERE e.planId = ?
            ORDER BY e.dayOfWeek ASC
        `;
        const [entries] = await db.execute(query, [planId]);

        res.status(200).json({ plan: plans[0], entries });
    } catch (error) {
        console.error('Error fetching meal plan:', error);
        res.status(500).json({ error: 'Failed to fetch meal plan.' });
    }
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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Nearbites Backend is running on port ${PORT}`);
});

// ==========================================
// ADMIN - GET ALL USERS
// ==========================================
app.get('/api/admin/users', async (req, res) => {
    try {
        const query = 'SELECT `userId`, `email`, `username`, `userType` FROM `Users`';
        const [rows] = await db.execute(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to retrieve users.' });
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