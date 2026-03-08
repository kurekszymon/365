<?php
// unified-sql-playground.php - Unified SQL playground backend
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$db = new PDO('sqlite:playground.db');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Create example tables if not exist
$db->exec('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, created_at TEXT)');
$db->exec('CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL, stock INTEGER DEFAULT 10)');
$db->exec('CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, product_id INTEGER, quantity INTEGER, created_at TEXT)');

// Insert sample data if tables are empty
function seedTable($db, $table, $insertSql, $countSql)
{
  $count = $db->query($countSql)->fetchColumn();
  if ($count == 0) {
    $db->exec($insertSql);
  }
}

// Seed users (100 users)
$userInserts = [];
for ($i = 1; $i <= 100; $i++) {
  $name = "User$i";
  $email = strtolower($name) . "@example.com";
  $date = date('Y-m-d', strtotime("2026-03-08 +$i days"));
  $userInserts[] = "('$name', '$email', '$date')";
}
seedTable($db, 'users', "INSERT INTO users (name, email, created_at) VALUES " . implode(",", $userInserts), 'SELECT COUNT(*) FROM users');

// Seed products (20 products)
$productInserts = [];
for ($i = 1; $i <= 20; $i++) {
  $name = "Product$i";
  $price = rand(10, 2000) + rand(0, 99) / 100;
  $stock = rand(5, 50);
  $productInserts[] = "('$name', $price, $stock)";
}
seedTable($db, 'products', "INSERT INTO products (name, price, stock) VALUES " . implode(",", $productInserts), 'SELECT COUNT(*) FROM products');

// Seed orders (300 orders)
$orderInserts = [];
for ($i = 1; $i <= 300; $i++) {
  $user_id = rand(1, 100);
  $product_id = rand(1, 20);
  $quantity = rand(1, 5);
  $date = date('Y-m-d', strtotime("2026-03-08 +$i days"));
  $orderInserts[] = "($user_id, $product_id, $quantity, '$date')";
}
seedTable($db, 'orders', "INSERT INTO orders (user_id, product_id, quantity, created_at) VALUES " . implode(",", $orderInserts), 'SELECT COUNT(*) FROM orders');

// Create view and trigger for advanced features
$db->exec('CREATE VIEW IF NOT EXISTS user_order_summary AS SELECT u.id as user_id, u.name, COUNT(o.id) as total_orders, SUM(o.quantity) as total_items FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.id');
$db->exec('CREATE TRIGGER IF NOT EXISTS update_product_stock AFTER INSERT ON orders BEGIN UPDATE products SET stock = stock - NEW.quantity WHERE id = NEW.product_id; END;');
$db->exec('UPDATE products SET stock = 10 WHERE stock IS NULL');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $data = json_decode(file_get_contents('php://input'), true);
  $sql = trim($data['sql'] ?? '');
  if (stripos($sql, 'select') === 0) {
    try {
      $stmt = $db->query($sql);
      $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
      echo json_encode(['result' => $result]);
    } catch (Exception $e) {
      echo json_encode(['error' => $e->getMessage()]);
    }
  } else {
    echo json_encode(['error' => 'Only SELECT queries are allowed for safety.']);
  }
  exit;
}

// GET: return schema and view info
$tables = $db->query("SELECT name FROM sqlite_master WHERE type='table'")->fetchAll(PDO::FETCH_COLUMN);
$views = $db->query("SELECT name FROM sqlite_master WHERE type='view'")->fetchAll(PDO::FETCH_COLUMN);
$schema = [];
foreach ($tables as $table) {
  $cols = $db->query("PRAGMA table_info($table)")->fetchAll(PDO::FETCH_ASSOC);
  $schema[$table] = $cols;
}
foreach ($views as $view) {
  $schema[$view] = 'VIEW';
}
echo json_encode(['schema' => $schema, 'views' => $views]);
