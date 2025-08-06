<?php
require_once '../config/database.php';
require_once '../auth/check_auth.php';

// Check if user is admin
if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header('Location: /dashboard/');
    exit();
}

$success_message = '';
$error_message = '';

// Handle form submission
if ($_POST) {
    try {
        $pdo = getDbConnection();
        
        // Update Discord settings
        $settings = [
            'discord_client_id' => $_POST['discord_client_id'] ?? '',
            'discord_client_secret' => $_POST['discord_client_secret'] ?? '',
            'discord_redirect_uri' => $_POST['discord_redirect_uri'] ?? '',
            'discord_bot_token' => $_POST['discord_bot_token'] ?? '',
            'discord_guild_id' => $_POST['discord_guild_id'] ?? '',
            'discord_bot_enabled' => isset($_POST['discord_bot_enabled']) ? '1' : '0'
        ];
        
        foreach ($settings as $name => $value) {
            $stmt = $pdo->prepare("INSERT INTO settings (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?");
            $stmt->execute([$name, $value, $value]);
        }
        
        $success_message = 'Discord settings updated successfully!';
    } catch (Exception $e) {
        $error_message = 'Error updating settings: ' . $e->getMessage();
    }
}

// Get current settings
try {
    $pdo = getDbConnection();
    $stmt = $pdo->prepare("SELECT name, value FROM settings WHERE name LIKE 'discord_%'");
    $stmt->execute();
    $settings_rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $settings = [];
    foreach ($settings_rows as $row) {
        $settings[$row['name']] = $row['value'];
    }
} catch (Exception $e) {
    $error_message = 'Error loading settings: ' . $e->getMessage();
    $settings = [];
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Discord Settings - Phoenix Club</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body class="bg-gray-100">
    <div class="container mx-auto px-4 py-8">
        <div class="max-w-4xl mx-auto">
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between mb-6">
                    <h1 class="text-2xl font-bold text-gray-800">
                        <i class="fab fa-discord text-indigo-600 mr-2"></i>
                        Discord Settings
                    </h1>
                    <a href="/dashboard/" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
                        <i class="fas fa-arrow-left mr-2"></i>Back to Dashboard
                    </a>
                </div>

                <?php if ($success_message): ?>
                    <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                        <i class="fas fa-check-circle mr-2"></i><?php echo htmlspecialchars($success_message); ?>
                    </div>
                <?php endif; ?>

                <?php if ($error_message): ?>
                    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        <i class="fas fa-exclamation-circle mr-2"></i><?php echo htmlspecialchars($error_message); ?>
                    </div>
                <?php endif; ?>

                <form method="POST" class="space-y-6">
                    <!-- Bot Status -->
                    <div class="border-b pb-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-lg font-medium text-gray-900">Discord Bot Status</h3>
                                <p class="text-sm text-gray-600">Enable or disable Discord integration</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" name="discord_bot_enabled" class="sr-only peer" 
                                       <?php echo ($settings['discord_bot_enabled'] ?? '0') === '1' ? 'checked' : ''; ?>>
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>

                    <!-- OAuth Settings -->
                    <div class="grid md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <i class="fas fa-key mr-1"></i>Client ID
                            </label>
                            <input type="text" name="discord_client_id" 
                                   value="<?php echo htmlspecialchars($settings['discord_client_id'] ?? ''); ?>"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                   placeholder="Your Discord Application Client ID">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <i class="fas fa-shield-alt mr-1"></i>Client Secret
                            </label>
                            <div class="relative">
                                <input type="password" name="discord_client_secret" id="client_secret"
                                       value="<?php echo htmlspecialchars($settings['discord_client_secret'] ?? ''); ?>"
                                       class="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                       placeholder="Your Discord Application Client Secret">
                                <button type="button" onclick="toggleVisibility('client_secret', this)"
                                        class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 px-2 py-1 text-sm">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Bot Settings -->
                    <div class="grid md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <i class="fas fa-robot mr-1"></i>Bot Token
                            </label>
                            <div class="relative">
                                <input type="password" name="discord_bot_token" id="bot_token"
                                       value="<?php echo htmlspecialchars($settings['discord_bot_token'] ?? ''); ?>"
                                       class="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                       placeholder="Your Discord Bot Token">
                                <button type="button" onclick="toggleVisibility('bot_token', this)"
                                        class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 px-2 py-1 text-sm">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <i class="fas fa-server mr-1"></i>Guild ID
                            </label>
                            <input type="text" name="discord_guild_id" 
                                   value="<?php echo htmlspecialchars($settings['discord_guild_id'] ?? ''); ?>"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                   placeholder="Your Discord Server (Guild) ID">
                        </div>
                    </div>

                    <!-- Redirect URI -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            <i class="fas fa-link mr-1"></i>Redirect URI
                        </label>
                        <input type="url" name="discord_redirect_uri" 
                               value="<?php echo htmlspecialchars($settings['discord_redirect_uri'] ?? ''); ?>"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                               placeholder="https://yoursite.com/auth/discord/">
                        <p class="text-xs text-gray-500 mt-1">This should match the redirect URI in your Discord application settings</p>
                    </div>

                    <!-- Project & Event Management -->
                    <div class="border-t pt-6">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">
                            <i class="fas fa-cogs mr-2"></i>Integration Management
                        </h3>
                        
                        <div class="grid md:grid-cols-2 gap-4">
                            <a href="/dashboard/projects.php" 
                               class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-center transition-colors">
                                <i class="fas fa-project-diagram mr-2"></i>Manage Project Roles
                            </a>
                            
                            <a href="/dashboard/events.php" 
                               class="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg text-center transition-colors">
                                <i class="fas fa-calendar mr-2"></i>Manage Event Roles
                            </a>
                        </div>
                    </div>

                    <!-- Save Button -->
                    <div class="flex justify-end pt-6 border-t">
                        <button type="submit" 
                                class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                            <i class="fas fa-save mr-2"></i>Save Settings
                        </button>
                    </div>
                </form>

                <!-- Connection Status -->
                <div class="mt-8 border-t pt-6">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">
                        <i class="fas fa-link mr-2"></i>Discord Links Status
                    </h3>
                    
                    <?php
                    try {
                        $stmt = $pdo->prepare("
                            SELECT COUNT(*) as total_links,
                                   COUNT(CASE WHEN dl.linked_at > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as recent_links
                            FROM discord_links dl
                        ");
                        $stmt->execute();
                        $link_stats = $stmt->fetch(PDO::FETCH_ASSOC);
                    ?>
                        <div class="grid md:grid-cols-2 gap-4">
                            <div class="bg-gray-50 p-4 rounded-lg">
                                <div class="text-2xl font-bold text-blue-600"><?php echo $link_stats['total_links']; ?></div>
                                <div class="text-sm text-gray-600">Total Discord Links</div>
                            </div>
                            <div class="bg-gray-50 p-4 rounded-lg">
                                <div class="text-2xl font-bold text-green-600"><?php echo $link_stats['recent_links']; ?></div>
                                <div class="text-sm text-gray-600">New Links (30 days)</div>
                            </div>
                        </div>
                    <?php
                    } catch (Exception $e) {
                        echo '<p class="text-red-600">Error loading connection statistics</p>';
                    }
                    ?>
                </div>
            </div>
        </div>
    </div>

    <script>
        function toggleVisibility(inputId, button) {
            const input = document.getElementById(inputId);
            const icon = button.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        }
    </script>
</body>
</html>
