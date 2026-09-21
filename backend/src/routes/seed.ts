import { Router, Request, Response } from 'express';
import { seedHistoricalData } from '../utils/seedHistoricalData';

const router = Router();

/**
 * Seed historical data for all students (2024-2026, all terms)
 */
router.post('/historical', async (req: Request, res: Response) => {
  try {
    const result = await seedHistoricalData();
    res.json(result);
  } catch (error) {
    console.error('Error seeding historical data:', error);
    res.status(500).json({ error: 'Failed to seed historical data' });
  }
});

export default router;