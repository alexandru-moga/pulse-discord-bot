# Auto Role Sync Service Documentation

## Overview

The Auto Role Sync Service automatically detects changes in the database and syncs Discord roles for affected users without manual intervention. This ensures that Discord roles are always up-to-date with user statuses, project assignments, and permissions in the Phoenix Club database.

## Features

✅ **Automatic Detection**: Monitors database changes in real-time
✅ **Smart Syncing**: Only syncs roles for users who have been affected by changes
✅ **Efficient Polling**: Checks for changes every 10 seconds (configurable)
✅ **Rate Limit Protection**: Built-in delays to prevent Discord API rate limiting
✅ **Manual Control**: Can be started, stopped, or restarted via Discord commands
✅ **Status Monitoring**: View service status and last sync timestamps

## How It Works

### 1. **Monitoring Tables**
The service monitors three key database tables:

- **`users`**: Tracks changes to user roles (Member, Co-leader, Leader) and active status
- **`project_assignments`**: Tracks changes to project assignments and pizza grants
- **`discord_links`**: Tracks new Discord account links

### 2. **Change Detection**
Every 10 seconds, the service checks these tables for records modified since the last check using the `updated_at` or `linked_at` timestamps.

### 3. **Automatic Syncing**
When changes are detected:
1. Identifies affected Discord users
2. Calculates required roles based on:
   - User membership role (Member/Co-leader/Leader)
   - User active status
   - Project assignments (accepted projects)
   - Pizza grants received
3. Adds missing roles
4. Removes outdated roles

### 4. **Logging**
All sync operations are logged to the console with detailed information about:
- Number of changes detected
- Users being synced
- Roles added/removed
- Success/error counts

## Configuration

### Service Settings
Located in `services/autoRoleSync.js`:

```javascript
this.config = {
    pollIntervalMs: 10000,     // Check every 10 seconds
    batchSyncDelay: 1000,      // Wait 1 second before syncing
};
```

### Adjusting Poll Interval
To change how often the service checks for changes, modify `pollIntervalMs`:
- **Lower value** = More responsive but more database queries
- **Higher value** = Less responsive but fewer database queries
- **Recommended**: 5000-30000ms (5-30 seconds)

## Discord Commands

### `/auto-sync status`
Check the current status of the auto role sync service.

**Output:**
- Service status (Running/Stopped)
- Guild ID
- Poll interval
- Last check timestamps for each monitored table

### `/auto-sync start`
Start the automatic role sync service.

**Note**: The service starts automatically when the bot boots up.

### `/auto-sync stop`
Stop the automatic role sync service.

**Use case**: Temporarily disable auto-syncing during maintenance or bulk database updates.

### `/auto-sync restart`
Restart the automatic role sync service.

**Use case**: Reload the service after configuration changes or to reset timestamps.

## Use Cases

### 1. **User Status Changes**
**Scenario**: Admin changes a user from "Member" to "Co-leader" in the dashboard.

**Result**: Within 10 seconds, the user automatically receives the Co-leader role in Discord and loses the Member role.

### 2. **Project Assignments**
**Scenario**: User is accepted to a new project or receives a pizza grant.

**Result**: The user automatically receives the corresponding project role or pizza role in Discord.

### 3. **Account Linking**
**Scenario**: New member links their Discord account through the website.

**Result**: User automatically receives their appropriate membership and project roles without running `/sync`.

### 4. **Bulk Updates**
**Scenario**: Admin imports multiple projects or updates many assignments at once.

**Result**: All affected users get their roles synced automatically within seconds.

## Benefits

### For Users
- ✅ No need to run `/sync` manually
- ✅ Instant role updates after account linking
- ✅ Always have correct roles and permissions

### For Admins
- ✅ No need to run `/sync-all` after database changes
- ✅ Reduced manual workload
- ✅ Consistent role state across platform
- ✅ Real-time reflection of database changes

### For the System
- ✅ Efficient: Only syncs affected users
- ✅ Reliable: Automatic retries on errors
- ✅ Safe: Rate limit protection built-in
- ✅ Transparent: Detailed logging

## Technical Details

### Database Queries
The service uses optimized queries with timestamp-based filtering:

```sql
-- Check for user changes
SELECT u.id, dl.discord_id
FROM users u
JOIN discord_links dl ON u.id = dl.user_id
WHERE u.updated_at > ?

-- Check for assignment changes
SELECT DISTINCT dl.discord_id
FROM project_assignments pa
JOIN discord_links dl ON pa.user_id = dl.user_id
WHERE pa.updated_at > ?

-- Check for new links
SELECT discord_id
FROM discord_links
WHERE linked_at > ?
```

### Performance Impact
- **Database**: Minimal - 3 simple queries every 10 seconds
- **Memory**: Low - Stores only last check timestamps
- **CPU**: Negligible - Most time is spent waiting
- **Network**: Only syncs when changes detected

### Error Handling
- Individual sync failures don't stop the service
- Errors are logged with details
- Service continues monitoring after errors
- Manual commands available if service fails

## Troubleshooting

### Service Not Starting
**Check:**
1. Bot has `MANAGE_ROLES` permission
2. `discord_guild_id` exists in settings table
3. Database connection is working
4. Check console for error messages

**Fix:** Restart the bot or use `/auto-sync restart`

### Roles Not Syncing
**Check:**
1. Service is running: `/auto-sync status`
2. Bot role is higher than managed roles
3. User is in `discord_links` table
4. Changes were made to monitored tables

**Fix:** Use `/sync <user>` for immediate manual sync

### Too Many Database Queries
**Solution:** Increase `pollIntervalMs` to 20000 or 30000ms

### Roles Syncing Too Slowly
**Solution:** Decrease `pollIntervalMs` to 5000ms (not recommended below 5000)

## Comparison: Manual vs Auto Sync

| Feature | Manual Sync | Auto Sync |
|---------|-------------|-----------|
| **Trigger** | User command | Automatic |
| **Timing** | On demand | Every 10s |
| **Coverage** | Single user or all | Only changed |
| **Efficiency** | Variable | Optimized |
| **User Action** | Required | None |
| **Admin Action** | Sometimes | Never |

## Best Practices

1. **Keep Service Running**: Only stop during major maintenance
2. **Monitor Logs**: Check console for sync activity and errors
3. **Use Status Command**: Regularly check service health
4. **Manual Sync Available**: Use `/sync` for immediate needs
5. **Adjust Polling**: Fine-tune interval based on server activity

## Files Modified

### New Files Created
1. **`services/autoRoleSync.js`** - Main auto-sync service implementation
2. **`commands/auto-sync.js`** - Discord command for service control
3. **`AUTO_ROLE_SYNC.md`** - This documentation

### Modified Files
1. **`index.js`** - Added service initialization and import

## Future Enhancements

Possible improvements for future versions:
- [ ] Webhook-based instant sync (instead of polling)
- [ ] Configurable poll interval via database settings
- [ ] Dashboard UI for monitoring sync activity
- [ ] Sync statistics and analytics
- [ ] Smart batching for large-scale changes
- [ ] Email notifications on sync failures

## Support

If you encounter issues with the auto role sync service:
1. Check the bot console logs
2. Use `/auto-sync status` to verify service state
3. Try `/auto-sync restart` to reset the service
4. Use `/sync` or `/sync-all` for manual syncing
5. Review this documentation for troubleshooting tips

---

**Version**: 1.0.0  
**Last Updated**: October 21, 2025  
**Author**: Phoenix Club Development Team
