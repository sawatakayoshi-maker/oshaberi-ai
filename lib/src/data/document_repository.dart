import 'dart:io';

import 'app_database.dart';
import 'scan_document.dart';

/// スキャン結果メタデータの永続化を担うリポジトリ。
class DocumentRepository {
  DocumentRepository(this._db);

  final AppDatabase _db;

  Future<List<ScanDocument>> fetchAll() async {
    final db = await _db.database;
    final rows = await db.query(
      AppDatabase.table,
      orderBy: 'created_at DESC',
    );
    return rows.map(ScanDocument.fromMap).toList(growable: false);
  }

  Future<ScanDocument> insert(ScanDocument doc) async {
    final db = await _db.database;
    final id = await db.insert(AppDatabase.table, doc.toMap());
    return doc.copyWith(id: id);
  }

  /// メタデータ行と、対応する PDF ファイルの両方を削除する。
  Future<void> delete(ScanDocument doc) async {
    final db = await _db.database;
    if (doc.id != null) {
      await db.delete(
        AppDatabase.table,
        where: 'id = ?',
        whereArgs: [doc.id],
      );
    }
    final file = File(doc.filePath);
    if (await file.exists()) {
      await file.delete();
    }
  }
}
