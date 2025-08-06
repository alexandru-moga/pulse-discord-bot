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

// Handle form submission for role ID updates
if ($_POST && isset($_POST['update_roles'])) {
    try {
        $pdo = getDbConnection();
        
        foreach ($_POST['projects'] as $project_id => $roles) {
            $stmt = $pdo->prepare("
                UPDATE projects 
                SET discord_accepted_role_id = ?, discord_pizza_role_id = ? 
                WHERE id = ?
            ");
            $stmt->execute([
                $roles['accepted_role'] ?: null,
                $roles['pizza_role'] ?: null,
                $project_id
            ]);
        }
        
        $success_message = 'Project Discord role IDs updated successfully!';
    } catch (Exception $e) {
        $error_message = 'Error updating roles: ' . $e->getMessage();
    }
}

// Get all projects
try {
    $pdo = getDbConnection();
    $stmt = $pdo->prepare("SELECT * FROM projects ORDER BY title");
    $stmt->execute();
    $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $error_message = 'Error loading projects: ' . $e->getMessage();
    $projects = [];
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Discord Roles - Phoenix Club</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body class="bg-gray-100">
    <div class="container mx-auto px-4 py-8">
        <div class="max-w-6xl mx-auto">
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between mb-6">
                    <h1 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-project-diagram text-blue-600 mr-2"></i>
                        Project Discord Roles
                    </h1>
                    <a href="/dashboard/discord-settings.php" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
                        <i class="fas fa-arrow-left mr-2"></i>Back to Discord Settings
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

                <div class="mb-6 p-4 bg-blue-50 rounded-lg">
                    <div class="flex items-start">
                        <i class="fas fa-info-circle text-blue-500 mt-1 mr-3"></i>
                        <div>
                            <h3 class="font-medium text-blue-900">Role Assignment Information</h3>
                            <p class="text-sm text-blue-700 mt-1">
                                Configure Discord role IDs for each project. Users with accepted project assignments will receive the accepted role, 
                                and users who have received pizza grants will also get the pizza role. Role syncing is handled by a separate Discord bot.
                            </p>
                        </div>
                    </div>
                </div>

                <form method="POST">
                    <input type="hidden" name="update_roles" value="1">
                    
                    <div class="space-y-6">
                        <?php foreach ($projects as $project): ?>
                            <div class="border border-gray-200 rounded-lg p-4">
                                <div class="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 class="text-lg font-medium text-gray-900"><?php echo htmlspecialchars($project['title']); ?></h3>
                                        <?php if ($project['description']): ?>
                                            <p class="text-sm text-gray-600 mt-1"><?php echo htmlspecialchars(strip_tags($project['description'])); ?></p>
                                        <?php endif; ?>
                                    </div>
                                    <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">ID: <?php echo $project['id']; ?></span>
                                </div>

                                <div class="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            <i class="fas fa-check-circle text-green-500 mr-1"></i>Accepted Role ID
                                        </label>
                                        <input type="text" 
                                               name="projects[<?php echo $project['id']; ?>][accepted_role]"
                                               value="<?php echo htmlspecialchars($project['discord_accepted_role_id'] ?? ''); ?>"
                                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                               placeholder="e.g., 1234567890123456789">
                                        <p class="text-xs text-gray-500 mt-1">Role given to users with accepted project assignments</p>
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            <i class="fas fa-pizza-slice text-orange-500 mr-1"></i>Pizza Grant Role ID
                                        </label>
                                        <input type="text" 
                                               name="projects[<?php echo $project['id']; ?>][pizza_role]"
                                               value="<?php echo htmlspecialchars($project['discord_pizza_role_id'] ?? ''); ?>"
                                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                               placeholder="e.g., 1234567890123456789">
                                        <p class="text-xs text-gray-500 mt-1">Role given to users who received pizza grants</p>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>

                        <?php if (empty($projects)): ?>
                            <div class="text-center py-8">
                                <i class="fas fa-project-diagram text-gray-300 text-4xl mb-4"></i>
                                <p class="text-gray-500">No projects found. Create some projects first!</p>
                                <a href="/dashboard/projects/" class="text-blue-600 hover:text-blue-800 mt-2 inline-block">
                                    Manage Projects →
                                </a>
                            </div>
                        <?php endif; ?>
                    </div>

                    <?php if (!empty($projects)): ?>
                        <div class="flex justify-end mt-8 pt-6 border-t">
                            <button type="submit" 
                                    class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                                <i class="fas fa-save mr-2"></i>Save Role Settings
                            </button>
                        </div>
                    <?php endif; ?>
                </form>
            </div>
        </div>
    </div>
</body>
</html>
