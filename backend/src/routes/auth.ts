import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, department } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create new user
    const user = new User({
      email,
      password,
      name,
      role: role || 'counselor',
      department,
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        section: user.section,
      },
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user (protected route)
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        section: user.section,
      },
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Seed demo users (temporary endpoint)
router.post('/seed-demo-users', async (req: Request, res: Response) => {
  try {
    const usersToSeed = [
      {
        email: 'admin@sjc.edu.ph',
        password: 'admin123',
        name: 'Dr. Ramon Aquino',
        role: 'admin',
        department: 'IT Department',
      },
      {
        email: 'counselor@sjc.edu.ph',
        password: 'counselor123',
        name: 'Ms. Anne Gabrielle Cortezano',
        role: 'counselor',
        department: 'Student Affairs',
      },
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const userData of usersToSeed) {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`⏭️  User ${userData.email} already exists, skipping`);
        skippedCount++;
      } else {
        const user = new User(userData);
        await user.save();
        console.log(`✓ Created user: ${userData.email} (${userData.role})`);
        createdCount++;
      }
    }

    res.json({ 
      message: `Seeding complete: ${createdCount} users created, ${skippedCount} skipped`,
      created: createdCount,
      skipped: skippedCount
    });
  } catch (error) {
    console.error('Error seeding users:', error);
    res.status(500).json({ error: 'Failed to seed users' });
  }
});

export default router;
