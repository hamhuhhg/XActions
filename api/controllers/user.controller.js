import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get user profile
 */
export async function getProfile(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        operations: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      plan: 'free_unlimited',
      twitterConnected: !!user.twitterAccessToken,
      recentOperations: user.operations
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

/**
 * Update user profile
 */
export async function updateProfile(req, res) {
  try {
    const { username } = req.body;

    if (username) {
      const existing = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: req.user.id }
        }
      });

      if (existing) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { username }
    });

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      plan: 'free_unlimited'
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

/**
 * Get user statistics
 */
export async function getStats(req, res) {
  try {
    const operations = await prisma.operation.findMany({
      where: { userId: req.user.id }
    });

    const stats = {
      totalOperations: operations.length,
      totalUnfollows: operations.reduce((sum, op) => sum + (op.unfollowedCount || 0), 0),
      totalFollowers: operations.reduce((sum, op) => sum + (op.followedCount || 0), 0),
      operationsByType: {},
      operationsByStatus: {}
    };

    operations.forEach(op => {
      stats.operationsByType[op.type] = (stats.operationsByType[op.type] || 0) + 1;
      stats.operationsByStatus[op.status] = (stats.operationsByStatus[op.status] || 0) + 1;
    });

    res.json(stats);
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}
