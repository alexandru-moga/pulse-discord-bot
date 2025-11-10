# Quick Start: Auto Role Sync

## What Changed?

Your Discord bot now **automatically syncs roles** when database changes occur! 🎉

## How to Use

### 1. Start the Bot
```bash
npm start
```

The auto role sync service starts automatically when the bot boots up.

### 2. Verify It's Running
In Discord, use:
```
/auto-sync status
```

You should see: 🟢 **Auto Role Sync Status: Running**

### 3. Make Database Changes
- Update user roles in the dashboard
- Assign users to projects
- Grant pizza awards
- Link new Discord accounts

**The bot will automatically sync roles within 10 seconds!**

## Key Commands

| Command | Purpose |
|---------|---------|
| `/auto-sync status` | Check if service is running |
| `/auto-sync stop` | Stop automatic syncing |
| `/auto-sync start` | Start automatic syncing |
| `/auto-sync restart` | Restart the service |

## What Gets Synced Automatically?

✅ User membership roles (Member, Co-leader, Leader)  
✅ User active/inactive status  
✅ Project assignment roles  
✅ Pizza grant roles  
✅ New Discord account links  

## Do I Still Need Manual Sync?

**No!** The bot now handles syncing automatically.

However, manual commands are still available:
- `/sync` - Force sync for a specific user
- `/sync-all` - Force sync for all users

Use these only if you need immediate syncing or for testing.

## Monitoring

The bot console will show:
- When changes are detected
- Which users are being synced
- How many roles were added/removed
- Any errors that occur

Example output:
```
📝 Detected 2 user changes
📝 Detected 1 project assignment changes
🔄 Auto-syncing roles for 3 users...
   ✅ Synced 123456789: +2 roles, -1 roles
   ✅ Synced 987654321: +1 roles, -0 roles
✅ Auto-sync completed: 3 success, 0 errors
```

## Troubleshooting

**Service not running?**
```
/auto-sync restart
```

**Need immediate sync?**
```
/sync @user
```

**Want to disable it temporarily?**
```
/auto-sync stop
```

## More Information

See [AUTO_ROLE_SYNC.md](AUTO_ROLE_SYNC.md) for complete documentation.

---

🎉 **Enjoy automatic role syncing!** No more manual work needed.
