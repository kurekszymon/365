<?php
// notes.php - Simple, safe note API (no SQLi, no XSS)
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$db = new PDO('sqlite:notes.db');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->exec('CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT NOT NULL)');

function sanitize($text)
{
  // Prevent XSS by escaping HTML
  return htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $data = json_decode(file_get_contents('php://input'), true);
  if (isset($data['content'])) {
    $stmt = $db->prepare('INSERT INTO notes (content) VALUES (:content)');
    $stmt->bindValue(':content', $data['content'], PDO::PARAM_STR);
    $stmt->execute();
    echo json_encode(['status' => 'ok']);
    exit;
  }
}

// GET: return all notes
$stmt = $db->query('SELECT id, content FROM notes ORDER BY id DESC');
$notes = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($notes as &$note) {
  $note['content'] = sanitize($note['content']);
}
echo json_encode($notes);
