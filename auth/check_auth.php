<?php
/**
 * Authentication check for Discord Bot Dashboard
 * This is a simple authentication system for the Discord bot's admin pages
 */

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Check if user is logged in
 */
function checkLoggedIn() {
    if (!isset($_SESSION['user_id'])) {
        header('Location: /dashboard/login.php');
        exit();
    }
}

/**
 * Check if user has required role
 * @param array $allowedRoles Array of allowed roles
 */
function checkRole($allowedRoles = []) {
    if (!isset($_SESSION['user_role']) || !in_array($_SESSION['user_role'], $allowedRoles)) {
        header('Location: /dashboard/');
        exit();
    }
}

/**
 * Get current user ID from session
 * @return int|null
 */
function getCurrentUserId() {
    return $_SESSION['user_id'] ?? null;
}

/**
 * Get current user role from session
 * @return string|null
 */
function getCurrentUserRole() {
    return $_SESSION['user_role'] ?? null;
}
