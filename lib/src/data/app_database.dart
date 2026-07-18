import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

/// SQLite データベースへの接続を遅延的に開いて保持するヘルパー。
class AppDatabase {
  static const String _dbName = 'oshaberi_scanner.db';
  static const int _dbVersion = 1;
  static const String table = 'documents';

  Database? _db;

  Future<Database> get database async {
    return _db ??= await _open();
  }

  Future<Database> _open() async {
    final dir = await getDatabasesPath();
    final path = p.join(dir, _dbName);
    return openDatabase(
      path,
      version: _dbVersion,
      onCreate: _onCreate,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    await db.execute('''
      CREATE TABLE $table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        file_path TEXT NOT NULL,
        page_count INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    ''');
  }

  Future<void> close() async {
    await _db?.close();
    _db = null;
  }
}
