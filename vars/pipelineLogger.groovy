/**
 * Global logger function for consistent logging across pipeline
 */

def info(String message) {
    echo "ℹ️ ${message}"
}

def success(String message) {
    echo "✅ ${message}"
}

def warning(String message) {
    echo "⚠️ ${message}"
}

def error(String message) {
    echo "❌ ${message}"
}

def debug(String message) {
    if (env.DEBUG == 'true') {
        echo "🐛 ${message}"
    }
}

def section(String title) {
    echo """
    ╔════════════════════════════════════════════════════════════╗
    ║ ${title.padRight(58)} ║
    ╚════════════════════════════════════════════════════════════╝
    """
}
